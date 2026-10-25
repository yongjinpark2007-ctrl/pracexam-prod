/* PracExam free Shorts - shared module (vanilla JS, no dependencies).
   Used by index.html (Featured Short band) and videos.html (/videos).
   Data comes from the Supabase table `shorts_videos` through the anon key (RLS: published rows only).
   Videos are YouTube embeds only - no video files are stored on our side. */
(function(){
  'use strict';

  // Members-only videos (2026-10-17): the list comes from the RPC get_videos_for_viewer(). For viewers who may not watch a
  // video the server returns it with locked=true and NO YouTube id, so a lock card is all we can draw (nothing to leak).
  var cfg = { url:'', anon:'', getToken:null, onLocked:null, lockedHref:'/app' };
  var current = null;   // the one player that is currently playing: { box, row, lang }

  var UI = {
    en: { play:'Play video: ', part:'EA Part ', watch:'Watch on YouTube', locked:'Members only', lockedCta:'Available with a paid membership', lockedLabel:'Members-only video: ' },
    ko: { play:'영상 재생: ',  part:'EA Part ', watch:'YouTube에서 보기', locked:'가입자 전용', lockedCta:'유료 멤버십으로 볼 수 있어요', lockedLabel:'가입자 전용 영상: ' }
  };

  // o.getToken()  -> the signed-in user's access token (optional; the page may know it better than localStorage)
  // o.onLocked(row) -> what a click on a lock card does (default: go to o.lockedHref, '/app')
  function init(o){
    cfg.url = o.url; cfg.anon = o.anon;
    if(o.getToken) cfg.getToken = o.getToken;
    if(o.onLocked) cfg.onLocked = o.onLocked;
    if(o.lockedHref) cfg.lockedHref = o.lockedHref;
  }

  function siteLang(){
    var r = document.getElementById('html-root');
    return (r && r.className.indexOf('lang-ko') > -1) ? 'ko' : 'en';
  }
  function other(l){ return l === 'ko' ? 'en' : 'ko'; }
  function idOf(row, l){ return row['youtube_id_' + l] || null; }
  function has(row, l){ return row.locked ? !!row['has_' + l] : !!idOf(row, l); }
  function isLocked(row){ return !!(row && row.locked); }

  // The language we can really show: the wanted one if it has a video, otherwise the other one.
  function usable(row, want){ return has(row, want) ? want : (has(row, other(want)) ? other(want) : null); }

  // YouTube titles carry "| Part 1 ..." and #hashtags; the page shows the badge separately, so show a clean title.
  function cleanTitle(t){ return String(t || '').replace(/#\S+/g, ' ').split('|')[0].replace(/\s+/g, ' ').trim(); }
  function titleOf(row, l){ return cleanTitle(row['title_' + l] || row['title_' + other(l)]) || row.topic; }
  // YouTube descriptions are long (question, answer, key terms, hashtags). Show only the first real line, without #hashtags.
  function firstLine(d){
    var lines = String(d || '').replace(/#\S+/g, ' ').split(/\r?\n/);
    for (var i = 0; i < lines.length; i++){
      var s = lines[i].replace(/\s+/g, ' ').trim();
      if (s && !/^[━─=\-\s]+$/.test(s)) return s;
    }
    return '';
  }
  // Structured-data text: the readable start of the description, no hashtags or divider lines.
  function plainDesc(d){
    return String(d || '').replace(/#\S+/g, ' ').split(/\r?\n/)
      .map(function(s){ return s.replace(/\s+/g, ' ').trim(); })
      .filter(function(s){ return s && !/^[━─=\-\s]+$/.test(s); }).join(' ').slice(0, 300);
  }
  function descOf(row, l){ return firstLine(row['description_' + l] || row['description_' + other(l)]); }

  // ── data ────────────────────────────────────────────────
  // The signed-in user's token, so a paying member sees unlocked videos on the public pages too.
  // supabase-js keeps the session in localStorage under sb-<project-ref>-auth-token (same origin as the app).
  function sessionToken(){
    try{
      if(cfg.getToken){ var t = cfg.getToken(); if(t) return t; }
      var ref = String(cfg.url).replace(/^https?:\/\//, '').split('.')[0];
      var s = JSON.parse(localStorage.getItem('sb-' + ref + '-auth-token') || 'null');
      if(s && s.access_token && (!s.expires_at || s.expires_at * 1000 > Date.now() + 10000)) return s.access_token;
    }catch(e){}
    return null;
  }
  function rpcRows(token, limit){
    return fetch(cfg.url + '/rest/v1/rpc/get_videos_for_viewer', {
      method:'POST',
      headers:{ apikey:cfg.anon, Authorization:'Bearer ' + (token || cfg.anon), 'Content-Type':'application/json' },
      body: JSON.stringify({ p_limit: limit || null })
    }).then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  // The old direct table read (free rows only). Used if the RPC is not available - the site must never break.
  function tableRows(limit){
    var q = cfg.url + '/rest/v1/shorts_videos?select=*&is_published=eq.true' +
            '&order=published_at.desc,sort_order.desc' + (limit ? '&limit=' + limit : '');
    return fetch(q, { headers:{ apikey:cfg.anon, Authorization:'Bearer ' + cfg.anon } })
      .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  // opts.playableOnly: skip the lock cards (e.g. the landing "latest video" band wants a video you can actually play)
  function fetchRows(limit, opts){
    var playable = !!(opts && opts.playableOnly);
    var want = playable ? null : limit;                       // with playableOnly we cut to `limit` after filtering
    var tok = sessionToken();
    var first = rpcRows(tok, want);
    if(tok) first = first.catch(function(){ return rpcRows(null, want); });   // expired / rejected token -> anonymous
    return first.catch(function(){ return tableRows(want); })
      .then(function(rows){
        rows = Array.isArray(rows) ? rows.filter(function(x){ return has(x,'en') || has(x,'ko'); }) : [];
        if(playable){ rows = rows.filter(function(x){ return !x.locked; }); if(limit) rows = rows.slice(0, limit); }
        return rows;
      });
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
    if(row.locked){ mountLocked(box, row, l, title); return; }
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

  // Lock card: no YouTube id exists on the page for this video. Poster only if the server sent a safe one.
  function mountLocked(box, row, l, title){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vx-poster vx-locked';
    btn.setAttribute('aria-label', UI[l].lockedLabel + title);
    var fb = '<span class="vx-fallback"><span>' + esc(UI[l].part + row.ea_part) + '</span><small>' + esc(row.topic) + '</small></span>';
    var bg = row.poster_url
      ? '<img alt="" width="360" height="640" loading="lazy" decoding="async" src="' + esc(row.poster_url) + '">'
      : fb;
    var lock = '<span class="vx-lock" aria-hidden="true">' +
               '<span class="vx-lock-ico"><svg viewBox="0 0 24 24"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3H9z"/></svg></span>' +
               '<b>' + esc(UI[l].locked) + '</b><small>' + esc(UI[l].lockedCta) + '</small></span>';
    btn.innerHTML = bg + lock;
    var img = btn.querySelector('img');
    if(img){ img.addEventListener('error', function(){ img.remove(); btn.insertAdjacentHTML('afterbegin', fb); }); }
    btn.addEventListener('click', function(){
      if(cfg.onLocked){ cfg.onLocked(row); } else { location.href = cfg.lockedHref; }
    });
    box.appendChild(btn);
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
            '?autoplay=1&rel=0&playsinline=1&modestbranding=1&cc_load_policy=0' +   // captions off unless the viewer's own YouTube setting turns them on
            '&enablejsapi=1&origin=' + encodeURIComponent(location.origin);          // enablejsapi: lets us send the "captions off" command below
    f.title = titleOf(row, l);
    f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
    f.setAttribute('allowfullscreen', '');
    box.innerHTML = '';
    box.appendChild(f);
    current = { box: box };
    captionsOff(f);
  }

  // Our videos already have captions burned in, so turn the YouTube caption layer off, whatever the viewer's own setting is.
  // Uses the player's postMessage command channel (undocumented unloadModule). If YouTube ever changes it, nothing breaks:
  // the captions simply stay as the viewer's setting decides. Sent a few times because the player may not be ready at first.
  function captionsOff(f){
    var ORIGIN = 'https://www.youtube-nocookie.com';
    function send(){
      try{
        var w = f.contentWindow; if(!w) return;
        w.postMessage(JSON.stringify({ event:'listening', id:1, channel:'widget' }), ORIGIN);
        w.postMessage(JSON.stringify({ event:'command', func:'unloadModule', args:['captions'] }), ORIGIN);
        w.postMessage(JSON.stringify({ event:'command', func:'unloadModule', args:['cc'] }), ORIGIN);
      }catch(e){}
    }
    f.addEventListener('load', send);
    [400, 1200, 2500].forEach(function(ms){ setTimeout(send, ms); });
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
  // Google wants an ISO 8601 datetime with a timezone; the table stores a plain date (2026-10-21).
  function isoDate(d){
    if(!d) return undefined;
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T00:00:00-07:00' : d;
  }
  function ldFor(row){
    var out = [];
    ['en','ko'].forEach(function(l){
      var id = idOf(row, l);
      if(!id) return;
      out.push({
        '@context':'https://schema.org', '@type':'VideoObject',
        name: row['title_' + l] || row.topic,
        description: plainDesc(row['description_' + l]) || ('EA Part ' + row.ea_part + ' - ' + row.topic),
        thumbnailUrl: [row.poster_url || ytThumb(id, 'hqdefault')],
        uploadDate: isoDate(row.published_at),
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
    titleOf: titleOf, descOf: descOf, idOf: idOf, isLocked: isLocked,
    fetchRows: fetchRows, mount: mount, stop: stop, play: play,
    makeToggle: makeToggle, setToggle: setToggle, injectLd: injectLd, esc: esc, UI: UI
  };
})();
