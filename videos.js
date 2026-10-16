/* PracExam free Shorts - shared module (vanilla JS, no dependencies).
   Used by index.html (Featured Short band) and videos.html (/videos).
   Data comes from the Supabase table `shorts_videos` through the anon key (RLS: published rows only).
   Videos are YouTube embeds only - no video files are stored on our side. */
(function(){
  'use strict';

  var cfg = { url:'', anon:'' };
  var current = null;   // the one player that is currently playing: { box, row, lang }

  var UI = {
    en: { play:'Play video: ', part:'EA Part ', watch:'Watch on YouTube' },
    ko: { play:'영상 재생: ',  part:'EA Part ', watch:'YouTube에서 보기' }
  };

  function init(o){ cfg.url = o.url; cfg.anon = o.anon; }

  function siteLang(){
    var r = document.getElementById('html-root');
    return (r && r.className.indexOf('lang-ko') > -1) ? 'ko' : 'en';
  }
  function other(l){ return l === 'ko' ? 'en' : 'ko'; }
  function idOf(row, l){ return row['youtube_id_' + l] || null; }
  function has(row, l){ return !!idOf(row, l); }

  // The language we can really show: the wanted one if it has a video, otherwise the other one.
  function usable(row, want){ return has(row, want) ? want : (has(row, other(want)) ? other(want) : null); }

  // YouTube titles carry "| Part 1 ..." and #hashtags; the page shows the badge separately, so show a clean title.
  function cleanTitle(t){ return String(t || '').replace(/#\S+/g, ' ').split('|')[0].replace(/\s+/g, ' ').trim(); }
  function titleOf(row, l){ return cleanTitle(row['title_' + l] || row['title_' + other(l)]) || row.topic; }
  function descOf(row, l){ return row['description_' + l] || row['description_' + other(l)] || ''; }

  // ── data ────────────────────────────────────────────────
  function fetchRows(limit){
    var q = cfg.url + '/rest/v1/shorts_videos?select=*&is_published=eq.true' +
            '&order=published_at.desc,sort_order.desc' + (limit ? '&limit=' + limit : '');
    return fetch(q, { headers:{ apikey:cfg.anon, Authorization:'Bearer ' + cfg.anon } })
      .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(rows){ return Array.isArray(rows) ? rows.filter(function(x){ return has(x,'en') || has(x,'ko'); }) : []; });
  }

  // ── poster / player ─────────────────────────────────────
  function ytThumb(id, name){ return 'https://i.ytimg.com/vi/' + id + '/' + name + '.jpg'; }

  function posterFor(row, l){
    var id = idOf(row, l);
    return row.poster_url || (id ? ytThumb(id, 'maxresdefault') : '');
  }

  function playIcon(){
    return '<span class="vx-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>';
  }

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  // Draw the poster (facade) for row/lang into `box` (a .vx-frame). No iframe is loaded here.
  function mount(box, row, l, lazy){
    l = usable(row, l);
    box.innerHTML = '';
    box.__row = row; box.__lang = l;
    if(!l){ return; }
    var title = titleOf(row, l);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vx-poster';
    btn.setAttribute('aria-label', UI[l].play + title);

    var fb = '<span class="vx-fallback"><span>' + esc(UI[l].part + row.ea_part) + '</span><small>' + esc(row.topic) + '</small></span>';
    var src = posterFor(row, l);
    var imgHtml = '';
    if(src){
      imgHtml = '<img alt="" width="360" height="640" ' + (lazy === false ? '' : 'loading="lazy" ') + 'decoding="async" src="' + esc(src) + '">';
    }
    btn.innerHTML = (imgHtml || fb) + playIcon();
    box.appendChild(btn);

    // No text badge on the poster: the thumbnail already carries its own text, and the Part pill sits next to it.

    var img = btn.querySelector('img');
    if(img){
      var step = row.poster_url ? 1 : 0;   // 0 = maxres tried, 1 = hq tried (or custom poster)
      var toHq = function(){
        var id = idOf(row, l);
        if(step === 0 && id){ step = 1; img.src = ytThumb(id, 'hqdefault'); return; }
        // everything failed -> brand CSS poster
        img.remove();
        btn.insertAdjacentHTML('afterbegin', fb);
      };
      img.addEventListener('error', toHq);
      img.addEventListener('load', function(){
        // YouTube answers a missing maxresdefault with a tiny 120x90 grey placeholder (HTTP 200).
        if(img.naturalWidth && img.naturalWidth <= 120 && step === 0){ toHq(); }
      });
    }
    btn.addEventListener('click', function(){ play(box); });
  }

  function stop(){
    if(current && current.box && current.box.isConnected){ mount(current.box, current.box.__row, current.box.__lang); }
    current = null;
  }

  function play(box){
    var row = box.__row, l = box.__lang;
    if(!row || !l) return;
    if(current && current.box !== box){ stop(); }
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(idOf(row, l)) +
            '?autoplay=1&rel=0&playsinline=1&modestbranding=1&cc_load_policy=0';   // captions off unless the viewer's own YouTube setting turns them on
    f.title = titleOf(row, l);
    f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
    f.setAttribute('allowfullscreen', '');
    box.innerHTML = '';
    box.appendChild(f);
    current = { box: box };
  }

  // ── EN | KO toggle (used per card and in the featured band) ─────────
  function makeToggle(row, startLang, onChange){
    var wrap = document.createElement('div');
    wrap.className = 'vx-toggle';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Language');
    ['en','ko'].forEach(function(l){
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = l === 'en' ? 'EN' : '한국어';
      b.setAttribute('data-l', l);
      b.disabled = !has(row, l);
      b.setAttribute('aria-pressed', String(l === startLang));
      b.addEventListener('click', function(){
        if(b.disabled || b.getAttribute('aria-pressed') === 'true') return;
        setToggle(wrap, l);
        onChange(l);
      });
      wrap.appendChild(b);
    });
    return wrap;
  }
  function setToggle(wrap, l){
    Array.prototype.forEach.call(wrap.querySelectorAll('button'), function(b){
      b.setAttribute('aria-pressed', String(b.getAttribute('data-l') === l));
    });
  }

  // ── JSON-LD VideoObject (every available language, regardless of the current selection) ──
  function ldFor(row){
    var out = [];
    ['en','ko'].forEach(function(l){
      var id = idOf(row, l);
      if(!id) return;
      out.push({
        '@context':'https://schema.org', '@type':'VideoObject',
        name: row['title_' + l] || row.topic,
        description: row['description_' + l] || ('EA Part ' + row.ea_part + ' - ' + row.topic),
        thumbnailUrl: [row.poster_url || ytThumb(id, 'hqdefault')],
        uploadDate: row.published_at,
        embedUrl: 'https://www.youtube.com/embed/' + id,
        contentUrl: 'https://www.youtube.com/shorts/' + id,
        inLanguage: l
      });
    });
    return out;
  }
  function injectLd(rows, key){
    var items = [];
    rows.forEach(function(r){ items = items.concat(ldFor(r)); });
    if(!items.length) return;
    var old = document.getElementById('ld-' + key);
    if(old) old.remove();
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'ld-' + key;
    s.textContent = JSON.stringify(items.length === 1 ? items[0] : items).replace(/</g, '\\u003c');
    document.head.appendChild(s);
  }

  window.PXVideos = {
    init: init, siteLang: siteLang, other: other, has: has, usable: usable,
    titleOf: titleOf, descOf: descOf, idOf: idOf,
    fetchRows: fetchRows, mount: mount, stop: stop, play: play,
    makeToggle: makeToggle, setToggle: setToggle, injectLd: injectLd, esc: esc, UI: UI
  };
})();
