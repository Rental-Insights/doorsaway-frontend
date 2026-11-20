/* Market dashboard: ZIP x property-type comparison with a cash-flow estimate.
   Signed-in only (the API answers 401 otherwise and we send the visitor to the login page).
   Everything from the API is written with textContent, never parsed as HTML. */
(function () {
  var A = window.DoorsAwayAPI, B = window.DOORSAWAY.base;
  var TYPE_LABEL = { SINGLE_FAMILY: 'Single family', TOWNHOUSE: 'Townhouse', MULTI_FAMILY: 'Multi-family (2-4 units)', CONDO: 'Condo' };
  var COLS = [
    ['zipcode', 'ZIP'], ['property_type', 'Type'], ['homes', 'Homes'], ['median_value', 'Est. value'], ['median_rent', 'Est. rent / mo'],
    ['gross_yield', 'Gross yield'], ['cash', 'Cash flow / mo'], ['price_change_pct', 'Price 12m'], ['sold_12m', 'Sales 12m'], ['rental_days_median', 'Days to rent']
  ];
  var state = { rows: [], types: {}, sort: 'gross_yield', dir: -1, picked: [] };
  function $(id) { return document.getElementById(id); }
  function el(tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
  function money(n) { return n == null ? '—' : (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString(); }
  function pct(n) { return n == null ? '—' : n.toFixed(1) + '%'; }
  function num(id) { var v = parseFloat($(id).value); return isFinite(v) ? v : 0; }

  // Monthly cash flow at the typical value and rent, using the visitor's own assumptions.
  function cash(r) {
    if (!r.median_value || !r.median_rent) return null;
    var price = r.median_value, loan = price * (1 - num('a-down') / 100);
    var i = num('a-rate') / 100 / 12, n = num('a-years') * 12;
    var pmt = !loan ? 0 : (i ? loan * i / (1 - Math.pow(1 + i, -n)) : loan / n);
    var fixed = price * (num('a-tax') + num('a-ins')) / 100 / 12;
    var rent = r.median_rent;
    return rent * (1 - (num('a-vac') + num('a-mgmt') + num('a-rep')) / 100) - pmt - fixed;
  }
  function thin(r) { return r.homes < 100 || r.sold_12m < 10; }
  function value(r, k) { return k === 'cash' ? cash(r) : r[k]; }

  function render() {
    var on = Object.keys(state.types).filter(function (t) { return state.types[t]; });
    var rows = state.rows.filter(function (r) { return on.indexOf(r.property_type) >= 0; });
    rows.sort(function (a, b) {
      var x = value(a, state.sort), y = value(b, state.sort);
      if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * state.dir;
    });
    var head = $('thead'); head.textContent = '';
    head.appendChild(el('th', 'Compare'));
    COLS.forEach(function (c) {
      var th = el('th'); th.setAttribute('aria-sort', c[0] === state.sort ? (state.dir > 0 ? 'ascending' : 'descending') : 'none');
      var b = el('button', c[1] + (c[0] === state.sort ? (state.dir > 0 ? ' ▲' : ' ▼') : '')); b.type = 'button';
      b.addEventListener('click', function () { state.dir = state.sort === c[0] ? -state.dir : (c[0] === 'zipcode' || c[0] === 'property_type' || c[0] === 'rental_days_median' ? 1 : -1); state.sort = c[0]; render(); });
      th.appendChild(b); head.appendChild(th);
    });
    var body = $('tbody'); body.textContent = '';
    rows.forEach(function (r) {
      var key = r.zipcode + '|' + r.property_type, tr = el('tr'), cf = cash(r);
      var td = el('td'); td.style.textAlign = 'left';
      var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = state.picked.indexOf(key) >= 0;
      cb.setAttribute('aria-label', 'Compare ' + r.zipcode + ' ' + (TYPE_LABEL[r.property_type] || r.property_type));
      cb.addEventListener('change', function () {
        var i = state.picked.indexOf(key);
        if (cb.checked && state.picked.length >= 3) { cb.checked = false; return; }
        if (cb.checked && i < 0) state.picked.push(key); else if (!cb.checked && i >= 0) state.picked.splice(i, 1);
        compare();
      });
      td.appendChild(cb); tr.appendChild(td);
      tr.appendChild(el('td', r.zipcode));
      var tt = el('td', TYPE_LABEL[r.property_type] || r.property_type); if (thin(r)) tt.appendChild(el('span', 'Thin data', 'flag')); tr.appendChild(tt);
      tr.appendChild(el('td', r.homes.toLocaleString()));
      tr.appendChild(el('td', money(r.median_value)));
      tr.appendChild(el('td', money(r.median_rent)));
      tr.appendChild(el('td', pct(r.gross_yield)));
      tr.appendChild(el('td', money(cf), cf == null ? '' : cf >= 0 ? 'pos' : 'neg'));
      tr.appendChild(el('td', r.price_change_pct == null ? '—' : (r.price_change_pct > 0 ? '+' : '') + pct(r.price_change_pct), r.price_change_pct == null ? '' : r.price_change_pct >= 0 ? 'pos' : 'neg'));
      tr.appendChild(el('td', r.sold_12m.toLocaleString()));
      tr.appendChild(el('td', r.rental_days_median == null ? '—' : r.rental_days_median));
      body.appendChild(tr);
    });
    $('status').textContent = rows.length ? rows.length + ' ZIP / type combinations. Click a column to sort.' : 'No rows for the selected property types.';
    compare();
  }

  function compare() {
    var box = $('compare'); box.textContent = '';
    var picks = state.picked.map(function (k) {
      return state.rows.filter(function (r) { return r.zipcode + '|' + r.property_type === k; })[0];
    }).filter(Boolean);
    $('compare-wrap').hidden = !picks.length;
    picks.forEach(function (r) {
      var card = el('div', null, 'card'); card.appendChild(el('h3', r.zipcode + ' · ' + (TYPE_LABEL[r.property_type] || r.property_type)));
      var dl = el('dl');
      [['Est. value', money(r.median_value)], ['Est. rent / mo', money(r.median_rent)], ['Gross yield', pct(r.gross_yield)],
       ['Cash flow / mo', money(cash(r))], ['Value per sq ft', r.median_ppsf == null ? '—' : '$' + Math.round(r.median_ppsf)],
       ['Median year built', r.median_year_built || '—'], ['Median sale, 12m', money(r.median_sold_12m)],
       ['Price change, 12m', r.price_change_pct == null ? '—' : pct(r.price_change_pct)], ['Sales, 12m', r.sold_12m.toLocaleString()],
       ['Days to rent', r.rental_days_median == null ? '—' : r.rental_days_median], ['Homes in sample', r.homes.toLocaleString()]
      ].forEach(function (p) { dl.appendChild(el('dt', p[0])); dl.appendChild(el('dd', p[1])); });
      card.appendChild(dl); box.appendChild(card);
    });
  }

  function loadMarket(opt) {
    $('status').textContent = 'Loading…';
    A.markets(opt.state, opt.city).then(function (r) {
      if (r.status === 401) return location.replace(B + '/login/?next=' + B + '/dashboard/');
      if (r.status !== 200) { $('err').textContent = 'Could not load that market. Please try again.'; $('err').hidden = false; return; }
      $('err').hidden = true; state.rows = r.data.rows; state.picked = [];
      var present = {}; state.rows.forEach(function (x) { present[x.property_type] = 1; });
      var box = $('types'); box.textContent = '';
      Object.keys(TYPE_LABEL).filter(function (t) { return present[t]; }).forEach(function (t) {
        if (!(t in state.types)) state.types[t] = t !== 'CONDO';
        var b = el('button', TYPE_LABEL[t], 'chip'); b.type = 'button'; b.setAttribute('aria-pressed', String(!!state.types[t]));
        b.addEventListener('click', function () { state.types[t] = !state.types[t]; b.setAttribute('aria-pressed', String(state.types[t])); render(); });
        box.appendChild(b);
      });
      render();
    }).catch(function () { $('err').textContent = 'We can’t reach DoorsAway right now. Please try again in a moment.'; $('err').hidden = false; });
  }

  A.session().then(function (s) {
    if (!(s.status === 200 && s.meta.is_authenticated)) return location.replace(B + '/login/?next=' + B + '/dashboard/');
    $('logout-btn').hidden = false;
    return A.markets().then(function (r) {
      if (r.status === 401) return location.replace(B + '/login/?next=' + B + '/dashboard/');
      var list = (r.data.markets || []).filter(function (m) { return m.zips >= 3; });
      var sel = $('market');
      list.forEach(function (m, i) { var o = el('option', m.city + ', ' + m.state + ' (' + m.zips + ' ZIPs)'); o.value = i; sel.appendChild(o); });
      var start = 0; list.forEach(function (m, i) { if (m.city === 'Philadelphia') start = i; }); sel.value = start;
      sel.addEventListener('change', function () { loadMarket(list[sel.value]); });
      ['a-down', 'a-rate', 'a-years', 'a-tax', 'a-ins', 'a-vac', 'a-mgmt', 'a-rep'].forEach(function (id) { $(id).addEventListener('input', render); });
      $('view-loading').hidden = true; $('view-dash').hidden = false;
      if (list.length) loadMarket(list[start]); else $('status').textContent = 'No market data has been published yet.';
    });
  }).catch(function () {
    $('view-loading').textContent = 'We can’t reach DoorsAway right now. Please try again in a moment.';
  });

  $('logout-btn').addEventListener('click', function () {
    this.disabled = true;
    A.logout().then(function () { location.assign(B + '/'); }).catch(function () { location.assign(B + '/'); });
  });
})();
