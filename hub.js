/* Hub (/) page script: language toggle, RE state chips, login card scroll, mobile menu (2026-10-24).
   Login itself is in hub-login.js. Language is stored under the same 'ea_lang' key as /ea/, /re/ and the app. */
(function(){
  function setLang(l){
    document.querySelectorAll('[data-en]').forEach(function(el){ el.textContent = el.getAttribute('data-' + l); });
    document.getElementById('l-en').setAttribute('aria-pressed', l === 'en');
    document.getElementById('l-ko').setAttribute('aria-pressed', l === 'ko');
    document.getElementById('l-en').classList.toggle('active', l === 'en');
    document.getElementById('l-ko').classList.toggle('active', l === 'ko');
    document.documentElement.lang = l;
    try { localStorage.setItem('ea_lang', l); } catch(e){}
    // Study Tips has one URL per language
    var n = document.getElementById('nav-notes'); if (n) n.href = (l === 'ko') ? '/tips/ko/' : '/tips/';
  }
  document.getElementById('l-en').onclick = function(){ setLang('en'); };
  document.getElementById('l-ko').onclick = function(){ setLang('ko'); };
  try { if (localStorage.getItem('ea_lang') === 'ko') setLang('ko'); } catch(e){}

  // RE door: the covered states are shown as plain labels from /re-states.js — not selectable (boss 2026-10-24).
  // The state is chosen at RE sign-up instead.
  var box = document.getElementById('re-chips');
  if (box && window.PE_RE_STATES){
    PE_RE_STATES.forEach(function(s){
      var c = document.createElement('span');
      c.className = 'chip chip-static'; c.textContent = s.name;
      box.appendChild(c);
    });
  }

  // Login card in the hero: header and member-strip «Log in» links scroll to it and focus the email box.
  function goLogin(e){
    if (e) e.preventDefault();
    var card = document.getElementById('login');
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function(){ document.getElementById('login-email').focus({ preventScroll: true }); }, 450);
  }
  document.querySelectorAll('a[href="#login"]').forEach(function(a){ a.addEventListener('click', function(e){ closeMenu(); goLogin(e); }); });
  if (location.hash === '#login') goLogin();

  // Mobile menu (hamburger)
  var menu = document.getElementById('nav-menu'), tog = document.getElementById('nav-toggle');
  function closeMenu(){ menu.classList.remove('open'); tog.classList.remove('open'); tog.setAttribute('aria-expanded', 'false'); }
  tog.addEventListener('click', function(e){
    e.stopPropagation();
    var o = !menu.classList.contains('open');
    menu.classList.toggle('open', o); tog.classList.toggle('open', o); tog.setAttribute('aria-expanded', o);
  });
  menu.querySelectorAll('.nav-links a').forEach(function(a){ a.addEventListener('click', closeMenu); });
  document.addEventListener('click', function(e){ if (!menu.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', function(){ if (window.innerWidth > 860) closeMenu(); });
})();
