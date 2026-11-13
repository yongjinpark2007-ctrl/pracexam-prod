/* Customer reviews (EA) — renders published reviews on the EA landing (#reviews) and on /ea/reviews/.
   Language rule (boss 2026-11-12): Korean view = Korean + English reviews, English view = English reviews only.
   Reviews are shown as written (no translation). No stars. Section stays hidden until 3+ reviews.
   2026-11-13 boss feedback: smaller cards, quiet name/badges, slow auto-scroll carousel on the landing,
   several parts can be reported as passed.
   Data: test site = SAMPLE data from reviews-sample.js (never shipped to pracexam.com).
         live = public_reviews view (published rows, display fields only) once Jay creates it.
   Row shape: { name, state, lang:'ko'|'en', subscriber:bool, passed:[1,2,3] (empty = studying), helped, advice, date:'YYYY-MM-DD', featured } */
(function(){
  'use strict';
  var host = location.hostname;
  var IS_TEST = /^test\.pracexam\.com$/i.test(host) || /\.pages\.dev$/i.test(host) || host === 'localhost' || host === '127.0.0.1';
  var LIVE_SOURCE = false;   // flip to true after public_reviews exists (build step 4)
  var SUPABASE_URL = 'https://ufrhvodruulpgnmudzwh.supabase.co';
  var LANDING_MAX = 12, AUTO_MS = 5000;

  var MON_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function bi(ko, en){ return '<span class="ko">' + ko + '</span><span class="en">' + en + '</span>'; }

  function passedText(r){
    var p = (r.passed || []).filter(function(n){ return n >= 1 && n <= 3; }).sort();
    if (!p.length) return bi('학습 중', 'Currently studying');
    if (p.length === 3) return '<span class="pass">' + bi('세 파트 모두 합격 (본인 응답)', 'Passed all 3 parts (self-reported)') + '</span>';
    var ko = 'Part ' + p.join(', ') + ' 합격 (본인 응답)';
    var en = 'Passed Part' + (p.length > 1 ? 's ' + p.join(' & ') : ' ' + p[0]) + ' (self-reported)';
    return '<span class="pass">' + bi(ko, en) + '</span>';
  }
  function dateText(d){
    var m = /^(\d{4})-(\d{2})/.exec(d || '');
    return m ? bi(m[1] + '년 ' + parseInt(m[2], 10) + '월', MON_EN[parseInt(m[2], 10) - 1] + ' ' + m[1]) : '';
  }

  function card(r, clamp){
    var verified = r.subscriber ? bi('✓ 구독 회원 인증', '✓ Verified Subscriber') : bi('✓ 회원 인증', '✓ Verified User');
    var who = [ '<span class="rv-name">' + esc(r.name) + '</span>', r.state ? esc(r.state) : '', dateText(r.date) ].filter(Boolean).join(' · ');
    return '<article class="rv-card' + (clamp ? ' rv-clamp' : '') + '" data-lang="' + (r.lang === 'ko' ? 'ko' : 'en') + '" lang="' + (r.lang === 'ko' ? 'ko' : 'en') + '">'
      + (r.sample ? '<span class="rv-sample-tag">SAMPLE</span>' : '')
      + '<div class="rv-quote-mark" aria-hidden="true">&ldquo;</div>'
      + '<p class="rv-text">' + esc(r.helped) + '</p>'
      + (r.advice ? '<p class="rv-advice"><b>' + bi('새로 시작하시는 분들께:', 'To someone just starting:') + '</b> ' + esc(r.advice) + '</p>' : '')
      + '<div class="rv-foot">' + who + '<span class="rv-badges"><span class="ok">' + verified + '</span> · ' + passedText(r) + '</span></div>'
      + '</article>';
  }

  function sortReviews(list){
    return list.slice().sort(function(a, b){
      if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
  }

  function loadReviews(){
    // SAMPLE data is fetched only on the test hosts, so the file is never requested on pracexam.com.
    if (IS_TEST) return new Promise(function(res){
      if (Array.isArray(window.PX_REVIEWS_SAMPLE)) return res(window.PX_REVIEWS_SAMPLE);
      var s = document.createElement('script');
      s.src = '/ea/reviews-sample.js?v=2';
      s.onload = function(){ res(Array.isArray(window.PX_REVIEWS_SAMPLE) ? window.PX_REVIEWS_SAMPLE : []); };
      s.onerror = function(){ res([]); };
      document.head.appendChild(s);
    });
    if (!LIVE_SOURCE) return Promise.resolve([]);
    var key = window.SUPABASE_ANON_KEY || '';
    return fetch(SUPABASE_URL + '/rest/v1/public_reviews?exam=eq.ea&select=name,state,lang,subscriber,passed,helped,advice,date,featured', {
      headers: { apikey: key, Authorization: 'Bearer ' + key }
    }).then(function(r){ return r.ok ? r.json() : []; }).catch(function(){ return []; });
  }

  function sampleBanner(list){
    if (!list.some(function(r){ return r.sample; })) return '';
    return '<div class="rv-sample-banner">' + bi('디자인 확인용 샘플(SAMPLE) 후기입니다. 실제 고객 리뷰가 아닙니다.', 'SAMPLE reviews for design review only. These are not real customer reviews.') + '</div>';
  }

  // ── slow continuous drift (boss 2026-11-13: the one-card jumps every 5 s felt dizzy) ──
  // About 18 px a second, endless loop (the cards are rendered twice), pauses on hover / focus / touch / hidden tab.
  // Off for prefers-reduced-motion. Arrows still move one card.
  var SPEED = 18;
  function carousel(wrap){
    var track = wrap.querySelector('.rv-track');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var paused = false, pos = 0, last = 0, busy = false;
    function half(){ return track.scrollWidth / 2; }
    function frame(t){
      var dt = last ? Math.min(t - last, 100) : 0; last = t;
      if (!paused && !busy && !document.hidden && track.offsetParent !== null){
        pos += SPEED * dt / 1000;
        if (pos >= half()) pos -= half();
        track.scrollLeft = pos;
      } else { pos = track.scrollLeft; }
      requestAnimationFrame(frame);
    }
    function step(dir){
      var c = track.querySelector('.rv-card'); if (!c) return;
      var w = c.getBoundingClientRect().width + 16;
      busy = true;
      var target = track.scrollLeft + dir * w;
      if (target < 0) target += half();
      track.scrollTo({ left: target, behavior: 'smooth' });
      setTimeout(function(){ pos = track.scrollLeft % half(); track.scrollLeft = pos; busy = false; }, 600);
    }
    ['mouseenter','focusin','touchstart'].forEach(function(e){ wrap.addEventListener(e, function(){ paused = true; }, { passive: true }); });
    ['mouseleave','focusout'].forEach(function(e){ wrap.addEventListener(e, function(){ paused = false; }); });
    wrap.addEventListener('touchend', function(){ setTimeout(function(){ paused = false; }, 4000); }, { passive: true });
    var prev = wrap.querySelector('[data-rv-prev]'), next = wrap.querySelector('[data-rv-next]');
    if (prev) prev.onclick = function(){ step(-1); };
    if (next) next.onclick = function(){ step(1); };
    if (!reduce) requestAnimationFrame(frame);
  }

  var ARROW_L = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 5 8 12 15 19"></polyline></svg>';
  var ARROW_R = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 5 16 12 9 19"></polyline></svg>';
  function carouselHtml(cls, list){
    return '<div class="rv-carousel ' + cls + '" aria-roledescription="carousel">'
      + '<div class="rv-track" tabindex="0">' + list.map(function(r){ return card(r, true); }).join('') + list.map(function(r){ return card(r, true).replace('<article ', '<article aria-hidden="true" '); }).join('') + '</div>'
      + '<div class="rv-nav"><button type="button" data-rv-prev aria-label="Previous">' + ARROW_L + '</button><button type="button" data-rv-next aria-label="Next">' + ARROW_R + '</button></div>'
      + '</div>';
  }

  // ── EA landing section ──
  function renderLanding(sec, list){
    var all = sortReviews(list);
    var en = all.filter(function(r){ return r.lang !== 'ko'; });
    if (all.length < 3) return;
    sec.classList.toggle('rv-few-en', en.length < 3);
    var box = document.getElementById('rv-carousels'), ban = document.getElementById('rv-banner');
    if (ban) ban.innerHTML = sampleBanner(all);
    if (box){
      box.innerHTML = carouselHtml('ko', all.slice(0, LANDING_MAX)) + carouselHtml('en', en.slice(0, LANDING_MAX));
      box.querySelectorAll('.rv-carousel').forEach(carousel);
    }
    sec.hidden = false;
    // TEST ONLY: background options for the boss to compare (2026-11-13). Remove after the choice.
    if (IS_TEST){
      var names = ['1 진한 청록','2 테라코타','3 중간 청록','4 딥 인디고','5 머스터드 골드','6 War Room 스타일'];
      var pick = document.createElement('div'); pick.className = 'rv-bg-pick';
      pick.innerHTML = names.map(function(n, i){ return '<button type="button" data-bg="' + (i + 1) + '">' + n + '</button>'; }).join('');
      function setBg(k){ for (var j = 1; j <= 6; j++) sec.classList.toggle('rv-bg-' + j, String(j) === String(k));
        pick.querySelectorAll('button').forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-bg') === String(k))); }); }
      pick.addEventListener('click', function(e){ var b = e.target.closest('button'); if (b) setBg(b.getAttribute('data-bg')); });
      var head = sec.querySelector('.rv-head'); head.parentNode.insertBefore(pick, head.nextSibling);
      setBg(new URLSearchParams(location.search).get('rvbg') || 6);
    }
  }

  // ── /ea/reviews/ page ──
  function renderPage(box, list){
    var all = sortReviews(list);
    var ban = document.getElementById('rv-banner');
    if (ban) ban.innerHTML = sampleBanner(all);
    box.innerHTML = all.map(function(r){ return card(r, false); }).join('');
    var empty = document.getElementById('rv-empty');
    if (empty) empty.hidden = all.length > 0;
    document.querySelectorAll('[data-rv-filter]').forEach(function(btn){
      btn.addEventListener('click', function(){
        box.setAttribute('data-filter', btn.getAttribute('data-rv-filter'));
        document.querySelectorAll('[data-rv-filter]').forEach(function(b){ b.setAttribute('aria-pressed', String(b === btn)); });
      });
    });
  }

  function start(){
    var sec = document.getElementById('reviews'), page = document.getElementById('rv-all');
    if (!sec && !page) return;
    loadReviews().then(function(list){
      list = Array.isArray(list) ? list : [];
      if (sec) renderLanding(sec, list);
      if (page) renderPage(page, list);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
