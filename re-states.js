/* PracExam — the ONE list of real estate states (2026-10-24).
   The state dropdown on /re/ and the state chips on the hub are drawn from it.
   Adding a state = one entry here (+ its /re/<id>/ page later). The choice is remembered in localStorage. */
(function(){
  var STATES = [
    { id:'ca', name:'California' },   // west to east (boss 2026-10-24)
    { id:'tx', name:'Texas' },
    { id:'nj', name:'New Jersey' },
    { id:'ny', name:'New York' }
  ];
  var KEY = 'pe_re_state';
  function valid(id){ return STATES.some(function(s){ return s.id === id; }); }
  function get(){
    var q = null;
    try { q = new URLSearchParams(location.search).get('state'); } catch(e){}
    if (q && valid(q)) return q;
    try { var v = localStorage.getItem(KEY); if (v && valid(v)) return v; } catch(e){}
    return STATES[0].id;
  }
  function set(id){ if (!valid(id)) return; try { localStorage.setItem(KEY, id); } catch(e){} }
  window.PE_RE_STATES = STATES;
  window.PE_RE_STATE = { get:get, set:set };
})();
