/* Email confirmation page: the link in the signup email lands here with ?key=... */
(function () {
  var A = window.DoorsAwayAPI;
  function $(id) { return document.getElementById(id); }
  function view(id) { ['view-checking', 'view-done', 'view-bad', 'view-net'].forEach(function (v) { $(v).hidden = v !== id; }); }

  var key = new URLSearchParams(location.search).get('key');
  if (!key) return view('view-bad');

  // Look the key up first so the page can name the address, then confirm it.
  A.checkVerifyKey(key).then(function (r) {
    if (r.status !== 200) return view('view-bad');
    var addr = (r.data && r.data.email) || '';
    return A.confirmEmail(key).then(function (c) {
      // Not logged in afterwards (the link may be opened on another device): 200 or 401, both mean confirmed.
      if (c.status === 200 || c.status === 401) { $('done-email').textContent = addr || 'Your email'; return view('view-done'); }
      view('view-bad');
    });
  }).catch(function () { view('view-net'); });
})();
