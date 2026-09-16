# Ariel & Fred — Wedding Venues

Single-file web app (`wedding-venues.html`) with two views:

1. **Comparison** (`#compare`) — a wide table of venue candidates (6 built-in columns), a full wedding budget builder, turnkey definitions, palette, next steps.
2. **Notebook** (`#notebook`, `#notebook/<id>`) — per-venue notes, pros/cons, questions, details, photo uploads. "Add a place" creates a new venue that also appears as a dynamic column in the comparison.

## Context

- Wedding: ~80 adults + ~15 kids (max 102), early Sept 2029, Québec (Charlevoix / Île d'Orléans / Saguenay; Montebello is the outlier).
- Budget framework: $35K challenge · $40K target · $42K buffer · $45K ceiling · $50K+ danger.
- Philosophy: "Offer, don't obligate." Spend on food, photography, coordinator, childcare; save on stuff. DIY deadline = 30 days before.
- Palette: sage, ivory, soft gold, natural wood, burgundy, dark green, navy.
- Only Château Montebello has a published price list (2024 menu). Other numbers are placeholders until quotes arrive.

## How the file is built

- One HTML file, inline CSS + JS, Google Fonts (Fraunces + Instrument Sans). No build step.
- Two `<script>` blocks: first = budget builder (static), second = notebook + routing + comparison sync.
- Built-in venues in the table carry `data-key` on their `<th>` (`cap, montebello, germain, leste, manoir, bacchus`); table rows carry `data-row`. The notebook script uses these to sync status pills, hide removed columns, append new venues, and fill the "From the notebook" row.
- Persistence uses claude.ai artifact runtime capabilities: `window.claude.use("db")` (JSON doc store, collection `venues`) and `window.claude.use("assets")` (photo uploads, referenced as `/_blob/<id>`).

## IMPORTANT — what works locally vs. published

- Opened from disk or any other host, `window.claude` does not exist → the notebook renders read-only and photos can't upload. **This is expected.** The comparison view and budget builder work fully offline.
- The live, shared version is the published claude.ai artifact: https://claude.ai/artifact/XFnhXBztYepE35FkgouQts
- To ship a change: edit locally → open the file in a browser to check layout → paste/upload the file back into a claude.ai chat and ask Claude to republish to that artifact URL (keep `capabilities: {db:{}, assets:{}}`).
- If the goal is a fully standalone app (own hosting, no claude.ai dependency), replace the `db`/`assets` layer with a backend (e.g. Supabase or Firebase: one `venues` table + storage bucket). The rest of the UI can stay as is.

## Conventions

- Keep it one file unless there's a strong reason to split.
- CSS uses `:root` tokens with dark-mode overrides — don't hardcode colours.
- Never invent venue prices; anything unconfirmed stays as an italic "quote needed" note.
- Avoid adding mandatory activities, rigid timelines, or décor-heavy features — see philosophy above.
