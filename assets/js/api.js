/* Thin client for the DoorsAway auth API (django-allauth headless, "browser" client).
   Auth state is an HttpOnly session cookie on the API host; this file never sees a token.
   Django requires a CSRF token on every write and rotates it on login/logout, so writes fetch a
   token first and, on a 403, fetch a fresh one and retry once. */
(function () {
  var C = window.DOORSAWAY;
  var AUTH = C.apiBase + '/_allauth/browser/v1';
  var csrf = null;

  function getCsrf(force) {
    if (csrf && !force) return Promise.resolve(csrf);
    return fetch(C.apiBase + '/api/csrf/', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (j) { csrf = j.csrfToken; return csrf; });
  }

  // Resolves to { status, ok, data, errors } for every HTTP answer. Rejects only when the
  // network is down or the API can't be reached at all.
  function call(method, path, body, headers, attempt) {
    attempt = attempt || 0;
    var isRead = method === 'GET';
    return (isRead ? Promise.resolve(null) : getCsrf(attempt > 0)).then(function (token) {
      var h = Object.assign({ Accept: 'application/json' }, headers || {});
      var init = { method: method, credentials: 'include', headers: h };
      if (!isRead) {
        h['Content-Type'] = 'application/json';
        h['X-CSRFToken'] = token;
        init.body = JSON.stringify(body || {}); // allauth answers 400 to a JSON request with no body
      }
      return fetch(AUTH + path, init);
    }).then(function (res) {
      if (res.status === 403 && !isRead && attempt === 0) return call(method, path, body, headers, 1);
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { status: res.status, ok: res.ok, data: data.data || {}, meta: data.meta || {}, errors: data.errors || [] };
      });
    });
  }

  function pendingFlow(r) {
    var flows = (r.data && r.data.flows) || [];
    for (var i = 0; i < flows.length; i++) if (flows[i].is_pending) return flows[i].id;
    return null;
  }

  window.DoorsAwayAPI = {
    session: function () { return call('GET', '/auth/session'); },
    login: function (email, password) { return call('POST', '/auth/login', { email: email, password: password }); },
    signup: function (email, password) { return call('POST', '/auth/signup', { email: email, password: password }); },
    checkVerifyKey: function (key) { return call('GET', '/auth/email/verify', null, { 'X-Email-Verification-Key': key }); },
    confirmEmail: function (key) { return call('POST', '/auth/email/verify', { key: key }); },
    requestReset: function (email) { return call('POST', '/auth/password/request', { email: email }); },
    checkResetKey: function (key) { return call('GET', '/auth/password/reset', null, { 'X-Password-Reset-Key': key }); },
    resetPassword: function (key, password) { return call('POST', '/auth/password/reset', { key: key, password: password }); },
    logout: function () { return call('DELETE', '/auth/session'); },
    pendingFlow: pendingFlow,
    // Paid reports tied to this account (matched on its verified email addresses).
    myOrders: function () {
      return fetch(C.apiBase + '/api/me/orders/', { credentials: 'include', headers: { Accept: 'application/json' } })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (j) { return { status: res.status, orders: j.orders || [] }; }); });
    },

    // Market dashboard (signed-in only): resolves { status, data }; 401 means "not signed in".
    markets: function (state, city) {
      var path = state ? '/api/markets/' + encodeURIComponent(state) + '/' + encodeURIComponent(city) + '/' : '/api/markets/';
      return fetch(C.apiBase + path, { credentials: 'include', headers: { Accept: 'application/json' } })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (j) { return { status: res.status, data: j }; }); });
    },

    // Google sign-in: a top-level form POST (the API answers with a redirect to Google, and Google
    // sends the browser back through the API to `next` on this site).
    googleSignIn: function (nextPath) {
      return getCsrf(true).then(function (token) {
        var f = document.createElement('form');
        f.method = 'POST';
        f.action = AUTH + '/auth/provider/redirect';
        [['provider', 'google'], ['process', 'login'], ['callback_url', (nextPath ? location.origin + nextPath : C.appUrl)],
         ['csrfmiddlewaretoken', token]].forEach(function (kv) {
          var i = document.createElement('input'); i.type = 'hidden'; i.name = kv[0]; i.value = kv[1]; f.appendChild(i);
        });
        document.body.appendChild(f);
        f.submit();
      });
    }
  };
})();
