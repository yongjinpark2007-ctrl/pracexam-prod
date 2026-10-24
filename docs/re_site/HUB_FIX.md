# Hub fix (boss 2026-10-24): rebuild `/` from the APPROVED chooser draft

Boss feedback on the preview: «랜딩은 이전에 사진을 넣은 화면을 이미 디자인 하였는데 그것을 반영안하고 새로 만들었습니다.»
The hub at `/` (index.html) was written from scratch. It must instead use the design the boss already approved:
**`docs/re_site/drafts/pracexam_landing_draft.html`**, the chooser with the two photo doors, «Which exam are you preparing for?»,
the EA door and the Real Estate door, and the login.

## Do
1. Rebuild `index.html` so it LOOKS like the draft: same layout, two photo cards (EA and RE), copy, fonts and colors.
   - Extract the base64 photos in the draft to files (e.g. `img/door-ea.jpg`, `img/door-re.jpg`, compressed webp/jpg) and reference them.
     Keep the base64 out of the HTML. Add width/height and alt text.
   - EA door → `/ea/`. Real Estate door → `/re/`.
   - Login: keep the working Supabase login from the current hub (`hub-login.js`), placed where the draft shows the login
     (the draft's login is a demo; wire it to the real one). The login gate is English-only.
   - Keep the «returning user with a session → Go to my EA practice» button.
2. Keep ALL the SEO parts of the current hub: title, meta description, canonical `/`, Organization/WebSite/ItemList JSON-LD,
   the KO middleware copy, and the crawlable text sections. Place the text sections BELOW the draft's chooser, so the
   chooser stays the first screen and crawlers still get real text.
3. Keep the header exam switch from `exams.js`, and the language toggle.
4. Mobile: the two doors stack. Check at 375px wide.
5. Don't touch `/ea/`, `/re/`, `/app` or anything else.
6. Also restore `app.html` line endings to match `main` (CRLF). Only the 4 real link changes should show in `git diff main -- app.html`.
7. Update `docs/re_site/CHANGES.md` with a «Hub fix» section. Commit and push to `re-site`. Do not merge.
