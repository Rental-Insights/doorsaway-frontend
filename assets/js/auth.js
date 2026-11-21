/* Login page: sign in, create account, confirm email by link, Google. */
(function () {
  var A = window.DoorsAwayAPI;
  function $(id) { return document.getElementById(id); }
  function show(el, on) { el.hidden = !on; }

  var q = new URLSearchParams(location.search);
  var mode = q.get('mode') === 'signup' ? 'signup' : 'signin';
  var email = '';        // address awaiting confirmation

  // Only same-site relative paths: never send someone to a URL taken from the query string.
  var next = (function () {
    var n = q.get('next') || (window.DOORSAWAY.base + '/dashboard/');
    return /^\/(?!\/)/.test(n) ? n : window.DOORSAWAY.base + '/dashboard/';
  })();

  var NETWORK = 'We can’t reach DoorsAway right now. Check your connection and try again.';
  var THROTTLED = 'Too many attempts. Please wait a few minutes and try again.';

  // ---------- helpers ----------
  function setBusy(btn, busy, label) {
    btn.disabled = busy; btn.setAttribute('aria-busy', busy ? 'true' : 'false');
    if (label) btn.textContent = label;
  }
  function clearErrors() {
    ['email-err', 'password-err', 'form-err'].forEach(function (id) { show($(id), false); $(id).textContent = ''; });
    $('email').removeAttribute('aria-invalid'); $('password').removeAttribute('aria-invalid');
  }
  function fieldError(id, input, text) {
    var el = $(id); el.textContent = text; show(el, true);
    if (input) { input.setAttribute('aria-invalid', 'true'); }
  }
  function notice(el, kind, text) {
    el.className = 'notice ' + kind; el.textContent = text; show(el, !!text);
  }
  // Route API validation errors to the right field.
  function applyErrors(r) {
    if (r.status === 429) { fieldError('form-err', null, THROTTLED); return; }
    var placed = false;
    r.errors.forEach(function (e) {
      if (e.code === 'too_many_login_attempts') { fieldError('form-err', null, THROTTLED); placed = true; return; }
      if (e.param === 'email') { fieldError('email-err', $('email'), e.message); placed = true; }
      else if (e.param === 'password') { fieldError('password-err', $('password'), e.message); placed = true; }
      else { fieldError('form-err', null, e.message); placed = true; }
    });
    if (!placed) fieldError('form-err', null, 'Something went wrong. Please try again.');
  }
  function done() { location.assign(next); }

  // ---------- mode: sign in / create account ----------
  function renderMode() {
    var signup = mode === 'signup';
    $('form-title').textContent = signup ? 'Create your free account' : 'Welcome back';
    $('switch-lead').textContent = signup ? 'Already have one?' : 'New here?';
    $('switch-mode').textContent = signup ? 'Sign in' : 'Create an account';
    $('submit-btn').textContent = signup ? 'Create account' : 'Sign in';
    $('password').setAttribute('autocomplete', signup ? 'new-password' : 'current-password');
    show($('forgot-link'), !signup);
    show($('pw-hint'), signup);
    document.title = (signup ? 'Create account' : 'Sign in') + ' — DoorsAway';
    clearErrors();
  }
  $('switch-mode').addEventListener('click', function () {
    mode = mode === 'signup' ? 'signin' : 'signup';
    var u = new URL(location.href); if (mode === 'signup') u.searchParams.set('mode', 'signup'); else u.searchParams.delete('mode');
    history.replaceState(null, '', u);
    renderMode();
  });

  $('pw-toggle').addEventListener('click', function () {
    var p = $('password'), shown = p.type === 'text';
    p.type = shown ? 'password' : 'text';
    this.textContent = shown ? 'Show' : 'Hide';
    this.setAttribute('aria-pressed', shown ? 'false' : 'true');
  });

  // ---------- submit ----------
  $('auth-form').addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();
    var em = $('email').value.trim(), pw = $('password').value;
    var bad = false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { fieldError('email-err', $('email'), 'Enter a valid email address.'); bad = true; }
    if (!pw) { fieldError('password-err', $('password'), 'Enter your password.'); bad = true; }
    else if (mode === 'signup' && pw.length < 8) { fieldError('password-err', $('password'), 'Use at least 8 characters.'); bad = true; }
    if (bad) { (document.querySelector('[aria-invalid="true"]') || $('email')).focus(); return; }

    var btn = $('submit-btn'), label = btn.textContent;
    setBusy(btn, true, mode === 'signup' ? 'Creating account…' : 'Signing in…');
    var req = mode === 'signup' ? A.signup(em, pw) : A.login(em, pw);
    req.then(function (r) {
      setBusy(btn, false, label);
      if (r.status === 200 && r.meta.is_authenticated) return done();
      if (r.status === 401 && A.pendingFlow(r) === 'verify_email') { email = em; return openVerify(); }
      applyErrors(r);
      var first = document.querySelector('[aria-invalid="true"]'); if (first) first.focus();
    }).catch(function () { setBusy(btn, false, label); fieldError('form-err', null, NETWORK); });
  });

  // ---------- Google ----------
  $('google-btn').addEventListener('click', function () {
    var b = this; setBusy(b, true);
    A.googleSignIn(next).catch(function () { setBusy(b, false); fieldError('form-err', null, NETWORK); });
  });

  // ---------- step 2: we emailed a confirmation link ----------
  function openVerify() {
    $('verify-email').textContent = email;
    show($('view-form'), false); show($('view-verify'), true);
    document.title = 'Check your email — DoorsAway';
    $('verify-title').setAttribute('tabindex', '-1'); $('verify-title').focus();
  }
  function backToForm() {
    show($('view-verify'), false); show($('view-form'), true);
    renderMode();
    $('email').value = email; $('password').focus();
  }
  $('back-btn').addEventListener('click', function () { mode = 'signin'; backToForm(); });

  // ---------- on load ----------
  renderMode();
  if (q.get('error') === 'social') notice($('page-notice'), 'err', 'Google sign-in didn’t complete. Please try again, or use your email and password.');
  if (q.get('confirmed') === '1') notice($('page-notice'), 'ok', 'Email confirmed. Sign in to continue.');
  if (q.get('reset') === '1') notice($('page-notice'), 'ok', 'Password updated. Sign in with your new password.');

  // Already signed in? Skip the form.
  A.session().then(function (r) { if (r.status === 200 && r.meta.is_authenticated) done(); }).catch(function () {});
})();
