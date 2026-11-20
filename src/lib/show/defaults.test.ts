import { describe, expect, it } from "vitest";
import { cueAsDefault, newCue } from "./logic";
import { monitorFields, revealedAt, stickyIndex } from "./monitors";
import type { Cue } from "./types";

describe("cue defaults saved in the show", () => {
  it("new MIDI cue uses the show's channel and name", () => {
    const tpl = newCue("midi") as Extract<Cue, { type: "midi" }>;
    tpl.name = "Lys"; tpl.messages[0]!.channel = 16;
    const c = newCue("midi", { midi: cueAsDefault(tpl) }) as Extract<Cue, { type: "midi" }>;
    expect(c.name).toBe("Lys");
    expect(c.messages[0]!.channel).toBe(16);
    expect(c.id).not.toBe(tpl.id);
  });
});

describe("memo inside group reaches monitor", () => {
  it("group exposes child memo text and role notes", () => {
    const g = { ...newCue("group"), children: [{ ...newCue("memo"), text: "Vers 1", monitorNotes: { bass: "E A" } }] } as Cue;
    const f = monitorFields(g);
    expect(f.text).toBe("Vers 1");
    expect(f.monitorNotes["bass"]).toBe("E A");
  });
  it("delayed memo in group only shows after its start time", () => {
    const g = { ...newCue("group"), children: [{ ...newCue("memo"), text: "Intro" }, { ...newCue("memo"), text: "Solo", preWait: 130 }] } as Cue;
    expect(monitorFields(g).text).toBe("Intro");
    expect(monitorFields(g, revealedAt(g, 129)).text).toBe("Intro");
    expect(monitorFields(g, revealedAt(g, 130)).text).toBe("Solo");
  });
  it("memo stays until the next memo", () => {
    const flat = [{ text: "Vers" }, { text: "" }, { text: "" }, { text: "Omkvæd" }];
    expect(stickyIndex(flat, 2)).toBe(0);
    expect(stickyIndex(flat, 3)).toBe(3);
  });
});
