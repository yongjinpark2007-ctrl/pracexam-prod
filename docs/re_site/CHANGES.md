# RE site build — CHANGES (branch `re-site`, 2026-10-24)

Built from `docs/re_site/BRIEF.md`. Nothing is merged to `main`.

## Files

New
| File | What |
|---|---|
| `index.html` | **Rewritten**: neutral hub. Title «PracExam \| EA & Real Estate License Exam Practice Questions», canonical `/`, JSON-LD Organization + WebSite + ItemList (links `/ea/`, `/re/`), English-only Supabase login, two doors, crawlable text sections for both exams. |
| `ea/index.html` | The old root EA landing, moved (see head diff below). |
| `re/index.html` | RE landing, from `drafts/pracexam_re_landing_draft.html` with the draft/demo parts removed. Own title, description, canonical `/re/`, OG, `Course` + `FAQPage` JSON-LD. |
| `re/app.html` | Placeholder page «Practice app opens here» (`noindex`). Served at `/re/app`. |
| `re/re.css`, `re/img/hero-re.jpg`, `re/img/killer-re.jpg` | RE-only CSS and the two Gemini photos (extracted from base64 in the draft). |
| `exams.js` | **The one exam list** (`id, name, full, blurb, url, app, color`). Draws the header switch on every landing and the hub doors. Switch renders pills for 2 exams and a `<details>` dropdown for more than 2. |
| `exam-palettes.css` | One `body[data-exam="…"]` block per exam (`ea`, `re`, `hub`). A new exam adds one block. |
| `landing.css` | The EA landing's inline `<style>` moved out, palette-neutral (24 hard-coded teal `rgba()` → `rgba(var(--x-rgb),…)`). |
| `exam-switch.css`, `hub.css` | Switch styling; hub-only styling. |
| `site-common.js` | Language toggle + mobile menu for `/` and `/re/` (same `ea_lang` key and `L` shortcut as `/ea/`). |
| `hub-login.js` | Hub login: same Supabase password call and `#access_token` hand-off to `/app.html` that `/ea/` already uses. |
| `docs/re_site/SEARCH_UPDATE.md` | Steps for the boss after merge. |

Changed
| File | Change |
|---|---|
| `sitemap.xml` | `/` lastmod → 2026-10-24; added `/ea/`, `/re/` (2026-10-24). All existing URLs kept. |
| `llms.txt` | Restructured: «PracExam overview» + «Enrolled Agent (EA)» (old text moved under it; two homepage URLs → `/ea/`; Study Tips block kept between its markers) + new «Real Estate License». |
| `robots.txt` | Kept; added a comment. `Allow: /` already covers `/ea/` and `/re/`; Sitemap line present. |
| `_redirects` | `/ea/app`, `/ea/app.html` → `/app` (301). |
| `functions/_middleware.js` | Korean title/description swap now applies to `/` (new hub copy), `/ea/` (the **same** EA Korean copy as before) and `/re/` (new). Other pages untouched. |
| `app.html` | `index.html?signup=1`, `index.html#about`, logout redirect `index.html` → `/ea/…`. |
| `popquiz.html` | Sign-up / home links → `/ea/…`; nav anchors `/#features` etc. → `/ea/#features` etc. |
| `videos.html`, `tips/**/index.html` (14 files) | Nav anchors `/#features`, `/#samples`, `/#pricing` → `/ea/#…`. Logo `/` still goes to the hub. |
| `terms.html`, `privacy.html`, `refund.html`, `install-guide.html` | `href="index.html"` → `/` (hub). |

`_redirects`: added `/ea/app` and `/ea/app.html` → `/app` (301), so the `/<exam>/app` pattern also works for EA; the app itself stays at `/app`. No entries for `/ea` and `/re`: Cloudflare Pages redirects a folder without the slash (`/ea` → `/ea/`, `/re` → `/re/`) by itself, as it already does for `/tips`. Verified on a local Pages-style server.

## EA `<head>`: old root vs new `/ea/` (SEO fields only changed in URL fields)

```
--- old / (root index.html) head
+++ new /ea/ head
@@ -3,4 +3,4 @@
-<link rel="icon" href="favicon.ico" sizes="any">
-<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
-<link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">
-<link rel="apple-touch-icon" href="apple-touch-icon.png">
+<link rel="icon" href="/favicon.ico" sizes="any">
+<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
+<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
+<link rel="apple-touch-icon" href="/apple-touch-icon.png">
@@ -9 +9 @@
-<link rel="canonical" href="https://pracexam.com/">
+<link rel="canonical" href="https://pracexam.com/ea/">
@@ -12 +12 @@
-<meta property="og:url" content="https://pracexam.com/">
+<meta property="og:url" content="https://pracexam.com/ea/">
@@ -26 +26,4 @@
-<link rel="stylesheet" href="videos.css">
+<link rel="stylesheet" href="/videos.css">
+<link rel="stylesheet" href="/exam-palettes.css">
+<link rel="stylesheet" href="/landing.css">
+<link rel="stylesheet" href="/exam-switch.css">```

- `<title>`, `description`, `og:title/description/image`, `twitter:*` are **byte-identical**.
- The only SEO changes: `canonical` and `og:url` → `/ea/`.
- JSON-LD: the old page has **one** block, `FAQPage`, with **no URL fields**; it is byte-identical (same hash, 5 Q&As). The old page has no `Course` JSON-LD, so none was added to `/ea/` (the brief says keep it identical). Add one later if wanted.
- The rest of the diff is path fixing (`favicon.ico` → `/favicon.ico`…) and the inline `<style>` moved to `/landing.css` + `/exam-palettes.css`.
- Body of `/ea/` vs old `/`: rendered both at 1280px and 390px with Playwright; pixel difference exists **only in the header** (the new «EA | Real Estate» switch). Logo now links to `/`.

## Links checked (local Pages-style server, Playwright)

83 references on `/`, `/ea/`, `/re/`, `/re/app` → 41 unique same-origin targets, **all 200**: `/app.html`, `/ea/`, `/re/`, `/re/app`, `/popquiz.html`, `/videos`, `/tips/`, `/install-guide.html`, `/terms.html`, `/privacy.html`, `/refund.html`, `/videos.css`, `/videos.js`, favicons, `hero-rot-*.webp` (+2x, with the `?v=` busters), `killer-focus*.webp`, `icon-192.png`, shared CSS/JS, RE images.
Redirects: `/ea` → `/ea/` (308), `/re` → `/re/` (308), `/ea/index.html` → `/ea/`, `/index.html` → `/`.
Behaviour: `/ea/?signup=1` opens the sign-up modal; hub login posts to the Supabase token endpoint and redirects to `/app.html#access_token=…` on success, shows an error on failure (mocked); KO/EN toggle works on `/` (`<html lang>` follows); no console or network errors on `/`, `/ea/`, `/re/`, `/re/app`.
Not checked: external hosts (Google Fonts, jsDelivr, Supabase, YouTube) were blocked in the sandbox, so live Supabase login and Cloudflare itself were not exercised. **Check the Cloudflare preview.**

## Existing EA customers (BRIEF section «do not break them»)

Left exactly as is (not touched): `manifest.json` (`start_url` `/app.html`), Supabase auth redirects in `ea/index.html` and `app.html` (`/app.html`), and the URLs `/app`, `/app.html`, `/tips/*`, `/popquiz`, `/videos`, `/install-guide.html`, privacy/terms.

Added on the hub:
- **«Go to my EA practice → /app»** bar at the top of the hub, shown only when a Supabase session (`sb-ufrhvodruulpgnmudzwh-auth-token`) exists in the browser. Never an auto-redirect, so crawlers see the hub. Tested with and without a stored session.
- **Old root anchors forwarded in JS** (`/` → `/ea/#anchor`, query string kept): `#features`, `#samples`, `#pricing`, `#faq`, `#fs-section`. Anchors that existed on the old root page: `about`, `features`, `fs-section`, `pricing`, `samples` (there was no `#faq` id; it is forwarded anyway because the brief named it). `#about` is **not** forwarded: the hub has its own About section, which is the same company text. `/#login`, `#ea-section`, `#re-section` are hub anchors.
- Logged-out returning customers use the hub login → `/app.html#access_token…`, same as the old confirmation hand-off.

Every place that linked to `/` (or `index.html`) and what I decided:

| Where | Link | Decision |
|---|---|---|
| `app.html` login card «Join us at PracExam.com» | `index.html?signup=1` | `/ea/?signup=1` (EA sign-up modal) |
| `app.html` footers (2) «About» | `index.html#about` | `/ea/#about` |
| `app.html` logout redirect | `index.html` | `/ea/` (free users are sent to the EA sign-up page, as before) |
| `popquiz.html` sign-up buttons (2) | `index.html?signup=1` | `/ea/?signup=1` |
| `popquiz.html` «Home» buttons (3) | `index.html` | `/ea/` (Pop Quiz is EA content) |
| `popquiz.html`, `videos.html`, `tips/**` (16 pages) nav | `/#features`, `/#samples`, `/#pricing` | `/ea/#…` |
| same pages, header logo | `/` | stays `/` (hub = brand home) |
| `videos.html` «Back to PracExam home» / footer «Home» | `/` | stays `/` (hub) |
| `terms`, `privacy`, `refund`, `install-guide` logo + «Home» | `index.html` | `/` (hub) |
| `404.html` logo, Home button, footer | `/` | stays `/` (hub) |
| `email/` | none | folder holds only logo images; no links |
| `functions/_middleware.js` | root-only Korean swap | now `/` (hub copy), `/ea/` (old EA copy), `/re/` |

**Rollback.** The build is two commits on `re-site` (the build, then the `/ea/app` alias); merge it as a **squash** so it lands on `main` as one commit, then revert that with `git revert <commit>` (if merged with a merge commit instead: `git revert -m 1 <merge-commit>`), then push; Cloudflare redeploys the old root EA landing and removes `/ea/`, `/re/`.

## Things to know / decide

1. **`sync_nav.js` / `build_site.js`** (not in this repo) stamp the header into `popquiz.html`, `videos.html` and `tips/**`, using the old `index.html`. I edited the generated files by hand; if those scripts run again they will put `/#features` back. Point them at `ea/index.html`, or ask me to.
2. **RE sign-up is off.** The RE bank is not public, so every «Start Free / Log In / Subscribe» on `/re/` goes to `/re/app` (placeholder page). The draft's sign-up modal and Supabase code were not carried over. `Pop Quiz` and `Study Tips` nav items are not on `/re/` (EA only).
3. **Hub login** signs in EA accounts only (the only app that exists).
4. Hub Korean «About» sentence is the owner's EA-only text (unchanged); only the English sentence was widened to both exams.
5. RE «5,000+» and `$29` are on the page as decided; TX needs +74 and NJ +376 questions before launch. I left the count out of RE meta/JSON-LD.
6. The RE state dropdown only changes the `?state=` on the Start Free link for now (all four states are normal options).
7. IndexNow needs a key file that does not exist yet (see `SEARCH_UPDATE.md`).
8. `manifest.json` still says «PracExam — EA Exam Prep» (the installed PWA is the EA app).

## Hub fix (docs/re_site/HUB_FIX.md)

`/` (index.html) was rebuilt from the approved chooser draft `drafts/pracexam_landing_draft.html` instead of the from-scratch hub.

- **Looks like the draft:** «Which exam are you preparing for?», the two photo doors (EA, Real Estate) with the same copy, facts, state chips, orange buttons, «Already a member? Log in» strip, footer, fonts (Poppins / Inter / Pretendard) and colors, including its dark mode. Reviewer-only parts of the draft (draft banner, notes card, demo login options, toast) were removed.
- **Photos and logos out of the HTML:** `img/door-ea.webp` (23 KB), `img/door-re.webp` (36 KB), both 1000×667 with width/height and alt text (the first is `fetchpriority=high`, the second lazy); `img/logo-dark.png` and `img/logo-white.png` from the draft. No base64 left in `index.html` (about 19 KB).
- **Doors:** EA → `/ea/`, Real Estate → `/re/`. The RE state chips (CA, NY, TX, NJ, drawn from `re-states.js`) put `?state=xx` on the RE link (`/re/?state=ca`), ready for the state pages; the draft's reviewer-only path text («/ea», «/re?state=ca») is hidden.
- **Login:** the draft's login modal is wired to the real Supabase login (`hub-login.js`, unchanged logic); English only. Header «Log in» and the member strip open it; `/#login` opens it too.
- **Kept:** the «Go to my EA practice → /app» bar for signed-in browsers (above the heading), old-anchor forwarding (`/#pricing` etc. → `/ea/#…`), header exam switch from `exams.js` (below 560px it drops to its own row), and the EN / 한국어 toggle (same `ea_lang` key as the other pages).
- **SEO parts kept:** title, meta description, canonical `/`, OG/Twitter, Organization + WebSite + ItemList JSON-LD, the KO copy in `functions/_middleware.js`, and the crawlable EA and Real Estate text sections plus About, now **below** the chooser (the chooser is the first screen).
- **New/changed files:** `index.html`, `hub.css` (now the draft's CSS plus a few additions), `hub.js` (language, chips, modal), `img/*`, `exams.js` (the hub doors are the approved static design, so the old door renderer was removed; the switch still comes from the list; a new exam adds a door card in `index.html`), `exam-palettes.css` (unused `hub` block removed). `/ea/`, `/re/`, `/app` and everything else untouched.
- **`app.html` line endings:** restored from `main` (CRLF, with its one LF-only line kept as is). `git diff main -- app.html` now shows only the 4 link changes (`/ea/?signup=1`, `/ea/#about` ×2, logout `/ea/`).
- **Checked (local Pages-style server, Playwright):** 85 refs / 47 targets all 200; no console or network errors; login success → `/app.html#access_token…` and failure message (mocked Supabase); signed-in bar shows only with a stored session; `/#pricing`, `/#features`, `/#faq` forward to `/ea/`; KO toggle works (`<html lang>` follows); at 375px wide the page does not scroll sideways and the two doors stack.

### Hub fix, follow-up requests in HUB_FIX.md (exam switch, state picker, top menu)

- **Exam switch is always a dropdown** (`exams.js` + `exam-switch.css`) on `/`, `/ea/`, `/re/`, `/re/app`: a `<button aria-expanded>` with the current exam name and ▾ (hub: «Exams ▾»), and a list of links for every exam in the list with the current one marked ✓ (`aria-current`). Esc closes (focus returns to the button), a click outside closes, ArrowDown opens and focuses the first item, focus ring visible. On `/ea/` and `/re/` the switch sits inside the hamburger menu, where phones/tablets (≤860px) show it as a plain list with no button; on the hub it stays a compact button (own row on narrow phones).
- **RE state picker is a dropdown** (`<select>`) on `/re/`; the options and the hub's state chips both come from **`re-states.js`** (`[{id, name}]`, California, New York, Texas, New Jersey; adding a state is one entry). After selecting, the Start Free button carries `?state=xx` to `/re/app`, as the chips did. The choice is stored in `localStorage` (`pe_re_state`, in try/catch) and `/re/?state=xx` preselects it. The hub chips behave the same way (link `/re/?state=xx`).
- **No «coming soon» / «준비 중» anywhere:** the dashed NY chip, its CSS and the «being built / launching with / planned / not public yet» wording are gone from `/re/` (FAQ text and JSON-LD), the hub, `llms.txt` and the RE placeholder. `/re/app` is still a placeholder page, titled «Practice app opens here». I removed the «State pages (planned)» line from `llms.txt` because those URLs do not exist yet; add it when `/re/ca/` etc. are built.
- **Top menu:** «Sample Questions» removed from `/ea/` and `/re/` (desktop and hamburger) and from `popquiz.html`, `videos.html` and the 14 `tips/**` pages, which listed it too. The sections keep `id="samples"`, so `/ea/#samples`, `/#samples` (forwarded) and the hero «Try Sample Questions» button still work. Menus now: EA = Features · Pop Quiz · Study Tips · Pricing; RE = Features · Pricing.
- Checked (Playwright): dropdown open/close/Esc/outside click on all four pages; menu items; state select values, `?state=` preselect, stored choice; hub chips; no page errors; 89 refs / 50 targets all 200; EA hamburger and the hub header at 375px have no sideways scroll.

### RE hero subtitle (HUB_FIX.md)

`/re/` h1 `<em>` is now «Your Ultimate State Exam Finisher» in both the `.ko` and `.en` spans (English in both, like EA), with the same `<em>` styling as EA. No «PSI» anywhere on `/re/` (checked). og:title and twitter:title did not quote the old subtitle, so they are unchanged.
