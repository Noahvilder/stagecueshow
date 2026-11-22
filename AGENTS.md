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
- Monitor profiles and per-profile cue notes live in show JSON and travel in PeerJS state snapshots; viewer connections cannot send transport or other editing commands, only `setMonitorNote`.
- Desktop .exe uses Tauri v2 in `src-tauri/`, built on GitHub Actions (`.github/workflows/release.yml`) since the sandbox is Linux; v1 window loads the published site, so it needs internet until a static offline bundle exists.
- Windows app bundles an offline SPA build (STAGECUE_DESKTOP=1 → dist/client/index.html); inside it isOffline() skips login and stores shows in localStorage, so the .exe never needs internet.
- Windows auto-update uses tauri-plugin-updater via custom Rust commands (update_check/update_install) so no capabilities file is needed; release.yml signs with the TAURI_SIGNING_PRIVATE_KEY secret and publishes latest.json to GitHub Releases.
