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
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
*,*::before,*::after{box-sizing:border-box}
img{max-width:100%}
#root>div{overflow:visible!important;overflow-x:clip!important}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #480E43;outline-offset:3px}

/* Header */
.cf-header{position:sticky;top:0;z-index:50;background:rgba(255,247,240,.92)!important;-webkit-backdrop-filter:saturate(1.4) blur(14px);backdrop-filter:saturate(1.4) blur(14px);transition:box-shadow .3s ease}
.cf-header.is-scrolled{box-shadow:0 10px 30px -18px rgba(72,14,67,.45)}
.cf-links a{transition:background-color .2s ease,color .2s ease}
.cf-links a:hover{background:#FAD0DC;color:#480E43!important}

/* Motion */
@media (prefers-reduced-motion: no-preference){
  [data-reveal]{opacity:0;transform:translateY(28px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1);transition-delay:var(--cf-delay,0ms)}
  [data-reveal].is-in{opacity:1;transform:none}
  #root a[style*="border-radius: 999px"],#root button[style*="border-radius: 999px"]{transition:transform .25s cubic-bezier(.2,.7,.2,1),box-shadow .25s ease,background-color .2s ease,filter .2s ease}
  #root a[style*="border-radius: 999px"]:active,#root button[style*="border-radius: 999px"]:active{transform:scale(.97)}
  #root [style*="overflow: hidden"]>img{transition:transform 1.1s cubic-bezier(.2,.7,.2,1)}
  span[style*="width: 7px; height: 7px"]{animation:cf-pulse 1.6s ease-in-out infinite}
  .cf-marquee{overflow:hidden;padding-left:0!important;padding-right:0!important;max-width:none!important;display:block!important}
  .cf-marquee-track{display:flex;gap:56px;width:max-content;animation:cf-marquee 32s linear infinite;padding-left:56px}
  .cf-marquee-track>span{white-space:nowrap}
  .cf-marquee:hover .cf-marquee-track{animation-play-state:paused}
}
@media (hover: hover) and (prefers-reduced-motion: no-preference){
  #root a[style*="border-radius: 999px"]:hover,#root button[style*="border-radius: 999px"]:hover{transform:translateY(-2px);box-shadow:0 12px 24px -12px rgba(72,14,67,.5)}
  #root [style*="overflow: hidden"]:hover>img{transform:scale(1.05)}
  #root [style*="display: grid"]>[style*="border-radius: 2"]{transition:transform .35s cubic-bezier(.2,.7,.2,1),box-shadow .35s ease}
  #root [style*="display: grid"]>[style*="border-radius: 2"]:hover{transform:translateY(-6px);box-shadow:0 24px 40px -24px rgba(72,14,67,.45)}
}
@keyframes cf-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.7)}}
@keyframes cf-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}

/* Tablet & phone menu */
@media (max-width: 1100px){
  .cf-burger{display:flex!important}
  .cf-links,.cf-actions{display:none!important}
  .cf-links.is-open{display:flex!important;order:3;width:100%;flex-direction:column!important;align-items:stretch!important;flex-wrap:nowrap!important;gap:2px!important;padding:8px 0 4px;animation:cf-drop .3s ease}
  .cf-links.is-open a{display:block;text-align:left}
  .cf-links.is-open a{padding:14px 16px!important;font-size:17px!important;border-radius:14px!important}
  .cf-actions.is-open{display:flex!important;order:4;width:100%;padding:4px 0 10px;animation:cf-drop .3s ease}
  .cf-actions.is-open a{flex:1;text-align:center;padding:15px 16px!important}
  .cf-header>div{padding-top:12px!important;padding-bottom:12px!important}
}
@keyframes cf-drop{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}

/* Phone layout */
@media (max-width: 640px){
  body{font-size:16px}
  section[style*="padding: 104px 32px"],div[style*="padding: 104px 32px"],section[style*="padding: 96px 32px"],div[style*="padding: 96px 32px"]{padding:64px 20px!important}
  section[style*="padding: 72px 32px"]{padding:40px 20px 48px!important}
  section[style*="32px"],div[style*="max-width: 1280px"]{padding-left:20px!important;padding-right:20px!important}
  [style*="gap: 48px"],[style*="gap: 56px"],[style*="gap: 64px"]{gap:32px!important}
  p[style*="font-size: 19px"],p[style*="font-size: 18px"],p[style*="font-size: 17px"]{font-size:16px!important}

  /* default: stack card grids */
  [style*="minmax("]{grid-template-columns:1fr!important}
  /* small tiles two-up */
  [style*="minmax(150px"],[style*="minmax(200px"],[style*="minmax(210px"],[style*="minmax(220px, 1fr)); gap: 28px"],[style*="minmax(250px"],[style*="auto-fill, minmax(280px"]{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important}
  [style*="minmax(250px"]>*{padding:18px!important}
  [style*="minmax(250px"] h3{font-size:16px!important}
  [style*="minmax(250px"] p{font-size:13.5px!important}
  [style*="minmax(220px, 1fr)); gap: 28px"] div[style*="font-size: 52px"]{font-size:40px!important}
  [style*="repeat(3, minmax(0, 1fr))"]{grid-template-columns:repeat(3,minmax(0,1fr))!important}
  [style*="repeat(2, minmax(0, 1fr))"]{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  [style*="repeat(4, minmax(0, 1fr))"]{grid-template-columns:repeat(2,minmax(0,1fr))!important}

  /* swipe rows for coaches and long card lists */
  [style*="auto-fill, minmax(260px"],[style*="auto-fill, minmax(360px"],#about [style*="minmax(300px"]{display:grid!important;grid-template-columns:none!important;grid-auto-flow:column;grid-auto-columns:78%;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;margin-left:-20px;margin-right:-20px;padding:4px 20px 14px!important;scrollbar-width:none}
  [style*="auto-fill, minmax(260px"]{grid-auto-columns:62%}
  [style*="auto-fill, minmax(260px"]::-webkit-scrollbar,[style*="auto-fill, minmax(360px"]::-webkit-scrollbar,#about [style*="minmax(300px"]::-webkit-scrollbar{display:none}
  [style*="auto-fill, minmax(260px"]>*,[style*="auto-fill, minmax(360px"]>*,#about [style*="minmax(300px"]>*{scroll-snap-align:start}

  /* masonry two-up */
  [style*="column-width"]{column-width:auto!important;column-count:2;column-gap:10px!important}
  [style*="column-width"]>*{margin-bottom:10px!important;border-radius:16px!important}

  /* boxes and heights */
  [style*="padding: 64px 56px"],[style*="padding: 72px 56px"]{padding:36px 22px!important}
  [style*="padding: 48px;"],[style*="padding: 56px;"],[style*="padding: 44px;"]{padding:26px!important}
  [style*="padding: 40px;"],[style*="padding: 36px;"]{padding:22px!important}
  [style*="padding: 32px;"]{padding:22px!important}
  [style*="height: 640px"]{height:460px!important}
  [style*="height: 600px"],[style*="height: 560px"],[style*="height: 540px"],[style*="height: 500px"]{height:340px!important}
  [style*="height: 420px"]{height:240px!important}
  [style*="height: 360px"]{height:220px!important}
  [style*="clip-path: polygon"]{clip-path:polygon(0 0,calc(100% - 28px) 0,100% 28px,100% 100%,0 100%)!important}
  section a[style*="padding: 18px"],section a[style*="padding: 17px"]{flex:1 1 auto;text-align:center;justify-content:center}

  /* schedule */
  [data-component="Schedule"]>div{padding:18px!important;border-radius:24px!important}
  [data-component="Schedule"] [style*="padding: 0 18px 8px"]{display:none!important}
  [data-component="Schedule"] [style*="grid-template-columns: 130px"]{grid-template-columns:88px minmax(0,1fr)!important;gap:4px 12px!important;padding:12px 14px!important}
  [data-component="Schedule"] [style*="grid-template-columns: 130px"]>span:first-child{font-size:17px!important}
  [data-component="Schedule"] [style*="grid-template-columns: 130px"]>span:last-child{grid-column:2}
  [data-component="Schedule"] button{min-height:40px!important;padding:8px 13px!important;font-size:14px!important}

  /* footer */
  footer>div{padding:56px 20px 32px!important}
  footer>div>div:first-child{display:grid!important;grid-template-columns:1fr 1fr;gap:32px 20px!important}
  footer>div>div:first-child>div:first-child{grid-column:1/-1}
  footer>div>div:first-child>div:last-child{grid-column:1/-1}
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
<script src="/assets/js/motion.js"></script>
<script>DC.boot(${json}, ${JSON.stringify(name)});window.cfMotion&&window.cfMotion();</script>
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
  fs.copyFileSync(path.join(__dirname, 'motion.js'), path.join(OUT, 'assets', 'js', 'motion.js'));

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
