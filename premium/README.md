# Mithqal Premium landing page

Arabic RTL marketing site. 56 product features, seven-day trial, responsive product tour and feature search.

## Cloudflare Git deployment

- Repository: aoosio/mithqal-releases
- Production branch: cloudflare-premium
- Project: mithqal-premium
- Live URL: https://mithqal-premium.pages.dev
- Root directory: premium
- Build command: empty (prebuilt static files)
- Build output: dist

Cloudflare uses its native GitHub integration. Push changes to this branch to publish automatically. The main branch and existing GitHub Pages landing page are independent.

## Editing

Edit dist/index.html, dist/styles.css, and dist/app.js. The feature inventory is in features.py; run python3 features.py to regenerate the feature disclosures. Update dist/releases.json when shipping new Windows versions.

For local preview: python3 -m http.server 4327 --directory dist

Images are product/demo captures; captions identify sample data. Font license: dist/assets/OFL.txt.
