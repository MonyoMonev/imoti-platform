// Снимка на екрана за проверка на дизайна.
// node tests/shot.mjs <url> <out.png> [width] [height] [scrollY|"full"] [waitMs]
import { chromium } from 'playwright-core';

const [url, out, w = '1440', h = '900', scroll = '0', wait = '900'] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const mobile = Number(w) < 700;
const ctx = await browser.newContext({
  viewport: { width: Number(w), height: Number(h) },
  deviceScaleFactor: mobile ? 2 : 1,
  isMobile: mobile,
  hasTouch: mobile,
  userAgent: mobile
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    : undefined,
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text().slice(0, 300)));
await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(700);
if (scroll === 'full') {
  // минаваме през страницата, за да се появят всички елементи
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 500) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: out, fullPage: true });
} else {
  const targets = scroll.split(',');
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const y = t.endsWith('%')
      ? await page.evaluate((p) => (document.documentElement.scrollHeight - innerHeight) * p, Number(t.slice(0, -1)) / 100)
      : Number(t);
    await page.evaluate((yy) => {
      const l = window.__lenis;
      if (l) l.scrollTo(yy, { immediate: true, force: true });
      else window.scrollTo(0, yy);
    }, y);
    await page.waitForTimeout(Number(wait));
    await page.screenshot({ path: targets.length > 1 ? out.replace('.png', `-${i}.png`) : out });
  }
}
if (errors.length) console.log(errors.slice(0, 8).join('\n'));
console.log('ok', out);
await browser.close();
