# Task: admin-only Real Estate (RE) test mode in app.html

Repo: `yongjinpark2007-ctrl/pracexam-prod`. File: `app.html`, a single-page app of about 11,300 lines.
Line numbers below are from `main` @ `a55086f`.

Work on a NEW branch named `re-test`. Never push to `main`. `main` auto-deploys to pracexam.com, which serves live paying customers.

## Goal

An admin who opens `app.html?exam=re-ca` (or `re-tx`, `re-nj`, `re-ny`) gets two things:

1. Practice on that state's Real Estate questions.
2. Real Estate mock exams through the RPC `start_re_mock_exam(p_exam)`.

Everyone else, and the admin without the URL param, must see the app exactly as today. Byte-for-byte, the EA behavior must not change.

## Hard rules

- With no `?exam=` param, or with a non-admin user, every code path stays identical to `main`. Gate every change on `S.reExam`, which is truthy only for the admin with a valid param.
- Do not change any Supabase SQL, RPC, view or table. The server side is already done (see below).
- Do not write RE answers into EA history. That covers `user_progress`, the `sessions` insert, the live-session cloud save, and the `localStorage` key `ea_prep_v3`.
- No semicolons are required in the UI text. Keep UI text short, and keep the existing bilingual `t()` / `LANG` pattern.
- Do not touch the login gate, payments (Paddle), `index.html`, or `sw.js`.

## Server side, already live in Supabase (read-only facts)

- `questions` rows:
  - RE state banks: `exam` = `re-ca` | `re-tx` | `re-nj` | `re-ny`.
  - National bank: `exam` = `re-n`, shared by all four states.
  - Practice rows have `pool='study'`. Every RE row is `is_active=false` for now. The admin must still see them.
- Mock rows:
  - `question_id` = `MOCK-RE-<ST>-<form>-<nnn>`, with `exam` = the state code and `pool='mock'`.
  - `source_qid` holds the original id.
  - For national items, the `RE-N-…` original stays in `re-n` `study`. It must be HIDDEN from that state's practice: exclude any `re-n` row whose `question_id` equals a `source_qid` of that state's mock rows.
- `start_re_mock_exam(p_exam text)` returns `(attempt_id uuid, question_ids text[])`.
  - It is admin-only for now and serves inactive rows to the admin.
  - Forms alternate 1, 2, 1, 2 per user (counted from graded attempts).
  - TX and NJ arrays put national items first and state items second.
- Questions per attempt: CA 150 · TX 135 · NJ 110 · NY 75.
  - TX items numbered 121-135 are unscored pretest items. They are not in `scored_ids`, so `grade_mock_exam` returns `is_scored=false` for them.
- `get_question_payload` already serves mock rows to the admin and to the attempt owner.
- `grade_mock_exam` works for RE as-is. It returns `per_question` with `outline_code`.
- `get_review_payload` hides answers for 4h while an RE attempt is in progress.
- `mock_attempts` RE rows have `exam` = the state code and `part=4`.
- RE questions have `part = 4` and outline codes like `N-PROP-05` (national), `CA-V-14`, `TX-S-12`, `NJ-S-03`, `NY-S-08` (state).

## Changes (insertion points from a read of main)

### A. Mode switch

1. Near L2783 (`ADMIN_UID`): parse `?exam=` and accept only `/^re-(ca|tx|nj|ny)$/`.
2. At L4700, right after `S.isAdminUser` is set: `S.reExam = S.isAdminUser ? RE_EXAM_PARAM : null`.
3. Show a small fixed banner in RE mode: "RE TEST MODE: <state>". Then nobody mistakes it for EA.

### B. Practice

1. Admin load, L4503 (`fetchQuestionMetaRows`):
   - When `S.reExam` is set, load from `questions` with `exam in (S.reExam, 're-n')`, `pool='study'`, and NO `is_active` filter.
   - Also load `question_id, source_qid` from `questions` where `exam = S.reExam` and `pool = 'mock'`.
   - Drop the `re-n` rows whose id is in that `source_qid` set.
   - Page with `.range()` the same way the existing code does. The bank is about 5,000 rows.
2. Admin backfill, L4604 (`adminBackfillContent`): when `S.reExam` is set, use the same exam filter (both banks, no `is_active` filter).
3. Fallback at L4527-4531: add the exam filter, so RE rows can never leak into EA through the fallback.
4. L4729: in RE mode, label part 4 as "Real Estate".
5. `getPool` (L7835) and `syncPartIconUI` (L7638): in RE mode, do not filter by part 1/2/3 and do not force part1.
6. Grading in RE mode:
   - Do NOT call `check_answer` (L8653 / L8557), because it writes `user_progress`.
   - The admin backfill already has `correct`, so grade locally from it.
7. In RE mode, make these four no-ops:
   - `saveProgressToCloud` (L4857)
   - `saveSessionToCloud` (L4871)
   - `saveLiveSessionToCloud` (L5478)
   - the `ea_prep_v3` save (L5458). Use the key `re_prep_<exam>` instead, or nothing.
8. Topic picker (L7722) and `domainOfCode` (L7685): in RE mode, group by two buckets, "National" (code starts `N-`) and "State" (everything else). Showing the `topic` field as the label is fine.

### C. Mock exam

1. L9932: set `MOCK_DURATION_SEC` per exam in RE mode:
   - re-ca: 3h (DRE RE 4)
   - re-tx: 4h (Pearson VUE TX handbook "240 minutes")
   - re-nj: 4h (PSI NJ bulletin)
   - re-ny: 90 min. NOT VERIFIED. Leave a `// TODO verify NY exam length` comment.
2. L9933: in RE mode, use the `localStorage` key base `re_mock_live_<exam>`.
3. `renderMockHub` (L10010-10066):
   - In RE mode, hide the Part 1/2/3 picker (L10034).
   - Show one start card with the state name, question count and duration.
   - Replace the "3 hours 30 minutes / 100 questions (85+15)" text (L10044-10046, L10088).
4. Start, L10127: in RE mode call `sb.rpc('start_re_mock_exam', { p_exam: S.reExam })` instead of `start_mock_exam`. The shape of the result is the same.
5. Replace every literal 100 / 99 with `Mock.ids.length` / `Mock.ids.length - 1`. Lines: L10173, L10178, L10189, L10232, the L10234 progress width (convert to a percentage), L10243, L10251, L10259, L10284. EA keeps 100 automatically.
6. Results, `renderMockResult` (L10324-10427):
   - Total = `scored` count from `per_question`. Do not use the 85 default (L10327) in RE mode.
   - re-tx and re-nj: show TWO scores, National (`outline_code` starting `N-`) and State (the rest). Count only `is_scored` items. Show percent and "pass line 70%".
   - re-ca and re-ny: one score, with "pass line 70%".
   - Mark the 70% pass line for TX, NJ and NY with a `// TODO verify` comment.
   - Hide the War Room buttons (L10390, L10520).
   - Replace the "85 scored / SEE" text (L10413-10414) and the "Part X" title (L10406) in RE mode.
   - Change the "EA Exam Tip" label (L10531) to "Exam Tip".
7. History and last scores, L10070 (`mockFillLastScores`), L10567 and `mockOpenPastResult` L10588:
   - Add `.eq('exam', S.reExam || 'ea')`.
   - Note that this also stops RE attempts from showing in EA history. That is intended.

## Done when

- `git diff main...re-test` touches only `app.html`.
- Every changed hunk is gated on `S.reExam` or is a pure `100 → Mock.ids.length` substitution that gives the same value for EA.
- A short `RE_TEST_NOTES.md` on the branch lists each change with its line number, plus anything left TODO.
- Push the branch `re-test` only. Do not open a PR to `main`. Do not merge.
