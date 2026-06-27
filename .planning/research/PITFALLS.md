# Pitfalls Research

**Domain:** Local-first, BYO-key Midjourney prompt-builder (web + desktop, single codebase)
**Researched:** 2026-06-26
**Confidence:** HIGH (provider CORS behavior, storage eviction, and MJ parameter model verified against official docs and primary sources; MEDIUM on exact MJ version-compatibility matrix, which shifts frequently)

This product has an unusual risk profile: there is **no backend**, so every classic "secure it server-side" answer is off the table by design. The hard problems cluster around (1) calling LLM providers directly from a browser, (2) keeping a key on a user's device without leaking it, (3) tracking a moving Midjourney parameter spec, and (4) durable local persistence with no sync safety net. The pitfalls below are ordered by how much damage they cause if missed.

## Critical Pitfalls

### Pitfall 1: Assuming all LLM providers allow direct browser calls (CORS reality)

**What goes wrong:**
The "BYO-key, client-side calls, no proxy" decision quietly assumes every provider will answer a `fetch()` from a browser origin. They don't, and they don't behave the same way:
- **Anthropic** blocks browser calls unless you send the `anthropic-dangerous-direct-browser-access: true` header — without it you get an authentication/CORS error.
- **OpenAI**'s official SDK refuses to run in a browser unless you pass `dangerouslyAllowBrowser: true`, and direct calls to `api.openai.com` from a page origin frequently fail CORS preflight; behavior has changed over time and is not contractually guaranteed.
- **Google Gemini** has its own CORS quirks (especially via the OpenAI-compat shim).
- Many smaller/self-hosted providers (and corporate proxies) simply do not send `Access-Control-Allow-Origin` at all.

A web build that hardcodes one provider's call shape will work for that provider and silently break for the next one the user brings.

**Why it happens:**
Developers test against whichever provider they personally use, see it work, and generalize. CORS is a server-controlled policy the app cannot fix from the client — there is no code change that makes a non-CORS provider work in a pure web build.

**How to avoid:**
- Build a **provider adapter layer** from day one: each provider declares its base URL, auth header shape, required extra headers (e.g. Anthropic's browser header), and request/response mapping. Do not bake one provider's quirks into shared code.
- Treat "does this provider support browser-origin calls?" as **per-provider metadata**, surfaced in the UI ("This provider may not work in the web app — use the desktop app").
- Lean on the **desktop build as the CORS escape hatch**: in Tauri/Electron, make the HTTP request from the native/Rust/main process (or Tauri's `http` plugin), which is not subject to browser CORS. This is a real architectural advantage — the desktop app can support providers the web app cannot.
- Probe and report errors honestly: distinguish "CORS blocked" (provider/transport problem) from "401" (bad key) from "429" (rate limit) so users aren't told "invalid key" when the real issue is CORS.

**Warning signs:**
Code that calls `https://api.<provider>.com` directly with a single hardcoded header set; a single `callLLM()` function with provider-specific `if` branches; "works in Electron, fails in browser" bug reports; CORS errors surfaced to users as generic failures.

**Phase to address:**
LLM integration phase — the provider adapter is foundational, not a later refactor.

---

### Pitfall 2: API key leakage and theft from local storage / client requests

**What goes wrong:**
The key lives on the user's device and travels in client-side requests. Specific leak vectors:
- **`localStorage` is readable by any script on the origin** — a single malicious or compromised dependency (supply-chain attack) can exfiltrate the key. There is no "obfuscation" that protects it; anyone can read it via DevTools or injected script.
- The key ends up in **error logs, crash reporters, or analytics** if request objects are logged naively.
- In the desktop build, the key may be written to disk in **plaintext config** (e.g. a JSON file in app-data) that other local processes or backups can read.
- A misconfigured provider request leaks the key into a **referrer or third-party request** (e.g. if the user pastes a custom base URL pointing somewhere hostile).

Note: "key stolen and someone runs up *the user's* bill" is the blast radius here — there is no first-party server, so the project's liability is reputational, but the user's financial exposure is real.

**Why it happens:**
"It's the user's own key, stored locally" gets mentally filed as "not a security concern." But local-only does not mean safe — XSS, supply-chain, and plaintext-at-rest all still apply.

**How to avoid:**
- **Minimize dependency surface** and pin/audit dependencies; a strict Content-Security-Policy (no inline scripts, locked-down connect-src to known provider hosts) dramatically reduces XSS/exfiltration risk. CSP is one of the few real protections for a client-held key.
- **Never log request objects or headers**; scrub the key from any error/telemetry path. Add a test that asserts the key string never appears in logged output.
- In the desktop build, store the key in the **OS keychain/credential store** (Tauri Stronghold plugin / OS keyring), not a plaintext JSON file. In the web build, be explicit with users that the key sits in browser storage and to use the desktop app for stronger protection.
- **Validate/whitelist the provider base URL** the user can enter. Don't let an arbitrary URL receive the key. Warn on custom endpoints.
- Set a **restrictive `connect-src`** so the key can only be sent to approved provider origins.
- Surface guidance: recommend users create a **scoped/limited key with a spend cap** at the provider for use in this tool.

**Warning signs:**
Key stored via plain `localStorage.setItem('apiKey', ...)` with no CSP; request/response objects passed to a logger; desktop config file containing the key in cleartext; a free-text "base URL" field with no validation.

**Phase to address:**
Key-management phase (storage + entry UI) and the LLM integration phase (CSP, request scrubbing). Desktop keychain integration in the desktop-packaging phase.

---

### Pitfall 3: Calling the LLM on every keystroke — cost, latency, and rate-limit blowups

**What goes wrong:**
The core UX ("type intent → palettes populate") tempts a live-update implementation that fires an LLM request on each keystroke or on every minor change. Consequences:
- **Cost explosion** on the user's own key — they pay per token, and a 20-character intent could trigger 20 completions.
- **429 rate limits** from the provider, which then cascade into a broken-feeling UI.
- **Race conditions / stale results**: response for "cat" arrives after response for "cathedral," palettes flicker or show wrong suggestions.
- **Latency stacking**: each call is 1–5s; without cancellation the UI feels frozen and queues stale work.

**Why it happens:**
Reactive frameworks make "call on change" trivial, and it demos well with a fast provider and a short prompt. The cost is invisible to the developer (who isn't paying the user's bill) until a user complains.

**How to avoid:**
- **Explicit trigger, not live**: populate palettes on a deliberate action ("Suggest" button / Enter), or at minimum a generous **debounce** (e.g. 600–1000ms) plus a minimum input length. Given the user is paying per call, an explicit button is the safer default.
- **Cancel in-flight requests** (AbortController) when input changes; always apply only the response matching the latest request (request-id guard) to kill races.
- **Cache** suggestions keyed by normalized intent so re-running the same intent is free.
- Show **token/cost estimate or a request counter** so users understand each "Suggest" costs money.
- Respect **429 + Retry-After** with backoff; never hot-loop retries.

**Warning signs:**
An `onChange` handler that calls the LLM; no AbortController; palette flicker while typing; provider 429s in testing; no debounce/min-length guard.

**Phase to address:**
LLM integration / palette-population phase.

---

### Pitfall 4: Midjourney flag drift — hardcoding a spec that changes every version

**What goes wrong:**
Midjourney's parameter set is a moving target. Within recent versions: `--stylize` range, `--chaos`, `--weird`, `--no`, `--ar`, `--tile`, `--raw`, `--hd`, and version-specific ones like `--oref`/`--ow` (Omni Reference, V7-only) and `--cref`/`--sref` (which changed across versions). Some parameters are **valid only on specific model versions**, and multi-prompts / image-weight syntax is not uniformly supported across versions. If flags and their valid ranges/version-compatibility are hardcoded into UI logic, the app emits **invalid or silently-ignored prompts** the moment Midjourney ships a new version, and the team is forced into code changes for what is really data.

**Why it happens:**
It's faster to write `<select>` options inline and clamp ranges with literals. The PROJECT.md explicitly flags this risk ("data-driven, not hardcoded") — but it's easy to honor in the schema and violate in component code.

**How to avoid:**
- Define flags as **data** (a versioned schema/JSON): for each flag — name, value type, min/max/enum, default, which model versions it applies to, and mutual-exclusion rules. UI renders from this; assembly reads from this.
- **Key the active flag set to the selected MJ version** (`--v` / `--niji`). When the user picks a version, only valid flags/ranges for that version are offered.
- Make the schema **updatable without a code release** where feasible (bundled JSON the app can refresh), so flag drift is a data update.
- Add a **"verified against MJ version X (date)"** marker in the UI so users know the spec's freshness, and a place to report drift.
- Don't silently drop unknown flags on load of an old saved prompt — preserve them (see Pitfall 8).

**Warning signs:**
Flag options or numeric ranges written as literals in components; no version field on flag definitions; ranges that don't change when the model version changes; "we shipped MJ updated and now prompts are wrong" requiring a code edit.

**Phase to address:**
Flag-model / schema phase (must precede the flag UI phase).

---

### Pitfall 5: Prompt-assembly correctness — ordering, multi-prompt weights, escaping

**What goes wrong:**
The final string is the product's entire output, and it's easy to get subtly wrong:
- **Parameter placement**: Midjourney expects `--` flags at the **end** of the prompt, after the description. Interleaving them or putting text after flags breaks parsing.
- **Multi-prompt weights**: the `::` separator with numeric weights (e.g. `hot dog::2 food::-1`) has precise spacing/format rules; a stray space or wrong sign produces a different image or an error. Negative weights and the `--no` shortcut overlap conceptually and can conflict.
- **Whitespace/duplication**: assembling from palettes easily yields double spaces, trailing commas, duplicate descriptors, or a flag specified twice (last-wins or error depending on flag).
- **Special characters**: commas, colons, and `::` inside user free-text or suggestion strings can be misread as multi-prompt syntax or parameter boundaries. URLs (image prompts / `--oref`) must lead and be well-formed.
- **Conflicting flags**: e.g. `--tile` with certain aspect ratios, `--niji` flags mixed with `--v` flags, or a value out of the version's valid range.

**Why it happens:**
Assembly looks like trivial string concatenation, so it gets no tests. The failure modes are invisible until a user pastes the prompt into Midjourney and gets garbage or an error — far from the app where they can't debug it.

**How to avoid:**
- Implement assembly as a **deterministic, ordered serializer**, not ad-hoc concatenation: description block → image/oref refs → multi-prompt weights → parameters (sorted to a canonical order) — with a single normalization pass (collapse whitespace, dedupe flags, strip trailing separators).
- **Unit-test the assembler** against a table of known-good expected strings, including multi-prompt weights, negative weights, `--no`, and edge characters. This is the single highest-ROI test suite in the project.
- **Validate before output**: detect conflicting/duplicate flags and out-of-range values, and warn the user inline rather than emitting a broken string.
- **Escape/guard special characters** in user text and suggestions: decide policy for stray `::` and colons in free text; ensure suggestion strings from the LLM can't inject parameter syntax (see Pitfall 6).
- Show a **live preview** of the exact string that will be copied so the user sees problems before pasting into MJ.

**Warning signs:**
Assembly is a chain of `+ ' ' +`; no test file for the serializer; double spaces or trailing `--` visible in the preview; flags appearing before description text; `::` in a suggestion rendering oddly.

**Phase to address:**
Prompt-assembly phase — and its test suite is a release gate.

---

### Pitfall 6: Trusting LLM output structure — hallucinated / malformed suggestions injected into the prompt

**What goes wrong:**
The LLM populates palettes, and its output is assumed to be clean categorized lists. In reality:
- It returns **malformed JSON**, markdown-fenced JSON, prose preamble, or extra/missing categories.
- It **hallucinates Midjourney parameters that don't exist** (e.g. invents `--quality 5` or a fake flag), which then flow into the assembled prompt and break it.
- It emits suggestion strings containing `::`, `--`, or colons that **collide with MJ syntax** (a prompt-injection-by-accident into the final string).
- It returns duplicates, empty strings, or absurdly long entries that wreck the palette UI.

**Why it happens:**
Happy-path testing with a strong model that returns clean JSON. Smaller/cheaper models (which BYO-key users will use to save money) are far less reliable, and there's no server to sanitize.

**How to avoid:**
- **Validate every response against a strict schema** (e.g. Zod/JSON-schema); reject and re-request or degrade gracefully on failure. Never feed raw model text into palettes.
- Use **structured-output / JSON mode** where the provider supports it — but still validate, since support varies across BYO providers.
- **Sanitize suggestion strings**: strip/escape `::`, leading `--`, and stray colons so a suggestion can never inject parameter syntax into the assembled prompt.
- **Cross-check any suggested flags against the flag schema** (Pitfall 4); discard invented parameters rather than trusting the model.
- Defensive UI: cap string length, dedupe, handle empty categories without crashing.

**Warning signs:**
`JSON.parse(response)` with no try/catch or schema validation; palettes occasionally empty or showing `\`\`\`json`; a suggestion containing `--` ending up in the final prompt; only ever tested with one strong model.

**Phase to address:**
LLM integration phase (parsing + validation), with sanitization tied into the assembly phase.

---

### Pitfall 7: Web/desktop divergence from one codebase (storage, fs, CORS, clipboard)

**What goes wrong:**
"Single codebase" hides platform-specific APIs that behave differently or don't exist on one side:
- **Persistence**: web uses IndexedDB/localStorage; desktop can use the real filesystem. If the data layer calls browser storage directly, the desktop app gets browser-storage limits and eviction for no reason; if it calls `fs`, the web build won't build.
- **CORS** (Pitfall 1): native HTTP in desktop bypasses CORS; browser doesn't — same provider, different results.
- **Clipboard**: `navigator.clipboard` requires a secure context and user gesture, and can behave differently in a desktop webview vs a browser tab.
- **File import/export** (library backup): file pickers and write access differ entirely (browser download/File System Access API vs native dialogs).
- Tauri (system webview, different engines across OSes) vs Electron (bundled Chromium) means **web-platform feature support varies by OS** in Tauri specifically.

**Why it happens:**
Developers build and test in one target (usually `npm run dev` in a browser) and assume the desktop wrapper is a thin shell. The divergences surface only when packaging the desktop app late.

**How to avoid:**
- Define a **platform-abstraction interface** for storage, HTTP, clipboard, and file I/O. Provide a web implementation and a desktop implementation behind the same interface; app code never touches platform APIs directly.
- **Test both targets in CI / regularly from the start**, not just before release. "It works in the browser" is half the matrix.
- If using **Tauri, test on the actual target OS webviews** (WebKit on macOS/Linux, WebView2 on Windows) — don't assume Chromium semantics.
- Decide the **HTTP transport per platform** deliberately (browser fetch vs native HTTP plugin) and route provider calls through the abstraction so CORS-limited providers automatically use the native path on desktop.

**Warning signs:**
Direct `localStorage`/`fs`/`navigator.clipboard` calls scattered through feature code; desktop app only built right before release; "works on web, blank on desktop" bugs; assuming Chromium APIs under Tauri.

**Phase to address:**
Foundational architecture phase (platform abstraction) — before features pile up on top of platform-specific calls.

---

### Pitfall 8: Local persistence loss — eviction, no backup, lossy schema migrations

**What goes wrong:**
The saved library is the user's accumulated value, and it's stored locally with no sync. Loss vectors:
- **Browser eviction**: non-persisted origins get cleared under storage pressure (least-recently-used origin wiped entirely — both IndexedDB and Cache). **Safari/WebKit (ITP)** can clear script-writable storage after ~7 days of no interaction. A user who returns after two weeks may find their library gone.
- **`localStorage` 5–10 MiB cap**: a growing library of prompts plus cached suggestions can hit the limit and start throwing `QuotaExceededError`, silently failing saves.
- **No export/backup**: with no server, a cleared browser or reinstalled desktop app means total, unrecoverable loss.
- **Schema migration**: changing the saved-prompt shape (very likely as flags evolve, Pitfall 4) can corrupt or drop old saved prompts on load — including dropping flags the new version doesn't recognize.

**Why it happens:**
Local storage feels permanent during development (it never gets evicted on a dev machine with free disk and daily use). The "no backend, no liability" decision removes the safety net without replacing it.

**How to avoid:**
- Use **IndexedDB (not localStorage) for the library** — far larger quota and structured — and reserve localStorage for tiny settings.
- Call **`navigator.storage.persist()`** on the web build to opt out of best-effort eviction (request it after a meaningful user action so it's more likely granted), and check `navigator.storage.estimate()` to warn before hitting quota.
- Ship **export / import (JSON file)** early as the real backup mechanism — this is the only true durability story in a no-backend design, and it doubles as web↔desktop migration.
- **Version the saved-data schema** and write forward-compatible migrations; **preserve unknown fields/flags** rather than dropping them, so an old prompt survives a flag-schema change.
- On desktop, persist the library to a **real file** in app-data (outside webview storage) so it isn't subject to webview eviction at all.

**Warning signs:**
Library stored in `localStorage`; no export feature; no `persist()` call; no schema version field on saved records; `QuotaExceededError` in testing; Safari users reporting "my prompts disappeared."

**Phase to address:**
Persistence phase (storage choice + persist + export/import) — export/import should not be deferred past MVP given it is the only backup.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode one LLM provider's call shape | Ship suggestions fast | Rewrite when adding providers; CORS surprises; violates "provider-flexible" requirement | Throwaway spike only — never in mainline |
| Inline flag options/ranges in UI components | Build flag UI quickly | Code change required on every MJ version; invalid prompts on drift | Never — PROJECT.md mandates data-driven |
| String-concat the final prompt | Trivial to write | Ordering/escaping/weight bugs reach the user invisibly | Never without a serializer + tests |
| Store library in localStorage | One-line API | Quota cap, eviction, no structure, data loss | Only for tiny settings, never the library |
| Call LLM on every change | Snappy live demo | User cost blowup + rate limits + races | Never with a per-call paid key; debounce/button instead |
| Plaintext key in a config file (desktop) | Easy to read back | Key theft from disk/backups | Web build only as documented tradeoff; desktop should use keychain |
| Skip schema validation on LLM output | Less code | Crashes/broken prompts with weaker BYO models | Never — validate always |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Anthropic API (browser) | Omitting `anthropic-dangerous-direct-browser-access: true` → auth/CORS error mistaken for bad key | Send the header in the web build; distinguish CORS from 401 in error handling |
| OpenAI API (browser) | Assuming direct browser calls always work; not handling `dangerouslyAllowBrowser`/CORS preflight failures | Route through native HTTP on desktop; treat web support as not guaranteed per provider |
| Generic / custom-base-URL provider | Letting users point the key at any URL with no validation | Whitelist/validate base URLs; restrict CSP `connect-src`; warn on custom endpoints |
| Provider rate limits | Hot-looping retries on 429 | Honor `Retry-After`, exponential backoff, surface "slow down" to user |
| Midjourney (output target) | Assuming a parameter is valid on all versions (e.g. `--oref` is V7-only; multi-prompt support varies) | Gate flags by selected model version from the data schema |
| Clipboard API | Calling outside a user gesture / non-secure context | Copy only on explicit user action; verify behavior in desktop webview |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| LLM call per keystroke | UI lag, flicker, provider 429s, surprise bill | Explicit "Suggest" trigger or strong debounce + cancellation | Almost immediately under real typing |
| No request cancellation | Stale palettes overwrite fresh ones | AbortController + latest-request guard | As soon as a user edits intent mid-request |
| Library in localStorage | Saves silently fail; app sluggish on load | IndexedDB; lazy load; paginate library UI | Low hundreds of saved prompts / a few MB |
| Re-requesting identical intents | Repeated cost/latency | Cache suggestions by normalized intent | Any repeated workflow |
| Rendering huge palettes | Janky scroll, slow paint | Cap suggestion counts; virtualize long lists | When a model returns oversized lists |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Key in `localStorage` with no CSP | XSS/supply-chain script reads and exfiltrates key | Strict CSP (no inline, locked `connect-src`); minimize/audit deps |
| Logging request/headers | Key leaks into logs/telemetry/crash reports | Scrub key from all logging; test that key never appears in output |
| Plaintext key file on desktop | Theft from disk, backups, other local processes | OS keychain / Tauri Stronghold keyring |
| Unvalidated custom provider URL | Key sent to attacker-controlled endpoint | Validate/whitelist base URL; CSP connect-src allowlist |
| Treating "local-only" as "safe" | False sense of security; user bills run up if key stolen | Recommend scoped keys with spend caps; document the browser-storage tradeoff |
| LLM suggestion injecting MJ syntax | `::`/`--` in suggestions corrupt the final prompt | Sanitize suggestion strings before they enter assembly |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No cost visibility for suggestions | User shocked by provider bill | Show per-"Suggest" cost/token estimate or request counter |
| CORS/401/429 shown as generic "error" | User can't tell bad key from blocked provider from rate limit | Specific, actionable error messages per failure type |
| Silent save failure (quota/eviction) | User loses prompts without knowing | Surface quota warnings; confirm saves; offer export |
| No preview of the exact copied string | User pastes a broken prompt into MJ, can't debug | Live preview of the final string before copy |
| Offering flags invalid for the chosen version | Prompt breaks in Midjourney | Gate available flags by selected `--v`/`--niji` |
| No "your data lives in this browser" disclosure | User assumes cloud sync, loses library | Explain local-only storage; prompt to export backups |

## "Looks Done But Isn't" Checklist

- [ ] **Suggestions:** Works with a strong model — verify malformed/markdown/hallucinated-flag output from a weak BYO model is handled (schema validation + reject path).
- [ ] **Provider support:** OpenAI works — verify Anthropic (browser header) and at least one custom/base-URL provider, in both web and desktop builds.
- [ ] **Prompt assembly:** Looks right for a simple prompt — verify multi-prompt `::` weights, negative weights, `--no`, duplicate flags, and `::`/colons in free text via unit tests.
- [ ] **Flags:** UI shows flags — verify ranges/availability change when the model version changes, and the set is data-driven (no literals in components).
- [ ] **Persistence:** Saves on dev machine — verify behavior under Safari 7-day eviction, quota exceeded, and that `persist()` is requested; confirm export/import round-trips.
- [ ] **Desktop parity:** Web build works — verify the packaged desktop app for storage, clipboard, file I/O, and native HTTP on the actual target OS webview.
- [ ] **Key safety:** Key saved/loaded — verify it never appears in logs, CSP restricts connect-src, and (desktop) it's in the keychain not plaintext.
- [ ] **Migration:** New schema loads new prompts — verify old saved prompts (and unknown flags) survive a schema change without data loss.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Hardcoded provider, need more | MEDIUM | Extract adapter interface; migrate existing call behind it; add provider metadata |
| Hardcoded flags, MJ drifted | MEDIUM–HIGH | Move flags to data schema; version it; re-render UI from data; backfill version gating |
| Key leaked via logs/deps | HIGH (user trust) | Add CSP + log scrubbing; advise affected users to rotate keys; move desktop key to keychain |
| Library lost to eviction | HIGH (often unrecoverable) | Ship export/import + `persist()`; for future, IndexedDB + desktop file storage; little recourse for already-lost data |
| Broken assembled prompts shipped | LOW–MEDIUM | Add serializer + golden-string tests; add pre-copy validation/preview |
| LLM-call cost blowup reported | LOW | Add debounce/explicit trigger + cancellation + caching; expose cost meter |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Provider CORS variance (1) | LLM integration (provider adapter) | Anthropic + OpenAI + custom provider work in both builds |
| Key leakage (2) | Key management + LLM integration; desktop packaging | CSP active; key absent from logs; desktop key in keychain |
| Call-per-keystroke cost (3) | Palette-population phase | No call without explicit trigger/debounce; AbortController present; 429 handled |
| Flag drift (4) | Flag-schema phase (before flag UI) | Flags are data; ranges/availability change with version |
| Assembly correctness (5) | Prompt-assembly phase | Golden-string unit tests pass incl. weights/escaping; live preview |
| Hallucinated suggestions (6) | LLM integration (parse/validate) | Schema validation rejects bad output; suggestions sanitized |
| Web/desktop divergence (7) | Foundational architecture (platform abstraction) | Both targets pass storage/clipboard/HTTP tests in CI |
| Persistence loss (8) | Persistence phase | IndexedDB + `persist()` + export/import; schema migration preserves data |

## Sources

- Anthropic CORS / `anthropic-dangerous-direct-browser-access` header — Simon Willison (primary, 2024-08-23): https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/ ; community confirmation: https://github.com/ChatGPTNextWeb/NextChat/issues/5429 (HIGH)
- OpenAI `dangerouslyAllowBrowser` / key-in-frontend risk: https://backmesh.com/blog/openai-api-mistakes/ ; https://salting.io/protect-openai-api-key ; OpenAI community CORS report: https://community.openai.com/t/chat-completions-api-endpoint-down-blocked-any-web-browser-request/1362527 (MEDIUM)
- Browser storage quotas, eviction, `navigator.storage.persist()` — MDN: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria ; web.dev persistent storage: https://web.dev/articles/persistent-storage ; Chrome Storage Buckets: https://developer.chrome.com/docs/web-platform/storage-buckets (HIGH)
- Midjourney parameter list & version compatibility — official docs: https://docs.midjourney.com/hc/en-us/articles/32859204029709-Parameter-List ; version notes: https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version ; reference (`--oref`/`--ow` V7-only, multi-prompt compat): https://blakecrosley.com/guides/midjourney (HIGH on existence of drift; MEDIUM on exact current matrix)
- IndexedDB max storage / localStorage limits — RxDB: https://rxdb.info/articles/indexeddb-max-storage-limit.html (MEDIUM)

---
*Pitfalls research for: local-first BYO-key Midjourney prompt-builder (web + desktop)*
*Researched: 2026-06-26*
