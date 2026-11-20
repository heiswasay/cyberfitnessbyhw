# Cyber Fitness by Hijab Wasif — website

Live online fitness: 16+ live Zoom classes a day, special programmes (postpartum, diastasis recti, senior citizens), consultations and fitness assessments.

## Structure

- `public/` — the built website that Vercel serves (one pre-rendered HTML file per page, plus `assets/`).
- `src/pages/*.dc.html` — page sources exported from the Cyber Fitness design canvas.
- `src/assets/` — images, logos and fonts.
- `tools/` — the build script and the small runtime that powers the interactive parts (schedule filters, pricing toggle, gallery filters, booking).

## Editing

1. Change a page in `src/pages/` (or the class schedule in `src/pages/Schedule.dc.html`).
2. Rebuild: `cd tools && npm install && npx playwright install chromium && npm run build`
3. Commit and push — Vercel redeploys automatically.

## Forms

The Contact, Sign up and Book forms open WhatsApp with the visitor's details filled in. The number is chosen from the visitor's country: UK/Europe → +44 7436 491467, UAE/KSA → +971 56 838 5499, everyone else → +92 339 0022620. Change these in `tools/site.js`.
