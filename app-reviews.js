/* EA app — customer review form + 30-Day Pro Pass (wired 2026-11-13 to supabase/sql/reviews_pro_pass_2026-11-13.sql).
   Boss decisions 2026-11-12/13: EA only · 250+ EA questions answered · not refunded (Blackout) · one review per account ·
   pass when the reviewer agrees to publish and Q2/Q3 reach the minimum (KO screen 40, EN screen 80 letters/digits),
   whatever the review says · pass valid 12 months, own use or gift to a never-paid account.
   🔴 Test hosts only until the boss's end-to-end test and the legal check. */
(function(){
  'use strict';
  var host = location.hostname;
  var IS_TEST = /^test\.pracexam\.com$/i.test(host) || /\.pages\.dev$/i.test(host) || host === 'localhost' || host === '127.0.0.1';
  if (!IS_TEST) return;   // not live on pracexam.com until wired and approved

  var MIN_SOLVED = 250;
  function realLen(t){
    var x = String(t || '').replace(/[^\p{L}\p{N}]/gu, '').replace(/[\u3131-\u318E]/g, '');
    return x.replace(/(.)\1{2,}/gu, '$1').length;
  }
  function minChars(){ return en() ? 80 : 40; }   // boss 2026-11-13: KO screen 40, EN screen 80
  var STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

  function en(){ try { return LANG === 'en'; } catch(e){ return true; } }
  function L(ko, e){ return en() ? e : ko; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  function solvedCount(){
    try { return Object.keys(S.answered || {}).filter(function(k){ return (S.answered[k].times || 0) > 0; }).length; } catch(e){ return 0; }
  }
  function displayName(){
    var f = '', l = '';
    try { var m = (SB_USER && SB_USER.user_metadata) || {}; f = (S.firstName || m.first_name || '').trim(); l = (S.lastName || m.last_name || '').trim(); } catch(e){}
    if (!f) return '';
    // boss 2026-11-13: Korean names (4 of 190 profiles, all «이름 2 + 성 1») use the Korean masking style 김*수.
    if (/[\uac00-\ud7a3]/.test(f + l)) {
      if (!l) return f.length > 1 ? f.charAt(0) + '*' + (f.length > 2 ? f.charAt(f.length - 1) : '') : f + '*';
      return l + '*' + (f.length > 1 ? f.charAt(f.length - 1) : '');
    }
    return f.charAt(0).toUpperCase() + f.slice(1) + (l ? ' ' + l.charAt(0).toUpperCase() + '.' : '');
  }

  // ── styles ──
  var css = ''
    + '#screen-review .rvm{max-width:760px;margin:0 auto;background:var(--card-bg,#fff);border:1px solid var(--border-clr);border-radius:14px;padding:1.5rem;}'
    + '@media (max-width:640px){#screen-review .rvm{padding:1.1rem;}}'
    + '.rvm-saved{font-size:12.5px;color:var(--text-muted);margin-left:auto;align-self:center;}'
    + '.rvm h3{font-size:19px;font-weight:700;color:var(--text-main);margin:0 0 4px;}'
    + '.rvm .rvm-sub{font-size:14.5px;color:var(--text-muted);line-height:1.6;margin:0 0 14px;}'
    + '.rvm .rvm-sample{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.12em;color:#fff;background:#dc2626;border-radius:4px;padding:2px 7px;margin-bottom:10px;}'
    + '.rvm-notice{margin-top:20px;padding-top:14px;border-top:1px solid var(--border-clr);}'
    + '.rvm-rules{font-size:13px;line-height:1.6;color:var(--text-muted);}'
    + '.rvm-rules b{display:block;margin-bottom:4px;}'
    + '.rvm-rules ul{margin:0;padding-left:1.2em;}'
    + '.rvm-f{margin-bottom:16px;}'
    + '.rvm-f label.q{display:block;font-size:15px;font-weight:700;color:var(--text-main);margin-bottom:6px;}'
    + '.rvm-f .opt{font-weight:500;color:var(--text-muted);font-size:13px;}'
    + '.rvm-f select,.rvm-f textarea,.rvm-f input[type=text],.rvp-redeem input{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:10px 12px;border:1px solid var(--border-clr);border-radius:10px;background:#fff;color:var(--text-main);}'
    + '.rvm-f textarea{min-height:84px;resize:vertical;line-height:1.55;}'
    + '.rvm-count{font-size:12.5px;color:var(--text-muted);text-align:right;margin-top:3px;}'
    + '.rvm-count.ok{color:var(--success-color,#16a34a);}'
    + '.rvm-check{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;line-height:1.55;color:var(--text-main);cursor:pointer;}'
    + '.rvm-check input{margin-top:4px;width:18px;height:18px;flex:0 0 auto;}'
    + '.rvm-hint{font-size:13px;color:var(--text-muted);margin:4px 0 0 28px;}'
    + '.rvm-err{color:var(--danger-color,#dc2626);font-size:14px;margin:8px 0 0;min-height:1em;}'
    + '.rvm-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;}'
    + '.rvm-actions .btn-navy,.rvm-actions .btn-ghost{padding:11px 20px;font-size:15.5px;}'
    + '#rvm-submit{background:#354649;color:#fff;border-color:#354649;font-weight:700;}#rvm-submit:hover{background:#2a383a;color:#fff;}'   // boss 2026-11-13: darker submit
    + '.rvm-bar{height:10px;border-radius:999px;background:var(--border-clr);overflow:hidden;margin:10px 0 6px;}'
    + '.rvm-bar span{display:block;height:100%;background:var(--teal,#354649);}'
    + '.rvm-code{font:700 22px/1.2 ui-monospace,Consolas,monospace;letter-spacing:.06em;color:var(--text-main);background:#fff;border:2px dashed var(--teal,#354649);border-radius:12px;padding:14px;text-align:center;margin:12px 0;}'
    + '.rvp-card{background:var(--card-bg);border:1px solid var(--border-clr);border-radius:14px;padding:1.25rem;margin-top:1rem;}'
    + '.rvp-row{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 0;border-bottom:1px solid var(--border-clr);}'
    + '.rvp-row:last-of-type{border-bottom:none;}'
    + '.rvp-code{font:700 16px ui-monospace,Consolas,monospace;letter-spacing:.05em;color:var(--text-main);}'
    + '.rvp-meta{font-size:13.5px;color:var(--text-muted);line-height:1.5;}'
    + '.rvp-btns{display:flex;gap:8px;flex-wrap:wrap;}'
    + '.rvp-btns button{padding:8px 14px;font-size:14px;}'
    + '.rvp-redeem{display:flex;gap:8px;margin-top:10px;max-width:420px;}'
    + '.rvp-redeem input{text-transform:uppercase;letter-spacing:.05em;}'
    + '.rvp-redeem button{white-space:nowrap;padding:10px 16px;font-size:15px;}'
    + '.rvm-parts{display:flex;flex-wrap:wrap;gap:8px 18px;}'
    + '.rvm-parts label{display:flex;align-items:center;gap:7px;font-size:15px;color:var(--text-main);cursor:pointer;}'
    + '.rvm-parts input{width:18px;height:18px;}'
    + '.rvm-req{font-size:13px;color:var(--danger-color,#dc2626);margin-left:4px;font-weight:600;}'
    + '.rvp-chip{display:inline-block;font-size:12px;font-weight:700;border-radius:999px;padding:2px 9px;margin-left:8px;vertical-align:middle;}'
    + '.rvp-chip.ok{background:#dcfce7;color:#166534;}.rvp-chip.done{background:var(--border-clr);color:var(--text-muted);}'
    + '.rvp-gift{width:100%;background:var(--page-bg,#f4f6f6);border-radius:10px;padding:10px 12px;font-size:14px;line-height:1.6;color:var(--text-main);margin-top:8px;}'
    + '.rvp-gift textarea{width:100%;box-sizing:border-box;font:inherit;font-size:14px;min-height:96px;padding:8px 10px;border:1px solid var(--border-clr);border-radius:8px;margin:6px 0;}'
    + '.rvp-sec{font-size:14px;font-weight:700;color:var(--text-muted);margin:18px 0 6px;padding-top:14px;border-top:1px solid var(--border-clr);}'
    + '.rvp-note{font-size:13.5px;color:var(--text-muted);line-height:1.6;margin-top:10px;}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ── menu items: More menu AND drawer (a new menu item goes in both) ──
  var ICO = '<svg class="%C" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/></svg>';
  function addMenus(){
    var more = document.getElementById('nav-settings'), drawer = document.getElementById('mob-settings');
    if (more && !document.getElementById('nav-review')){
      var b = document.createElement('button'); b.className = 'nav-btn'; b.id = 'nav-review'; b.type = 'button';
      b.innerHTML = ICO.replace('%C', 'nav-ico') + '<span class="rv-menu-label"></span>';
      b.onclick = function(){ try{ closeNavMore(); }catch(e){} openReview(); };
      more.parentNode.insertBefore(b, more);
    }
    if (drawer && !document.getElementById('mob-review-write')){
      var d = document.createElement('button'); d.className = 'mobile-nav-item'; d.id = 'mob-review-write'; d.type = 'button';
      d.innerHTML = ICO.replace('%C', 'mob-ico') + '<span class="rv-menu-label"></span>';
      d.onclick = function(){ try{ closeDrawer(); }catch(e){} openReview(); };
      drawer.parentNode.insertBefore(d, drawer);
    }
    document.querySelectorAll('.rv-menu-label').forEach(function(s){ s.textContent = L('리뷰 작성하기', 'Write a Review'); });
  }

  // ── review screen (boss 2026-11-13: the popup closed on a stray click and lost the text → a normal app screen) ──
  var screenEl;
  function screen(){
    if (screenEl) return screenEl;
    screenEl = document.createElement('div'); screenEl.className = 'screen'; screenEl.id = 'screen-review';
    screenEl.innerHTML = '<div class="rvm"><div id="rvm-body"></div></div>';
    var settings = document.getElementById('screen-settings');
    if (settings && settings.parentNode) settings.parentNode.insertBefore(screenEl, settings.nextSibling);
    else document.body.appendChild(screenEl);
    return screenEl;
  }
  function closeReview(){ try { showScreen('dashboard'); } catch(e){} }
  function body(html){
    screen().querySelector('#rvm-body').innerHTML = html;
    try { if (!screenEl.classList.contains('active')) showScreen('review'); } catch(e){}
    try { window.scrollTo(0, 0); } catch(e){}
  }

  function rulesBox(){   // wording by the boss 2026-11-13
    return '<div class="rvm-rules"><b>' + L('30-Day Pro Pass 증정 내용', 'How the 30-Day Pro Pass works') + '</b><ul>'
      + '<li>' + L('리뷰 게시에 동의하시고 2번과 3번 항목을 각각 ' + minChars() + '자 이상 작성하시면 리뷰 내용에 상관없이 30-Day Pro Pass 코드를 증정합니다.', 'Agree to publish and write at least ' + minChars() + ' characters each for questions 2 and 3, and you receive a 30-Day Pro Pass code, whatever your review says.') + '</li>'
      + '<li>' + L('발급된 코드는 12개월 이내에 직접 사용하거나, PracExam이 처음인 친구, 동료에게 선물하실 수 있습니다.', 'Use the code yourself within 12 months, or give it to a friend or colleague who is new to PracExam.') + '</li>'
      + '</ul><div style="margin-top:6px;">' + L('자세한 이용권 약관은 ' + '<a href="/terms.html#pro-pass" target="_blank" rel="noopener" style="color:var(--teal,#354649);font-weight:700;">여기</a>' + '를 참조하세요.', 'For the full pass terms, see ' + '<a href="/terms.html#pro-pass" target="_blank" rel="noopener" style="color:var(--teal,#354649);font-weight:700;">here</a>' + '.') + '</div></div>';
  }

  function counter(id, outId){
    var t = document.getElementById(id), o = document.getElementById(outId);
    function upd(){ var n = realLen(t.value); o.textContent = n + L(' / 최소 ' + minChars() + '자', ' / min ' + minChars()); o.classList.toggle('ok', n >= minChars()); }
    t.addEventListener('input', upd); upd();
  }

  function draftKey(){ try { return 'px_review_draft_' + (SB_USER ? SB_USER.id : 'anon'); } catch(e){ return 'px_review_draft'; } }
  function saveDraft(){
    try {
      var g = function(id){ var el = document.getElementById(id); return el ? (el.type === 'checkbox' ? el.checked : el.value) : null; };
      var d = { passed: [].map.call(document.querySelectorAll('input[name="rvm-pass"]:checked'), function(x){ return x.value; }),
                studying: g('rvm-studying'), q2: g('rvm-q2'), q3: g('rvm-q3'), q4: g('rvm-q4'),
                name: (document.getElementById('rvm-name') || {}).type === 'text' ? g('rvm-name') : null,
                q5: g('rvm-q5'), q6: g('rvm-q6'), state: g('rvm-state') };
      localStorage.setItem(draftKey(), JSON.stringify(d));
      var m = document.getElementById('rvm-saved'); if (m) m.textContent = L('작성 중인 내용이 자동 저장되었습니다', 'Draft saved automatically');
    } catch(e){}
  }
  function loadDraft(){
    try {
      var d = JSON.parse(localStorage.getItem(draftKey()) || 'null'); if (!d) return;
      (d.passed || []).forEach(function(v){ var x = document.querySelector('input[name="rvm-pass"][value="' + v + '"]'); if (x) x.checked = true; });
      var set = function(id, v){ var el = document.getElementById(id); if (!el || v == null) return; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; };
      set('rvm-studying', d.studying); set('rvm-q2', d.q2); set('rvm-q3', d.q3); set('rvm-q4', d.q4);
      if (d.name != null && (document.getElementById('rvm-name') || {}).type === 'text') set('rvm-name', d.name);
      set('rvm-q5', d.q5); set('rvm-q6', d.q6); set('rvm-state', d.state);
    } catch(e){}
  }
  function clearDraft(){ try { localStorage.removeItem(draftKey()); } catch(e){} }

  function form(){
    var nm = displayName();
    body('<div class="section-title" id="rvm-title">' + L('리뷰 작성하기', 'Write a Review') + '</div>'
      + '<p class="rvm-sub">' + L('솔직한 후기를 들려주세요. 좋았던 점과 아쉬웠던 점 모두 서비스 개선에 큰 도움이 됩니다.', 'Please share your honest feedback. Hearing what you liked and what we can improve helps us make PracExam better.') + '</p>'
      + '<div class="rvm-f" style="margin-bottom:26px;"><span class="q" style="display:block;font-size:15px;font-weight:700;color:var(--text-main);margin-bottom:12px;">1. ' + L('해당하는 것을 모두 선택해 주세요.', 'Check all that apply.') + '</span>'
      +   '<div class="rvm-parts">' + [1,2,3].map(function(n){ return '<label><input type="checkbox" name="rvm-pass" value="' + n + '">' + L('Part ' + n + ' 합격', 'Passed Part ' + n) + '</label>'; }).join('') + '<label><input type="checkbox" id="rvm-studying">' + L('학습 중', 'Still studying') + '</label></div></div>'
      + '<div class="rvm-f"><label class="q" for="rvm-q2">2. ' + L('PracExam에서 가장 도움이 되었던 점과 그 이유는 무엇인가요?', 'What helped you most in PracExam, and why?') + '</label>'
      +   '<textarea id="rvm-q2" maxlength="600" placeholder="' + esc(L('예: 해설, 모의고사, War Room, 모바일 학습', 'For example: explanations, mock exams, War Room, studying on your phone')) + '"></textarea><div class="rvm-count" id="rvm-c2"></div></div>'
      + '<div class="rvm-f"><label class="q" for="rvm-q3">3. ' + L('이제 시험 준비를 시작하는 수험생에게 조언과 경험을 공유해주세요.', 'Please share your advice and experience with candidates who are just starting to prepare.') + '</label>'
      +   '<textarea id="rvm-q3" maxlength="400"></textarea><div class="rvm-count" id="rvm-c3"></div></div>'
      + '<div class="rvm-f"><label class="q" for="rvm-q4">4. ' + L('PracExam이 개선되었으면 하는 점', 'What would you like PracExam to improve?') + ' <span class="opt">' + L('(선택 사항 · 비공개)', '(optional · never published)') + '</span></label>'
      +   '<textarea id="rvm-q4" maxlength="800"></textarea></div>'
      + (nm ? '<input type="hidden" id="rvm-name" value="' + esc(nm) + '">'
            : '<div class="rvm-f"><label class="q" for="rvm-name">' + L('후기에 표시할 이름', 'Name to show on your review') + '</label>'
            + '<input type="text" id="rvm-name" maxlength="40" placeholder="Jenny K." style="max-width:260px;">'
            + '<div class="rvm-count" style="text-align:left;">' + L('이름과 성의 첫 글자. 예: Jenny K.', 'First name and last initial. For example: Jenny K.') + '</div></div>')
      + '<div class="rvm-f"><label class="rvm-check"><input type="checkbox" id="rvm-q5"><span>' + L('내 리뷰를 PracExam 웹사이트에 공유해도 좋습니다.', 'Yes, PracExam may share my review on its website.') + (nm ? ' <span class="opt">' + L('표시 이름: ', 'Shown as: ') + esc(nm) + '</span>' : '') + '</span></label>'
      +   '<p class="rvm-hint">' + L('내용은 바꾸지 않지만, 게시 여건상 맞춤법과 길이를 조금 다듬어서 올릴 수도 있습니다. 동의하시면 2번과 3번 질문에 각각 ' + minChars() + '자 이상 작성해주세요. 체크하지 않으셔도 여러분의 리뷰를 감사히 받겠습니다. 하지만 30일 무료 이용권 기회는 제한됩니다.', 'We do not change what you say, but we may lightly fix spelling and length to fit the page. If you agree, please write at least ' + minChars() + ' characters each for questions 2 and 3. Even if you do not check the box, we will gladly receive your review. However, the free 30-day pass will not be available.') + '</p></div>'
      + '<div class="rvm-f"><label class="rvm-check"><input type="checkbox" id="rvm-q6"><span>' + L('거주하는 주(State)도 함께 표시합니다.', 'Also show my state.') + ' <span class="opt">' + L('(선택)', '(optional)') + '</span></span></label>'
      +   '<div id="rvm-state-wrap" style="display:none;margin:8px 0 0 28px;max-width:160px;"><select id="rvm-state">' + STATES.map(function(s){ return '<option>' + s + '</option>'; }).join('') + '</select></div></div>'
      + '<p class="rvm-err" id="rvm-err"></p>'
      + '<div class="rvm-actions"><button class="btn-navy" type="button" id="rvm-submit">' + L('리뷰 제출하기', 'Submit review') + '</button><button class="btn-ghost" type="button" id="rvm-cancel">' + L('나중에 쓰기', 'Finish later') + '</button><span class="rvm-saved" id="rvm-saved"></span></div>'
      + '<div class="rvm-notice">' + rulesBox() + '</div>');
    loadDraft();
    counter('rvm-q2', 'rvm-c2'); counter('rvm-q3', 'rvm-c3');
    var _t; screenEl.querySelector('#rvm-body').addEventListener('input', function(){ clearTimeout(_t); _t = setTimeout(saveDraft, 400); });
    screenEl.querySelector('#rvm-body').addEventListener('change', saveDraft);
    function req(){ var on = document.getElementById('rvm-q5').checked;
      ['rvm-c2','rvm-c3'].forEach(function(id){ var o = document.getElementById(id); o.style.fontWeight = on ? '700' : ''; o.title = on ? L('필수', 'Required') : ''; });
      document.getElementById('rvm-err').textContent = ''; }
    function stateDep(){ var on = document.getElementById('rvm-q5').checked, q6 = document.getElementById('rvm-q6');
      q6.disabled = !on; if (!on){ q6.checked = false; document.getElementById('rvm-state-wrap').style.display = 'none'; }
      q6.closest('.rvm-f').style.opacity = on ? '1' : '.5'; }
    document.getElementById('rvm-q5').onchange = function(){ req(); stateDep(); };
    stateDep();
    if (document.getElementById('rvm-q6').checked) document.getElementById('rvm-state-wrap').style.display = 'block';
    document.getElementById('rvm-q6').onchange = function(){ document.getElementById('rvm-state-wrap').style.display = this.checked ? 'block' : 'none'; };
    document.getElementById('rvm-cancel').onclick = closeReview;
    document.getElementById('rvm-submit').onclick = submit;
  }

  // ── server (supabase/sql/reviews_pro_pass_2026-11-13.sql): submit_review · redeem_pro_pass · my_review_info ──
  var INFO = null;
  function rpc(name, args){
    try { return sb.rpc(name, args).then(function(r){ if (r.error) throw r.error; return r.data; }); }
    catch(e){ return Promise.reject(e); }
  }
  function loadInfo(){
    try { if (!SB_USER) return Promise.resolve(null); } catch(e){ return Promise.resolve(null); }
    return rpc('my_review_info', { p_exam: 'ea' }).then(function(d){ INFO = d && d.ok ? d : null; refreshUi(); return INFO; })
      .catch(function(e){ console.warn('my_review_info', e && e.message); INFO = null; refreshUi(); return null; });
  }
  function isAdmin(){ try { return SB_USER && SB_USER.id === ADMIN_UID; } catch(e){ return false; } }
  function canReview(){ return !!(INFO && (INFO.can_review || (isAdmin() && !INFO.has_review && !INFO.blackout))); }

  var REASONS = {
    login:      ['로그인 후 이용해 주세요.', 'Please log in first.'],
    exam:       ['EA 시험 리뷰만 받을 수 있습니다.', 'Reviews are open for the EA exam only.'],
    blackout:   ['이 계정은 리뷰를 남길 수 없습니다.', 'This account cannot leave a review.'],
    not_enough: ['250문항 이상 풀면 리뷰를 남길 수 있습니다.', 'You can write a review after answering 250 questions.'],
    already:    ['이미 리뷰를 남기셨습니다. 감사합니다.', 'You have already left a review. Thank you.'],
    too_short:  ['2번과 3번 답변의 글자 수가 부족합니다.', 'Answers 2 and 3 are too short.'],
    name:       ['후기에 표시할 이름을 적어 주세요.', 'Please enter the name to show on your review.'],
    bad_input:  ['입력 내용을 다시 확인해 주세요.', 'Please check your answers.'],
    invalid:    ['코드를 찾을 수 없습니다. 다시 확인해 주세요.', 'We could not find that code. Please check it.'],
    used:       ['이미 사용된 코드입니다.', 'This code has already been used.'],
    expired:    ['사용 기한이 지난 코드입니다.', 'This code has expired.'],
    not_new:    ['선물받은 이용권은 PracExam에서 결제한 적이 없는 계정에서만 쓸 수 있습니다.', 'Gifted passes work only on accounts that have never paid for PracExam.'],
    gift_used:  ['선물받은 이용권은 계정당 한 번만 쓸 수 있습니다.', 'A gifted pass can be used only once per account.'],
    needs_payment: ['이 이용권은 첫 결제 후에 사용하실 수 있습니다.', 'This pass can be used after your first payment.']
  };
  function reasonText(r){ var x = REASONS[r]; return x ? L(x[0], x[1]) : L('잠시 후 다시 시도해 주세요.', 'Please try again in a moment.'); }

  function submit(){
    var q2 = document.getElementById('rvm-q2').value.trim(), q3 = document.getElementById('rvm-q3').value.trim();
    var consent = document.getElementById('rvm-q5').checked, err = document.getElementById('rvm-err');
    var nameEl = document.getElementById('rvm-name');
    if (!q2 || !q3){ err.textContent = L('2번과 3번 질문에 답변을 입력해 주세요.', 'Please answer questions 2 and 3.'); return; }
    if (consent && !nameEl.value.trim()){ err.textContent = reasonText('name'); nameEl.focus(); return; }
    if (consent && (realLen(q2) < minChars() || realLen(q3) < minChars())){
      err.textContent = L('게시에 동의하셨으므로 2번과 3번 답변을 각각 ' + minChars() + '자 이상 써 주세요.', 'Because you agreed to publish, answers 2 and 3 must each be at least ' + minChars() + ' characters.');
      (realLen(q2) < minChars() ? document.getElementById('rvm-q2') : document.getElementById('rvm-q3')).focus();
      return;
    }
    var btn = document.getElementById('rvm-submit'); btn.disabled = true; err.textContent = '';
    var passed = [].map.call(document.querySelectorAll('input[name="rvm-pass"]:checked'), function(x){ return +x.value; });
    var showState = document.getElementById('rvm-q6').checked;
    rpc('submit_review', {
      p_exam: 'ea', p_ui_lang: en() ? 'en' : 'ko', p_passed: passed,
      p_studying: document.getElementById('rvm-studying').checked,
      p_helped: q2, p_advice: q3, p_improve: document.getElementById('rvm-q4').value.trim() || null,
      p_consent: consent, p_display_name: consent ? nameEl.value.trim() : null,
      p_show_state: showState, p_state: showState ? document.getElementById('rvm-state').value : null
    }).then(function(d){
      if (!d || !d.ok){ btn.disabled = false; err.textContent = reasonText(d && d.reason); return; }
      clearDraft(); done(d.pass_code || null, !!d.locked); loadInfo();
    }).catch(function(e){ btn.disabled = false; console.warn('submit_review', e && e.message); err.textContent = reasonText(); });
  }

  function done(code, locked){
    if (!code){
      body('<div class="section-title" id="rvm-title">' + L('소중한 리뷰를 남겨 주셔서 감사합니다', 'Thank you for your review') + '</div>'
        + '<p class="rvm-sub">' + L('보내 주신 의견은 PracExam 서비스 개선에 활용하겠습니다. 게시에 동의하지 않으셔서 이번에는 이용권이 발급되지 않았습니다.', 'We read every review and use it to improve PracExam. No pass was issued because you did not agree to publish.') + '</p>'
        + '<div class="rvm-actions"><button class="btn-navy" type="button" id="rvm-close">' + L('닫기', 'Close') + '</button></div>');
      document.getElementById('rvm-close').onclick = closeReview; return;
    }
    body('<div class="section-title" id="rvm-title">' + L('감사합니다! 30-Day Pro Pass가 발급되었습니다', 'Thank you! Here is your 30-Day Pro Pass') + '</div>'
      + '<p class="rvm-sub">' + L('이 코드는 12개월 동안 유효합니다. 지금 바로 사용하거나 설정 화면에 보관해 두었다가 나중에 쓸 수 있으며, 아직 결제 이력이 없는 신규 계정에 선물할 수도 있습니다.', 'This code is valid for 12 months. You can use it now, save it in Settings for later, or gift it to a new account that has never paid for PracExam.') + '</p>'
      + (locked ? '<p class="rvm-sub" style="color:var(--text-main);font-weight:600;">' + L('선물 이용권으로 시작하신 계정이라, 이 이용권은 첫 결제 후에 사용하거나 선물하실 수 있습니다.', 'Because this account started with a gifted pass, this pass can be used or gifted after your first payment.') + '</p>' : '')
      + '<div class="rvm-code">' + esc(code) + '</div>'
      + '<div class="rvm-actions"><button class="btn-navy" type="button" id="rvm-use">' + L('지금 사용하기', 'Use now') + '</button>'
      + '<button class="btn-ghost" type="button" id="rvm-gift">' + L('선물하기', 'Gift') + '</button>'
      + '<button class="btn-ghost" type="button" id="rvm-later">' + L('나중에 사용하기', 'Use later') + '</button></div>');
    if (locked){ ['rvm-use', 'rvm-gift'].forEach(function(id){ var b = document.getElementById(id); if (b) b.style.display = 'none'; });
      document.getElementById('rvm-later').textContent = L('확인', 'OK'); }
    document.getElementById('rvm-use').onclick = function(){ redeem(code, function(){ closeReview(); }); };
    document.getElementById('rvm-gift').onclick = function(){ closeReview(); try { showScreen('settings'); } catch(e){}
      setTimeout(function(){ var b = document.querySelector('[data-rvp-gift="' + code + '"]'); if (b) b.click(); }, 400); };
    document.getElementById('rvm-later').onclick = function(){ closeReview(); try { showScreen('settings'); } catch(e){} };
  }

  function redeem(code, after){
    rpc('redeem_pro_pass', { p_code: code }).then(function(d){
      if (!d || !d.ok){ toast(reasonText(d && d.reason)); return; }
      if (d.result === 'queued'){ extendPaddle(code, after); return; }
      else toast(L('Pro 30일이 열렸습니다. ' + fmt(String(d.until).slice(0, 10)) + '까지 이용하실 수 있습니다.', '30 days of Pro are now open, until ' + fmt(String(d.until).slice(0, 10)) + '.'));
      try { loadTrialStatus(); } catch(e){}
      loadInfo(); if (after) after();
    }).catch(function(e){ console.warn('redeem_pro_pass', e && e.message); toast(reasonText()); });
  }

  // Active subscriber: the server function moves the Paddle next billing date 30 days later (no charge).
  // If Paddle cannot (past due, cancel scheduled …) the pass stays queued and starts after the paid period ends.
  function extendPaddle(code, after){
    sb.auth.getSession().then(function(r){
      var tok = r && r.data && r.data.session ? r.data.session.access_token : '';
      return fetch(SUPABASE_URL + '/functions/v1/pro-pass-extend', {
        method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + tok, apikey: SUPABASE_ANON },
        body: JSON.stringify({ code: code })
      }).then(function(x){ return x.json(); });
    }).then(function(d){
      if (d && d.ok) toast(L('다음 결제일이 30일 뒤로 미뤄졌습니다. 새 결제일: ' + fmt(String(d.until).slice(0, 10)), 'Your next billing date moved 30 days later, to ' + fmt(String(d.until).slice(0, 10)) + '.'));
      else toast(L('구독 기간이 끝나면 30일 Pro가 이어서 시작됩니다.', 'Your 30 days of Pro will start when your current paid period ends.'));
    }).catch(function(){
      toast(L('구독 기간이 끝나면 30일 Pro가 이어서 시작됩니다.', 'Your 30 days of Pro will start when your current paid period ends.'));
    }).then(function(){ try { loadTrialStatus(); } catch(e){} loadInfo(); if (after) after(); });
  }

  function toast(m){ try { showToast(m); } catch(e){ alert(m); } }
  function copy(text){
    try { navigator.clipboard.writeText(text).then(function(){ toast(L('복사되었습니다', 'Copied')); }); } catch(e){ toast(text); }
  }

  function openReview(){
    // Boss 2026-11-13: no gate screen, the form opens at once. The menu item is shown only to users who can review
    // (250+ EA questions, not Blackout, no review yet), and the server checks the same again.
    if (INFO && INFO.has_review){ toast(reasonText('already')); return; }
    form();
  }
  window.pxOpenReview = openReview;

  // ── Settings: 30-Day Pro Pass card ──
  function fmt(d){ var p = String(d).slice(0, 10).split('-'); return en() ? (['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+p[1]-1] + ' ' + (+p[2]) + ', ' + p[0]) : (p[0] + '년 ' + (+p[1]) + '월 ' + (+p[2]) + '일'); }
  function giftText(code, exp){
    return en()
      ? 'Here is a free 30-day PracExam Pro pass for the EA exam: ' + code + '\nSign up at https://pracexam.com/ea/, then go to Settings > 30-Day Pro Pass and enter the code.\nIt works on an account that has never paid for PracExam. Use it by ' + fmt(exp) + '.'
      : 'PracExam EA 시험 Pro 30일 무료 이용권을 선물합니다: ' + code + '\nhttps://pracexam.com/ea/ko/ 에서 가입한 뒤, 설정 > 30-Day Pro Pass 에서 코드를 등록하세요.\nPracExam에서 결제한 적이 없는 계정에서 쓸 수 있고, ' + fmt(exp) + '까지 등록해야 합니다.';
  }
  function renderPassCard(){
    var host = document.getElementById('screen-settings'); if (!host) return;
    var card = document.getElementById('rvp-card');
    if (!card){
      card = document.createElement('div'); card.id = 'rvp-card'; card.className = 'rvp-card';
      host.insertBefore(card, document.getElementById('settings-data-mgmt') || null);
    }
    var list = (INFO && INFO.passes) || [];
    var rows = list.map(function(p){
      var chip, meta;
      if (p.status === 'unused' && p.locked){ chip = '<span class="rvp-chip done">' + L('첫 결제 후 사용 가능', 'After first payment') + '</span>'; meta = L('첫 결제 후 ' + fmt(p.expires_at) + '까지 사용하실 수 있습니다.', 'Usable after your first payment, until ' + fmt(p.expires_at) + '.'); }
      else if (p.status === 'unused'){ chip = '<span class="rvp-chip ok">' + L('사용 가능', 'Available') + '</span>'; meta = L(fmt(p.expires_at) + '까지 사용 가능', 'Use by ' + fmt(p.expires_at)); }
      else if (p.status === 'queued'){ chip = '<span class="rvp-chip done">' + L('대기 중', 'Queued') + '</span>'; meta = L('구독 기간이 끝나면 30일이 이어서 시작됩니다.', 'Starts when your current paid period ends.'); }
      else if (p.mode === 'gift'){ chip = '<span class="rvp-chip done">' + L('선물함', 'Gifted') + '</span>'; meta = p.used_at ? L(fmt(p.used_at) + '에 사용됨', 'Used on ' + fmt(p.used_at)) : ''; }
      else { chip = '<span class="rvp-chip done">' + L('사용함', 'Used') + '</span>'; meta = p.applied_until ? L(fmt(p.applied_until) + '까지 Pro', 'Pro until ' + fmt(p.applied_until)) : ''; }
      var btns = p.status === 'unused' && !p.locked
        ? '<div class="rvp-btns"><button class="btn-navy" type="button" data-rvp-use="' + esc(p.code) + '">' + L('내 계정에 사용', 'Use on my account') + '</button><button class="btn-ghost" type="button" data-rvp-gift="' + esc(p.code) + '" data-exp="' + esc(p.expires_at) + '">' + L('선물하기', 'Gift') + '</button></div>'
        : '';
      return '<div class="rvp-row"><div><div class="rvp-code">' + esc(p.code) + chip + '</div><div class="rvp-meta">' + meta + '</div></div>' + btns + '<div class="rvp-gift" id="gift-' + esc(p.code) + '" hidden></div></div>';
    }).join('');
    var empty = '<div class="rvp-meta" style="padding:6px 0 2px;">' + L('아직 받은 이용권이 없습니다. 250문항 이상 학습하시고 리뷰를 남기시면 받으실 수 있습니다.', 'You do not have a pass yet. Study at least 250 questions and leave a review to receive one.')
      + '</div>' + (canReview() ? '<div style="margin-top:10px;"><button class="btn-navy" type="button" id="rvp-write" style="padding:9px 18px;font-size:14.5px;">' + L('리뷰 작성하기', 'Write a Review') + '</button></div>' : '');   // boss 2026-11-14: a button, not a link
    card.innerHTML = '<div class="exp-label" style="margin-bottom:4px;">🎟️ 30-Day Pro Pass</div>'
      + '<div class="rvp-meta" style="margin-bottom:4px;">' + L('하나의 이용권으로 Pro를 30일 동안 사용할 수 있습니다.', 'One pass gives you 30 days of Pro.') + '</div>'
      + '<div class="rvp-sec" style="border-top:none;padding-top:4px;margin-top:8px;">' + L('내 이용권', 'My pass') + '</div>'
      + (list.length ? rows : empty)
      + '<div class="rvp-sec">' + L('선물받은 이용권 등록', 'Redeem a gifted pass') + '</div>'
      + '<div class="rvp-redeem"><input type="text" id="rvp-input" placeholder="PASS-XXXX-XXXX" autocomplete="off" spellcheck="false"><button class="btn-navy" type="button" id="rvp-redeem-btn">' + L('등록', 'Redeem') + '</button></div>'
      + '<p class="rvp-note">' + L('선물받은 이용권은 PracExam을 처음 이용하는 계정에서 등록할 수 있습니다.', 'Gifted passes are for accounts that are new to PracExam.') + '</p>'
      + '<p class="rvp-note">' + L('자세한 이용권 약관은 ' + '<a href="/terms.html#pro-pass" target="_blank" rel="noopener" style="color:var(--teal,#354649);font-weight:700;">여기</a>' + '를 참조하세요.', 'For the full pass terms, see ' + '<a href="/terms.html#pro-pass" target="_blank" rel="noopener" style="color:var(--teal,#354649);font-weight:700;">here</a>' + '.') + '</p>';   // boss 2026-11-14: «자세한 이용권 약관은 여기를 참조하세요»
    card.querySelectorAll('[data-rvp-use]').forEach(function(b){ b.onclick = function(){ b.disabled = true; redeem(b.getAttribute('data-rvp-use')); }; });
    card.querySelectorAll('[data-rvp-gift]').forEach(function(b){ b.onclick = function(){
      var code = b.getAttribute('data-rvp-gift'), box = document.getElementById('gift-' + code), msg = giftText(code, b.getAttribute('data-exp'));
      box.hidden = !box.hidden; if (box.hidden) return;
      box.innerHTML = L('아래 메시지를 복사해 친구에게 보내세요.', 'Copy this message and send it to a friend.') + '<textarea readonly>' + esc(msg) + '</textarea><button class="btn-navy" type="button">' + L('메시지 복사', 'Copy message') + '</button>';
      box.querySelector('button').onclick = function(){ copy(msg); };
    }; });
    var w = card.querySelector('#rvp-write'); if (w) w.onclick = function(e){ e.preventDefault(); openReview(); };
    card.querySelector('#rvp-redeem-btn').onclick = function(){
      var v = card.querySelector('#rvp-input').value.trim().toUpperCase();
      if (!/^PASS-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(v)){ toast(L('코드 형식을 다시 한번 확인해 주세요. (예: PASS-7K3M-Q9TX)', 'Please check the code format. Example: PASS-7K3M-Q9TX')); return; }
      redeem(v, function(){ card.querySelector('#rvp-input').value = ''; });
    };
  }

  function refreshUi(){
    addMenus();
    var show = canReview();
    ['nav-review', 'mob-review-write'].forEach(function(id){ var el = document.getElementById(id); if (el) el.style.display = show ? '' : 'none'; });
    renderPassCard();
  }

  // keep labels in step with the app language and the Settings screen
  function hook(name, after){
    var orig = window[name]; if (typeof orig !== 'function') return;
    window[name] = function(){ var r = orig.apply(this, arguments); try { after.apply(this, arguments); } catch(e){} return r; };
  }
  function start(){
    refreshUi();
    hook('setLang', function(){ refreshUi(); });
    hook('showScreen', function(n){ if (n === 'settings') loadInfo(); });
    // wait for login, then ask the server once
    var tries = 0, t = setInterval(function(){
      var ok = false; try { ok = !!SB_USER; } catch(e){}
      if (ok || ++tries > 60){ clearInterval(t); if (ok) loadInfo(); }
    }, 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
