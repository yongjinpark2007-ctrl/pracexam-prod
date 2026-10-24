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
      name:{ ko:'EA', en:'EA' },
      full:{ ko:'미국 세무사 Enrolled Agent (EA)', en:'Enrolled Agent (EA)' },
      blurb:{ ko:'IRS EA 시험 Part 1·2·3 — 5,000개+ 실전 문제', en:'IRS Enrolled Agent exam, Parts 1–3 — 5,000+ practice questions' } },
    { id:'re', url:'/re/', app:'/re/app', color:'#4F7CAC',
      name:{ ko:'부동산', en:'Real Estate' },
      full:{ ko:'미국 부동산 중개사 Real Estate Agent', en:'Real Estate License' },
      blurb:{ ko:'National + 주(州) 시험 — 캘리포니아·뉴욕·텍사스·뉴저지', en:'National + state exams — CA, NY, TX, NJ' } }
  ];

  function bi(o){ return '<span class="ko">' + o.ko + '</span><span class="en">' + o.en + '</span>'; }

  // Header switch. Two exams = side-by-side pills; more than two = a dropdown (<details>).
  function renderSwitch(el, currentId){
    if(!el) return;
    var cur = EXAMS.filter(function(e){ return e.id === currentId; })[0];
    if(EXAMS.length <= 2){
      el.innerHTML = EXAMS.map(function(e){
        return '<a href="' + e.url + '"' + (e.id === currentId ? ' aria-current="page"' : '') + '>' + bi(e.name) + '</a>';
      }).join('');
      el.classList.add('exam-switch-pills');
    } else {
      el.innerHTML = '<details><summary>' + (cur ? bi(cur.name) : bi({ko:'시험 선택', en:'Exam'})) + '</summary><div class="exam-switch-menu">' +
        EXAMS.map(function(e){
          return '<a href="' + e.url + '"' + (e.id === currentId ? ' aria-current="page"' : '') + '>' + bi(e.full) + '</a>';
        }).join('') + '</div></details>';
      el.classList.add('exam-switch-menu-wrap');
    }
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
