/* Hub (/) page script: language toggle, RE state chips, login modal open/close (2026-10-24).
   Login itself is in hub-login.js. Language is stored under the same 'ea_lang' key as /ea/, /re/ and the app. */
(function(){
  function setLang(l){
    document.querySelectorAll('[data-en]').forEach(function(el){ el.textContent = el.getAttribute('data-' + l); });
    document.getElementById('l-en').setAttribute('aria-pressed', l === 'en');
    document.getElementById('l-ko').setAttribute('aria-pressed', l === 'ko');
    document.documentElement.lang = l;
    try { localStorage.setItem('ea_lang', l); } catch(e){}
    // Study Tips has one URL per language
    var n = document.getElementById('nav-notes'); if (n) n.href = (l === 'ko') ? '/tips/ko/' : '/tips/';
  }
  document.getElementById('l-en').onclick = function(){ setLang('en'); };
  document.getElementById('l-ko').onclick = function(){ setLang('ko'); };
  try { if (localStorage.getItem('ea_lang') === 'ko') setLang('ko'); } catch(e){}

  // RE door: the chosen state rides on the link (?state=ca). /re/state pages will use it later.
  var chips = document.querySelectorAll('.chip[data-st]');
  function setState(st){
    var href = '/re/?state=' + st;
    document.getElementById('re-go').href = href;
    document.getElementById('re-photo').href = href;
  }
  Array.prototype.forEach.call(chips, function(c){
    c.addEventListener('click', function(){
      Array.prototype.forEach.call(chips, function(o){ o.setAttribute('aria-pressed', 'false'); });
      c.setAttribute('aria-pressed', 'true');
      setState(c.getAttribute('data-st'));
    });
  });

  // Login modal
  var scrim = document.getElementById('scrim');
  function open(){ scrim.hidden = false; document.getElementById('login-email').focus(); }
  function close(){ scrim.hidden = true; }
  document.getElementById('open-login').onclick = open;
  document.getElementById('open-login2').onclick = open;
  document.getElementById('m-cancel').onclick = close;
  scrim.addEventListener('click', function(e){ if (e.target === scrim) close(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
  if (location.hash === '#login') open();
})();
