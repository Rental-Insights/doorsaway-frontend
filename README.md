# doorsaway-frontend

Static site for DoorsAway: landing page, login, and the Memphis / Cleveland paid-report pages.
Plain HTML/CSS/JS, no build step. Successor to RentalInsights-Frontend.

| Path | What |
|---|---|
| `/` | Landing |
| `/verify-email/` | Landing page for the confirmation link (`?key=`). |
| `/login/` | Sign in / create account (email + password, Google). New accounts confirm their email by clicking a link we send. `?mode=signup` opens create-account. |
| `/forgot-password/`, `/reset-password/?key=` | Emailed reset link flow |
| `/account/` | Signed-in placeholder (redirects to login when signed out) |
| `/reports/memphis/`, `/reports/cleveland/` | Pre-order landing pages for the pay-or-not experiment |

## Run locally
```
python3 -m http.server 3000        # this repo
# and the backend (doorsaway-backend) on http://localhost:8000
```
Open http://localhost:3000. `assets/js/config.js` points at `localhost:8000` automatically.

## Configure — `assets/js/config.js`
- `apiBase` for production (**placeholder `api.doorsaway.example` — set it**). The site and API must share a registrable domain so the session cookie is same-site.
- `paymentLinks`: one Stripe Payment Link per market × price ($49 / $149). Success URL for each: `https://<site>/reports/<market>/?paid=1&p=<price>`. **Empty until created.**
- `contactEmail`, `metaPixelId`, `ga4Id`, per-market copy and stats.

Colours are tokens at the top of `assets/css/site.css` (palette from the DoorsAway logo).
Deploy to any static host at the domain root (paths are absolute). `404.html` is included.
