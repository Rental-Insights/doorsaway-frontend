/* Account page: shows who is signed in; sends anyone who isn't to the login page. */
(function () {
  var A = window.DoorsAwayAPI;
  function $(id) { return document.getElementById(id); }

  A.session().then(function (r) {
    if (r.status === 200 && r.meta.is_authenticated) {
      var u = r.data.user || {};
      $('who').textContent = u.email || u.display || 'your account';
      $('view-loading').hidden = true; $('view-account').hidden = false; $('logout-btn').hidden = false;
    } else {
      location.replace(window.DOORSAWAY.base + '/login/?next=' + window.DOORSAWAY.base + '/account/');
    }
  }).catch(function () {
    $('view-loading').innerHTML = '<p class="msg err" style="margin:0">We can’t reach DoorsAway right now. Please try again in a moment.</p>';
  });

  $('logout-btn').addEventListener('click', function () {
    this.disabled = true;
    A.logout().then(function () { location.assign(window.DOORSAWAY.base + '/'); }).catch(function () { location.assign(window.DOORSAWAY.base + '/'); });
  });
})();
