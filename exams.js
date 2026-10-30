/* PracExam — the ONE exam list (2026-10-24).
   Every landing's header switch is drawn from this list (pills for 2 exams, a dropdown for more).
   The hub's two photo doors are the approved chooser design and are written in index.html;
   a new exam adds a door card there. Adding an exam = one entry here + its landing folder
   (/<id>/index.html) + one block in exam-palettes.css.
     id    : URL folder and the value of <body data-exam="…">
     name  : short label for the header switch   {ko, en}
     full  : full exam name                       {ko, en}
     blurb : one line for the hub door            {ko, en}
     url   : landing page          app : practice app
     color : door accent (same as --accent in exam-palettes.css)
   Names follow the drafts README: «미국 세무사 Enrolled Agent (EA)» / «미국 부동산 중개사 Real Estate Agent». */
(function(){
  var EXAMS = [
    { id:'ea', url:'/ea/', app:'/app', color:'#6FA39E',
      name:{ ko:'EA', en:'Enrolled Agent' },
      full:{ ko:'미국 세무사 Enrolled Agent (EA)', en:'Enrolled Agent' },   // switch list = same name as the button (boss 2026-10-30)
      blurb:{ ko:'IRS EA 시험 Part 1·2·3 — 5,000개+ 실전 문제', en:'IRS Enrolled Agent exam, Parts 1–3 — 5,000+ practice questions' } },
    { id:'re', url:'/re/', app:'/re/app', color:'#4F7CAC',
      name:{ ko:'부동산', en:'Real Estate Agent' },
      full:{ ko:'미국 부동산 중개사 Real Estate Agent', en:'Real Estate Agent' },
      blurb:{ ko:'National + 주(州) 시험 — 캘리포니아·텍사스·뉴저지·뉴욕', en:'National + state exams — CA, TX, NJ, NY' } }
  ];

  function bi(o){ return '<span class="ko">' + o.ko + '</span><span class="en">' + o.en + '</span>'; }

  // Header switch: English labels in BOTH languages (boss 2026-10-24: Korean labels were too long and read oddly).
  // Header switch: ALWAYS a dropdown (button + list of links), also with only two exams.
  // Closed: the current exam's name and a caret (on the hub: «Exams»). Open: every exam in the list, current one marked.
  // Esc and a click outside close it. Inside the mobile hamburger menu the CSS shows the list flat (no button).
  function renderSwitch(el, currentId){
    if(!el) return;
    var cur = EXAMS.filter(function(e){ return e.id === currentId; })[0];
    el.className = (el.className.replace(/\bexam-dd\b/, '') + ' exam-dd').trim();
    el.innerHTML =
      '<button type="button" class="exam-dd-btn" aria-expanded="false" aria-haspopup="true" aria-controls="exam-dd-list">' +
        '<span class="exam-dd-label">' + (cur ? cur.name.en : 'Exams') + '</span><span class="exam-dd-caret" aria-hidden="true">▾</span></button>' +
      '<ul class="exam-dd-list" id="exam-dd-list">' +
        EXAMS.map(function(e){
          var on = e.id === currentId;
          return '<li><a href="' + e.url + '"' + (on ? ' aria-current="page"' : '') + '>' + e.full.en + (on ? '<span class="exam-dd-check" aria-hidden="true">✓</span>' : '') + '</a></li>';
        }).join('') + '</ul>';
    var btn = el.querySelector('.exam-dd-btn');
    function setOpen(v){ el.classList.toggle('open', v); btn.setAttribute('aria-expanded', v ? 'true' : 'false'); }
    btn.addEventListener('click', function(ev){ ev.stopPropagation(); setOpen(!el.classList.contains('open')); });
    btn.addEventListener('keydown', function(ev){
      if(ev.key === 'ArrowDown'){ ev.preventDefault(); setOpen(true); var a = el.querySelector('.exam-dd-list a'); if(a) a.focus(); }
    });
    el.addEventListener('keydown', function(ev){
      if(ev.key === 'Escape' && el.classList.contains('open')){ ev.stopPropagation(); setOpen(false); btn.focus(); }
    });
    document.addEventListener('click', function(ev){ if(!el.contains(ev.target)) setOpen(false); });
    el.setAttribute('role', 'navigation');
    el.setAttribute('aria-label', 'Exam');
  }

  window.PE_EXAMS = EXAMS;
  function init(){
    var cur = document.body.getAttribute('data-exam');
    var sw = document.querySelectorAll('[data-exam-switch]');
    for(var i = 0; i < sw.length; i++) renderSwitch(sw[i], cur);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
