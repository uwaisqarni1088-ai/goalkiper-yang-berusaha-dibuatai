# AGENTS.md

Notes for working on this repository in the Base44 sandbox.

## What this project is
A dependency-free static browser game: `index.html` + `app.js` + `style.css`.
No package manager, no `package.json`, no lockfile, no build step, no backend,
no database. `app.js` is an ES module that pulls Three.js 0.160.0 from jsDelivr
at runtime, so the browser needs outbound internet access (the CDN is fetched by
the client, not by the sandbox).

## How it runs here
`docker-compose.base44.yml` serves the repo with `python -m http.server` on host
port 3000, bind-mounting the repo at `/app`. Because the files are served from
the bind mount, an edit is live on the next page load — there is no dev server
to hot-reload it, so call `reload_preview` after changing `index.html`,
`style.css` or `app.js`.

```bash
docker compose -f docker-compose.base44.yml up -d
```

## Verifying it works
1. `curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:3000/` → `200`.
2. In the preview: one `<canvas>` with a live WebGL 2 context, no console errors,
   no failed requests.
3. Click **Start Match** → the menu hides and the message becomes
   "Pertandingan dimulai. Jaga gawangmu!"; the TIMER counts down and SCORE
   changes as shots resolve. Clicking "Lompat Kiri"/"Lompat Kanan" or pressing
   the arrow keys dives the keeper.
4. The 3D pitch is WebGL, so a screenshot can come back with the canvas blank —
   confirm the 3D scene through the DOM/WebGL checks above (canvas size, GL
   context, running timer) rather than pixels.

## Quirks
- `wrangler.toml` is vestigial: it points at a `worker.js` that does not exist in
  the repo and is unrelated to the preview. The README's `python -m http.server
  8000` steps serve the same files on a different port.
- The UI text is a mix of English and Indonesian (HUD labels in English, in-game
  messages in Indonesian) — keep that split when editing copy.

## Secrets
None. The app talks to no external service, so no environment variables or
credentials are required to run it.
