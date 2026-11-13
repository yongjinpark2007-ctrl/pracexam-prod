/* Customer reviews (EA) — renders published reviews on the EA landing (#reviews) and on /ea/reviews/.
   Language rule (boss 2026-11-12): Korean view = Korean + English reviews, English view = English reviews only.
   Reviews are shown as written (no translation). No stars. Section stays hidden until 3+ reviews.
   Data: test site = SAMPLE data from reviews-sample.js (never shipped to pracexam.com).
         live = public_reviews view (published rows, display fields only) once Jay creates it. */
(function(){
  'use strict';
  var host = location.hostname;
  var IS_TEST = /^test\.pracexam\.com$/i.test(host) || /\.pages\.dev$/i.test(host) || host === 'localhost' || host === '127.0.0.1';
  // Flip to true after public_reviews exists (step 4 of the build order).
  var LIVE_SOURCE = false;
  var SUPABASE_URL = 'https://ufrhvodruulpgnmudzwh.supabase.co';

  var MON_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function bi(ko, en){ return '<span class="ko">' + ko + '</span><span class="en">' + en + '</span>'; }

  var CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="5 12.5 10 17 19 7"></polyline></svg>';

  function resultBadge(r){
    var p = { p1: '1', p2: '2', p3: '3' }[r.result];
    if (p) return '<span class="rv-badge pass">' + bi('Part ' + p + ' 합격 · 본인 응답', 'Passed Part ' + p + ' (self-reported)') + '</span>';
    if (r.result === 'all') return '<span class="rv-badge pass">' + bi('세 파트 모두 합격 · 본인 응답', 'Passed all 3 parts (self-reported)') + '</span>';
    return '<span class="rv-badge study">' + bi('학습 중', 'Currently studying') + '</span>';
  }

  function dateText(d){
    var m = /^(\d{4})-(\d{2})/.exec(d || '');
    if (!m) return '';
    return bi(m[1] + '년 ' + parseInt(m[2], 10) + '월', MON_EN[parseInt(m[2], 10) - 1] + ' ' + m[1]);
  }

  function card(r, clamp){
    var initial = (r.name || '?').trim().charAt(0).toUpperCase();
    var verified = r.subscriber
      ? '<span class="rv-badge">' + CHECK + bi('구독 회원 인증', 'Verified Subscriber') + '</span>'
      : '<span class="rv-badge">' + CHECK + bi('회원 인증', 'Verified User') + '</span>';
    var meta = [r.state ? esc(r.state) : '', dateText(r.date)].filter(Boolean).join(' · ');
    return '<article class="rv-card' + (clamp ? ' rv-clamp' : '') + (r.featured ? ' is-featured' : '') + '" data-lang="' + (r.lang === 'ko' ? 'ko' : 'en') + '"'
      + (r.lang === 'ko' ? ' lang="ko"' : ' lang="en"') + '>'
      + (r.sample ? '<span class="rv-sample-tag">SAMPLE</span>' : '')
      + '<div class="rv-quote-mark" aria-hidden="true">&ldquo;</div>'
      + '<p class="rv-text">' + esc(r.helped) + '</p>'
      + (r.advice ? '<div class="rv-advice"><span class="rv-advice-label">' + bi('새로 시작하시는 분들께', 'To someone just starting') + '</span><p>' + esc(r.advice) + '</p></div>' : '')
      + '<div class="rv-foot">'
      +   '<div class="rv-who"><span class="rv-avatar" aria-hidden="true">' + esc(initial) + '</span>'
      +     '<span><span class="rv-name">' + esc(r.name) + '</span><br><span class="rv-meta">' + meta + '</span></span></div>'
      +   '<div class="rv-badges">' + verified + resultBadge(r) + '</div>'
      + '</div>'
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
      s.src = '/ea/reviews-sample.js?v=1';
      s.onload = function(){ res(Array.isArray(window.PX_REVIEWS_SAMPLE) ? window.PX_REVIEWS_SAMPLE : []); };
      s.onerror = function(){ res([]); };
      document.head.appendChild(s);
    });
    if (!LIVE_SOURCE) return Promise.resolve([]);
    var key = window.SUPABASE_ANON_KEY || '';
    return fetch(SUPABASE_URL + '/rest/v1/public_reviews?exam=eq.ea&select=name,state,lang,subscriber,result,helped,advice,date,featured', {
      headers: { apikey: key, Authorization: 'Bearer ' + key }
    }).then(function(r){ return r.ok ? r.json() : []; }).catch(function(){ return []; });
  }

  function sampleBanner(list){
    if (!list.some(function(r){ return r.sample; })) return '';
    return '<div class="rv-sample-banner">' + bi('디자인 확인용 샘플(SAMPLE) 후기입니다. 실제 고객 리뷰가 아닙니다.', 'SAMPLE reviews for design review only. These are not real customer reviews.') + '</div>';
  }

  // ── EA landing section ──
  function renderLanding(sec, list){
    var all = sortReviews(list);
    var en = all.filter(function(r){ return r.lang !== 'ko'; });
    if (all.length < 3) return;                       // hidden in both views
    sec.classList.toggle('rv-few-en', en.length < 3); // CSS hides it in the English view
    var ko = document.getElementById('rv-grid-ko'), enG = document.getElementById('rv-grid-en'), ban = document.getElementById('rv-banner');
    if (ban) ban.innerHTML = sampleBanner(all);
    if (ko) ko.innerHTML = all.slice(0, 3).map(function(r){ return card(r, true); }).join('');
    if (enG) enG.innerHTML = en.slice(0, 3).map(function(r){ return card(r, true); }).join('');
    sec.hidden = false;
  }

  // ── /ea/reviews/ page ──
  function renderPage(box, list){
    var all = sortReviews(list);
    var ban = document.getElementById('rv-banner');
    if (ban) ban.innerHTML = sampleBanner(all);
    box.innerHTML = all.length
      ? all.map(function(r){ return card(r, false); }).join('')
      : '';
    var empty = document.getElementById('rv-empty');
    if (empty) empty.hidden = all.length > 0;
    document.querySelectorAll('[data-rv-filter]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var f = btn.getAttribute('data-rv-filter');
        box.setAttribute('data-filter', f);
        document.querySelectorAll('[data-rv-filter]').forEach(function(b){ b.setAttribute('aria-pressed', String(b === btn)); });
      });
    });
  }

  function start(){
    var sec = document.getElementById('reviews');
    var page = document.getElementById('rv-all');
    if (!sec && !page) return;
    loadReviews().then(function(list){
      list = Array.isArray(list) ? list : [];
      if (sec) renderLanding(sec, list);
      if (page) renderPage(page, list);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
