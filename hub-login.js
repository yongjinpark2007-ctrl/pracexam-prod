/* Hub login for returning customers (2026-10-24).
   Same Supabase password-grant call and the same «#access_token=…» hand-off that /ea/'s confirmation flow
   (_cfPoll / _cfEnter) already uses — /app.html picks the session up from that hash.
   English only: the login gate has no Korean (CLAUDE.md). Accounts may be EA, Real Estate or both (2026-10-29). */
(function(){
  var SUPABASE_URL  = 'https://ufrhvodruulpgnmudzwh.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcmh2b2RydXVscGdubXVkendoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5OTgyOTYsImV4cCI6MjA5NzU3NDI5Nn0.evW9GggJ2saXHgZah1SRQvSdle7AC5esAnrmpbm5jb8';

  // Which exams this account is signed up for. EA = profiles.ea_enrolled (true for every EA account),
  // RE = a row in entitlements (re-<state>). Both reads are the customer's own rows (RLS).
  function examsOf(token, uid){
    if (!token || !uid) return Promise.reject(new Error('no session'));
    var h = { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + token };
    var p1 = fetch(SUPABASE_URL + '/rest/v1/profiles?select=ea_enrolled,home_exam&id=eq.' + uid, { headers: h }).then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); });
    var p2 = fetch(SUPABASE_URL + '/rest/v1/entitlements?select=exam&user_id=eq.' + uid + '&exam=like.re-*', { headers: h }).then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); });
    return Promise.all([p1, p2]).then(function(v){
      var p = v[0][0] || {};
      return { ea: p.ea_enrolled !== false, re: v[1].length > 0, home: p.home_exam || 'ea' };
    });
  }
  var LBL = { ea: { href: '/app',    ko: '내 EA 학습으로 이동 →',     en: 'Go to my EA practice →' },
              re: { href: '/re/app', ko: '내 부동산 학습으로 이동 →', en: 'Go to my Real Estate practice →' } };
  function setBtn(a, k){
    var L = LBL[k]; a.href = L.href; a.setAttribute('data-ko', L.ko); a.setAttribute('data-en', L.en);
    a.textContent = (document.documentElement.lang === 'ko') ? L.ko : L.en;
  }
  // The app this account last really entered on this browser, set by _joinCoverOff in the apps (boss 2026-11-05).
  // The account id is in the value so a different account on the same browser does not inherit it.
  function lastApp(uid){
    try { var v = (localStorage.getItem('px_last_app') || '').split('|');
      return (uid && v[1] === uid && (v[0] === 'ea' || v[0] === 're')) ? v[0] : ''; } catch(e){ return ''; }
  }
  // Header button (boss 2026-11-05): for a signed-in visitor the login card has no form, so «Log In» did nothing.
  // It becomes «My Practice» and goes straight to the app. Runs before hub.js, whose scroll handler binds only to href="#login".
  var topBtn = null;
  function paintTop(k){
    if (!topBtn) return;
    topBtn.href = LBL[k].href; topBtn.setAttribute('data-ko', '내 학습'); topBtn.setAttribute('data-en', 'My Practice');
    topBtn.textContent = (document.documentElement.lang === 'ko') ? '내 학습' : 'My Practice';
  }
  function paintResume(bar, x, uid){
    var list = !x ? ['ea', 're'] : [].concat(x.ea ? ['ea'] : [], x.re ? ['re'] : []);
    if (!list.length) list = ['ea'];
    if (x && list.length > 1 && String(x.home || '').indexOf('re-') === 0) list = ['re', 'ea'];
    // Last app used comes first. It was really entered, so it counts even without an entitlement row (admin).
    // px_seen_re keeps the RE button after a later visit to EA (accounts with RE access but no entitlement row).
    try { if (uid && localStorage.getItem('px_seen_re') === uid && list.indexOf('re') < 0) list.push('re'); } catch(e){}
    var last = lastApp(uid);
    if (last) list = [last].concat(list.filter(function(k){ return k !== last; }));
    setBtn(bar, list[0]); paintTop(list[0]);
    if (list[1] && !document.getElementById('resume-bar-2')){
      var b2 = bar.cloneNode(false); b2.id = 'resume-bar-2'; b2.className = 'btn btn-ghost'; b2.style.marginTop = '8px';
      bar.parentNode.insertBefore(b2, bar.nextSibling); setBtn(b2, list[1]);
    }
  }
  // Returning customer who is already signed in on this browser: show «Go to my EA practice».
  // supabase-js v2 keeps the session in localStorage under sb-<project-ref>-auth-token (same client as /app).
  try{
    var raw = localStorage.getItem('sb-ufrhvodruulpgnmudzwh-auth-token');
    var sess = raw && JSON.parse(raw);
    var bar = document.getElementById('resume-bar');
    if (bar && sess && (sess.access_token || sess.refresh_token)){
      var card = document.getElementById('resume-card'), f = document.getElementById('hub-login');
      if (card){ card.hidden = false; if (f) f.hidden = true; } else bar.hidden = false;
      var uid = sess.user && sess.user.id;
      topBtn = document.querySelector('.nav-actions a[href="#login"]'); paintTop(lastApp(uid) || 'ea');
      // EA and RE are separate sign-ups (2026-10-29): one button per exam this account has, home exam first.
      examsOf(sess.access_token, uid).then(function(x){ paintResume(bar, x, uid); }, function(){ paintResume(bar, null, uid); });
    }
    // «Log in with a different account» (and /?login for a direct look): show the login form instead.
    var sw = document.getElementById('resume-switch');
    function toLogin(){ var c = document.getElementById('resume-card'), f2 = document.getElementById('hub-login');
      if (c) c.hidden = true; if (f2){ f2.hidden = false; var em = document.getElementById('login-email'); if (em) em.focus({preventScroll:true}); } }
    if (sw) sw.addEventListener('click', function(e){ e.preventDefault(); toLogin(); });
    if (/[?&]login\b/.test(location.search)) toLogin();
  }catch(e){}
  var form = document.getElementById('hub-login');
  if (!form) return;
  var msg = document.getElementById('login-msg');
  function show(html){ msg.innerHTML = html; msg.className = 'login-msg show'; }
  form.addEventListener('submit', function(ev){
    ev.preventDefault();
    var email = document.getElementById('login-email').value.trim();
    var pw = document.getElementById('login-pw').value;
    var btn = document.getElementById('login-btn');
    if (!email || !pw){ show('Enter your email and password.'); return; }
    btn.disabled = true; msg.className = 'login-msg';
    fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
      body: JSON.stringify({ email: email, password: pw })
    })
    .then(function(res){ return res.json().then(function(d){ return { ok: res.ok, data: d }; }); })
    .then(function(r){
      if (r.ok && r.data && r.data.access_token){
        var d = r.data;
        var hash = '#access_token=' + encodeURIComponent(d.access_token)
                 + '&expires_in=' + (d.expires_in || 3600)
                 + '&refresh_token=' + encodeURIComponent(d.refresh_token || '')
                 + '&token_type=bearer&type=signup';
        // go to the account's own app: RE-only or RE home -> /re/app, otherwise the EA app (2026-10-29)
        examsOf(d.access_token, d.user && d.user.id).then(function(x){ return x; }, function(){ return null; }).then(function(x){
          var last = lastApp(d.user && d.user.id);
          var re = last ? last === 're' : (x && x.re && (!x.ea || String(x.home || '').indexOf('re-') === 0));
          window.location.href = (re ? '/re/app' : '/app.html') + hash;
        });
        return;
      }
      btn.disabled = false;
      var code = (r.data && (r.data.error_code || r.data.msg || r.data.error_description || '')) + '';
      if (code.indexOf('email_not_confirmed') > -1 || code.toLowerCase().indexOf('not confirmed') > -1){
        show('Please confirm your email first. <a href="/app.html">Open the app to resend the confirmation email</a>.');
      } else {
        show('Email or password is incorrect. <a href="/app.html">Reset it in the app</a>.');
      }
    })
    .catch(function(){ btn.disabled = false; show('Network error. Please try again.'); });
  });
})();
