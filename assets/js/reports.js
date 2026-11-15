/* Paid-report landing pages (/reports/memphis/, /reports/cleveland/).
   What it does:
   - Market comes from <body data-market="...">; copy and stats from config.js.
   - Price arms: visitors are split 50/50 between the two prices in config.prices and stay in their
     arm on return visits. Force one with ?p=49 or ?p=149.
   - Pre-order button -> the Stripe Payment Link for this market and price, with
     client_reference_id = da_market_price_campaign_content_visitor so every payment can be
     attributed (the backend ignores references without the leading "da").
   - Waitlist, survey and funnel events post to the backend's /api/landing/* endpoints.
   - ?paid=1 (the Payment Link's success URL) swaps the page for the thank-you survey.
   - Meta Pixel and GA4 load only when their IDs are set in config.js. */
(function () {
  var C = window.DOORSAWAY;
  var q = new URLSearchParams(location.search);
  var API = C.apiBase;

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function $(id) { return document.getElementById(id); }
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  // ---------- variant: market ----------
  var market = document.body.getAttribute('data-market');
  var M = C.markets[market];
  if (!M) { market = 'memphis'; M = C.markets.memphis; }

  // ---------- variant: price arm (sticky per visitor) ----------
  var forced = parseInt(q.get('p'), 10);
  var price = C.prices.indexOf(forced) !== -1 ? forced : parseInt(get('da_price_arm'), 10);
  if (C.prices.indexOf(price) === -1) price = C.prices[Math.random() < 0.5 ? 0 : 1];
  set('da_price_arm', String(price));

  // ---------- attribution ----------
  var utm = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
    var v = q.get(k) || get('da_' + k); if (v) { utm[k] = v; set('da_' + k, v); }
  });
  var visitor = get('da_vid') || ('v' + Math.random().toString(36).slice(2, 10));
  set('da_vid', visitor);

  // ---------- tracking ----------
  if (C.metaPixelId) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', C.metaPixelId); fbq('track', 'PageView');
  }
  if (C.ga4Id) {
    var g = document.createElement('script'); g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(C.ga4Id); document.head.appendChild(g);
    window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date()); gtag('config', C.ga4Id);
  }
  var META = { view: 'ViewContent', lead: 'Lead', checkout: 'InitiateCheckout', purchase: 'Purchase' };
  var GA = { view: 'view_item', lead: 'generate_lead', checkout: 'begin_checkout', purchase: 'purchase' };
  function track(name, extra) {
    var p = Object.assign({ market: market, price_arm: price, value: price, currency: 'USD', visitor: visitor }, utm, extra || {});
    try { if (window.fbq && META[name]) fbq('track', META[name], { value: p.value, currency: 'USD', content_name: market + '_report', content_category: 'price_' + price }); } catch (e) {}
    try { if (window.gtag) gtag('event', GA[name] || name, p); } catch (e) {}
    try {
      if (navigator.sendBeacon) navigator.sendBeacon(API + '/api/landing/event/',
        new Blob([JSON.stringify(Object.assign({ event: name, ts: Date.now(), path: location.pathname }, p))], { type: 'text/plain;charset=UTF-8' }));
    } catch (e) {}
  }

  // ---------- fill content ----------
  function addBusinessDays(d, n) { var x = new Date(d); while (n > 0) { x.setDate(x.getDate() + 1); var w = x.getDay(); if (w !== 0 && w !== 6) n--; } return x; }
  var delivery = addBusinessDays(new Date(), C.deliveryBusinessDays).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  each('[data-city]', function (el) { el.textContent = M.name; });
  each('[data-price]', function (el) { el.textContent = String(price); });
  each('[data-delivery]', function (el) { el.textContent = delivery; });
  $('headline').textContent = M.headline;
  $('sub').textContent = M.sub;
  $('wl-market').value = market;
  var contact = $('contact-link'); if (C.contactEmail) { contact.href = 'mailto:' + C.contactEmail; contact.hidden = false; }
  var founding = $('founding');
  if (C.foundingLimit) founding.textContent = 'Founding price for the first ' + C.foundingLimit + ' pre-orders. Later reports will cost more.'; else founding.remove();

  M.why.forEach(function (t) {
    var d = document.createElement('div'); d.className = 'card';
    var p = document.createElement('p'); p.style.color = 'var(--ink)'; p.textContent = t;
    d.appendChild(p); $('why').appendChild(d);
  });

  var S = M.stats, statsEl = $('stats'), shown = 0;
  [['medianPrice', 'Typical rental-home price', function (v) { return '$' + Number(v).toLocaleString('en-US'); }],
   ['medianRent', 'Typical monthly rent', function (v) { return '$' + Number(v).toLocaleString('en-US'); }],
   ['neighborhoods', 'Neighborhoods analyzed', String],
   ['managersScreened', 'Property managers screened', String]].forEach(function (d) {
    if (S[d[0]] == null) return; shown++;
    var div = document.createElement('div'); div.className = 'stat';
    var b = document.createElement('b'); b.textContent = d[2](S[d[0]]);
    var s = document.createElement('span'); s.textContent = d[1];
    div.appendChild(b); div.appendChild(s); statsEl.appendChild(div);
  });
  if (!shown) statsEl.remove();

  // ---------- buy ----------
  // No underscores inside a part: the backend splits client_reference_id on "_".
  function sanitize(s) { return String(s).replace(/[^A-Za-z0-9-]/g, '').slice(0, 60); }
  function toast(text) {
    var t = $('da-toast');
    if (!t) { t = document.createElement('div'); t.id = 'da-toast'; t.className = 'toast'; t.setAttribute('role', 'alert'); document.body.appendChild(t); }
    t.textContent = text; t.hidden = false;
    clearTimeout(toast.timer); toast.timer = setTimeout(function () { t.hidden = true; }, 6000);
  }
  each('[data-buy]', function (btn) {
    btn.addEventListener('click', function () {
      track('checkout');
      var link = (C.paymentLinks[market] || {})[price];
      if (!link) { toast('Checkout isn’t connected yet. Please join the waitlist below and we’ll email you the moment it opens.'); return; }
      var ref = ['da', market, price, sanitize(utm.utm_campaign || 'direct'), sanitize(utm.utm_content || 'none'), visitor].join('_').slice(0, 200);
      location.href = link + (link.indexOf('?') === -1 ? '?' : '&') + 'client_reference_id=' + encodeURIComponent(ref);
    });
  });
  each('[data-track]', function (a) { a.addEventListener('click', function () { track(a.getAttribute('data-track')); }); });

  // ---------- forms ----------
  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); });
  }
  function say(el, cls, text) { el.className = 'msg ' + cls; el.textContent = text; }
  var fallbackContact = C.contactEmail ? ' or email ' + C.contactEmail : '';

  $('waitlist-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = $('wl-email').value.trim(), msg = $('wl-msg');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { say(msg, 'err', 'Please enter a valid email.'); return; }
    var body = Object.assign({ email: email, interest: $('wl-market').value, market: market, price_arm: price, visitor: visitor }, utm);
    post(API + '/api/landing/waitlist/', body).then(function () {
      track('lead', { value: 0 });
      say(msg, 'ok', 'You’re on the list. One email when the next report is out.');
      e.target.reset(); $('wl-market').value = market;
    }).catch(function () { say(msg, 'err', 'Something went wrong. Please try again' + fallbackContact + '.'); });
  });

  // ---------- thank-you mode (Stripe success URL) ----------
  if (q.get('paid') === '1') {
    $('sales').hidden = true; $('sticky').hidden = true; $('thanks').hidden = false;
    document.body.classList.remove('has-sticky');
    if (!get('da_purchased_' + market)) { track('purchase'); set('da_purchased_' + market, '1'); }
    $('survey-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, msg = $('s-msg');
      var body = Object.assign({ market: market, price_arm: price, visitor: visitor, budget: f.budget.value, timeline: f.timeline.value, owned: f.owned.value, note: f.note.value, call_ok: f.call_ok.checked }, utm);
      post(API + '/api/landing/survey/', body).then(function () {
        say(msg, 'ok', 'Thanks — this helps us make your report sharper.'); f.querySelector('button').disabled = true;
      }).catch(function () { say(msg, 'err', 'Couldn’t send. Please reply to your receipt email instead.'); });
    });
  } else {
    track('view');
  }
  document.title = M.full + ' rental market report for out-of-state investors — DoorsAway';
})();
