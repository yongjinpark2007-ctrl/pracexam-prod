# Hub fix (boss 2026-10-24): rebuild `/` from the APPROVED chooser draft

Boss feedback on the preview: «랜딩은 이전에 사진을 넣은 화면을 이미 디자인 하였는데 그것을 반영안하고 새로 만들었습니다.»
The hub at `/` (index.html) was written from scratch. It must instead use the design the boss already approved:
**`docs/re_site/drafts/pracexam_landing_draft.html`** (the latest approved version, from the boss-reviewed artifact of 2026-10-20), the chooser with the two photo doors, «Which exam are you preparing for?»,
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

## Exam switch: ALWAYS a dropdown (boss 2026-10-24)
Boss: «이 메뉴를 드랍다운 형식으로 하는 것이 공간 운영에 좋을 것 같습니다.»
- The header exam switch (`exams.js` + `exam-switch.css`) shows a dropdown even with 2 exams, not pills.
- Closed state: one compact button with the current exam name and a ▾ caret (e.g. «Enrolled Agent ▾» / «Real Estate ▾»; on the hub, «Exams ▾»).
- Open: a list of all exams from `exams.js`, with the current one marked.
- Keyboard and a11y: a `<button aria-expanded>` plus a list of links. Esc closes, a click outside closes, and focus is visible.
- Mobile: it lives inside the hamburger menu as a simple list.
- Same on `/`, `/ea/` and `/re/`.

## RE state picker: a dropdown (boss 2026-10-24)
The boss pointed at the RE landing's state chips («어느 주에서 시험을 보세요? California / Texas / New Jersey / New York (준비 중)»)
and said a dropdown saves space.
- On `/re/`, replace the chip row with one compact dropdown: label «Which state are you testing in? / 어느 주에서 시험을 보세요?» and a select-style control.
- Options come from ONE list (put it next to `exams.js`, e.g. `re-states.js`): `[{id:'ca', name:'California', ready:true}, …]`, so adding a state is one entry.
- ⛔ NO «coming soon / 준비 중» anywhere (boss 2026-10-24: «준비 중은 쓰지 마세요. 론칭할때는 준비가 다 될것이므로 준비된것 기준으로 합니다»).
  All four states (California, New York, Texas, New Jersey) are listed as normal, selectable options. Remove the `ready`/«soon» styling and any dashed «soon» chips.
- Keep the current behaviour after selection (whatever the chip did). Remember the choice in localStorage, wrapped in try/catch.
- Also remove «coming soon / 준비 중» wording from the rest of `/re/` and the hub (state chips, facts, FAQ, JSON-LD), and write as if all four states are live.
  `/re/app` stays a placeholder page, but its copy should not say «coming soon» either. Use a neutral «Practice app opens here».

## Top menu: drop «Sample Questions» (boss 2026-10-24)
Boss: «EA의 탑메뉴가 많아서 RE와 맞지 않습니다. Sample Questions 은 탑메뉴에서 내리면 어떨까요? 별도 페이지가 아니니».
- Remove the «Sample Questions / 예제 문제» (`#samples`) link from the top nav on `/ea/` and on `/re/`, desktop and the mobile hamburger.
- Keep the samples SECTION on both pages, with the same `id="samples"`, so old `#samples` links still scroll to it. Only the menu item goes.
- Resulting EA top menu: Features · Pop Quiz · Study Tips · Pricing, plus exam dropdown, language, Log in and the start button.
  Resulting RE top menu: Features · Pricing, plus the same right side.
- The tips/videos/popquiz pages' nav anchors to `/ea/#samples` may stay, since the section still exists. Update them only if they list «Sample Questions» as a top-menu item; then remove it there too, for a consistent menu.
- No other EA change (SEO head untouched).
