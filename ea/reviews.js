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
  var LIVE_SOURCE = true;    // public_reviews exists since 2026-11-13
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

  function key(r){ return 'rv-' + String(r.id || (String(r.name || '') + '-' + String(r.date || ''))).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  var CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="5 12.5 10 17 19 7"></polyline></svg>';
  function card(r, clamp){
    var vt = r.subscriber ? 'Verified Subscriber · 구독 회원 인증' : 'Verified User · 회원 인증';
    var meta = [ r.subscriber ? 'Verified Subscriber' : 'Verified User', r.state ? esc(r.state) : '', dateText(r.date) ].filter(Boolean).join(' · ');
    var init = esc(String(r.name || '?').trim().charAt(0).toUpperCase());
    var tag = clamp ? 'a' : 'article';
    var link = clamp ? ' href="' + (document.documentElement.className.indexOf('lang-ko') > -1 ? '/ea/reviews/ko/' : '/ea/reviews/') + '#' + key(r) + '" data-rv-link' : ' id="' + key(r) + '"';
    var tr = r.lang === 'ko' && r.helped_en;
    var dl = r.lang === 'ko' ? (tr ? 'both' : 'ko') : 'en';
    function body(h, a){ return '<p class="rv-text"><span class="rv-q" aria-hidden="true">&ldquo;</span>' + esc(h) + '</p>'
      + (a ? '<p class="rv-advice"><b>' + 'To Future EAs:' + '</b> ' + esc(a) + '</p>' : ''); }
    var text = !tr ? body(r.helped, r.advice)
      : '<div class="ko" lang="ko">' + body(r.helped, r.advice) + '</div>'
        + '<div class="en" lang="en"><div class="rv-tr-text">' + body(r.helped_en, r.advice_en) + '</div>'
        + (clamp ? '' : '<div class="rv-tr-orig" lang="ko" hidden>' + body(r.helped, r.advice) + '</div>')
        + '<p class="rv-tr">Translated from Korean' + (clamp ? '' : ' · <button type="button" class="rv-tr-btn" data-rv-orig>Show original</button>') + '</p></div>';
    return '<' + tag + link + ' class="rv-card' + (clamp ? ' rv-clamp' : '') + '" data-lang="' + dl + '" lang="' + (r.lang === 'ko' ? 'ko' : 'en') + '">'
      + text
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

  // public anon key (same one the landing and app already ship); public_reviews returns published rows, display fields only
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcmh2b2RydXVscGdubXVkendoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5OTgyOTYsImV4cCI6MjA5NzU3NDI5Nn0.evW9GggJ2saXHgZah1SRQvSdle7AC5esAnrmpbm5jb8';
  function loadLive(){
    return fetch(SUPABASE_URL + '/rest/v1/public_reviews?exam=eq.ea&select=id,name,state,lang,subscriber,passed,studying,helped,advice,date,featured,helped_en,advice_en', {
      headers: { apikey: ANON, Authorization: 'Bearer ' + ANON }
    }).then(function(r){ return r.ok ? r.json() : []; }).catch(function(){ return []; });
  }
  function loadSample(){
    return new Promise(function(res){
      if (Array.isArray(window.PX_REVIEWS_SAMPLE)) return res(window.PX_REVIEWS_SAMPLE);
      var s = document.createElement('script');
      s.src = '/ea/reviews-sample.js?v=2';
      s.onload = function(){ res(Array.isArray(window.PX_REVIEWS_SAMPLE) ? window.PX_REVIEWS_SAMPLE : []); };
      s.onerror = function(){ res([]); };
      document.head.appendChild(s);
    });
  }
  // Live published reviews always. On test hosts only, SAMPLE rows are added after them so the design can be seen
  // before there are 3 real reviews; the sample file is never requested on pracexam.com.
  function loadReviews(){
    var live = LIVE_SOURCE ? loadLive() : Promise.resolve([]);
    return live.then(function(rows){
      rows = Array.isArray(rows) ? rows : [];
      if (!IS_TEST) return rows;   // pracexam.com never requests the sample file
      if (/[?&]rv=live\b/.test(location.search)) return rows;   // test site: see exactly what pracexam.com shows (spotlight check)
      // boss 2026-11-14: on the test site add 3 English SAMPLE reviews so the section can be seen (needs 3 English)
      return loadSample().then(function(sm){
        var en3 = (sm || []).filter(function(r){ return r.lang === 'en'; }).slice(0, 3);
        return rows.concat(en3);
      });
    });
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
    var b = e.target.closest && e.target.closest('[data-rv-orig]'); if (!b) return;
    var c = b.closest('.rv-card'), o = c.querySelector('.rv-tr-orig'), t = c.querySelector('.rv-tr-text');
    var show = o.hidden; o.hidden = !show; t.hidden = show; b.textContent = show ? 'Show translation' : 'Show original';
  });
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[data-rv-link]'); if (!a) return;
    var ko = document.documentElement.className.indexOf('lang-ko') > -1;
    a.href = a.getAttribute('href').replace(/^\/ea\/reviews\/(ko\/)?/, ko ? '/ea/reviews/ko/' : '/ea/reviews/');
  }, true);
  var LOOP_MIN = 5;   // with 4 or fewer cards everything fits: no duplicate copy, no auto-scroll, no arrows
  function carouselHtml(cls, list){
    return '<div class="rv-carousel ' + cls + '" data-loop="' + (list.length >= LOOP_MIN ? 1 : 0) + '" aria-roledescription="carousel">'
      + '<div class="rv-track" tabindex="0">' + list.map(function(r){ return card(r, true); }).join('') + (list.length >= LOOP_MIN ? list.map(function(r){ return card(r, true).replace('<a ', '<a aria-hidden="true" tabindex="-1" '); }).join('') : '') + '</div>'
      + (list.length >= LOOP_MIN ? '<div class="rv-nav"><button type="button" data-rv-prev aria-label="Previous">' + ARROW_L + '</button><button type="button" data-rv-next aria-label="Next">' + ARROW_R + '</button></div>' : '')
      + '</div>';
  }

  var MIN_EN = 3;   // boss 2026-11-14: at least 3 published reviews (any language; Korean ones carry an English translation)

  // ── Interview spotlight (boss 2026-11-27): until the carousel has its 3 reviews, show the best one as a short
  //    interview (our question -> the customer's own words, as written). Verified Subscriber is stressed: the badge is
  //    only on members with a paid subscription, and the pass is the customer's own answer (said so on the card).
  //    When 3+ reviews are published this goes away by itself and the carousel takes over.
  var STATE_NAMES = { AL:'Alabama', AK:'Alaska', AZ:'Arizona', AR:'Arkansas', CA:'California', CO:'Colorado', CT:'Connecticut', DE:'Delaware',
    FL:'Florida', GA:'Georgia', HI:'Hawaii', ID:'Idaho', IL:'Illinois', IN:'Indiana', IA:'Iowa', KS:'Kansas', KY:'Kentucky', LA:'Louisiana',
    ME:'Maine', MD:'Maryland', MA:'Massachusetts', MI:'Michigan', MN:'Minnesota', MS:'Mississippi', MO:'Missouri', MT:'Montana', NE:'Nebraska',
    NV:'Nevada', NH:'New Hampshire', NJ:'New Jersey', NM:'New Mexico', NY:'New York', NC:'North Carolina', ND:'North Dakota', OH:'Ohio',
    OK:'Oklahoma', OR:'Oregon', PA:'Pennsylvania', RI:'Rhode Island', SC:'South Carolina', SD:'South Dakota', TN:'Tennessee', TX:'Texas',
    UT:'Utah', VT:'Vermont', VA:'Virginia', WA:'Washington', WV:'West Virginia', WI:'Wisconsin', WY:'Wyoming', DC:'Washington, D.C.' };
  function spotlight(r){
    var p = (r.passed || []).filter(function(n){ return n >= 1 && n <= 3; }).sort();
    var first = esc(String(r.name || '').split(/\s+/)[0] || r.name || '');
    var st = r.state ? esc(STATE_NAMES[String(r.state).toUpperCase()] || r.state) : '';
    var init = esc(String(r.name || '?').trim().charAt(0).toUpperCase());
    var head = p.length
      ? bi('Part ' + p.join('·') + ' 합격, ' + first + ' 님의 이야기', first + '\u2019s story: passed Part ' + p.join(' & '))
      : bi(first + ' 님의 이야기', first + '\u2019s story');
    var tr = r.lang === 'ko' && r.helped_en;
    function ans(ko, en){ return tr ? '<div class="ko" lang="ko">' + esc(ko) + '</div><div class="en" lang="en">' + esc(en) + '</div>' : esc(ko); }
    var qa = '<div class="rvi-qa"><p class="rvi-q">' + bi('PracExam에서 가장 도움이 된 것은 무엇이었나요?', 'What helped you most in PracExam?') + '</p>'
      + '<blockquote class="rvi-a" lang="' + (r.lang === 'ko' ? 'ko' : 'en') + '">' + ans(r.helped, r.helped_en) + '</blockquote></div>';
    if (r.advice) qa += '<div class="rvi-qa"><p class="rvi-q">' + bi('앞으로 EA를 준비하는 분들께 한마디 해 주세요.', 'Any advice for future EAs?') + '</p>'
      + '<blockquote class="rvi-a" lang="' + (r.lang === 'ko' ? 'ko' : 'en') + '">' + ans(r.advice, r.advice_en) + '</blockquote></div>';
    return '<article class="rvi" id="' + key(r) + '">'
      + '<div class="rvi-side">'
      +   '<span class="rvi-av" aria-hidden="true">' + init + '</span>'
      +   '<p class="rvi-name">' + esc(r.name) + '</p>'
      +   (st ? '<p class="rvi-where">' + st + '</p>' : '')
      +   '<p class="rvi-ver">' + CHECK + (r.subscriber ? bi('인증된 구독 회원', 'Verified Subscriber') : bi('인증된 회원', 'Verified User')) + '</p>'
      +   (p.length ? '<p class="rvi-pass"><img src="/check-mark.png" alt="" width="14" height="14">' + bi('Part ' + p.join('·') + ' 합격', 'Passed Part ' + p.join(' & ')) + '</p>' : '')
      +   '<p class="rvi-date">' + dateText(r.date) + '</p>'
      + '</div>'
      + '<div class="rvi-main">'
      +   '<p class="rvi-eyebrow">' + bi('고객 인터뷰', 'CUSTOMER INTERVIEW') + '</p>'
      +   '<h3 class="rvi-head">' + head + '</h3>'
      +   qa
      +   '<p class="rvi-note">' + (r.subscriber
            ? bi('PracExam 구독 결제가 확인된 회원이 직접 작성한 후기입니다. 답변은 고객이 쓴 그대로이며, 합격 여부는 본인 응답입니다.',
                 'Written by a PracExam member with a confirmed paid subscription. Answers are in the customer\u2019s own words; the pass is self-reported.')
            : bi('PracExam 회원이 직접 작성한 후기입니다. 답변은 고객이 쓴 그대로이며, 합격 여부는 본인 응답입니다.',
                 'Written by a PracExam member. Answers are in the customer\u2019s own words; the pass is self-reported.')) + '</p>'
      + '</div></article>';
  }
  function renderSpotlight(sec, all){
    var r = all.filter(function(x){ return x.featured; })[0];
    if (!r) return;
    var box = document.getElementById('rv-carousels');
    if (!box) return;
    box.innerHTML = spotlight(r);
    var more = sec.querySelector('.rv-more'); if (more) more.hidden = true;   // the /ea/reviews/ page still waits for 3
    if (r.lang !== 'ko' || r.helped_en) sec.classList.remove('rv-few-en'); else sec.classList.add('rv-few-en');
    sec.hidden = false;
    sec.classList.add('rv-spot');
  }

  // ── EA landing section ──
  function renderLanding(sec, list){
    var all = sortReviews(list);
    var en = all.filter(function(r){ return r.lang !== 'ko' || r.helped_en; });
    if (all.length < MIN_EN) { renderSpotlight(sec, all); return; }   // boss 2026-11-14: carousel only from 3 reviews; until then one interview (2026-11-27)
    var box = document.getElementById('rv-carousels'), ban = document.getElementById('rv-banner');
    if (ban) ban.innerHTML = sampleBanner(all);
    if (box){
      box.innerHTML = carouselHtml('ko', all.slice(0, LANDING_MAX)) + carouselHtml('en', en.slice(0, LANDING_MAX));
      box.querySelectorAll('.rv-carousel[data-loop="1"]').forEach(carousel);
    }
    sec.hidden = false;
    sec.classList.add('rv-bg-6');   // War Room style background (boss 2026-11-13)
  }

  // ── /ea/reviews/ page ──
  function renderPage(box, list){
    var all = sortReviews(list);
    if (all.length < MIN_EN) all = [];   // same 3-review rule as the landing
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
