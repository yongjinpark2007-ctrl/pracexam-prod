# RE test mode: implementation notes

Branch `re-test`, file `app.html` only. Line numbers are from this branch (they shift from the spec's `main` numbers).
Everything is gated on `S.reExam` (admin + valid `?exam=re-ca|re-tx|re-nj|re-ny`). Without it, every path is the same as `main`.

## Changes
- A. Mode switch
  - L2786 `RE_EXAM_PARAM`: parses `?exam=`, accepts only `/^re-(ca|tx|nj|ny)$/`.
  - L4748 `S.reExam = S.isAdminUser ? RE_EXAM_PARAM : null` in `loadFromCloud`, then banner + mock config.
  - L4504 `reShowBanner()`: fixed "RE TEST MODE: <ST>" banner.
- B. Practice
  - `fetchQuestionMetaRows` (~L4520-4560): RE branch loads `exam in (state, 're-n')`, `pool='study'`, no `is_active` filter. Pages with `.range()`. Fallback has the same exam filter.
  - L4563 `_reDropMockSources`: loads `question_id, source_qid` of the state's mock rows and drops `re-n` rows whose id is a `source_qid`.
  - L4645 `adminBackfillContent`: same filter in RE mode (EA filter unchanged otherwise).
  - L5856 `partLabel` and the feedback modal meta: part 4 is labeled "Real Estate".
  - L7691 `syncPartIconUI` and L7897 `getPool`: no Part 1/2/3 filtering or forcing in RE mode.
  - L8618 `autoTimeout` and L8721 `submitAnswer`: local grading from backfilled `correct`, no `check_answer`.
  - L4907 `saveProgressToCloud`, L4922 `saveSessionToCloud`, L5531 `saveLiveSessionToCloud`, L5498 `save()` (ea_prep_v3): no-ops in RE mode. Nothing is saved locally either.
  - L7745 `domainOfCode` and L7783 topic picker: two buckets, "National" (`N-` prefix) and "State".
- C. Mock exam
  - L10010 `RE_MOCK_CFG` and `reApplyMockConfig()`: duration per exam (CA 3h, TX 4h, NJ 4h, NY 90 min) and `localStorage` key base `re_mock_live_<exam>`.
  - `renderMockHub` (~L10127): no Part picker, one card with state name, question count, duration. The dashboard mock card text is also replaced.
  - L10226 `_mockStartGo`: `start_re_mock_exam({p_exam})`. Attempt part is 4.
  - Literal 100 / 99 replaced by `Mock.ids.length` (question header, next/submit, progress text and bar, submit note, nav grid, legend, confirm modal, global and hub banners fall back to 100 when `ids` is missing).
  - `renderMockResult` (~L10425-10540): total = scored count. TX/NJ show National and State scores, CA/NY one score, each with "pass line 70%". Title shows the state. The 85/SEE text is replaced. War Room buttons are hidden (result weak topics L10501, review modal L10636). "Exam Tip" label.
  - L10170, L10684, L10704: `.eq('exam', S.reExam || 'ea')` on last scores, history and past result.

## TODO / caveats
- NOT VERIFIED: NY exam length (90 min), marked `// TODO verify NY exam length`.
- NOT VERIFIED: 70% pass line for TX, NJ and NY (`// TODO verify` near `reScoreHtml`).
- The `.eq('exam','ea')` filter on mock history is required by the spec but changes EA queries. If any old EA `mock_attempts` rows have `exam` null, they will disappear from EA history. Check in Supabase before merging.
- Not run against the live Supabase (no browser session with the admin login). Only JS syntax was checked (`node --check`). Needs a manual pass with `?exam=re-ca` etc.
- The reset-progress function (~L5711 area) still deletes the admin's EA `live_session` if used in RE mode. It was not in the spec's list.
- Practice answers in RE mode live in memory only for the session (`S.answered`), by design.
