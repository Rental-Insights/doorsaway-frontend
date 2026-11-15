/* DoorsAway frontend configuration. The only file you edit to point the site at an environment.
   No secrets belong here: everything in this file is public. */
window.DOORSAWAY = (function () {
  // Served from a GitHub project page (/doorsaway-frontend/) or from a domain root.
  var base = /^\/doorsaway-frontend(\/|$)/.test(location.pathname) ? '/doorsaway-frontend' : '';
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  return {
    base: base,
    // Backend API (Django). Must share a registrable domain with this site in production so the
    // session cookie is same-site, e.g. site doorsaway.example, API api.doorsaway.example.
    apiBase: isLocal ? 'http://localhost:8000' : 'https://app.doorsaway.com',

    contactEmail: 'hello@doorsaway.com', // shown in footers, legal pages and error messages

    // ---- Paid-report experiment (Memphis / Cleveland) ----
    metaPixelId: '',   // e.g. '123456789012345'
    ga4Id: '',         // e.g. 'G-XXXXXXX'
    deliveryBusinessDays: 5,
    foundingLimit: 50, // "founding price for the first N pre-orders"; 0 hides the line
    prices: [49, 149], // the two A/B price arms (the backend only accepts these)

    // One Stripe Payment Link per market and price arm. For each link, set the success URL to
    //   https://<this site>/reports/<market>/?paid=1&p=<price>
    // Left empty on purpose: RentalInsights' links redirect to rentalinsights.ai after payment.
    // While a link is empty, the pre-order button shows "checkout isn't connected yet".
    paymentLinks: {
      memphis:   { 49: 'https://buy.stripe.com/14A9AMbVxbNg1hb9DSew804', 149: 'https://buy.stripe.com/5kQaEQbVx18CaRL4jyew805' },
      cleveland: { 49: 'https://buy.stripe.com/dRm3cof7Jg3w6Bv3fuew806', 149: 'https://buy.stripe.com/8x25kw4t5cRk8JD3fuew807' }
    },

    // Per-market copy and stats. Leave a stat null to hide it.
    markets: {
      memphis: {
        name: 'Memphis', state: 'TN', full: 'Memphis, TN',
        headline: 'Memphis rentals that still pay for themselves — picked for investors who live far away.',
        sub: 'One report with the neighborhoods that cash-flow at today’s rates, the property managers and agents who actually work with out-of-state owners, and the deals worth looking at this month.',
        why: [
          'Californians are the largest group of out-of-state buyers here — about 29% of out-of-state purchases (SFR Analytics, Q1 2026).',
          'Tennessee has no state income tax on wages.',
          'Prices are a fraction of coastal markets, so rent can cover the mortgage.'
        ],
        stats: { medianPrice: null, medianRent: null, neighborhoods: null, managersScreened: null }
      },
      cleveland: {
        name: 'Cleveland', state: 'OH', full: 'Cleveland, OH',
        headline: 'Cleveland rentals that still cash-flow — vetted for owners who live out of state.',
        sub: 'One report with the neighborhoods where the numbers work at today’s rates, the property managers and agents who work with remote owners, and the deals worth looking at this month.',
        why: [
          'About 21% of out-of-state purchases in Cleveland come from California buyers (SFR Analytics, Q1 2026).',
          'Home prices are far below coastal markets, so rent can cover the mortgage.',
          'Neighborhoods change block by block — the report shows which blocks keep tenants.'
        ],
        stats: { medianPrice: null, medianRent: null, neighborhoods: null, managersScreened: null }
      }
    }
  };
})();
