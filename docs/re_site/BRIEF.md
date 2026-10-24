# RE site build brief (boss 2026-10-24) — for a Claude Code cloud session

Work ONLY on branch `re-site`. Never push to `main`; the boss reviews the Cloudflare preview first.
Reference drafts: `docs/re_site/drafts/` (chooser draft, RE landing draft, decisions README).

## Boss requirements (updated 2026-10-24: NEUTRAL ROOT)
Boss: «부동산이 시장이 더 큽니다» · «중립으로 양쪽을 다 커버 해야 합니다» · «지금 부터 라도 검색엔진을 업데이트 하여야 합니다».
⟹ The root becomes a NEUTRAL hub for both exams. EA moves to `/ea/`. RE lives at `/re/`. Search engines get updated now.

1. **`/` (root): neutral brand hub, indexable.**
   - Title along the lines of «PracExam | EA & Real Estate License Exam Practice Questions». The meta description names both exams.
   - Canonical `https://pracexam.com/`. JSON-LD: `Organization` + `WebSite`, plus an `ItemList` of the two courses linking `/ea/` and `/re/`.
   - Above the fold: a login for returning customers (reuse the current Supabase login code; the login gate is English-only) and two equal doors, **EA → `/ea/`** and **Real Estate → `/re/`**.
   - Below: short crawlable sections for each exam, with real text that links to each landing. ⛔ No JS-only content.
2. **`/ea/`: the current EA landing, moved.**
   - Copy today's `index.html` content to `ea/index.html` unchanged, except canonical → `https://pracexam.com/ea/`, Open Graph URL → `/ea/`, and JSON-LD URLs → `/ea/`.
   - Keep the EA `<title>`, description, FAQ and Course JSON-LD text identical, so the ranking signals carry over.
   - Fix relative asset paths after the move (images, CSS, JS) and check every link works from `/ea/`.
   - ⛔ Do NOT move or rename any other EA URL: `/tips/*`, `/popquiz`, `/videos`, `/app`, `/install-guide.html`, privacy, etc. Those already rank, and they stay put.
   - Update internal links that pointed at `/` as «the EA page» so they point to `/ea/` where they mean EA.
3. **`/re/`: the RE landing.** Same structure as the EA landing, RE palette below, its own title, description, canonical `https://pracexam.com/re/`, Open Graph, and `Course` + `FAQPage` JSON-LD (CA, NY, TX, NJ + national).
4. **`/re/app`:** a «coming soon» placeholder for now. The RE bank isn't public yet.
5. **Search-engine update files (do these now, in this branch):**
   - `sitemap.xml`: `/` (hub), ADD `/ea/` and `/re/`, keep every existing EA URL, and set `<lastmod>` to today.
   - `llms.txt`: restructure into «PracExam overview» + «Enrolled Agent (EA)», with the existing text moved under it unchanged, + a NEW «Real Estate License» section with its URLs.
   - `robots.txt`: keep. Make sure `/ea/` and `/re/` are allowed and the sitemap line is present.
   - Add `docs/re_site/SEARCH_UPDATE.md`: the exact steps for the boss after merge.
     - Google Search Console: submit the sitemap; URL Inspection → Request Indexing for `/`, `/ea/` and `/re/`.
     - Bing Webmaster: sitemap plus IndexNow (BingSiteAuth.xml already exists).
     - IndexNow ping URLs for `/`, `/ea/` and `/re/`.
6. **Header on all three landings:** an exam switch «EA | Real Estate», and a PracExam logo that goes to `/`.
7. **Language:** keep the current EN/KO toggle behaviour on `/ea/`, and give `/` and `/re/` the same toggle.

## Existing EA customers: do not break them (boss 2026-10-24 «기존 사용고객이 있으므로 /ea 전환은 조심해서»)
Already safe, so keep exactly as is (verified in repo):
- `manifest.json` `start_url` = `/app.html`. Installed phone/desktop apps open the app, not the root. ⛔ Don't change it.
- Supabase auth redirects (`emailRedirectTo`, password reset `redirectTo`) = `/app.html`. ⛔ Don't change them.
- `/app`, `/app.html`, `/tips/*`, `/popquiz`, `/videos`, `/install-guide.html`, privacy/terms: same URLs.
- **The EA app stays at `/app`** (boss asked 2026-10-24). Add an alias in `_redirects`: `/ea/app  /app  301` (and `/ea/app.html`), so the pattern `/<exam>/app` also works for EA. ⛔ Don't move the app itself.

Must add:
- **Returning visitors on `/`.** If a Supabase session exists in the browser, show a prominent «Go to my EA practice → /app» button at the top of the hub. Do NOT auto-redirect; crawlers must still see the hub. Logged-out returning customers use the hub login, which sends them to `/app.html`, the same as today.
- **Old root links keep working.** Emails, social posts and bookmarks that point to `https://pracexam.com/` land on the hub, which shows the EA door clearly above the fold. Old EA section anchors (e.g. `/#pricing`, `/#faq`): if `/` is opened with an EA anchor, forward it to `/ea/#anchor` in JS. List the anchors you found in CHANGES.md.
- **Search for every place that links to `/` meaning «the EA page»** (app.html nav/logo, tips pages, popquiz, videos, 404.html, email templates in `email/`) and decide for each: hub `/`, or `/ea/`. List them in CHANGES.md.
- **Rollback.** The merge must be one commit that can be reverted cleanly. Note the revert command in CHANGES.md.

Outside the repo (for the boss/Jay; list in SEARCH_UPDATE.md):
- Supabase Auth «Site URL» stays `https://pracexam.com`, which is the fallback only. Brevo email templates and Paddle success/cancel URLs: check whether any point to `/` meaning EA.
- Merge at a low-traffic hour, then test immediately: log in, open the app, open the installed PWA, test a password-reset email, and test a Paddle sandbox checkout return.

## Build for more exams later (boss asked 2026-10-24)
- Use the URL pattern `/<exam>/` for each landing and `/<exam>/app` for each app (`/ea/`, `/re/`, a future `/cpa/` …).
- The hub's exam doors and the header exam switch render from ONE small list, e.g. `exams.js`: `[{id:'ea', name, url, color}, …]`.
  Adding an exam = one entry plus its landing folder. Write the switch so it can become a dropdown when there are more than 2 exams.
- RE state pages later at `/re/ca/`, `/re/ny/`, `/re/tx/`, `/re/nj/`. Do not build them now, but leave the RE landing's state links and sitemap ready for them.
- Shared CSS: put common styles in one file, and the exam palette in a small per-exam file or a `data-exam` attribute on `<body>`, so a new exam only adds colors.

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
- Static HTML/CSS/JS, deployed by Cloudflare Pages from GitHub. Check `/ea/` and `/re/` work, with and without the trailing slash, matching the existing `_redirects` style.
- No new external script hosts beyond those already used by `index.html`.

## Deliverables
1. New `index.html`, the neutral hub
2. `ea/index.html`, the moved EA landing
3. `re/index.html`, the RE landing
4. `re/app.html`, a placeholder
5. `sitemap.xml`, `llms.txt`, `robots.txt` (if needed), `_redirects` (only `/ea` → `/ea/` and `/re` → `/re/` if Cloudflare needs it)
6. `docs/re_site/SEARCH_UPDATE.md` (the boss's steps after merge)
7. `docs/re_site/CHANGES.md`: every file touched, a diff of the EA `<head>` (old root vs new `/ea/`) showing that only URL fields changed, and a list of links checked
Commit on `re-site` and push. Do not merge.
