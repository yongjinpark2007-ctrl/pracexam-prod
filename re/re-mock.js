/* RE mock exams for /re/app (phase 1, admin only) — boss 2026-10-24.
   Replaces the EA mock hub (Part 1/2/3, server RPCs) with per-state numbered sets (회차).
   Questions: MOCK-RE-<ST>-<set>-<nnn> in `questions` (pre-launch, admin reads them directly).
   Exam formats come only from the official candidate documents on disk (re_generator/sources):
     CA  DRE pamphlet RE 4 — 150 multiple-choice questions, three hours, at least 70 percent.
     TX  Pearson VUE candidate handbook — Sales: National 85 items (150 min) + State 50 items (90 min), both 240 min;
         pass = 56 correct on National and 28 correct on State (of 80 / 40 scored items). Both portions must be passed.
     NJ  PSI candidate information bulletin — Salesperson 110 questions, 70% (77 correct), 4 hours.
     NY  DOS — 1 1/2 hours. DOS does not publish the question count or passing score.
   Our sets include the unscored pretest share as ordinary items, so TX is graded at 70% of each portion here.
   Grading is local (admin preview). Phase 2 (customers) needs server-side grading so keys never reach the browser. */
(function(){
  var FORMAT = {
    ca: { n:150, min:180, rule:'single', passPct:70, ko:'150문항 · 3시간 · 70% 이상 합격', en:'150 questions · 3 hours · pass at 70%' },
    tx: { n:135, min:240, rule:'portions', passPct:70, ko:'National 85 + 주 50 · 4시간 · 두 부분 각각 70% 이상', en:'National 85 + State 50 · 4 hours · pass each portion at 70%' },
    nj: { n:110, min:240, rule:'single', passPct:70, ko:'110문항 · 4시간 · 70% (77문항) 이상 합격', en:'110 questions · 4 hours · pass at 70% (77 correct)' },
    ny: { n:75,  min:90,  rule:'single', passPct:70, ko:'75문항 · 1시간 30분 · 합격선 미공개 (70% 기준으로 표시)', en:'75 questions · 1.5 hours · passing score not published (shown at 70%)' }
  };
  var SETS = [1, 2];
  var LSK = 're_mock_live_v1';
  var REM = { active:false };

  function L(ko, en){ return (typeof LANG !== 'undefined' && LANG === 'en') ? en : ko; }
  function esc(s){ var d = document.createElement('div'); d.textContent = (s == null ? '' : String(s)); return d.innerHTML; }
  function st(){ return (typeof RE_STATE !== 'undefined') ? RE_STATE : 'ca'; }
  function stName(){ return (typeof RE_STATES !== 'undefined') ? RE_STATES[st()] : 'California'; }
  function hub(){ return document.getElementById('mock-hub'); }
  function save(){ try{ if(REM.active) localStorage.setItem(LSK, JSON.stringify({ st:REM.st, set:REM.set, ids:REM.qs.map(function(q){return q.question_id;}), ans:REM.ans, flag:REM.flag, idx:REM.idx, endAt:REM.endAt })); }catch(e){} }
  function loadLS(){ try{ var r = localStorage.getItem(LSK); return r ? JSON.parse(r) : null; }catch(e){ return null; } }
  function clearLS(){ try{ localStorage.removeItem(LSK); }catch(e){} }
  function fmt(ms){ ms = Math.max(0, ms); var s = Math.floor(ms/1000), h = Math.floor(s/3600), m = Math.floor((s%3600)/60), x = s%60; return h + ':' + (m<10?'0':'') + m + ':' + (x<10?'0':'') + x; }

  async function fetchSet(state, set){
    var pre = 'MOCK-RE-' + state.toUpperCase() + '-' + set + '-';
    var res = await sb.from('questions')
      .select('question_id,text,options,correct,explanation,explanation_en,examtip,examtip_en,outline_code,topic')
      .like('question_id', pre + '%').order('question_id').range(0, 999);
    if(res.error) throw res.error;
    return res.data || [];
  }

  function renderHub(){
    var el = hub(); if(!el) return;
    var f = FORMAT[st()], live = loadLS();
    var html = '<div class="section-title">' + L('모의고사', 'Mock Exams') + ' · ' + esc(stName()) + '</div>' +
      '<div style="font-size:14.5px;color:var(--text-mid);margin:-4px 0 18px;line-height:1.6;">' + esc(L(f.ko, f.en)) + '</div>';
    if(live && live.st === st()){
      html += '<div class="card" style="padding:16px 18px;margin-bottom:16px;border:1.5px solid var(--sel-border);">' +
        '<b>' + L('진행 중인 모의고사', 'Mock exam in progress') + '</b> — ' + esc(stName()) + ' ' + L(live.set + '회', 'Set ' + live.set) +
        ' · ' + L('남은 시간 ', 'Time left ') + fmt(live.endAt - Date.now()) +
        '<div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">' +
        '<button class="btn-navy" style="padding:10px 18px;" onclick="REMock.resume()">' + L('이어서 풀기', 'Resume') + '</button>' +
        '<button class="btn-ghost" style="padding:10px 18px;" onclick="REMock.discard()">' + L('그만두기', 'Discard') + '</button></div></div>';
    }
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;">';
    SETS.forEach(function(s){
      html += '<div class="card" style="padding:20px;">' +
        '<div style="font-size:18px;font-weight:700;color:var(--text-main);margin-bottom:6px;">' + esc(stName()) + ' ' + L(s + '회', 'Set ' + s) + '</div>' +
        '<div style="font-size:13.5px;color:var(--text-muted);margin-bottom:16px;">' + f.n + L('문항 · ', ' questions · ') + (f.min >= 60 ? (f.min/60 + L('시간', (f.min === 60 ? ' hour' : ' hours'))) : (f.min + L('분', ' min'))) + '</div>' +
        '<button class="btn-navy" style="padding:10px 18px;width:100%;" onclick="REMock.start(' + s + ')">' + L('시작하기', 'Start') + '</button></div>';
    });
    html += '</div><div style="font-size:12.5px;color:var(--text-muted);margin-top:16px;line-height:1.6;">' +
      L('시험 형식은 각 주 공식 수험 안내서를 따릅니다. 실제 시험의 채점 제외(사전 시험) 문항도 이 세트에서는 채점합니다.',
        "Formats follow each state's official candidate handbook. Unscored pretest items in the real exam are scored in these sets.") + '</div>';
    el.innerHTML = html;
  }

  async function start(set){
    var el = hub(); el.innerHTML = '<div class="card" style="padding:20px;">' + L('문제를 불러오는 중…', 'Loading questions…') + '</div>';
    try{
      var qs = await fetchSet(st(), set);
      if(!qs.length){ el.innerHTML = '<div class="card" style="padding:20px;">' + L('이 회차 문제를 찾지 못했습니다.', 'No questions found for this set.') + '</div>'; return; }
      REM = { active:true, st:st(), set:set, qs:qs, ans:new Array(qs.length).fill(null), flag:[], idx:0, endAt:Date.now() + FORMAT[st()].min*60000 };
      save(); tick(); renderExam();
    }catch(e){ el.innerHTML = '<div class="card" style="padding:20px;">' + L('불러오지 못했습니다: ', 'Could not load: ') + esc(e && e.message) + '</div>'; }
  }
  async function resume(){
    var live = loadLS(); if(!live) return renderHub();
    var all = await fetchSet(live.st, live.set), by = {};
    all.forEach(function(q){ by[q.question_id] = q; });
    REM = { active:true, st:live.st, set:live.set, qs:live.ids.map(function(id){ return by[id]; }).filter(Boolean), ans:live.ans, flag:live.flag || [], idx:live.idx || 0, endAt:live.endAt };
    if(Date.now() >= REM.endAt) return submit(true);
    tick(); renderExam();
  }
  function discard(){ clearLS(); REM = { active:false }; renderHub(); }

  function tick(){
    clearInterval(REM._t);
    REM._t = setInterval(function(){
      if(!REM.active) return clearInterval(REM._t);
      var left = REM.endAt - Date.now(), t = document.getElementById('rem-timer');
      if(t) t.textContent = fmt(left);
      if(left <= 0){ clearInterval(REM._t); submit(true); }
    }, 1000);
  }

  function renderExam(){
    var el = hub(); if(!el || !REM.active) return;
    var q = REM.qs[REM.idx], n = REM.qs.length, a = REM.ans[REM.idx], fl = REM.flag.indexOf(REM.idx) >= 0;
    var opts = (q.options || []).map(function(o, i){
      return '<button class="option-btn' + (a === i ? ' selected' : '') + '" style="display:flex;gap:10px;width:100%;text-align:left;padding:13px 14px;margin:0 0 8px;border:1.5px solid ' + (a === i ? 'var(--sel-border)' : 'var(--border-clr)') + ';background:' + (a === i ? 'var(--sel-bg)' : 'var(--card-bg)') + ';border-radius:10px;cursor:pointer;font:inherit;color:var(--text-main);" onclick="REMock.pick(' + i + ')"><b>' + String.fromCharCode(65 + i) + '.</b><span>' + esc(o) + '</span></button>';
    }).join('');
    var grid = REM.qs.map(function(_, i){
      var bg = (REM.ans[i] != null) ? 'var(--sel-bg)' : 'var(--card-bg)', bd = (i === REM.idx) ? 'var(--navy)' : (REM.flag.indexOf(i) >= 0 ? 'var(--flag-color)' : 'var(--border-clr)');
      return '<button onclick="REMock.go(' + i + ')" style="width:38px;height:34px;border-radius:7px;border:1.5px solid ' + bd + ';background:' + bg + ';font:600 12.5px inherit;color:var(--text-main);cursor:pointer;">' + (i + 1) + '</button>';
    }).join('');
    var answered = REM.ans.filter(function(x){ return x != null; }).length;
    el.innerHTML =
      '<div class="mk-exam-bar" style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">' +
        '<span class="mk-timer" id="rem-timer">' + fmt(REM.endAt - Date.now()) + '</span>' +
        '<span class="mk-progtext">Question ' + (REM.idx + 1) + ' of ' + n + '</span><span style="flex:1"></span>' +
        '<button class="btn-ghost" style="padding:8px 12px;font-size:13px;" onclick="REMock.toggleFlag()">' + (fl ? '⚑ Flagged' : '⚐ Flag') + '</button>' +
        '<button class="btn-navy" style="padding:8px 14px;font-size:13px;" onclick="REMock.askSubmit()">' + L('제출', 'Submit') + '</button>' +
      '</div>' +
      '<div class="card" style="padding:20px;">' +
        '<div style="font-size:17px;line-height:1.7;color:var(--text-main);margin-bottom:16px;white-space:pre-line;">' + esc(q.text) + '</div>' + opts +
        '<div style="display:flex;justify-content:space-between;margin-top:10px;">' +
          '<button class="btn-ghost" style="padding:9px 16px;" ' + (REM.idx === 0 ? 'disabled' : '') + ' onclick="REMock.go(' + (REM.idx - 1) + ')">← Prev</button>' +
          '<button class="btn-ghost" style="padding:9px 16px;" ' + (REM.idx === n - 1 ? 'disabled' : '') + ' onclick="REMock.go(' + (REM.idx + 1) + ')">Next →</button>' +
        '</div></div>' +
      '<div class="card" style="padding:16px;margin-top:14px;"><div style="font-size:13px;color:var(--text-muted);margin-bottom:10px;">' +
        L('답한 문항 ', 'Answered ') + answered + ' / ' + n + '</div><div style="display:flex;flex-wrap:wrap;gap:6px;">' + grid + '</div></div>' +
      '<div id="rem-confirm"></div>';
  }
  function pick(i){ REM.ans[REM.idx] = i; save(); renderExam(); }
  function go(i){ if(i < 0 || i >= REM.qs.length) return; REM.idx = i; save(); renderExam(); window.scrollTo(0, 0); }
  function toggleFlag(){ var k = REM.flag.indexOf(REM.idx); if(k >= 0) REM.flag.splice(k, 1); else REM.flag.push(REM.idx); save(); renderExam(); }
  function askSubmit(){
    var left = REM.ans.filter(function(x){ return x == null; }).length, c = document.getElementById('rem-confirm');
    c.innerHTML = '<div class="card" style="padding:16px;margin-top:14px;border:1.5px solid var(--navy);">' +
      (left ? L('답하지 않은 문항이 ' + left + '개 있습니다. ', left + ' question(s) unanswered. ') : '') + L('제출하고 채점할까요?', 'Submit and grade?') +
      '<div style="margin-top:12px;display:flex;gap:10px;"><button class="btn-navy" style="padding:9px 18px;" onclick="REMock.submit()">' + L('제출', 'Submit') + '</button>' +
      '<button class="btn-ghost" style="padding:9px 18px;" onclick="document.getElementById(\'rem-confirm\').innerHTML=\'\'">' + L('계속 풀기', 'Keep going') + '</button></div></div>';
    c.scrollIntoView({ behavior:'smooth', block:'center' });
  }

  function submit(timeUp){
    clearInterval(REM._t);
    var f = FORMAT[REM.st], rows = REM.qs.map(function(q, i){
      var portion = (REM.st === 'tx') ? (((q.outline_code || '').indexOf('N-') === 0) ? 'National' : 'State') : null;
      return { q:q, i:i, a:REM.ans[i], ok:(REM.ans[i] === q.correct), portion:portion };
    });
    function score(list){ var c = list.filter(function(r){ return r.ok; }).length; return { c:c, n:list.length, pct:list.length ? Math.round(c * 1000 / list.length) / 10 : 0 }; }
    var all = score(rows), parts = null, pass;
    if(f.rule === 'portions'){
      parts = ['National', 'State'].map(function(p){ var s = score(rows.filter(function(r){ return r.portion === p; })); s.name = p; s.pass = s.pct >= f.passPct; return s; });
      pass = parts.every(function(p){ return p.pass; });
    } else pass = all.pct >= f.passPct;
    REM.active = false; clearLS();
    var el = hub();
    var head = '<div class="section-title">' + esc(stName()) + ' ' + L(REM.set + '회 결과', 'Set ' + REM.set + ' — Result') + '</div>' +
      (timeUp ? '<div style="color:var(--flag-color);margin:-4px 0 12px;">' + L('시간이 끝나 자동 제출되었습니다.', 'Time is up — submitted automatically.') + '</div>' : '') +
      '<div class="card" style="padding:20px;margin-bottom:16px;"><div style="font-size:30px;font-weight:800;color:' + (pass ? 'var(--success-color)' : 'var(--danger-color)') + ';">' +
      (pass ? L('합격 수준', 'Pass level') : L('불합격 수준', 'Below pass level')) + '</div>' +
      '<div style="font-size:15px;color:var(--text-mid);margin-top:6px;">' + L('정답 ', 'Correct ') + all.c + ' / ' + all.n + ' (' + all.pct + '%)</div>' +
      (parts ? parts.map(function(p){ return '<div style="font-size:14px;margin-top:4px;">' + p.name + ': ' + p.c + ' / ' + p.n + ' (' + p.pct + '%) ' + (p.pass ? '✓' : '✗') + '</div>'; }).join('') : '') +
      '<div style="font-size:12.5px;color:var(--text-muted);margin-top:8px;">' + esc(L(f.ko, f.en)) + '</div>' +
      '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;"><button class="btn-navy" style="padding:9px 18px;" onclick="REMock.hub()">' + L('모의고사 목록', 'Mock exams') + '</button>' +
      '<button class="btn-ghost" style="padding:9px 18px;" onclick="REMock.onlyWrong(this)">' + L('틀린 문항만 보기', 'Show wrong only') + '</button></div></div>';
    var list = rows.map(function(r){
      var q = r.q, exp = L(q.explanation || q.explanation_en, q.explanation_en || q.explanation), tip = L(q.examtip || q.examtip_en, q.examtip_en || q.examtip);
      return '<details class="card rem-row' + (r.ok ? ' rem-ok' : '') + '" style="padding:14px 16px;margin-bottom:10px;border-left:4px solid ' + (r.ok ? 'var(--success-color)' : 'var(--danger-color)') + ';">' +
        '<summary style="cursor:pointer;font-weight:600;color:var(--text-main);">' + (r.i + 1) + '. ' + (r.ok ? '✓' : '✗') + ' ' + esc((q.text || '').slice(0, 90)) + ((q.text || '').length > 90 ? '…' : '') + '</summary>' +
        '<div style="margin-top:10px;white-space:pre-line;line-height:1.7;">' + esc(q.text) + '</div>' +
        '<ol type="A" style="margin:10px 0 10px 22px;line-height:1.7;">' + (q.options || []).map(function(o, i){
          return '<li style="' + (i === q.correct ? 'color:var(--success-color);font-weight:700;' : (i === r.a ? 'color:var(--danger-color);text-decoration:line-through;' : '')) + '">' + esc(o) + '</li>'; }).join('') + '</ol>' +
        (r.a == null ? '<div style="color:var(--text-muted);font-size:13px;">' + L('답하지 않음', 'Not answered') + '</div>' : '') +
        '<div style="white-space:pre-line;line-height:1.75;color:var(--text-mid);margin-top:8px;">' + esc(exp) + '</div>' +
        (tip ? '<div style="margin-top:10px;padding:10px 12px;border-left:3px solid var(--accent);background:var(--accent-tint);border-radius:0 8px 8px 0;white-space:pre-line;"><b>Exam Tip</b><br>' + esc(tip) + '</div>' : '') +
        '</details>';
    }).join('');
    el.innerHTML = head + list;
    window.scrollTo(0, 0);
  }
  function onlyWrong(btn){
    var on = btn.getAttribute('data-on') !== '1'; btn.setAttribute('data-on', on ? '1' : '0');
    btn.textContent = on ? L('전체 보기', 'Show all') : L('틀린 문항만 보기', 'Show wrong only');
    document.querySelectorAll('.rem-ok').forEach(function(d){ d.style.display = on ? 'none' : ''; });
  }

  window.REMock = { start:start, resume:resume, discard:discard, pick:pick, go:go, toggleFlag:toggleFlag, askSubmit:askSubmit, submit:submit, hub:renderHub, onlyWrong:onlyWrong };
  // the app calls renderMockHub() when the Mock screen opens and on language change
  window.renderMockHub = function(){ if(REM.active) renderExam(); else renderHub(); };
})();
