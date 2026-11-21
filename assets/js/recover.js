/* Forgot-password and reset-password pages (same script; each page has its own elements). */
(function () {
  var A = window.DoorsAwayAPI;
  function $(id) { return document.getElementById(id); }
  function show(el, on) { el.hidden = !on; }
  function msg(id, text, input) { var el = $(id); el.textContent = text; show(el, !!text); if (input) input.setAttribute('aria-invalid', 'true'); }
  function clear() { ['email-err', 'password-err', 'form-err'].forEach(function (id) { if ($(id)) msg(id, ''); }); }
  function busy(btn, on, label) { btn.disabled = on; btn.setAttribute('aria-busy', on ? 'true' : 'false'); if (label) btn.textContent = label; }
  var NETWORK = 'We can’t reach DoorsAway right now. Check your connection and try again.';
  var THROTTLED = 'Too many attempts. Please wait a few minutes and try again.';

  // ---------- forgot password ----------
  if ($('request-form')) {
    $('request-form').addEventListener('submit', function (e) {
      e.preventDefault(); clear();
      var em = $('email').value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { msg('email-err', 'Enter a valid email address.', $('email')); $('email').focus(); return; }
      var btn = $('request-btn'); busy(btn, true, 'Sending…');
      A.requestReset(em).then(function (r) {
        busy(btn, false, 'Send reset link');
        if (r.status === 429) return msg('form-err', THROTTLED);
        if (r.status === 400) return msg('email-err', (r.errors[0] && r.errors[0].message) || 'Enter a valid email address.', $('email'));
        // The API answers the same whether or not the account exists, and so do we.
        $('sent-email').textContent = em;
        show($('view-request'), false); show($('view-sent'), true);
      }).catch(function () { busy(btn, false, 'Send reset link'); msg('form-err', NETWORK); });
    });
    $('again-btn').addEventListener('click', function () { show($('view-sent'), false); show($('view-request'), true); $('email').focus(); });
  }

  // ---------- reset password ----------
  if ($('reset-form')) {
    var key = new URLSearchParams(location.search).get('key') || '';
    function expired() { show($('view-checking'), false); show($('view-reset'), false); show($('view-expired'), true); }
    if (!key) { expired(); }
    else {
      A.checkResetKey(key).then(function (r) {
        if (r.status === 200) { show($('view-checking'), false); show($('view-reset'), true); $('password').focus(); }
        else expired();
      }).catch(function () { show($('view-checking'), false); show($('view-reset'), true); msg('form-err', NETWORK); });
    }

    $('pw-toggle').addEventListener('click', function () {
      var p = $('password'), shown = p.type === 'text';
      p.type = shown ? 'password' : 'text'; this.textContent = shown ? 'Show' : 'Hide'; this.setAttribute('aria-pressed', shown ? 'false' : 'true');
    });

    $('reset-form').addEventListener('submit', function (e) {
      e.preventDefault(); clear();
      var pw = $('password').value;
      if (pw.length < 8) { msg('password-err', 'Use at least 8 characters.', $('password')); $('password').focus(); return; }
      var btn = $('reset-btn'); busy(btn, true, 'Updating…');
      A.resetPassword(key, pw).then(function (r) {
        busy(btn, false, 'Update password');
        // 200 (signed in) and 401 (password changed, sign in again) are both success.
        if (r.status === 200 && r.meta.is_authenticated) return location.assign(window.DOORSAWAY.appUrl);
        if (r.status === 401) return location.assign(window.DOORSAWAY.base + '/login/?reset=1');
        if (r.status === 429) return msg('form-err', THROTTLED);
        var keyErr = r.errors.filter(function (x) { return x.param === 'key'; })[0];
        if (keyErr || r.status === 409) return expired();
        var e0 = r.errors[0];
        msg('password-err', (e0 && e0.message) || 'That password can’t be used. Try a different one.', $('password')); $('password').focus();
      }).catch(function () { busy(btn, false, 'Update password'); msg('form-err', NETWORK); });
    });
  }
})();
