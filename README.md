# CLEAR
### A citizen check-in for the Bureau of Civic Responsibility

> *"A true patriot does not delay. A true patriot does not make excuses. A true patriot completes their task list."*
> — Director R. Harlan Briggs, Productivity Division

---

## Setup

```bash
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

To build for production:
```bash
npm run build
npm run preview
```

## Tech Stack

- **element-vir** — typed, reactive web components
- **vira** — design system (electrovir's packages)
- **TypeScript** — strict mode throughout
- **Vite** + **vite-plugin-pwa** — dev server and PWA bundling

## Characters

**Director R. Harlan Briggs** — Productivity Commissioner of the Bureau of Civic Responsibility. A career government man who views every snoozed task as a red flag in your permanent record. He speaks in red-bordered official notices and appears when things get bad.

**Agent Henry "Hal" Whitaker** — Your assigned productivity coach. He's seen enough to know life is complicated, but he believes in you and wants to see you succeed — both because he cares, and because Briggs reviews his numbers too.

## Snooze Severity System

| Snoozes | Severity | Visual |
|---------|----------|--------|
| 0 | None | Normal |
| 1 | Warning | Yellow badge |
| 2–3 | Caution | Orange badge, "Noted" |
| 4–5 | Danger | Red badge, "FLAGGED" — Agent Whitaker escalates |
| 6+ | Critical | "UNDER REVIEW" stamp — Director Briggs takes over |

## Data

All data is stored in `localStorage` under the key `bureau_v1`. No backend. No accounts. Your file stays on your machine.

## Install as PWA

After running `npm run build` and serving the `dist/` folder over HTTPS, you can install Clear as a PWA from your browser's address bar or share sheet.
