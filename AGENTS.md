<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Shows are stored per user in the `shows` table (JSON in `data`); audio blobs stay in the PC's IndexedDB and reach phones over the PeerJS channel — keeps large files off the cloud.
- The PC host writes its current remote code to `shows.remote_code` so mobile mode can auto-connect without typing the code.
- Monitor profiles and per-profile cue notes live in show JSON and travel in read-only PeerJS snapshots; viewer connections cannot send transport or editing commands.
