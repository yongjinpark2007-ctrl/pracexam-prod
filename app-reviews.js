/* EA app — customer review form + 30-Day Pro Pass screen (DESIGN STAGE, 2026-11-13).
   Boss decisions 2026-11-12: EA only · paid and trial users with 250+ questions solved · one pass per review,
   valid 12 months · reward = publish consent + real answers (Q2, Q3 each 30+ characters), never tied to sentiment ·
   pass can be used by the reviewer or gifted to a never-paid new account · refunded customers (Blackout) see nothing.
   🔴 Design stage: shown only on test hosts. Nothing is saved; the pass codes are SAMPLE codes.
      Wiring to customer_reviews / pro_passes / the redeem RPC comes after the boss's design OK and Jay's SQL. */
(function(){
  'use strict';
  var host = location.hostname;
  var IS_TEST = /^test\.pracexam\.com$/i.test(host) || /\.pages\.dev$/i.test(host) || host === 'localhost' || host === '127.0.0.1';
  if (!IS_TEST) return;   // not live on pracexam.com until wired and approved

  var MIN_SOLVED = 250, MIN_CHARS = 30;
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
    if (!f) return L('이름 미설정', 'Name not set');
    return f.charAt(0).toUpperCase() + f.slice(1) + (l ? ' ' + l.charAt(0).toUpperCase() + '.' : '');
  }

  // ── styles ──
  var css = ''
    + '#rv-modal-bg .modal.rvm{max-width:680px;}'
    + '.rvm h3{font-size:19px;font-weight:700;color:var(--text-main);margin:0 0 4px;}'
    + '.rvm .rvm-sub{font-size:14.5px;color:var(--text-muted);line-height:1.6;margin:0 0 14px;}'
    + '.rvm .rvm-sample{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.12em;color:#fff;background:#dc2626;border-radius:4px;padding:2px 7px;margin-bottom:10px;}'
    + '.rvm-rules{background:var(--navy-light,#d9ebe9);border-radius:12px;padding:12px 14px;font-size:14px;line-height:1.65;color:var(--text-main);margin-bottom:16px;}'
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

  // ── modal ──
  var bg;
  function modal(){
    if (bg) return bg;
    bg = document.createElement('div'); bg.className = 'modal-bg'; bg.id = 'rv-modal-bg';
    bg.innerHTML = '<div class="modal rvm" role="dialog" aria-modal="true" aria-labelledby="rvm-title"><button class="modal-close" type="button" aria-label="Close">×</button><div id="rvm-body"></div></div>';
    bg.addEventListener('click', function(e){ if (e.target === bg) closeReview(); });
    bg.querySelector('.modal-close').onclick = closeReview;
    document.body.appendChild(bg);
    return bg;
  }
  function closeReview(){ if (bg) bg.classList.remove('open'); }
  function body(html){ modal().querySelector('#rvm-body').innerHTML = '<span class="rvm-sample">SAMPLE · DESIGN</span>' + html; bg.classList.add('open'); }

  function rulesBox(){
    return '<div class="rvm-rules"><b>' + L('30-Day Pro Pass 지급 조건', 'How the 30-Day Pro Pass works') + '</b><ul>'
      + '<li>' + L('리뷰 게시에 동의하고 2번과 3번 질문에 각각 30자 이상 답변하시면 30-Day Pro Pass 코드 1개를 드립니다.', 'Agree to publish and answer questions 2 and 3 with at least 30 characters each to receive a 30-Day Pro Pass code.') + '</li>'
      + '<li>' + L('리뷰의 긍정·부정 여부와 관계없이 동일하게 지급되며, 실제로 게시되지 않더라도 드립니다.', 'You will receive it whether your review is positive or negative, even if it is not published.') + '</li>'
      + '<li>' + L('발급된 코드는 12개월 이내에 직접 사용하거나, PracExam 결제 이력이 없는 신규 계정에 선물할 수 있습니다.', 'Use the code yourself within 12 months, or gift it to a new account that has never paid for PracExam.') + '</li>'
      + '<li>' + L('리뷰 작성 보상은 계정당 1회만 제공됩니다.', 'Limit one review reward per account.') + '</li>'
      + '</ul></div>';
  }

  function gate(n){
    var pct = Math.min(100, Math.round(n / MIN_SOLVED * 100));
    body('<h3 id="rvm-title">' + L('리뷰 작성하기', 'Write a Review') + '</h3>'
      + '<p class="rvm-sub">' + L('PracExam을 충분히 이용해 보신 분들의 리뷰를 받습니다. ' + MIN_SOLVED + '문항 이상 풀면 리뷰를 남길 수 있습니다.', 'Reviews come from people who have really used PracExam. You can write one after answering ' + MIN_SOLVED + ' questions.') + '</p>'
      + '<div class="rvm-bar"><span style="width:' + pct + '%"></span></div>'
      + '<p class="rvm-sub" style="margin:0 0 16px;"><b>' + n + ' / ' + MIN_SOLVED + '</b> · ' + L((MIN_SOLVED - n) + '문항 더 풀면 리뷰를 남길 수 있습니다.', (MIN_SOLVED - n) + ' more questions to go.') + '</p>'
      + rulesBox()
      + '<div class="rvm-actions"><button class="btn-navy" type="button" id="rvm-close">' + L('확인', 'OK') + '</button>'
      + '<button class="btn-ghost" type="button" id="rvm-preview">' + L('(테스트) 양식 미리 보기', '(Test) Preview the form') + '</button></div>');
    document.getElementById('rvm-close').onclick = closeReview;
    document.getElementById('rvm-preview').onclick = form;
  }

  function counter(id, outId){
    var t = document.getElementById(id), o = document.getElementById(outId);
    function upd(){ var n = t.value.trim().length; o.textContent = n + ' / ' + MIN_CHARS + '+'; o.classList.toggle('ok', n >= MIN_CHARS); }
    t.addEventListener('input', upd); upd();
  }

  function form(){
    var nm = displayName();
    body('<h3 id="rvm-title">' + L('리뷰 작성하기', 'Write a Review') + '</h3>'
      + '<p class="rvm-sub">' + L('솔직한 의견을 작성해 주세요. 좋았던 점과 아쉬웠던 점 모두 서비스 개선에 큰 도움이 됩니다.', 'Please share your honest feedback. Hearing what you liked and what we can improve helps us make PracExam better.') + '</p>'
      + rulesBox()
      + '<div class="rvm-f"><span class="q" style="display:block;font-size:15px;font-weight:700;color:var(--text-main);margin-bottom:6px;">1. ' + L('합격한 파트를 모두 골라 주세요.', 'Which parts have you passed? Check all that apply.') + '</span>'
      +   '<div class="rvm-parts">' + [1,2,3].map(function(n){ return '<label><input type="checkbox" name="rvm-pass" value="' + n + '">Part ' + n + '</label>'; }).join('') + '</div>'
      +   '<div class="rvm-count" style="text-align:left;">' + L('아직 합격한 파트가 없으면 비워 두세요. 학습 중으로 표시됩니다. 합격 여부는 본인 응답으로 표시됩니다.', 'Leave all unchecked if you have not passed any parts yet. You will be shown as Currently studying. Pass results are shown as self-reported.') + '</div></div>'
      + '<div class="rvm-f"><label class="q" for="rvm-q2">2. ' + L('PracExam에서 가장 도움이 되었던 점은 무엇인가요?', 'What did you find most helpful about PracExam?') + '</label>'
      +   '<textarea id="rvm-q2" maxlength="600" placeholder="' + esc(L('예: 해설, 모의고사, War Room, 모바일 학습', 'For example: explanations, mock exams, War Room, studying on your phone')) + '"></textarea><div class="rvm-count" id="rvm-c2"></div></div>'
      + '<div class="rvm-f"><label class="q" for="rvm-q3">3. ' + L('이제 준비를 시작하는 수험생에게 조언 한마디를 남겨 주세요.', 'Please share a word of advice for candidates just starting out.') + '</label>'
      +   '<textarea id="rvm-q3" maxlength="400"></textarea><div class="rvm-count" id="rvm-c3"></div></div>'
      + '<div class="rvm-f"><label class="q" for="rvm-q4">4. ' + L('개선되었으면 하는 점', 'What should we improve?') + ' <span class="opt">' + L('(선택 사항 · 비공개)', '(optional · never published)') + '</span></label>'
      +   '<textarea id="rvm-q4" maxlength="800"></textarea></div>'
      + '<div class="rvm-f"><label class="rvm-check"><input type="checkbox" id="rvm-q5"><span>' + L('이 리뷰를 <b>' + esc(nm) + '</b> 이름으로 PracExam 웹사이트에 게시하는 데 동의합니다. 맞춤법과 길이만 다듬을 수 있습니다.', 'I agree that PracExam may publish this review on its website as <b>' + esc(nm) + '</b>. PracExam may correct spelling and shorten it only.') + '</span></label>'
      +   '<p class="rvm-hint">' + L('동의하면 2번과 3번 답변은 각각 30자 이상이어야 합니다. 동의하지 않아도 리뷰를 제출할 수 있으나, 이 경우 무료 이용권은 발급되지 않습니다.', 'If you agree, answers 2 and 3 must each be at least 30 characters. You can still submit your review without agreeing, but a free pass will not be issued in this case.') + '</p></div>'
      + '<div class="rvm-f"><label class="rvm-check"><input type="checkbox" id="rvm-q6"><span>' + L('거주하는 주(State)도 함께 표시합니다.', 'Also show my state.') + ' <span class="opt">' + L('(선택)', '(optional)') + '</span></span></label>'
      +   '<div id="rvm-state-wrap" style="display:none;margin:8px 0 0 28px;max-width:160px;"><select id="rvm-state">' + STATES.map(function(s){ return '<option>' + s + '</option>'; }).join('') + '</select></div></div>'
      + '<p class="rvm-err" id="rvm-err"></p>'
      + '<div class="rvm-actions"><button class="btn-navy" type="button" id="rvm-submit">' + L('리뷰 제출하기', 'Submit review') + '</button><button class="btn-ghost" type="button" id="rvm-cancel">' + L('취소', 'Cancel') + '</button></div>');
    counter('rvm-q2', 'rvm-c2'); counter('rvm-q3', 'rvm-c3');
    function req(){ var on = document.getElementById('rvm-q5').checked;
      ['rvm-c2','rvm-c3'].forEach(function(id){ var o = document.getElementById(id); o.style.fontWeight = on ? '700' : ''; o.title = on ? L('필수', 'Required') : ''; });
      document.getElementById('rvm-err').textContent = ''; }
    document.getElementById('rvm-q5').onchange = req;
    document.getElementById('rvm-q6').onchange = function(){ document.getElementById('rvm-state-wrap').style.display = this.checked ? 'block' : 'none'; };
    document.getElementById('rvm-cancel').onclick = closeReview;
    document.getElementById('rvm-submit').onclick = submit;
  }

  function submit(){
    var q2 = document.getElementById('rvm-q2').value.trim(), q3 = document.getElementById('rvm-q3').value.trim();
    var consent = document.getElementById('rvm-q5').checked, err = document.getElementById('rvm-err');
    if (!q2 || !q3){ err.textContent = L('2번과 3번 질문에 답변을 입력해 주세요.', 'Please answer questions 2 and 3.'); return; }
    if (consent && (q2.length < MIN_CHARS || q3.length < MIN_CHARS)){
      err.textContent = L('게시에 동의하셨으므로 2번과 3번 답변을 각각 ' + MIN_CHARS + '자 이상 써 주세요.', 'Because you agreed to publish, answers 2 and 3 must each be at least ' + MIN_CHARS + ' characters.');
      (q2.length < MIN_CHARS ? document.getElementById('rvm-q2') : document.getElementById('rvm-q3')).focus();
      return;
    }
    // DESIGN STAGE: nothing is saved. passed = checked parts.
    done(consent);
  }

  function done(withPass){
    if (!withPass){
      body('<h3 id="rvm-title">' + L('소중한 리뷰를 남겨 주셔서 감사합니다', 'Thank you for your review') + '</h3>'
        + '<p class="rvm-sub">' + L('보내 주신 의견은 PracExam 서비스 개선에 활용하겠습니다. 게시에 동의하지 않으셔서 이번에는 이용권이 발급되지 않았습니다.', 'We read every review and use it to improve PracExam. No pass was issued because you did not agree to publish.') + '</p>'
        + '<div class="rvm-actions"><button class="btn-navy" type="button" id="rvm-close">' + L('닫기', 'Close') + '</button></div>');
      document.getElementById('rvm-close').onclick = closeReview; return;
    }
    body('<h3 id="rvm-title">' + L('감사합니다! 30-Day Pro Pass가 발급되었습니다', 'Thank you! Here is your 30-Day Pro Pass') + '</h3>'
      + '<p class="rvm-sub">' + L('이 코드는 12개월 동안 유효합니다. 지금 바로 사용하거나 설정 화면에 보관해 두었다가 나중에 쓸 수 있으며, 아직 결제 이력이 없는 신규 계정에 선물할 수도 있습니다.', 'This code is valid for 12 months. You can use it now, save it in Settings for later, or gift it to a new account that has never paid for PracExam.') + '</p>'
      + '<div class="rvm-code">PASS-SAMP-LE01</div>'
      + '<div class="rvm-actions"><button class="btn-navy" type="button" id="rvm-use">' + L('지금 사용하기', 'Use now') + '</button>'
      + '<button class="btn-ghost" type="button" id="rvm-gift">' + L('선물하기', 'Gift') + '</button>'
      + '<button class="btn-ghost" type="button" id="rvm-later">' + L('나중에 사용하기', 'Use later') + '</button></div>');
    document.getElementById('rvm-use').onclick = function(){ closeReview(); toast(L('(테스트) 실제로는 Pro 30일 이용 권한이 활성화됩니다.', '(Test) In the live version this opens 30 days of Pro.')); };
    document.getElementById('rvm-gift').onclick = function(){ closeReview(); try { showScreen('settings'); } catch(e){} setTimeout(function(){ var b = document.querySelector('[data-rvp-gift="PASS-SAMP-LE01"]'); if (b) b.click(); }, 50); };
    document.getElementById('rvm-later').onclick = function(){ closeReview(); try { showScreen('settings'); } catch(e){} };
  }

  function toast(m){ try { showToast(m); } catch(e){ alert(m); } }
  function copy(code){
    try { navigator.clipboard.writeText(code).then(function(){ toast(L('코드가 복사되었습니다', 'Code copied')); }); } catch(e){ toast(code); }
  }

  function openReview(){
    var n = solvedCount();
    if (n < MIN_SOLVED) gate(n); else form();
  }
  window.pxOpenReview = openReview;

  // ── Settings: 30-Day Pro Pass card (v2, 2026-11-13) ──
  // Layout: what a pass is (one line) → my passes (status chip, expiry, Use / Gift) or an empty state → redeem a gifted code.
  // Billing wording stays neutral until the Paddle check (design doc 5-1).
  var SAMPLE_PASSES = [
    { code: 'PASS-SAMP-LE01', status: 'unused', expires: '2027-11-13' },
    { code: 'PASS-SAMP-LE02', status: 'gifted', expires: '2027-10-02', used: '2026-10-20' }
  ];
  var showEmpty = false;
  function fmt(d){ var p = d.split('-'); return en() ? (['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+p[1]-1] + ' ' + (+p[2]) + ', ' + p[0]) : (p[0] + '년 ' + (+p[1]) + '월 ' + (+p[2]) + '일'); }
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
    var list = showEmpty ? [] : SAMPLE_PASSES;
    var rows = list.map(function(p){
      var chip = p.status === 'unused' ? '<span class="rvp-chip ok">' + L('사용 가능', 'Available') + '</span>'
               : '<span class="rvp-chip done">' + (p.status === 'gifted' ? L('선물함', 'Gifted') : L('사용함', 'Used')) + '</span>';
      var meta = p.status === 'unused' ? L(fmt(p.expires) + '까지 사용 가능', 'Use by ' + fmt(p.expires))
               : L(fmt(p.used) + '에 사용됨', 'Used on ' + fmt(p.used));
      var btns = p.status === 'unused'
        ? '<div class="rvp-btns"><button class="btn-navy" type="button" data-rvp-use="' + p.code + '">' + L('내 계정에 사용', 'Use on my account') + '</button><button class="btn-ghost" type="button" data-rvp-gift="' + p.code + '" data-exp="' + p.expires + '">' + L('선물하기', 'Gift') + '</button></div>'
        : '';
      return '<div class="rvp-row"><div><div class="rvp-code">' + p.code + chip + '</div><div class="rvp-meta">' + meta + '</div></div>' + btns + '<div class="rvp-gift" id="gift-' + p.code + '" hidden></div></div>';
    }).join('');
    var empty = '<div class="rvp-meta" style="padding:6px 0 2px;">' + L('아직 받은 이용권이 없습니다. 250문항 이상 푼 뒤 리뷰를 쓰면 받을 수 있습니다.', 'You do not have any passes yet. Answer at least 250 questions, then write a review to get one.')
      + ' <a href="#" id="rvp-write" style="color:var(--teal);font-weight:700;">' + L('리뷰 작성하기', 'Write a Review') + '</a></div>';
    card.innerHTML = '<span style="display:inline-block;font-size:11px;font-weight:800;letter-spacing:.12em;color:#fff;background:#dc2626;border-radius:4px;padding:2px 7px;margin-bottom:8px;">SAMPLE · DESIGN</span>'
      + '<div class="exp-label" style="margin-bottom:4px;">🎟️ 30-Day Pro Pass</div>'
      + '<div class="rvp-meta" style="margin-bottom:4px;">' + L('이용권 하나로 Pro를 30일 동안 쓸 수 있습니다. 리뷰를 쓰면 하나를 드립니다.', 'One pass gives you 30 days of Pro. You get one for writing a review.') + '</div>'
      + '<div class="rvp-sec" style="border-top:none;padding-top:4px;margin-top:8px;">' + L('내 이용권', 'My passes') + '</div>'
      + (list.length ? rows : empty)
      + '<div class="rvp-sec">' + L('선물받은 코드 등록', 'Redeem a gifted code') + '</div>'
      + '<div class="rvp-redeem"><input type="text" id="rvp-input" placeholder="PASS-XXXX-XXXX" autocomplete="off" spellcheck="false"><button class="btn-navy" type="button" id="rvp-redeem-btn">' + L('등록', 'Redeem') + '</button></div>'
      + '<p class="rvp-note">' + L('선물받은 코드는 PracExam 결제 이력이 없는 계정에서만 등록할 수 있습니다. 각 코드는 한 번만 사용할 수 있습니다.', 'Gifted codes can only be redeemed on accounts that have never paid for PracExam. Each code can only be used once.') + '</p>'
      + '<p class="rvp-note" style="margin-top:4px;"><a href="#" id="rvp-toggle" style="color:var(--text-muted);">' + (showEmpty ? '(테스트) 이용권 있는 화면 보기' : '(테스트) 이용권 없는 화면 보기') + '</a></p>';
    card.querySelectorAll('[data-rvp-use]').forEach(function(b){ b.onclick = function(){ toast(L('(테스트) 실제로는 Pro 30일 이용 권한이 활성화됩니다.', '(Test) In the live version this opens 30 days of Pro.')); }; });
    card.querySelectorAll('[data-rvp-gift]').forEach(function(b){ b.onclick = function(){
      var code = b.getAttribute('data-rvp-gift'), box = document.getElementById('gift-' + code), msg = giftText(code, b.getAttribute('data-exp'));
      box.hidden = !box.hidden; if (box.hidden) return;
      box.innerHTML = L('아래 메시지를 복사해 친구에게 보내세요.', 'Copy this message and send it to a friend.') + '<textarea readonly>' + esc(msg) + '</textarea><button class="btn-navy" type="button">' + L('메시지 복사', 'Copy message') + '</button>';
      box.querySelector('button').onclick = function(){ copy(msg); };
    }; });
    var w = card.querySelector('#rvp-write'); if (w) w.onclick = function(e){ e.preventDefault(); openReview(); };
    card.querySelector('#rvp-toggle').onclick = function(e){ e.preventDefault(); showEmpty = !showEmpty; renderPassCard(); };
    card.querySelector('#rvp-redeem-btn').onclick = function(){
      var v = card.querySelector('#rvp-input').value.trim().toUpperCase();
      toast(/^PASS-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(v) ? L('(테스트) 실제 환경에서는 서버가 코드 유효성을 확인합니다.', '(Test) In the live version the server checks the code.') : L('코드 형식을 다시 한번 확인해 주세요. (예: PASS-7K3M-Q9TX)', 'Please check the code format. Example: PASS-7K3M-Q9TX'));
    };
  }

  // keep labels in step with the app language and the Settings screen
  function hook(name, after){
    var orig = window[name]; if (typeof orig !== 'function') return;
    window[name] = function(){ var r = orig.apply(this, arguments); try { after.apply(this, arguments); } catch(e){} return r; };
  }
  function start(){
    addMenus(); renderPassCard();
    hook('setLang', function(){ addMenus(); renderPassCard(); });
    hook('showScreen', function(n){ if (n === 'settings') renderPassCard(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
