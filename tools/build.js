#!/usr/bin/env node
/* Builds the static Cyber Fitness website from the design pages in src/pages.
   Output: public/ — one pre-rendered HTML file per page, plus assets.
   Usage: node tools/build.js   (needs Playwright + Chromium for pre-rendering) */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'pages');
const ASSETS = path.join(ROOT, 'src', 'assets');
const OUT = path.join(ROOT, 'public');

const PAGES = {
  Main: { file: 'index.html', route: '/', title: 'Cyber Fitness by Hijab Wasif — Live online fitness, join any day', desc: 'Live Zoom fitness classes with certified trainers and clinical dietitians. 16+ classes a day, no fixed batches — join any day, any time.' },
  About: { file: 'about.html', route: '/about', title: 'About us — Cyber Fitness', desc: 'Fitness that fits your life and respects your culture. Meet Cyber Fitness and founder Hijab Wasif.' },
  Classes: { file: 'classes.html', route: '/classes', title: 'Live online classes & schedule — Cyber Fitness', desc: 'Coach-led live Zoom classes from morning to midnight in six time zones. See the full schedule and join any class, any day.' },
  Programs: { file: 'programmes.html', route: '/programmes', title: 'Special programmes — postpartum, diastasis recti & seniors — Cyber Fitness', desc: 'Postpartum package, diastasis recti and pelvic floor class, and gentle sessions for senior citizens — live and online.' },
  Trainers: { file: 'trainers.html', route: '/trainers', title: 'Trainers & team — Cyber Fitness', desc: 'Certified trainers, registered dietitians and the team behind Cyber Fitness.' },
  Nutrition: { file: 'nutrition.html', route: '/nutrition', title: 'Nutrition & diet support — Cyber Fitness', desc: 'Personalised, macro-aware meal plans and meal tracking with clinical dietitians.' },
  Progress: { file: 'progress.html', route: '/progress', title: 'Progress & accountability — Cyber Fitness', desc: 'Baseline assessments, weekly check-ins and monthly reviews to keep you on track.' },
  Transformations: { file: 'transformations.html', route: '/transformations', title: 'Transformations — Cyber Fitness', desc: 'Real member results, all from home.' },
  Pricing: { file: 'pricing.html', route: '/pricing', title: 'Plans & pricing — Cyber Fitness', desc: 'Workout, Workout + Diet and Diet plans — monthly, 3-month and 6-month options.' },
  SignUp: { file: 'signup.html', route: '/signup', title: 'Join now — Cyber Fitness', desc: 'Create your Cyber Fitness account and start training live today.' },
  Book: { file: 'book.html', route: '/book', title: 'Book a consultation or fitness assessment — Cyber Fitness', desc: 'Start any day. Book a consultation or a live fitness assessment with a Cyber Fitness coach.' },
  Press: { file: 'press.html', route: '/press', title: 'Press & partners — Cyber Fitness', desc: 'Cyber Fitness and Hijab Wasif featured on Geo, ARY, PTV, BOL and more.' },
  Gallery: { file: 'gallery.html', route: '/gallery', title: 'Gallery — Cyber Fitness', desc: 'Training days, team, events and media.' },
  Contact: { file: 'contact.html', route: '/contact', title: 'Contact us — Cyber Fitness', desc: 'Get in touch with Cyber Fitness in Pakistan, the UK and the UAE.' },
  Shop: { file: 'shop.html', route: '/shop', title: 'Shop — Cyber Fitness', desc: 'Cyber Fitness merchandise and equipment — coming soon.' }
};

const assetFiles = fs.readdirSync(ASSETS);
const assetById = {};
for (const f of assetFiles) assetById[f.split('.')[0]] = f;

function rewrite(s) {
  s = s.replace(/\/_blob\/([0-9a-f]{32})/g, (m, id) => {
    if (!assetById[id]) throw new Error('Missing asset ' + id);
    return '/assets/' + assetById[id];
  });
  s = s.replace(/\b([A-Z][A-Za-z]+)\.dc\.html/g, (m, name) => {
    if (PAGES[name]) return PAGES[name].route;
    return m;
  });
  s = s.replace(/href="\/#/g, 'href="/#');
  return s;
}

function parse(name) {
  const raw = rewrite(fs.readFileSync(path.join(SRC, name + '.dc.html'), 'utf8'));
  const helmet = (raw.match(/<helmet>([\s\S]*?)<\/helmet>/) || [, ''])[1];
  const tpl = raw.split('</helmet>')[1].split('</x-dc>')[0].trim();
  let script = raw.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
  if (name === 'Book') {
    script = script.replace(
      "submit: () => this.setState({ sent: true })",
      "submit: () => { if (window.cfSend) { var f = document.getElementById('bk-name'); window.cfSend(f.closest('div').parentElement, 'Cyber Fitness website — ' + 'Request: ' + k.short); } this.setState({ sent: true }); }"
    );
    if (script.indexOf('window.cfSend') === -1) throw new Error('Book submit patch failed');
  }
  return { helmet, tpl, script };
}

const ALL = {};
for (const f of fs.readdirSync(SRC)) if (f.endsWith('.dc.html')) ALL[f.replace('.dc.html', '')] = parse(f.replace('.dc.html', ''));

function deps(name, seen = new Set()) {
  if (seen.has(name)) return seen;
  seen.add(name);
  for (const m of ALL[name].tpl.matchAll(/<dc-import[^>]*name="([^"]+)"/g)) deps(m[1], seen);
  return seen;
}

function headCss(names) {
  const seen = new Set();
  let css = '';
  for (const n of names) {
    for (const block of ALL[n].helmet.matchAll(/<style>([\s\S]*?)<\/style>/g)) {
      for (const line of block[1].split('\n')) {
        const t = line.trim();
        if (!t || seen.has(t)) continue;
        seen.add(t);
        css += t + '\n';
      }
    }
  }
  return css;
}

const RESPONSIVE = `
html{scroll-behavior:smooth}
*,*::before,*::after{box-sizing:border-box}
img{max-width:100%}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #480E43;outline-offset:3px}
@media (max-width: 1240px){
  nav[aria-label="Main"]{order:3;width:100%;flex-wrap:nowrap!important;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px}
  nav[aria-label="Main"] a{white-space:nowrap}
}
@media (max-width: 640px){
  [style*="minmax("]{grid-template-columns:1fr!important}
  [style*="padding: 64px 56px"],[style*="padding: 72px 56px"]{padding:40px 24px!important}
  [style*="padding: 48px;"],[style*="padding: 56px;"],[style*="padding: 44px;"]{padding:28px!important}
  [style*="padding: 40px;"],[style*="padding: 36px;"]{padding:24px!important}
  [style*="height: 640px"],[style*="height: 600px"],[style*="height: 560px"],[style*="height: 540px"]{height:420px!important}
  section[style*="padding: 104px 32px"],div[style*="padding: 104px 32px"]{padding-top:64px!important;padding-bottom:64px!important}
  section,div{min-width:0}
  [data-component="Schedule"] [style*="padding: 0 18px 8px"]{display:none!important}
  [data-component="Schedule"] [style*="grid-template-columns: 130px"]{grid-template-columns:92px minmax(0,1fr)!important;gap:6px 12px!important}
  [data-component="Schedule"] [style*="grid-template-columns: 130px"]>span:last-child{grid-column:2}
}
`;

function shell(name, root, prerendered) {
  const p = PAGES[name];
  const names = [...deps(name)];
  const comps = {};
  for (const n of names) comps[n] = { tpl: ALL[n].tpl, script: ALL[n].script };
  const json = JSON.stringify(comps).replace(/<\//g, '<\\/');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${p.title}</title>
<meta name="description" content="${p.desc}">
<meta property="og:title" content="${p.title}">
<meta property="og:description" content="${p.desc}">
<meta property="og:type" content="website">
<meta property="og:image" content="/assets/${assetById['8a1fb04ecba5b19b81cb0d1d17fe75aa']}">
<meta name="theme-color" content="#ED3159">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preload" href="/assets/${assetById['856990c91645be07e259db49d0475b43']}" as="font" type="font/woff2" crossorigin>
<style>
${headCss(names)}${RESPONSIVE}</style>
</head>
<body>
<div id="root">${prerendered ? root : ''}</div>
<script src="/assets/js/dc.js"></script>
<script src="/assets/js/site.js"></script>
<script>DC.boot(${json}, ${JSON.stringify(name)});</script>
</body>
</html>
`;
}

function serve(dir) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.css': 'text/css' };
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let u = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
      let f = path.join(dir, u);
      if (u === '/') f = path.join(dir, 'index.html');
      else if (!path.extname(f)) f += '.html';
      fs.readFile(f, (err, buf) => {
        if (err) { res.writeHead(404); return res.end('not found'); }
        res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
        res.end(buf);
      });
    }).listen(0, () => resolve(srv));
  });
}

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'assets', 'js'), { recursive: true });
  for (const f of assetFiles) fs.copyFileSync(path.join(ASSETS, f), path.join(OUT, 'assets', f));
  fs.copyFileSync(path.join(__dirname, 'dc.js'), path.join(OUT, 'assets', 'js', 'dc.js'));
  fs.copyFileSync(path.join(__dirname, 'site.js'), path.join(OUT, 'assets', 'js', 'site.js'));

  for (const name of Object.keys(PAGES)) fs.writeFileSync(path.join(OUT, PAGES[name].file), shell(name, '', false));

  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { chromium = null; }
  if (!chromium) { console.log('Playwright not found — pages left client-rendered.'); return; }

  const srv = await serve(OUT);
  const port = srv.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const name of Object.keys(PAGES)) {
    const p = PAGES[name];
    await page.goto(`http://localhost:${port}${p.route}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('html[data-ready]');
    const info = await page.evaluate(() => ({
      root: document.getElementById('root').innerHTML,
      holes: (document.body.innerText.match(/\{\{[^}]*\}\}/g) || []).length,
      broken: [...document.images].filter((i) => i.complete && !i.naturalWidth).map((i) => i.getAttribute('src')),
      height: document.documentElement.scrollHeight
    }));
    fs.writeFileSync(path.join(OUT, p.file), shell(name, info.root, true));
    console.log(`${p.route.padEnd(18)} height ${info.height}  holes ${info.holes}  broken images ${info.broken.length}`);
  }
  await browser.close();
  srv.close();
  if (errors.length) { console.error('Page errors:\n' + errors.join('\n')); process.exit(1); }

  fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  fs.writeFileSync(path.join(OUT, '404.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page not found — Cyber Fitness</title><link rel="icon" href="/assets/favicon.png"><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#FFF7F0;color:#1C0A1B;font-family:system-ui,sans-serif;text-align:center;padding:24px}a{display:inline-block;margin-top:20px;padding:16px 28px;border-radius:999px;background:#ED3159;color:#fff;text-decoration:none;font-weight:700}</style></head><body><main><h1>Page not found</h1><p>The page you are looking for has moved or does not exist.</p><a href="/">Back to Cyber Fitness</a></main></body></html>');
  console.log('Built', Object.keys(PAGES).length, 'pages into public/');
})().catch((e) => { console.error(e); process.exit(1); });
