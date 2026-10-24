# RE site build brief (boss 2026-10-24) — for a Claude Code cloud session

Work ONLY on branch `re-site`. Never push to `main`; the boss reviews the Cloudflare preview first.
Reference drafts: `docs/re_site/drafts/` (chooser draft, RE landing draft, decisions README).

## Boss requirements
1. **Entry flow.** A returning customer logs in directly. A new visitor picks one of two exams:
   - **EA** goes to the current EA landing (`/index.html`), unchanged.
   - **RE** goes to the new Real Estate landing.
2. **RE landing.** It uses the SAME structure as the current EA `index.html`: same menu, sections, components and fonts (Poppins 700 headings, Inter body, Pretendard for Korean). It uses the RE palette agreed earlier, below.
3. **SEO / AEO (overriding rule).** Do NOT disturb the EA SEO/AEO. RE gets its own, separate SEO/AEO.
   - ⛔ Do NOT move EA off `/`. The root URL, its `<title>`, canonical (`https://pracexam.com/`), JSON-LD and meta stay byte-identical except for one small «EA / Real Estate» exam switch link in the header.
     The 10-19 draft idea «EA moves to /ea» is CANCELLED for this reason.
   - ⛔ No interstitial or full-page chooser that hides EA content from crawlers on `/`.
   - ✅ The chooser lives at **`/start`**, with `noindex`. Root CTAs for new visitors ("Get started") link to `/start`.
     `/start` shows: a login form for existing customers (reuse the current Supabase login code), plus two doors, EA → `/` and Real Estate → `/re/`.
   - ✅ RE landing at **`/re/`** (`re/index.html`):
     - its own `<title>`, meta description, canonical `https://pracexam.com/re/`, and Open Graph tags
     - JSON-LD: `Course` / `FAQPage` for real-estate license exam prep (CA, NY, TX, NJ + national)
     - hreflang only if a KO page exists
   - ✅ `sitemap.xml`: ADD `/re/` entries. Do not change the EA entries.
   - ✅ `llms.txt`: ADD a separate «Real Estate» section. Leave the EA text as is.
   - ✅ `robots.txt`: no change, except allowing `/re/` if needed.
4. **RE app link.** The RE landing CTAs point to `/re/app` (`re/app.html`). For now that page may be a «coming soon» placeholder, like `app_comingsoon.html`. The RE question bank is not public yet (all RE rows inactive).

## RE palette (agreed; from drafts/pracexam_re_landing_draft.html)
```
--navy #10304C  --navy-mid #2F5F8F  --navy-light #DCE7F3
--accent #4F7CAC  --accent-tint #E8EFF7  --accent-border #A9C2DE
--page-bg #E3E9F0  --text-main #16283A  --text-mid #3E4C5A  --text-muted #4E5C66
--terracotta #DD8F75 (+ tint/border/deep as EA)  --muted-gold #C6A15B
```
(EA uses teal/slate: accent #6FA39E, navy #354649. Do not change EA.)

## Content decisions already made (drafts README)
- Price $29, same as EA. Count message «5,000+».
- Photos: the Gemini AI images in the RE draft.
- Korean exam names: «미국 세무사 Enrolled Agent (EA)» / «미국 부동산 중개사 Real Estate Agent».
- English pages make no "English and Korean explanations" claim. The EN·KO chip shows only in Korean.

## Site rules (from CLAUDE.md)
- Screen titles use `.section-title`. Don't invent new heading sizes.
- The login gate is English-only.
- Static HTML/CSS/JS, deployed by Cloudflare Pages from GitHub. Check `/re` and `/start` work without `.html`, matching the existing `_redirects` style.
- No new external script hosts beyond those already used by `index.html`.

## Deliverables
1. `start.html` (chooser + login)
2. `re/index.html` (RE landing)
3. `re/app.html` (placeholder)
4. Header exam-switch link added to `index.html`. This is the ONLY EA change.
5. `sitemap.xml` + `llms.txt` additions
6. A short `docs/re_site/CHANGES.md` listing every file touched, and confirming the EA root `<head>` is unchanged apart from nothing (diff it).
Commit on `re-site` and push. Do not merge.
