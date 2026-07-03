# Product

## Register

product

## Users

Midjourney image creators, hobbyist to pro, who can picture what they want but can't recall Midjourney's sprawling vocabulary and flag syntax. They work in bursts of creative iteration: type a vague idea, get suggestions, assemble, copy into Midjourney, repeat. They value speed and staying in creative flow over learning parameter minutiae. They run this locally (web or desktop), bring their own LLM key, and keep a private library of past prompts. The job: go from a fuzzy idea to a complete, correctly-formatted, copyable prompt faster than writing it by hand.

## Product Purpose

A local-first Midjourney prompt builder. The user describes intent in plain language; an LLM populates categorized palettes (style/medium, lighting, camera & lens, composition, color, mood); the user clicks options to assemble a final prompt, including version-gated technical flags. Success is the moment a vague idea becomes a copyable prompt the user is proud of — with the AI suggesting and the user always in control of the final composition. Ships as one codebase to web and native desktop; everything stays on the user's machine.

## Brand Personality

Playful and creative — this is a tool for image-makers, and it should feel like it was made by one. Three words: **expressive, encouraging, effortless**. The voice is a creative partner brainstorming alongside you, not a form to fill out. Color and personality are welcome; the interface should feel alive and a little joyful without ever getting in the way of the work. Emotional goal: turn the intimidation of Midjourney's syntax into creative confidence.

## Anti-references

- **Stock shadcn scaffold** — the default grayscale zinc palette with zero identity. The current build is exactly this; it must not stay this way. This tool needs a face of its own.
- **Generic AI SaaS** — purple-gradient hero, big-number metric cards, identical icon+heading card grids, tracked-uppercase eyebrows on every section, gradient text. The reflexive "AI product" look.
- **Cluttered power-tool** — density with no breathing room, every control shouting at once. This is a dense app, but it must stay calm and navigable; the prompt being built is the hero, controls recede around it.

## Design Principles

- **The prompt is the hero.** The assembling prompt string is the center of gravity and the primary feedback loop. Controls exist to feed it and should recede; the live preview should feel rewarding to watch grow.
- **AI suggests, the user composes.** Never auto-write the final prompt. Every AI-surfaced option is an invitation to click, not a decision made for the user. The UI must always keep the user feeling in control.
- **Creative confidence over syntax mastery.** Lower the barrier of Midjourney's vocabulary and flags. The user should never need to memorize `--ar` or `::` — the interface teaches by doing.
- **Colorful with intent, not SaaS-by-reflex.** Earn a distinct, expressive identity. Color is used deliberately (to organize palettes, to celebrate the built prompt), never as a gradient-hero decoration.
- **Calm density.** It's a tool with many controls, but breathing room, grouping, and progressive disclosure keep it from overwhelming. Dense where the expert wants it, quiet everywhere else.
- **Private by design, visibly.** Local-only, bring-your-own-key, no server. The UX should make that trust plain rather than hiding it.

## Accessibility & Inclusion

Baseline for v1 (pragmatic, not formal conformance): body text meets ~4.5:1 contrast, full keyboard navigation, visible focus states, and `prefers-reduced-motion` honored on every animation. Works in both light and dark. Not a v1 commitment: formal WCAG audit, color-blind-safe palette-category cues (revisit if palette color-coding becomes load-bearing).
