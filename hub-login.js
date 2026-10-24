/* Hub login for returning customers (2026-10-24).
   Same Supabase password-grant call and the same «#access_token=…» hand-off that /ea/'s confirmation flow
   (_cfPoll / _cfEnter) already uses — /app.html picks the session up from that hash.
   English only: the login gate has no Korean (CLAUDE.md). Accounts are EA accounts for now. */
(function(){
  var SUPABASE_URL  = 'https://ufrhvodruulpgnmudzwh.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcmh2b2RydXVscGdubXVkendoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5OTgyOTYsImV4cCI6MjA5NzU3NDI5Nn0.evW9GggJ2saXHgZah1SRQvSdle7AC5esAnrmpbm5jb8';
  // Returning customer who is already signed in on this browser: show «Go to my EA practice».
  // supabase-js v2 keeps the session in localStorage under sb-<project-ref>-auth-token (same client as /app).
  try{
    var raw = localStorage.getItem('sb-ufrhvodruulpgnmudzwh-auth-token');
    var sess = raw && JSON.parse(raw);
    var bar = document.getElementById('resume-bar');
    if (bar && sess && (sess.access_token || sess.refresh_token)){
      var card = document.getElementById('resume-card'), f = document.getElementById('hub-login');
      if (card){ card.hidden = false; if (f) f.hidden = true; } else bar.hidden = false;
    }
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
        window.location.href = '/app.html' + hash;
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
