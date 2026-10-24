/* Shared by the hub (/) and /re/ — language toggle and mobile menu, same behaviour as /ea/ (2026-10-24).
   Language is stored under the same 'ea_lang' key the app and /ea/ already use. */
function _curLang(){
  return document.getElementById('html-root').className.indexOf('lang-en') > -1 ? 'en' : 'ko';
}
function setLang(lang){
  var root = document.getElementById('html-root');
  root.className = 'lang-' + lang;
  try { root.setAttribute('lang', lang); } catch(e){}
  document.getElementById('btn-ko').classList.toggle('active', lang === 'ko');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  try { localStorage.setItem('ea_lang', lang); } catch(e){}
  // Study Tips has one URL per language (so Google can tell them apart) — the link follows.
  try { var n = document.getElementById('nav-notes'); if (n) n.href = (lang === 'ko') ? '/tips/ko/' : '/tips/'; } catch(e){}
  if (typeof window.onLangChange === 'function') { try { window.onLangChange(lang); } catch(e){} }
}
(function(){
  var saved = 'en';
  try { saved = localStorage.getItem('ea_lang') || 'en'; } catch(e){}
  setLang(saved === 'ko' ? 'ko' : 'en');
})();
function toggleNavMenu(){
  var menu = document.getElementById('nav-menu'), btn = document.getElementById('nav-toggle');
  var isOpen = menu.classList.toggle('open');
  btn.classList.toggle('open', isOpen);
  btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}
function closeNavMenu(){
  var menu = document.getElementById('nav-menu'), btn = document.getElementById('nav-toggle');
  menu.classList.remove('open'); btn.classList.remove('open'); btn.setAttribute('aria-expanded', 'false');
}
window.addEventListener('resize', function(){ if (window.innerWidth > 860) closeNavMenu(); });
document.addEventListener('click', function(e){
  var menu = document.getElementById('nav-menu'), btn = document.getElementById('nav-toggle');
  if (!menu.classList.contains('open')) return;
  if (menu.contains(e.target) || btn.contains(e.target)) return;
  closeNavMenu();
});
document.addEventListener('keydown', function(e){
  if (e.key === 'Escape') closeNavMenu();
  // [L] = KO/EN toggle (same as /ea/; e.code so a Korean IME does not swallow it)
  else if ((e.key === 'l' || e.key === 'L' || e.code === 'KeyL') && !e.ctrlKey && !e.metaKey && !e.altKey){
    var tg = e.target;
    if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)) return;
    setLang(_curLang() === 'ko' ? 'en' : 'ko');
  }
});
