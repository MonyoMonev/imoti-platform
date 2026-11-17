// Обхожда целия сайт и панела и проверява всяка страница: статус, грешки в конзолата,
// счупени заявки и снимки, хоризонтално превъртане, тирета в текста, заглавие и h1.
//   node tests/deep-crawl.mjs [http://localhost:3214] [chromium|webkit]
// Сървърът трябва да е с примерните данни (входовете от README).
import { chromium, webkit } from 'playwright-core';
import fs from 'node:fs';

const BASE = (process.argv[2] || 'http://localhost:3214').replace(/\/$/, '');
const ENGINE = process.argv[3] || 'chromium';
const browser = ENGINE === 'webkit' ? await webkit.launch() : await chromium.launch({ channel: 'chrome', headless: true });

let pages = 0;
let bad = 0;
const problems = [];

const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = {
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};

// Един и същ вид страница (запитване 12, запитване 13...) се отваря най много няколко пъти.
function pattern(path) {
  return path
    .replace(/\?.*$/, (q) => (q.length > 1 ? '?…' : ''))
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(/\/(zapitvania|klienti|analiz|imoti|brokeri)\/(?!nov$)[^/?]+/g, '/$1/:x')
    .replace(/\/oferta\/[^/]+\/[^/?]+/, '/oferta/:b/:p');
}

async function crawl(name, ctxOptions, { login, start, allow, perPattern = 4, limit = 140 }) {
  const ctx = await browser.newContext(ctxOptions);
  if (login) {
    const r = await ctx.request.post(BASE + '/api/auth/login', { data: { phone: login[0], password: login[1] } });
    if (!r.ok()) throw new Error('входът не стана: ' + login[0]);
  }
  const page = await ctx.newPage();
  let errors = [];
  page.on('pageerror', (e) => errors.push('грешка в страницата: ' + e.message.slice(0, 220)));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/favicon/.test(t)) return;
    errors.push('конзола: ' + t.slice(0, 220));
  });
  page.on('response', (r) => {
    const u = r.url();
    if (r.status() >= 400 && !u.includes('/api/track')) errors.push(`заявка ${r.status()}: ${u.replace(BASE, '').slice(0, 120)}`);
  });

  const queue = [...start];
  const seen = new Set(start);
  const counts = new Map();
  let n = 0;
  console.log(`\n${name}`);
  while (queue.length && n < limit) {
    const path = queue.shift();
    const pat = pattern(path);
    const c = counts.get(pat) || 0;
    if (c >= perPattern) continue;
    counts.set(pat, c + 1);
    n++;
    pages++;
    errors = [];
    const issues = [];
    let status = 0;
    let res = null;
    try {
      res = await page.goto(BASE + path, { waitUntil: 'load', timeout: 45000 });
      status = res ? res.status() : 0;
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      // Минаваме през цялата страница, за да се заредят снимките и да се появят блоковете.
      await page.evaluate(async () => {
        const h = document.documentElement.scrollHeight;
        for (let y = 0; y < h; y += Math.round(window.innerHeight * 0.8)) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(350);
    } catch (e) {
      issues.push('не се отвори: ' + String(e.message).split('\n')[0].slice(0, 160));
    }

    if (status >= 400) issues.push('статус ' + status);
    if (status && status < 400) {
      const info = await page.evaluate(() => {
        const text = document.body.innerText || '';
        const de = document.documentElement;
        const imgs = Array.from(document.images);
        const snippet = (re) => {
          const m = re.exec(text);
          return m ? text.slice(Math.max(0, m.index - 30), m.index + 40).replace(/\s+/g, ' ') : '';
        };
        return {
          title: document.title,
          h1: document.querySelectorAll('h1').length,
          lang: de.lang,
          viewport: !!document.querySelector('meta[name=viewport]'),
          overflow: Math.max(de.scrollWidth, document.body.scrollWidth) - window.innerWidth,
          broken: imgs.filter((i) => i.complete && i.naturalWidth === 0 && (i.currentSrc || i.src)).map((i) => (i.currentSrc || i.src).slice(-70)),
          noAlt: imgs.filter((i) => !i.hasAttribute('alt')).length,
          dash: snippet(/[—–]/) || snippet(/\s-\s/) || snippet(/(^|[^А-Яа-яA-Za-z])(най|по)-[а-я]/i),
          junk: snippet(/undefined|\bNaN\b|\[object Object\]|\bnull\b|Invalid Date/),
          emptyLinks: Array.from(document.querySelectorAll('a')).filter((a) => !a.getAttribute('href') || a.getAttribute('href') === '#').length,
          links: Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href')),
        };
      });
      if (!info.title.trim()) issues.push('няма заглавие на страницата');
      if (info.h1 !== 1) issues.push(`h1 са ${info.h1}`);
      if (info.lang !== 'bg') issues.push('езикът на страницата не е bg');
      if (!info.viewport) issues.push('няма meta viewport');
      if (info.overflow > 1) issues.push(`хоризонтално превъртане с ${info.overflow}px`);
      if (info.broken.length) issues.push('счупени снимки: ' + info.broken.slice(0, 3).join(', '));
      if (info.noAlt) issues.push(`снимки без alt: ${info.noAlt}`);
      if (info.dash) issues.push('тире в текста: „' + info.dash + '“');
      if (info.junk) issues.push('боклук в текста: „' + info.junk + '“');
      if (info.emptyLinks) issues.push(`празни линкове: ${info.emptyLinks}`);

      for (const href of info.links) {
        if (!href || /^(tel:|mailto:|viber:|https?:\/\/|#|javascript:)/.test(href)) continue;
        const clean = href.split('#')[0];
        if (!clean.startsWith('/') || clean.startsWith('/api/') || clean.startsWith('/_next') || clean.startsWith('/img/') || clean.startsWith('/media/')) continue;
        if (!allow(clean) || seen.has(clean)) continue;
        seen.add(clean);
        queue.push(clean);
      }
    }
    for (const e of [...new Set(errors)]) issues.push(e);
    // Рядката грешка при съживяване на страницата (React #418): пазим какво е пратил сървърът и какво
    // е останало в браузъра, за да може да се види кой елемент се разминава.
    if (errors.some((e) => /#418|hydrat/i.test(e)) && res) {
      const name = `tests/shots/hydration-${Date.now()}`;
      fs.mkdirSync('tests/shots', { recursive: true });
      fs.writeFileSync(`${name}-server.html`, await res.text().catch(() => ''));
      fs.writeFileSync(`${name}-browser.html`, await page.content().catch(() => ''));
      issues.push(`двете версии на страницата са записани в ${name}-*.html`);
    }

    if (issues.length) {
      bad++;
      problems.push({ where: name, path, issues });
      console.log(`  FAIL ${path}`);
      for (const i of issues) console.log(`         ${i}`);
    } else {
      console.log(`  ok   ${path}`);
    }
  }
  await ctx.close();
}

const pub = (p) => !p.startsWith('/admin');
const adm = (p) => p.startsWith('/admin') && !p.startsWith('/admin/vhod') && !p.startsWith('/admin/pokana');

await crawl('Публичен сайт, компютър', DESKTOP, { start: ['/'], allow: pub, perPattern: 14 });
await crawl('Публичен сайт, телефон', PHONE, { start: ['/', '/imoti', '/brokeri', '/za-nas', '/kontakti', '/vhod', '/registracia', '/poveritelnost'], allow: pub, perPattern: 6 });
await crawl('Влязъл клиент, телефон', PHONE, { login: ['0888555099', 'klient2026'], start: ['/profil', '/', '/imoti'], allow: pub, perPattern: 3, limit: 30 });
await crawl('Вход в панела и покана', DESKTOP, { start: ['/admin/vhod', '/admin/pokana', '/admin/pokana?kod=VARNA7'], allow: () => false });
await crawl('Панел, управител, компютър', DESKTOP, { login: ['0888555010', 'shef2026'], start: ['/admin'], allow: adm, perPattern: 4 });
await crawl('Панел, управител, телефон', PHONE, { login: ['0888555010', 'shef2026'], start: ['/admin'], allow: adm, perPattern: 2 });
await crawl('Панел, брокер, компютър', DESKTOP, { login: ['0888555011', 'broker2026'], start: ['/admin'], allow: adm, perPattern: 3 });
await crawl('Панел, брокер, телефон', PHONE, { login: ['0888555011', 'broker2026'], start: ['/admin'], allow: adm, perPattern: 2 });

await browser.close();
console.log(`\nГотово (${ENGINE}): ${pages} страници, ${pages - bad} без забележки, ${bad} със забележки`);
if (problems.length) {
  const kinds = new Map();
  for (const p of problems) for (const i of p.issues) kinds.set(i.split(':')[0], (kinds.get(i.split(':')[0]) || 0) + 1);
  console.log('По вид: ' + [...kinds].map(([k, v]) => `${k} (${v})`).join(', '));
}
process.exit(bad ? 1 : 0);
