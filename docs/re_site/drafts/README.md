# Landing drafts (2026-10-19)

Two working drafts kept for later review. The boss asked to keep both as HTML.

| File | What | Artifact |
|---|---|---|
| pracexam_landing_draft.html | pracexam.com chooser (EA / RE doors, login demo) | https://claude.ai/artifact/3PFmLdUhyvCb8mrAcqBW8B |
| pracexam_re_landing_draft.html | /re landing, cloned from Production Files\index.html with the RE palette | https://claude.ai/artifact/YDqonqBv1rUrPgkG1wDc2U |

## Decisions so far (boss)
- One app codebase. EA moves to /ea; RE lands at /re, its app at /re/app.
- Price is $29, the same as EA. Count message is "5,000+", the same as EA. TX needs +74 and NJ +376 before launch.
- Photos are the Gemini AI images.
- The RE landing uses the same menu and structure as the EA landing.
- 2026-10-19 fonts: the same as the exam pages.
  - Headings: Poppins 700.
  - Body: Inter.
  - Korean: Pretendard. The artifact cannot load Pretendard, so Noto Sans KR stands in there.
- 2026-10-19 English: no "English and Korean explanations" claim, because that is a Korean-only feature. The EN·KO chip shows only in Korean.
- 2026-10-19 Korean exam names are uniform:
  - "미국 세무사 Enrolled Agent (EA)"
  - "미국 부동산 중개사 Real Estate Agent"

## build\
- landing_tpl.html and landing_assets.json are the source of the chooser.
  - The chooser HTML was edited after the build, by hand and by fix_landing_fonts.py.
  - Edit the HTML here, not the template.
- build_re_index.py rebuilds the RE draft from index.html.
  - A rebuild drops the Noto Sans KR fallback.
