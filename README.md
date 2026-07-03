# Midjourney Prompt Helper

Go from a vague idea to a complete, correctly-formatted, copyable Midjourney prompt — faster than writing it by hand.

Describe what you want in plain language. An LLM populates categorized palettes of relevant options; you click to assemble the final prompt, including version-gated Midjourney technical flags. Runs as a web app **and** a native desktop app from one codebase, stores everything locally, and keeps a private library of past prompts.

**AI suggests, you compose.** Every AI-surfaced option is an invitation to click, never a decision made for you. The manual builder works fully without a key — the AI just lowers the vocabulary barrier.

## Features

- **Live prompt builder** — canonical model + deterministic serializer + live preview. The assembling prompt is the hero; watch it grow as you click.
- **AI palettes** — enter intent, trigger suggestion, get six categorized palettes (style/medium, lighting, camera & lens, composition, color, mood) behind a provider adapter with schema validation.
- **Midjourney flags** — `--ar` / `--v` / `--niji` / `--stylize` / `--chaos` / `--no` / `--seed` via version-gated, data-driven controls rendered into valid syntax. Never memorize the syntax.
- **Local library** — save / list / reload full builder state / delete, plus JSON export/import backup.
- **Web + desktop** — one codebase ships an SPA and a native macOS `.app`/`.dmg` (Tauri wraps the same `dist/`).

## Privacy & security

Local-first by design. There is no backend and no first-party server.

- Your LLM API key is stored **locally only** and sent directly to your chosen provider — it never touches a first-party server (there is none).
- The prompt library lives in your browser/webview (IndexedDB); nothing syncs anywhere.
- All LLM output is treated as untrusted text; strict CSP on both targets.

Bring your own key ([OpenRouter](https://openrouter.ai) at v1; more providers planned).

## Tech stack

Vite + React 19 + TypeScript SPA · Zustand (builder/session state) · Dexie/IndexedDB behind a `StorageAdapter` seam · Zod schemas · Vercel AI SDK via a `PaletteAdapter` (OpenRouter) · Tailwind CSS v4 + shadcn/Base UI · Tauri 2 desktop wrapper.

## Getting started

```bash
npm install
npm run dev        # Vite dev server (web)
```

Open the printed localhost URL. Enter an image idea, add your LLM key in Settings to enable AI palettes (or build manually without one), then Copy the assembled prompt into Midjourney.

### Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Vite dev server (web) |
| `npm run build` | Type-check (`tsc -b`) + production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | Lint with oxlint |
| `npm run tauri` | Tauri CLI (desktop dev/build) |
| `npx vitest` | Run the test suite |

### Desktop build

```bash
npm run tauri dev     # native window, hot-reloads the SPA
npm run tauri build   # produce a native .app / .dmg
```

Requires the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) (Rust toolchain + platform webview deps). The web build needs none of it.

## Status

**v1.0 shipped** (2026-07-02) — all 31 v1 requirements validated across 5 phases. See `.planning/` for project state, roadmap, and retrospective; `PRODUCT.md` for the product brief and design principles.

Candidate v2 themes: reference manager (`--sref`/`--cref`/`--oref`), multi-prompt `::` weight editor, per-palette "suggest more", version-aware flag validation, importing an existing prompt string back into builder state, more LLM provider adapters (Anthropic/OpenAI/Gemini/local).
