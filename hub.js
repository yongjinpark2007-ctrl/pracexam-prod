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

  // RE door: chips come from /re-states.js; the chosen state rides on the link (?state=ca) and is remembered.
  var box = document.getElementById('re-chips');
  function setState(st){
    var href = '/re/?state=' + st;
    document.getElementById('re-go').href = href;
    document.getElementById('re-photo').href = href;
  }
  if (box && window.PE_RE_STATES){
    var cur = PE_RE_STATE.get();
    PE_RE_STATES.forEach(function(s){
      var c = document.createElement('button');
      c.type = 'button'; c.className = 'chip'; c.setAttribute('data-st', s.id); c.textContent = s.name;
      c.setAttribute('aria-pressed', s.id === cur ? 'true' : 'false');
      c.addEventListener('click', function(){
        Array.prototype.forEach.call(box.children, function(o){ o.setAttribute('aria-pressed', 'false'); });
        c.setAttribute('aria-pressed', 'true');
        PE_RE_STATE.set(s.id); setState(s.id);
      });
      box.appendChild(c);
    });
    setState(cur);
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
