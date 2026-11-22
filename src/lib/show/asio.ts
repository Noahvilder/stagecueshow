/** ASIO bridge (Windows app only): Web Audio renders all channels, an AudioWorklet taps them
 * and streams interleaved PCM to the Rust ASIO stream, so every interface channel is usable. */
type Inv = (cmd: string, args?: unknown) => Promise<unknown>;
const tauri = (): Inv | null => {
  const t = (globalThis as unknown as { __TAURI_INTERNALS__?: { invoke: Inv } }).__TAURI_INTERNALS__;
  return t ? t.invoke.bind(t) : null;
};

export const ASIO_PREFIX = "asio:";
export const isAsio = (id: string) => id.startsWith(ASIO_PREFIX);

export async function listAsio(): Promise<{ id: string; label: string }[]> {
  const inv = tauri();
  if (!inv) return [];
  const names = ((await inv("asio_list").catch(() => [])) as string[]) ?? [];
  return names.map((n) => ({ id: ASIO_PREFIX + n, label: `ASIO · ${n}` }));
}

export async function openAsio(id: string): Promise<{ channels: number; rate: number }> {
  const inv = tauri();
  if (!inv) throw new Error("ASIO virker kun i Windows-appen");
  return (await inv("asio_open", { name: id.slice(ASIO_PREFIX.length) })) as { channels: number; rate: number };
}

const WORKLET = `class B extends AudioWorkletProcessor{constructor(o){super();this.n=o.processorOptions.ch;this.f=1024;this.b=new Float32Array(this.f*this.n);this.i=0}
process(inp){const x=inp[0]||[],n=this.n;for(let s=0;s<128;s++){const o=this.i*n;for(let c=0;c<n;c++){const ch=x[c];this.b[o+c]=ch?ch[s]:0}if(++this.i===this.f){this.port.postMessage(this.b.buffer,[this.b.buffer]);this.b=new Float32Array(this.f*n);this.i=0}}return true}}
registerProcessor('asio-bridge',B)`;

/** Node to connect the master bus to; its audio goes to ASIO, never to the Windows speakers. */
export async function asioBridge(ctx: AudioContext, channels: number): Promise<AudioNode> {
  const inv = tauri();
  if (!inv) throw new Error("ASIO virker kun i Windows-appen");
  const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
  await ctx.audioWorklet.addModule(url);
  const n = Math.max(1, Math.min(32, channels));
  const node = new AudioWorkletNode(ctx, "asio-bridge", {
    numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
    channelCount: n, channelCountMode: "explicit", channelInterpretation: "discrete",
    processorOptions: { ch: channels },
  });
  node.port.onmessage = (e) => { void inv("asio_push", new Uint8Array(e.data as ArrayBuffer)).catch(() => {}); };
  node.connect(ctx.destination); // outputs silence; keeps the graph rendering
  return node;
}
