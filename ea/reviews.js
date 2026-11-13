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

  // Pass badge (boss 2026-11-13: the footer was cluttered). One short pill; «self-reported» moves to the tooltip.
  function passBadge(r){
    var p = (r.passed || []).filter(function(n){ return n >= 1 && n <= 3; }).sort();
    if (!p.length) return '';
    return '<span class="rv-pass" title="Passed · self-reported / 합격 · 본인 응답"><img src="/check-mark.png" alt="" width="14" height="14">Part ' + p.join('·') + '</span>';
  }
  function dateText(d){
    var m = /^(\d{4})-(\d{2})/.exec(d || '');
    return m ? bi(m[1] + '.' + m[2], MON_EN[parseInt(m[2], 10) - 1] + ' ' + m[1]) : '';
  }

  function key(r){ return 'rv-' + (r.id || (String(r.name || '') + '-' + String(r.date || ''))).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  var CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="5 12.5 10 17 19 7"></polyline></svg>';
  function card(r, clamp){
    var vt = r.subscriber ? 'Verified Subscriber · 구독 회원 인증' : 'Verified User · 회원 인증';
    var meta = [ r.subscriber ? 'Verified Subscriber' : 'Verified User', r.state ? esc(r.state) : '', dateText(r.date) ].filter(Boolean).join(' · ');
    var init = esc(String(r.name || '?').trim().charAt(0).toUpperCase());
    var tag = clamp ? 'a' : 'article';
    var link = clamp ? ' href="' + (document.documentElement.className.indexOf('lang-ko') > -1 ? '/ea/reviews/ko/' : '/ea/reviews/') + '#' + key(r) + '" data-rv-link' : ' id="' + key(r) + '"';
    return '<' + tag + link + ' class="rv-card' + (clamp ? ' rv-clamp' : '') + '" data-lang="' + (r.lang === 'ko' ? 'ko' : 'en') + '" lang="' + (r.lang === 'ko' ? 'ko' : 'en') + '">'
      + '<p class="rv-text"><span class="rv-q" aria-hidden="true">&ldquo;</span>' + esc(r.helped) + '</p>'
      + (r.advice ? '<p class="rv-advice"><b>' + 'To Future EAs:' + '</b> ' + esc(r.advice) + '</p>' : '')
      + '<div class="rv-foot"><span class="rv-av" aria-hidden="true">' + init + '</span>'
      +   '<span class="rv-name">' + esc(r.name) + '</span>' + passBadge(r)
      +   '<span class="rv-meta">' + meta + '</span></div>'
      + '</' + tag + '>';
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
    return '';   // boss 2026-11-13: no banner, the test site shows the samples as the real thing would look
    if (!list.some(function(r){ return r.sample; })) return '';
    return '<div class="rv-sample-banner">' + bi('디자인 확인용 샘플(SAMPLE) 후기입니다. 실제 고객 리뷰가 아닙니다.', 'SAMPLE reviews for design review only. These are not real customer reviews.') + '</div>';
  }

  // ── pause, then glide one card slowly (boss 2026-11-13: fast jumps were dizzy, a constant drift cannot be read) ──
  // Each card rests HOLD_MS, then glides over GLIDE_MS with ease-in-out. Endless loop (cards rendered twice).
  // Pauses on hover / focus / touch / hidden tab. Off for prefers-reduced-motion. Arrows glide one card.
  var HOLD_MS = 7000, GLIDE_MS = 5000;   // boss 2026-11-13: slower again (twice)
  function carousel(wrap){
    var track = wrap.querySelector('.rv-track');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var paused = false, moving = false;
    function half(){ return track.scrollWidth / 2; }
    function cardW(){ var c = track.querySelector('.rv-card'); return c ? c.getBoundingClientRect().width + 16 : 0; }
    function ease(t){ return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
    function glide(dir, ms){
      if (moving) return; var w = cardW(); if (!w) return;
      var from = track.scrollLeft;
      if (dir < 0 && from < w) { from += half(); track.scrollLeft = from; }
      var to = from + dir * w, t0 = 0; moving = true;
      function f(t){ if (!t0) t0 = t; var k = Math.min(1, (t - t0) / ms);
        track.scrollLeft = from + (to - from) * ease(k);
        if (k < 1) requestAnimationFrame(f);
        else { if (track.scrollLeft >= half()) track.scrollLeft -= half(); moving = false; } }
      requestAnimationFrame(f);
    }
    function tick(){ if (!paused && !document.hidden && track.offsetParent !== null) glide(1, GLIDE_MS); }
    ['mouseenter','focusin','touchstart'].forEach(function(e){ wrap.addEventListener(e, function(){ paused = true; }, { passive: true }); });
    ['mouseleave','focusout'].forEach(function(e){ wrap.addEventListener(e, function(){ paused = false; }); });
    wrap.addEventListener('touchend', function(){ setTimeout(function(){ paused = false; }, 4000); }, { passive: true });
    var prev = wrap.querySelector('[data-rv-prev]'), next = wrap.querySelector('[data-rv-next]');
    if (prev) prev.onclick = function(){ glide(-1, 700); };
    if (next) next.onclick = function(){ glide(1, 700); };
    if (!reduce) setInterval(tick, HOLD_MS + GLIDE_MS);
  }

  var ARROW_L = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 5 8 12 15 19"></polyline></svg>';
  var ARROW_R = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 5 16 12 9 19"></polyline></svg>';
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[data-rv-link]'); if (!a) return;
    var ko = document.documentElement.className.indexOf('lang-ko') > -1;
    a.href = a.getAttribute('href').replace(/^\/ea\/reviews\/(ko\/)?/, ko ? '/ea/reviews/ko/' : '/ea/reviews/');
  }, true);
  function carouselHtml(cls, list){
    return '<div class="rv-carousel ' + cls + '" aria-roledescription="carousel">'
      + '<div class="rv-track" tabindex="0">' + list.map(function(r){ return card(r, true); }).join('') + list.map(function(r){ return card(r, true).replace('<a ', '<a aria-hidden="true" tabindex="-1" '); }).join('') + '</div>'
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
    sec.classList.add('rv-bg-6');   // War Room style background (boss 2026-11-13)
  }

  // ── /ea/reviews/ page ──
  function renderPage(box, list){
    var all = sortReviews(list);
    var ban = document.getElementById('rv-banner');
    if (ban) ban.innerHTML = sampleBanner(all);
    box.innerHTML = all.map(function(r){ return card(r, false); }).join('');
    if (location.hash){ var t = document.getElementById(location.hash.slice(1));
      if (t){ setTimeout(function(){ t.scrollIntoView({ block: 'center' }); t.classList.add('rv-flash'); setTimeout(function(){ t.classList.remove('rv-flash'); }, 2600); }, 60); } }
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
