# Build /re/app.html from the EA /app.html (boss 2026-10-24, phase 1: «부동산 app도 EA와 동일하게 … 내가 풀 수 있게»).
# Phase 1 = ADMIN ONLY. The admin path reads `questions` directly, so no DB change is needed.
#   Part 1 = National (exam re-n) · Part 2 = the chosen state (exam re-<st>) · Part 3 hidden.
#   Mock exam, War Room, videos hidden (EA-only server functions / no RE sheets in DB yet).
#   RE rows are still is_active=false (pre-launch) → the RE copy does not filter is_active (admin only).
# Re-run after app.html changes: py build_re_app.py   (every edit is anchored; a missing anchor stops the build)
import io, re, sys
R = r"C:/Users/Yongj/pracexam-prod/"
h = io.open(R + "app.html", encoding="utf-8", newline="").read().replace("\r\n", "\n")
def one(a, b, label, n=1):
    global h
    c = h.count(a)
    if c != n: sys.exit("anchor %s found %d (want %d)" % (label, c, n))
    h = h.replace(a, b)

# ── head ──
one("<title>EA Exam Practice · 2026 EA Exam</title>", "<title>Real Estate Exam Practice · PracExam</title>", "title")
for f in ("favicon.ico", "favicon-32x32.png", "favicon-16x16.png", "apple-touch-icon.png", "privacy.html", "terms.html", "refund.html"):
    h = h.replace('href="%s"' % f, 'href="/%s"' % f)
one('href="popquiz.html"', 'href="/re/popquiz"', "popquiz")
h = re.sub(r'\n?<link rel="manifest" href="manifest.json"[^>]*>', "", h, count=1)   # EA PWA manifest would install the EA app
one("navigator.serviceWorker.register('sw.js')", "Promise.reject(new Error('RE app: no service worker in phase 1'))", "sw")

RE_CFG = r"""
<script>
/* ── RE app config (phase 1, 2026-10-24) — built from /app.html by build_re_app.py ── */
var RE_STATES = { ca:'California', tx:'Texas', nj:'New Jersey', ny:'New York' };
var RE_STATE_KO = { ca:'캘리포니아', tx:'텍사스', nj:'뉴저지', ny:'뉴욕' };
var RE_STATE = (function(){
  var s = null;
  try { s = new URLSearchParams(location.search).get('state'); } catch(e){}
  if (!s) { try { s = localStorage.getItem('pe_re_state'); } catch(e){} }
  s = (s || 'ca').toLowerCase();
  if (!RE_STATES[s]) s = 'ca';
  try { localStorage.setItem('pe_re_state', s); } catch(e){}
  return s;
})();
var RE_EXAMS = ['re-n', 're-' + RE_STATE];
function reSetState(s){ try { localStorage.setItem('pe_re_state', s); } catch(e){} location.href = '/re/app?state=' + s; }
</script>
<style>
/* phase 1: EA-only features hidden */
#nav-mock, #nav-warroom, #nav-videos { display:none !important; }
#part-row { grid-template-columns:repeat(2,1fr) !important; }
#part-row > button:nth-child(3), button[data-p="Part 3"] { display:none !important; }
.re-statebar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px;margin:0 0 12px}
.re-statebar select{font:inherit;padding:5px 8px;border-radius:8px;border:1px solid var(--border-clr,#ccc);background:var(--card-bg,#fff);color:inherit}
#re-admin-only{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;background:var(--page-bg,#fff);padding:16px}
#re-admin-only.show{display:flex}
#re-admin-only .box{max-width:420px;text-align:center;font-size:15px;line-height:1.6}
#re-admin-only a{display:inline-block;margin:14px 6px 0;padding:10px 16px;border-radius:10px;background:#10304C;color:#fff;text-decoration:none;font-weight:600}
</style>
"""
one("</head>", RE_CFG + "</head>", "head-end")
one("<body", """<body""", "body")  # keep
h = re.sub(r"(<body[^>]*>)", r"""\1
<div id="re-admin-only"><div class="box"><b>Real Estate practice app — admin preview</b><br>This test build is open to the administrator account only.<br>이 시험용 화면은 관리자 계정만 사용할 수 있습니다.<br><a href="/re/">Real Estate home</a><a href="/app">EA app</a></div></div>""", h, count=1)

# ── data: RE exams instead of EA ──
one("const Q_META_COLS = 'question_id, part, topic, outline_code, difficulty, created_at';",
    "const Q_META_COLS = 'question_id, part, topic, outline_code, difficulty, created_at, exam';", "meta-cols")
one("""        ? sb.from('questions').select(Q_META_COLS, withCount ? { count: 'exact' } : undefined).neq('pool','mock').eq('exam','ea').eq('is_active', true)
        : sb.from('questions_meta').select('*', withCount ? { count: 'exact' } : undefined);""",
    """        ? sb.from('questions').select(Q_META_COLS, withCount ? { count: 'exact' } : undefined).neq('pool','mock').in('exam', RE_EXAMS)
        : sb.from('questions_meta').select('question_id').eq('question_id', '__re_admin_only__');   // RE phase 1: admin only (members would get EA rows)""", "meta-query")
one("  const Q_TABLE = S.isAdminUser ? 'questions' : 'questions_meta';",
    "  const Q_TABLE = S.isAdminUser ? 'questions' : 'questions_meta';\n  if (!S.isAdminUser) { var _ro = document.getElementById('re-admin-only'); if (_ro) _ro.classList.add('show'); }", "admin-gate")
one("""        .eq('exam','ea')      // EA만 백필 — RE 등 타시험 차단 (2026-07-22)
        .eq('is_active', true)   // 내린 문항 제외 (2026-08-22) — 메타 로드와 같은 잣대""",
    """        .in('exam', RE_EXAMS)   // RE app: National + chosen state (RE bank is pre-launch, is_active=false)""", "backfill")
one("part: r.part ? ('Part ' + r.part) : 'Part 1',",
    "part: (r.exam === 're-n' || /^RE-N-/.test(r.question_id || '')) ? 'Part 1' : 'Part 2',", "part-map", n=2)
one("async function fetchCopRows(){", "async function fetchCopRows(){ return null; /* RE app: cop_reference is EA-only */ }\nasync function _eaFetchCopRows_unused(){", "cop")

# ── labels ──
one("""  'Part 1': { ko: 'Part 1 — 개인세', en: 'Part 1 — Individuals',""",
    """  'Part 1': { ko: 'National — 공통', en: 'National',""", "pm1")
one("""  'Part 2': { ko: 'Part 2 — 사업세', en: 'Part 2 — Businesses',""",
    """  'Part 2': { ko: RE_STATE_KO[RE_STATE] + ' — 주 시험', en: RE_STATES[RE_STATE] + ' — State',""", "pm2")
one("  document.getElementById('q-part').textContent=q.part;",
    "  document.getElementById('q-part').textContent = (q.part === 'Part 1') ? 'National' : RE_STATES[RE_STATE];", "qpart")
one("  const parts = ['Part 1','Part 2','Part 3'];", "  const parts = ['Part 1','Part 2'];", "parts-dash")
one("  var parts = ['Part 1','Part 2','Part 3'];", "  var parts = ['Part 1','Part 2'];", "parts-2")
one("  ['Part 1','Part 2','Part 3'].forEach(function(p){", "  ['Part 1','Part 2'].forEach(function(p){", "parts-3")
h = h.replace('<div class="setup-icon-label">Part 1</div>', '<div class="setup-icon-label">National</div>', 1)
h = h.replace('<div class="setup-icon-label">Part 2</div>', '<div class="setup-icon-label"><script>document.write(RE_STATES[RE_STATE])</script></div>', 1)

# ── domains (topic picker): RE outline-code ranges; q = null → the picker shows topic counts only ──
i = h.index("var EXAM_DOMAINS = {"); j = h.index("\n};\n", i) + 4
h = h[:i] + """var EXAM_DOMAINS = {
  'Part 1': [
    { name:'Property, Land Use and Legal Descriptions', q:null, r:[['N-PROP','N-PROP~']] },
    { name:'Ownership, Transfer and Recording',         q:null, r:[['N-OWN','N-OWN~']] },
    { name:'Value and Appraisal',                       q:null, r:[['N-VAL','N-VAL~']] },
    { name:'Contracts',                                 q:null, r:[['N-CON','N-CON~']] },
    { name:'Agency',                                    q:null, r:[['N-AGY','N-AGY~']] },
    { name:'Real Estate Practice',                      q:null, r:[['N-PRAC','N-PRAC~']] },
    { name:'Disclosures and Environmental',             q:null, r:[['N-DISC','N-DISC~']] },
    { name:'Financing and Settlement',                  q:null, r:[['N-FIN','N-FIN~']] },
    { name:'Real Estate Math',                          q:null, r:[['N-MATH','N-MATH~']] },
    { name:'Federal Law',                               q:null, r:[['N-FED','N-FED~']] }
  ],
  'Part 2': [
    { name:'State-only rules',                          q:null, r:[[RE_STATE.toUpperCase()+'-S', RE_STATE.toUpperCase()+'-S~']] },
    { name:'Where your state differs',                  q:null, r:[[RE_STATE.toUpperCase()+'-V', RE_STATE.toUpperCase()+'-V~']] },
    { name:'National topics under state law',           q:null, r:[['N-','N-~']] }
  ],
  'Part 3': []
};
""" + h[j:]
# the picker prints d.q; skip it when null
h = h.replace("""      ? (LANG === 'en' ? (nt + (nt === 1 ? ' topic' : ' topics') + ' · ' + d.q + ' ' + t('topic_onexam'))
                       : ('토픽 ' + nt + '개 · ' + t('topic_onexam') + ' ' + d.q + '문제'))
      : (LANG === 'en' ? (d.q + ' ' + t('topic_onexam'))
                       : (t('topic_onexam') + ' ' + d.q + '문제'));""",
"""      ? (d.q == null ? (LANG === 'en' ? (nt + (nt === 1 ? ' topic' : ' topics')) : ('토픽 ' + nt + '개'))
         : (LANG === 'en' ? (nt + (nt === 1 ? ' topic' : ' topics') + ' · ' + d.q + ' ' + t('topic_onexam'))
                       : ('토픽 ' + nt + '개 · ' + t('topic_onexam') + ' ' + d.q + '문제')))
      : (d.q == null ? '' : (LANG === 'en' ? (d.q + ' ' + t('topic_onexam'))
                       : (t('topic_onexam') + ' ' + d.q + '문제')));""")

# ── shared user_progress / sessions: the RE copy keeps only RE rows (the EA app keeps only non-RE rows) ──
one("function _isMyExamId(id){ return !/^(MOCK-)?RE-/i.test(id || ''); }",
    "function _isMyExamId(id){ return /^(MOCK-)?RE-/i.test(id || ''); }", "my-exam")

one("function _isMyExamAnn(a){ return ((a && a.exam) || 'ea') !== 're'; }",
    "function _isMyExamAnn(a){ return !!(a && a.exam === 're'); }", "my-ann")
# ── admin menu: the EA admin screen (users, payments, daily quiz, War Room stats, announcements editor) is EA-only.
#    Hidden in the RE app until an RE admin screen exists (boss 2026-10-24 «관리자 메뉴도 분리»). ──

# ── live_session is ONE row per user: the RE app must not overwrite/delete the EA app's resumable session ──
one("function saveLiveSessionToCloud(){", "function saveLiveSessionToCloud(){ return; /* RE app phase 1: keep the EA live session intact */ }\nfunction _eaSaveLiveSessionToCloud_unused(){", "live-save")
one("async function loadLiveSessionFromCloud(){", "async function loadLiveSessionFromCloud(){ return null; /* RE app phase 1 */ }\nasync function _eaLoadLiveSessionFromCloud_unused(){", "live-load")
one("  if(SB_USER){ sb.from('live_session').delete().eq('user_id', SB_USER.id); }", "  /* RE app phase 1: never delete the EA live session */", "live-del")

# ── War Room: RE sheets are in war_room_topics with status='draft' (hidden from the EA RPCs on purpose).
#    The RE app (admin) reads the table directly: National + the chosen state's sheets. ──
import json as _json
_codes = _json.load(io.open(r"C:/Users/Yongj/OneDrive/1_DXD Computer/0_PracExam/Real Estate Agent/war_room/codes.json", encoding="utf-8"))
from collections import Counter as _C
_cnt = _C("-".join(c["code"].split("-")[:2]) for c in _codes)
WR_LIST = ("sb.from('war_room_topics').select('outline_code,part,domain,title_ko,title_en,is_free,sort_order')"
           ".eq('status','draft').or('outline_code.like.N-*,outline_code.like.' + RE_STATE.toUpperCase() + '-*').order('sort_order')")
one("sb.rpc('list_war_room_topics')", WR_LIST, "wr-list", n=2)
one("sb.rpc('get_war_room_topic',{p_code:code})", "sb.from('war_room_topics').select('*').eq('outline_code',code).eq('status','draft')", "wr-get")
one("sb.rpc('get_war_room_preview',{p_code:code})", "sb.from('war_room_topics').select('*').eq('outline_code',code).eq('status','draft')", "wr-preview")
one("return sb.rpc('search_war_room',{p_q:nq})", "return Promise.resolve({ data:null, error:'RE phase 1: no body search' })", "wr-search")
one("""  var tabs=''; [1,2,3].forEach(function(p){ tabs+='<button class="wr-ptab'+(p===WR.curPart?' active':'')+'" onclick="_wrSetPart('+p+')">Part '+p+'</button>'; });""",
    """  var tabs=''; [1,2].forEach(function(p){ tabs+='<button class="wr-ptab'+(p===WR.curPart?' active':'')+'" onclick="_wrSetPart('+p+')">'+(p===1?'National':RE_STATES[RE_STATE])+'</button>'; });""", "wr-tabs")
one("  [1,2,3].forEach(function(p){", "  [1,2].forEach(function(p){", "wr-parts-loop")
i = h.index("var WR_SKELETON={"); j = h.index("\n};\n", i) + 4
st = "' + RE_STATE.toUpperCase() + '"
h = h[:i] + """var WR_SKELETON={
 1:[['Property, Land Use and Legal Descriptions','물권·토지 이용·법적 기술',%d],['Ownership, Transfer and Recording','소유·이전·등기',%d],
    ['Value and Appraisal','가치와 감정평가',%d],['Contracts','계약',%d],['Agency','대리',%d],['Real Estate Practice','부동산 실무',%d],
    ['Disclosures and Environmental','공시와 환경',%d],['Financing and Settlement','금융과 정산',%d],['Real Estate Math','부동산 계산',%d],['Federal Law','연방법',%d]],
 2:[['State-only rules','주에만 있는 규칙',0],['Where your state differs','주마다 다른 규칙',0]]
};
""" % tuple(_cnt[p] for p in ("N-PROP", "N-OWN", "N-VAL", "N-CON", "N-AGY", "N-PRAC", "N-DISC", "N-FIN", "N-MATH", "N-FED")) + h[j:]
h = h.replace("#nav-mock, #nav-warroom, #nav-videos { display:none !important; }", "#nav-mock, #nav-videos, #nav-anomaly { display:none !important; }")
one("""inner='<div class="wr-dom-empty">'+(lang==='en'?'Coming soon':'곧 추가됩니다')+' ('+cnt+')</div>';""",
    """inner='<div class="wr-dom-empty">'+(lang==='en'?'No sheets for this state yet':'이 주의 시트는 아직 없습니다')+'</div>';""", "wr-empty")

# ── visible EA labels ──
one('<div class="lg-title">EA Exam Practice</div>', '<div class="lg-title">Real Estate Exam Practice</div>', "lg-title")
one('<div class="lg-sub">PracExam.com · 2026 EA EXAM</div>', '<div class="lg-sub">PracExam.com · Real Estate License Exam</div>', "lg-sub")
one('<div class="header-title">EA Exam Practice</div>', '<div class="header-title">Real Estate Exam Practice</div>', "header-title")
one("' SESSION · 2026 EA EXAM'", "' SESSION · ' + RE_STATES[RE_STATE].toUpperCase() + ' REAL ESTATE'", "session-label")

one('<div class="header-sub">Enrolled Agent · 2026 Exam</div>',
    '<div class="header-sub"><script>document.write(RE_STATES[RE_STATE] + \' · Real Estate\')</script></div>', "header-sub")

# ── RE palette (boss 2026-10-24): EA Harbor teal → RE navy / steel blue (same values as exam-palettes.css) ──
for a, b in [("#354649", "#10304C"), ("#4d6164", "#2F5F8F"), ("#6FA39E", "#4F7CAC"), ("#E0E7E9", "#E3E9F0"),
             ("#EDF4F3", "#E8EFF7"), ("#d9ebe9", "#DCE7F3"), ("#e9eeee", "#E8EFF7"), ("#A3C6C4", "#A9C2DE"),
             ("#C9DEDB", "#A9C2DE"), ("#5D8F8A", "#3F6A96"), ("#232e30", "#16283A"), ("#4b5759", "#3E4C5A"),
             ("111,163,158", "79,124,172"), ("53,70,73", "16,48,76"), ("163,198,196", "169,194,222")]:
    h = h.replace(a, b).replace(a.lower(), b).replace(a.upper(), b)

# ── per-app keys (EA and RE apps share an origin) ──
for k in ("ea_focus_part", "ea_prep_v3"):
    h = h.replace("'%s'" % k, "'re_%s'" % k[3:])

# ── state switcher on the dashboard (top of the main area) ──
SB = """<div class="re-statebar">State: <select onchange="reSetState(this.value)">
  <option value="ca">California</option><option value="tx">Texas</option><option value="nj">New Jersey</option><option value="ny">New York</option>
</select><script>document.currentScript.previousElementSibling.value = RE_STATE;</script></div>"""
m = re.search(r'(<div[^>]*id="screen-dashboard"[^>]*>)', h)
if not m: sys.exit("no dashboard screen anchor")
h = h[:m.end()] + "\n" + SB + h[m.end():]

io.open(R + "re/app.html", "w", encoding="utf-8", newline="").write(h.replace("\n", "\r\n"))
print("built re/app.html", len(h))
