/* Account page: shows who is signed in; sends anyone who isn't to the login page. */
(function () {
  var A = window.DoorsAwayAPI;
  function $(id) { return document.getElementById(id); }

  A.session().then(function (r) {
    if (r.status === 200 && r.meta.is_authenticated) {
      var u = r.data.user || {};
      $('who').textContent = u.email || u.display || 'your account';
      $('view-loading').hidden = true; $('view-account').hidden = false; $('logout-btn').hidden = false;
      A.myOrders().then(showOrders).catch(function () {});
    } else {
      location.replace(window.DOORSAWAY.base + '/login/?next=' + window.DOORSAWAY.base + '/account/');
    }
  }).catch(function () {
    $('view-loading').innerHTML = '<p class="msg err" style="margin:0">We can’t reach DoorsAway right now. Please try again in a moment.</p>';
  });

  // Paid reports for this account. Built with textContent only: nothing from the API is parsed as HTML.
  function showOrders(r) {
    if (r.status !== 200 || !r.orders.length) return;
    var ul = $('orders-list'); ul.textContent = '';
    r.orders.forEach(function (o) {
      var li = document.createElement('li'); li.className = 'card'; li.style.cssText = 'padding:14px 16px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center';
      var name = o.market ? o.market.charAt(0).toUpperCase() + o.market.slice(1) : 'Market';
      var left = document.createElement('div');
      var t = document.createElement('strong'); t.textContent = name + ' market report'; left.appendChild(t);
      var d = document.createElement('div'); d.style.color = 'var(--muted)'; d.style.fontSize = '14px';
      d.textContent = 'Paid $' + Math.round(o.amount) + ' on ' + new Date(o.purchased_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      left.appendChild(d); li.appendChild(left);
      if (o.status === 'delivered' && /^https:\/\//.test(o.delivered_url || '')) {
        var a = document.createElement('a'); a.className = 'btn btn-accent btn-small'; a.href = o.delivered_url; a.rel = 'noopener'; a.textContent = 'Open report'; li.appendChild(a);
      } else {
        var p = document.createElement('span'); p.style.color = 'var(--muted)'; p.textContent = 'We’re preparing your report'; li.appendChild(p);
      }
      ul.appendChild(li);
    });
    $('orders').hidden = false;
  }

  $('logout-btn').addEventListener('click', function () {
    this.disabled = true;
    A.logout().then(function () { location.assign(window.DOORSAWAY.base + '/'); }).catch(function () { location.assign(window.DOORSAWAY.base + '/'); });
  });
})();
