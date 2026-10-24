# HANDOFF 2026-10-24 — RE site build: design V1 locked (resume = "RE 사이트 이어서")

Boss 2026-10-24: «현재까지의 전체 디자인으로 1차 정하고 기록해주세요. 내일 새창에서 작업 합니다.»
⟹ The design below is **V1 (1st decision)**. Change it only on a new boss instruction.

## Where it lives
- Repo `C:\Users\Yongj\pracexam-prod`, branch **`re-site`** (NOT main). V1 = commit `219e11e`, git tag **`re-site-design-v1`**.
- Repo-side copy of this record: `docs/re_site/DESIGN_V1.md`. Earlier briefs: `docs/re_site/BRIEF.md`, `docs/re_site/HUB_FIX.md`.
- **Preview** (always the latest re-site build): https://re-site.pracexam-teaser.pages.dev/ · `/ea/` · `/re/` · `/re/popquiz`
  - Cloudflare Pages project name is **pracexam-teaser** (not «pracexam-prod»; I guessed wrong once → NXDOMAIN).
  - Per-deploy URLs come from `gh api repos/yongjinpark2007-ctrl/pracexam-prod/commits/<sha>/check-runs` (output.summary).
- Nothing is on pracexam.com yet. **Merge to main only after boss approval**, and only at a quiet hour. Then run the five tests in BRIEF.md: login, app, PWA, password reset, and the Paddle sandbox return.
- Local test server I used: `py -m http.server 8799 --directory C:/Users/Yongj/pracexam-prod`. Headless Chrome screenshots, with phone width via the iframe trick (`scratchpad/phone.html`).

## Site structure (agreed)
- `/` = neutral hub (EA + RE). `/ea/` = the old EA landing; only URL fields changed. `/re/` = the RE landing. `/re/app` = a placeholder.
- The EA app stays at **/app**. `/ea/app` and `/ea/app.html` redirect 301 to `/app`. The PWA start_url and auth redirects are unchanged.
- One list per thing: `exams.js` (exams), `re-states.js` (RE states), `exam-palettes.css` (colours per exam).

## Hub `/` — V1 design (files: index.html, hub.css, hub.js, hub-login.js)
- Style = the boss-approved «premium» study, but with the **site fonts**:
  - Poppins headings (600; sub-headline 400 upright) and Inter body.
  - Warm off-white page `#FBFAF7`. One ink colour `#1C2326` and one accent `#1F4E5A`.
  - Hairlines instead of shadows and colour stripes. Generous spacing.
  - **Rounded corners like the rest of the site**: buttons 10, login card 14, inputs 9, photos 16, small nav buttons 8.
- Top menu: logo · **EA Exam → /ea/** · **Real Estate Exam → /re/** · About (#about) · Log In (scrolls to the login card) · KO/EN.
  - No exam dropdown next to the logo, and no Study Tips (both removed by the boss).
  - Phone: hamburger.
- Hero, left side:
  - Eyebrow «U.S. LICENSE EXAM PRACTICE» / KO «미국 자격시험 실전 문제은행».
  - H1 «Master Your U.S. License Exam» + sub «Tailored practice for Enrolled Agent and Real Estate candidates». Both stay English in KO too.
  - Lead EN: «Stop guessing and start passing. PracExam gives you exam-style question banks with detailed explanations, built to match how your real test asks questions.»
  - Lead KO is **boss-written; do not reword**: «실전형 시험대비 학습으로 확실한 합격을 경험하십시오. PracExam은 실제 시험 환경을 완벽히 구현한 최고 수준의 문제은행과 심층적인 해설을 제공합니다.»
    - 🟡 I flagged that «실제 시험 환경을 완벽히 구현» overclaims and differs from the EN. The boss has not answered. Leave it as is unless told.
  - Button «Select Your Exam ↓» / «시험 선택 ↓» scrolls to #choose.
    - 🟡 I asked whether to change it to «Select Your License ↓ / 자격증 선택 ↓» to match the section title. No answer yet.
- Hero, right side: a **big login card**, English only (login gate rule). A signed-in visitor sees a «Welcome back / 환영합니다» card with «Go to my EA practice →» instead of the form. Never an auto-redirect.
- Hero type is LARGER than the landings because there is no photo: H1 up to 74px, sub up to 38–50px.
- Section «Choose your license» / KO «자격증을 고르세요» holds two photo doors (door-ea.webp, door-re.webp).
  - Each door: photo, title, one line, and a button. **No fact boxes.**
  - EA door: «Enrolled Agent, EA» / «미국 세무사, EA». Button «Start EA prep for free →» / «세무사 시험 준비 무료로 시작하기 →».
  - RE door: «Real Estate Agent» / «미국 부동산 중개사». Button «Start Real Estate prep for free →» / «부동산 중개사 시험 준비 무료로 시작하기 →».
  - Under the RE door title: state labels **California · Texas · New Jersey · New York** (west → east, boss). They are shown only and **not selectable**.
- Below the doors: two text cards **side by side**, lined up with the doors. These are the crawlable SEO text.
  - Eyebrow = door title. EA H2 «Enrolled Agent Exam» / «미국 세무사 시험». RE H2 «Real Estate Agent Exam» / «부동산 중개사 시험».
  - **No buttons** (the boss removed the duplicates).
- Then «About PracExam», full width. The boss-written KO About sentence is kept verbatim. Footer last.
- Titles have no parentheses. Korean shows Korean, with a comma if needed (boss).
- 🟡 Open: the EA body text still has «Part 1(개인)·Part 2(법인·사업체)…» parentheses. I asked whether to tidy it.

## RE landing `/re/` (files: re/index.html, re/re.css, landing.css, exam-palettes.css)
- Same structure as EA, in the RE navy palette.
- Top menu = EA structure: «Real Estate ▾» dropdown · Features · Pop Quiz (/re/popquiz) · Study Tips (/re/tips/ — **not built yet**) · Pricing · Log In · Start Free · KO/EN.
- Hero H1 «Master the / Real Estate Agent Exam» (no break inside «Real Estate») + «Your Ultimate State Exam Finisher». Never write «PSI» on /re/.
  - Title, meta and eyebrow keep «Real Estate **License** Exam» for search.
- **No state picker on the landing.** The state is chosen at RE sign-up (noted in BRIEF.md).
- Install note has the app icon and a «How to install →» link (/install-guide.html), like EA.
- «Applying the rules, not reciting them» (Killer Questions) = **original solid navy**. The boss tried gradient option A and then asked to revert.
- «Sample Questions» was removed from the top menus of /ea/ and /re/. The section stays.
- No «coming soon / 준비 중» anywhere. All four states are written as live.

## Shared header switch (exams.js)
- On /ea/ and /re/: always a dropdown, with **English labels in both languages** (boss). Closed: «Enrolled Agent ▾» / «Real Estate ▾». Open: «Enrolled Agent (EA)», «Real Estate License».

## Korean copy
- The Gemini (grounded) review of hub + /re/ KO, 117 strings, is done. I accepted 18 of the 71 suggested edits.
- I rejected edits that changed meaning (3영업일→3일, dropping 한·영), dropped the agreed KO exam names, or swapped Korean for English.
- Files: `scratchpad/site_ko_review.json`, `site_ko_apply.py`.

## Open work (next session)
1. **RE Pop Quiz data**: `/re/popquiz` is built, but shows «No question is available» until Jay runs `docs/re_site/re_daily_quiz.sql`.
   - That script creates the `daily_quiz_re` table and the `get_daily_quiz_re()` function. Then insert the first question (an RE-N item).
   - DB work = Jay's role.
2. **RE Study Tips** (boss: «EA처럼 부동산 문항으로 만들어요»): 5 articles, EN + KO, like EA's «Where Part N hides its questions»:
   - National, California, Texas, New Jersey, New York.
   - Facts ONLY from `re_generator/sources/CONTENT_OUTLINES.md` and the state outline files. CA = RE 425 Rev 6/25: 150 q / 3 h / 70%. I once wrote «3h15m» by mistake.
   - Gemini final KO, then review_app, then publish under /re/tips/ and /re/tips/ko/.
3. Boss decision pending: give /re/ the same «premium» look as the hub? I recommended keeping /ea/ as is because of existing customers.
4. Before merge to main: normalise the app.html line endings (only 4 real changes; the rest is CRLF churn). Then follow SEARCH_UPDATE.md.

## Live test domain (added 2026-10-24, boss)
- **https://test.dxdgroup.com** serves the `re-site` branch. It was set up by the boss as follows:
  - a custom domain on Cloudflare Pages project **pracexam-prod** (subdomain pracexam-teaser)
  - the DNS CNAME `test` pointed at `re-site.pracexam-teaser.pages.dev`
- The apex dxdgroup.com stays the company site (repo dxdgroup-web), on purpose.
- Gate code lives in `functions/_middleware.js`, the `testGate()` function. It applies ONLY when the host matches `*.dxdgroup.com`.
  - Password: `pracexam`. Only the SHA-256 is in the repo, and the env var `GATE_PASSWORD_SHA256` overrides it. After entry, a cookie lasts 30 days.
  - Every response on that host gets `X-Robots-Tag: noindex, nofollow`, and `/robots.txt` returns Disallow all.
- Verified: the gate works (wrong password → 401), and /, /ea/, /re/, /re/popquiz and /app all show the re-site build. pracexam.com is unchanged.
- The test site uses the REAL Supabase. For confirm and reset e-mails to return to test.dxdgroup.com, Jay must add it to the Supabase redirect URLs. Paddle stays sandbox-only there.
- When testing ends: merge re-site → main (the gate stays dormant on pracexam.com), then remove the test.dxdgroup.com custom domain.
- Boss 2026-10-24: leave sign-up as is on the test site, so no Supabase redirect change. Confirm and reset e-mail links from the test site land on pracexam.com, and that is accepted.
