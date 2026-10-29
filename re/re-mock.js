/* RE mock exams for /re/app (phase 1, admin only) — boss 2026-10-24:
   «EA의 모의고사 시험 화면과 문제 해설, 통계등을 그대로 사용하세요. 단 색상은 부동산 색상으로».
   The EA mock UI (hub, exam screen, review grid, timer, breaks, result, domain stats, weak topics, review modal,
   history) is kept as is. This file swaps only the data side that the EA server RPCs did:
     start_mock_exam  → load the fixed set MOCK-RE-<ST>-<set>-<nnn> (admin reads `questions` directly)
     grade_mock_exam  → grade in the browser (admin preview; customers need server grading in phase 2)
     mock_attempts    → history kept in this browser (localStorage) until an RE attempts table exists
   «Part 1/2/3» becomes «set 1/2» of the chosen state. build_re_app.py patches the EA screens' fixed 100s.
   Exam formats come only from the official candidate documents on disk (re_generator/sources):
     CA  DRE pamphlet RE 4 — 150 multiple-choice questions, three hours, at least 70 percent.
     TX  Pearson VUE handbook — Sales: National 85 items + State 50 items, 240 min for both;
         pass = 56 correct National and 28 correct State (of 80 / 40 scored). Both portions must be passed.
     NJ  PSI bulletin — Salesperson 110 questions, 70% (77 correct), 4 hours.
     NY  DOS — 1 1/2 hours. DOS does not publish the question count or the passing score.
     FL  DBPR/Pearson VUE sales associate booklet — 100 multiple-choice questions, 3 1/2 hours, 75 points or higher (2026-10-29). */
(function(){
  var FMT = {
    ca: { n:150, min:180, pct:70, portions:false, ko:['150문항 · 3시간', '70% 이상이면 합격 (California DRE 기준)'], en:['150 questions · 3 hours', 'Pass at 70% or more (California DRE)'] },
    tx: { n:135, min:240, pct:70, portions:true,  ko:['National 85 + 주 50문항 · 4시간', 'National과 주 부분을 각각 70% 이상 맞혀야 합격 (실제 시험: 채점 80문항 중 56개 · 40문항 중 28개)'],
                                                   en:['National 85 + State 50 questions · 4 hours', 'Pass each portion at 70% (real exam: 56 of 80 and 28 of 40 scored items)'] },
    fl: { n:100, min:210, pct:75, portions:false, ko:['100문항 · 3시간 30분', '75점 이상이면 합격 (Florida DBPR 기준)'], en:['100 questions · 3 hours 30 minutes', 'Pass at 75 or more (Florida DBPR)'] },
    nj: { n:110, min:240, pct:70, portions:false, ko:['110문항 · 4시간', '70% (77문항) 이상이면 합격 (PSI 기준)'], en:['110 questions · 4 hours', 'Pass at 70% (77 correct) or more (PSI)'] },
    ny: { n:75,  min:90,  pct:70, portions:false, ko:['75문항 · 1시간 30분', '뉴욕주는 합격선을 공개하지 않습니다 — 여기서는 70%로 표시'], en:['75 questions · 1 hour 30 minutes', 'New York does not publish a passing score — shown here at 70%'] }
  };
  var F = FMT[(typeof RE_STATE !== 'undefined' && FMT[RE_STATE]) ? RE_STATE : 'ca'];
  var STN = (typeof RE_STATES !== 'undefined') ? RE_STATES[RE_STATE] : 'California';
  var HIST = 're_mock_hist_v1';
  var KEYS = {};   // question_id -> full row (correct + explanation), loaded with the set

  MOCK_DURATION_SEC = F.min * 60;           // EA global, read by the timer
  if(!Mock.selPart || Mock.selPart > 2) Mock.selPart = 1;

  window.reMockLabel = function(p){ return STN + ' ' + mL(p + '회', 'Set ' + p); };
  window.reMockNote = function(){
    return mL('실제 시험의 채점 제외 문항도 이 회차에서는 모두 채점합니다. ' + F.ko[1],
              'Unscored pretest items in the real exam are all scored here. ' + F.en[1]);
  };

  function hist(){ try{ return JSON.parse(localStorage.getItem(HIST) || '[]'); }catch(e){ return []; } }
  function saveHist(a){ try{ localStorage.setItem(HIST, JSON.stringify(a.slice(0, 50))); }catch(e){} }

  async function loadSet(set){
    var pre = 'MOCK-RE-' + String(RE_STATE).toUpperCase() + '-' + set + '-';
    var res = await sb.from('questions')
      .select('question_id,text,options,correct,explanation,explanation_en,examtip,examtip_en,outline_code,topic')
      .like('question_id', pre + '%').order('question_id').range(0, 999);
    if(res.error) throw res.error;
    (res.data || []).forEach(function(r){ KEYS[r.question_id] = r; });
    return (res.data || []).map(function(r){ return r.question_id; });
  }

  // ── hub: the EA hub, with set 1/2 in place of Part 1/2/3 ──
  window.renderMockHub = function(){
    var el = document.getElementById('mock-hub'); if(!el) return;
    var live = mockLoadLS();
    var html = '<div style="margin-bottom:1.25rem;"><div class="section-title">' + mL('실전 모의고사', 'Mock Exam') + ' · ' + STN + '</div>' +
      '<div style="font-size:15.5px;color:var(--text-muted);">' + mL('실제 시험과 같은 조건으로 응시하세요.', 'Sit a full exam under real exam conditions.') + '</div></div>';
    if(live && live.attemptId){
      var rem = mockRemainingOf(live), ans = Object.keys(live.answers || {}).length;
      html += '<div style="background:var(--accent-tint);border:1px solid var(--accent);border-radius:12px;padding:.85rem 1rem;margin-bottom:1.25rem;font-size:14.5px;color:var(--text-main);line-height:1.6;">' +
        '⏱ <b>' + mL('진행 중인 모의고사', 'Mock exam in progress') + '</b> — ' + reMockLabel(live.part) + ' · ' + ans + '/' + (live.ids || []).length + ' ' + mL('응답', 'answered') +
        ' · <b>' + mL('남은', 'left') + ' ' + mockFmt(rem) + '</b> · ' + mL('만료 시 자동 제출', 'auto-submits at expiry') + '</div>';
    }
    var sets = '';
    [1, 2].forEach(function(p){
      sets += '<button class="setup-icon-btn' + (Mock.selPart === p ? ' selected' : '') + '" onclick="mockSelectPart(' + p + ')">' +
        '<div class="setup-icon-circle" style="font-weight:800;font-size:18px;color:var(--navy);">' + p + '</div>' +
        '<div class="setup-icon-label">' + mL(p + '회', 'Set ' + p) + '</div></button>';
    });
    html += '<div class="start-card"><div class="setup-section-label">' + mL('회차 선택', 'Choose a set') + '</div>' +
      '<div class="setup-icon-grid" style="grid-template-columns:repeat(2,1fr);gap:12px;">' + sets + '</div><div class="setup-divider"></div>' +
      '<div style="font-size:15px;color:var(--text-mid);line-height:1.85;">' +
        '• ' + mL(F.ko[0], F.en[0]) + '<br>' +
        '• ' + mL(F.ko[1], F.en[1]) + '<br>' +
        '• ' + mL('시험당 최대 2회 휴식 (휴식 중 시험 시계 정지)', 'Up to 2 breaks per exam — clock pauses during breaks') + '<br>' +
        '• ' + mL('시험 종료 후 문항별 해설, 영역별 결과, 약점 토픽 Top 5 분석 제공', 'Per-question explanations, results by area, and Weak Topics Top 5 after you finish') +
      '</div><div class="mk-lastscores" id="mock-lastscores"></div>' +
      (live && live.attemptId
        ? '<button class="setup-cta-btn" style="margin-top:1.25rem;" onclick="mockResume()">' + mL('이어하기', 'Resume') + '</button>' +
          '<button class="btn-ghost" style="width:100%;margin-top:8px;" onclick="mockStart()">' + mL('새 모의고사로 다시 시작', 'Start a new mock exam') + '</button>'
        : '<button class="setup-cta-btn" style="margin-top:1.25rem;" onclick="mockStart()">' + mL('모의고사 시작', 'Start mock exam') + '</button>') +
      '<div style="margin-top:12px;text-align:center;"><a href="#" onclick="showScreen(\'mock-history\');return false;" style="font-size:14.5px;color:var(--teal);font-weight:700;text-decoration:none;">' +
        mL('모의고사 이력 보기 →', 'View history →') + '</a></div></div>';
    el.innerHTML = html;
    mockFillLastScores();
  };
  window.mockFillLastScores = function(){
    var box = document.getElementById('mock-lastscores'); if(!box) return;
    var h = hist().filter(function(a){ return a.st === RE_STATE && a.part === Mock.selPart; });
    if(!h.length){ box.innerHTML = ''; return; }
    var last = h[0], best = h.reduce(function(a, b){ return b.score_correct > a.score_correct ? b : a; });
    box.innerHTML = '<span class="mk-chip">' + mL('최근', 'Last') + ': <b>' + last.score_correct + '/' + last.score_total + '</b></span>' +
      '<span class="mk-chip">' + mL('최고', 'Best') + ': <b>' + best.score_correct + '/' + best.score_total + '</b></span>';
  };
  window.renderMockDashCard = function(){
    var el = document.getElementById('dash-mock'); if(!el) return;
    var live = mockLoadLS();
    var sub = (live && live.attemptId) ? ('⏱ ' + mL('진행 중 · 남은 ', 'In progress · ') + mockFmt(mockRemainingOf(live))) : mL(F.ko[0], F.en[0]);
    el.innerHTML = '<div class="prem-row"><div class="prem-card" onclick="showScreen(\'mock\')">' +
      '<div class="prem-ico"><svg viewBox="0 0 24 24"><path d="M10 2h4"/><path d="M12 14l3-3"/><circle cx="12" cy="14" r="8"/></svg></div>' +
      '<div><div class="prem-tt">' + mL('실전 모의고사', 'Mock Exam') + '</div><div class="prem-sub">' + sub + '</div></div></div>' +
      '<div class="prem-card" onclick="showScreen(\'warroom\')"><div class="prem-ico ter"><svg viewBox="0 0 24 24"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg></div>' +
      '<div><div class="prem-tt">War Room</div><div class="prem-sub">' + mL('주제별 규칙 자세히 보기', 'Topic deep dives') + '</div></div></div></div>';
  };

  // ── start: the fixed set instead of start_mock_exam ──
  window._mockStartGo = async function(){
    var set = Mock.selPart;
    if(Mock.timerInt){ clearInterval(Mock.timerInt); Mock.timerInt = null; }
    showToast(mL('모의고사 준비 중…', 'Preparing mock exam…'));
    try{
      var ids = await loadSet(set);
      if(!ids.length) throw new Error('EMPTY');
      Mock.attemptId = 're-' + RE_STATE + '-' + set + '-' + Date.now(); Mock.part = set; Mock.ids = ids;
      Mock.qmap = {}; Mock.answers = {}; Mock.flags = {}; Mock.curIdx = 0; Mock.startedAt = Date.now(); Mock.result = null; Mock._practiceAck = false;
      Mock.pausedMs = 0; Mock.breakStart = null; Mock.breaksUsed = 0;
      mockPersist();
      await mockLoadPayloads(ids);
      showScreen('mock-exam'); mockBackToQ(); mockRenderQuestion(0); mockStartTimer();
    }catch(e){ showToast(mL('시작 실패: ', 'Start failed: ') + ((e && e.message) || e)); console.error('[re mock start]', e); }
  };
  window.mockLoadPayloads = async function(ids){
    try{
      var miss = ids.filter(function(id){ return !KEYS[id]; });
      for(var i = 0; i < miss.length; i += 150){
        var res = await sb.from('questions').select('question_id,text,options,correct,explanation,explanation_en,examtip,examtip_en,outline_code,topic').in('question_id', miss.slice(i, i + 150));
        if(res.error) throw res.error;
        (res.data || []).forEach(function(r){ KEYS[r.question_id] = r; });
      }
      ids.forEach(function(id){ var r = KEYS[id]; if(r) Mock.qmap[id] = { text:r.text, options:r.options }; });
      return true;
    }catch(e){ console.error('[re mock payload]', e); return false; }
  };

  // ── grade: in the browser instead of grade_mock_exam (same result shape) ──
  window.mockSubmit = async function(){
    if(Mock.timerInt){ clearInterval(Mock.timerInt); Mock.timerInt = null; }
    if(!Mock.attemptId) return;
    await mockLoadPayloads(Mock.ids);
    var pq = Mock.ids.map(function(id){
      var r = KEYS[id] || {}, ch = (Mock.answers[id] !== undefined ? Mock.answers[id] : -1);
      return { question_id:id, choice:ch, is_correct:(ch !== -1 && ch === r.correct), is_scored:true,
               outline_code:r.outline_code || '', topic:r.topic || '', flagged:!!Mock.flags[id] };
    });
    var res = { score_correct:pq.filter(function(x){ return x.is_correct; }).length, score_total:pq.length, per_question:pq, part:Mock.part };
    var h = hist(); h.unshift({ id:Mock.attemptId, st:RE_STATE, part:Mock.part, score_correct:res.score_correct, score_total:res.score_total,
                                started_at:new Date(Mock.startedAt).toISOString(), finished_at:new Date().toISOString(), per_question:pq });
    saveHist(h);
    Mock.result = res; mockClearLS(); Mock._practiceAck = false;
    renderMockResult(res); showScreen('mock-result');
  };

  // ── result: the EA result page + a pass line by this state's rule ──
  var _eaResult = window.renderMockResult;
  window.renderMockResult = function(r){
    _eaResult(r);
    var pq = r.per_question || [], rows = [], pass;
    function sc(list){ var c = list.filter(function(x){ return x.is_correct; }).length; return { c:c, n:list.length, p:list.length ? Math.round(c * 1000 / list.length) / 10 : 0 }; }
    if(F.portions){
      var nat = sc(pq.filter(function(x){ return (x.outline_code || '').indexOf('N-') === 0; }));
      var sta = sc(pq.filter(function(x){ return (x.outline_code || '').indexOf('N-') !== 0; }));
      pass = nat.p >= F.pct && sta.p >= F.pct;
      rows.push('National ' + nat.c + '/' + nat.n + ' (' + nat.p + '%) ' + (nat.p >= F.pct ? '✓' : '✗'));
      rows.push(mL('주 부분 ', 'State ') + sta.c + '/' + sta.n + ' (' + sta.p + '%) ' + (sta.p >= F.pct ? '✓' : '✗'));
    } else { var a = sc(pq); pass = a.p >= F.pct; }
    var hero = document.querySelector('#mock-result-wrap .mk-eyebrow');
    if(hero){
      var b = document.createElement('div');
      b.style.cssText = 'margin:8px 0 4px;font-size:18px;font-weight:800;color:' + (pass ? 'var(--success-color)' : 'var(--danger-color)') + ';';
      b.innerHTML = (pass ? mL('합격 수준', 'Pass level') : mL('불합격 수준', 'Below pass level')) +
        (rows.length ? '<div style="font-size:13.5px;font-weight:600;color:var(--text-mid);margin-top:4px;">' + rows.join(' · ') + '</div>' : '');
      hero.parentNode.insertBefore(b, hero.nextSibling);
    }
  };

  // ── history: this browser's attempts ──
  window.renderMockHistory = function(){
    var el = document.getElementById('mock-history-wrap'); if(!el) return;
    var data = hist().filter(function(a){ return a.st === RE_STATE; });
    var title = '<h2 style="font-size:20px;font-weight:800;color:var(--text-main);margin:2px 0 14px;">' + mL('모의고사 이력', 'Mock Exam History') + ' · ' + STN + '</h2>';
    if(!data.length){ el.innerHTML = title + '<div class="card"><div style="font-size:14px;color:var(--text-muted);">' + mL('아직 응시 기록이 없습니다.', 'No attempts yet.') + '</div>' +
      '<button class="btn-navy" style="margin-top:14px;" onclick="showScreen(\'mock\')">' + mL('모의고사 시작', 'Start a mock exam') + '</button></div>'; return; }
    var rows = data.map(function(a){
      return '<tr><td>' + (a.started_at || '').slice(5, 10) + '</td><td>' + reMockLabel(a.part) + '</td><td><b>' + a.score_correct + '/' + a.score_total + '</b> (' +
        Math.round(a.score_correct / a.score_total * 100) + '%)</td><td><a href="#" onclick="mockOpenPastResult(\'' + a.id + '\');return false;" style="color:var(--teal);font-weight:700;text-decoration:none;">' +
        mL('결과 보기', 'View') + ' →</a></td></tr>';
    }).join('');
    el.innerHTML = title + '<div class="card"><table class="mk-hist-tb"><thead><tr><th>' + mL('날짜', 'Date') + '</th><th>' + mL('회차', 'Set') + '</th><th>' + mL('점수', 'Score') +
      '</th><th></th></tr></thead><tbody>' + rows + '</tbody></table><p style="font-size:12px;color:var(--text-muted);margin-top:12px;">' +
      mL('관리자 미리보기: 이력은 이 브라우저에만 저장됩니다.', 'Admin preview: history is kept in this browser only.') + '</p></div>';
  };
  window.mockOpenPastResult = function(id){
    var a = hist().filter(function(x){ return x.id === id; })[0];
    if(!a){ showToast(mL('결과 로드 실패', 'Failed to load result')); return; }
    Mock.result = { score_correct:a.score_correct, score_total:a.score_total, per_question:a.per_question || [], part:a.part };
    renderMockResult(Mock.result); showScreen('mock-result');
  };
})();
