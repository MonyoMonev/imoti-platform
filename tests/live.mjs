// Кратка проверка на качената версия. Оставя едно пробно запитване и една пробна снимка,
// които се чистят след това.   node tests/live.mjs https://<адрес>
import { chromium } from 'playwright-core';
const BASE = process.argv[2];
let pass = 0, fail = 0;
const ok = (c, n, x = '') => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + n + (c || !x ? '' : '  -> ' + x)); };
const browser = await chromium.launch({ channel: 'chrome', headless: true });

// 1. Страници на компютър
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const u of ['/', '/imoti', '/imoti/briz-penthaus', '/brokeri', '/za-nas', '/kontakti']) {
    const res = await page.goto(BASE + u, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const t = await page.evaluate(() => document.body.innerText);
    ok(res.status() === 200 && !/[—–]/.test(t) && !/ - /.test(t), `${u} се зарежда и няма тирета`);
  }
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const imgs = await page.evaluate(() => Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).length);
  ok(imgs === 0, 'няма счупени снимки на началната страница', String(imgs));
  await page.evaluate(() => window.__lenis?.scrollTo(2600, { immediate: true, force: true }) ?? window.scrollTo(0, 2600));
  await page.waitForTimeout(700);
  const lvl = await page.locator('.cabin__level').innerText();
  ok(parseFloat(lvl) > 0 && parseFloat(lvl) < 21, 'асансьорът върви', lvl);
  ok(errors.length === 0, 'няма грешки в браузъра', errors.slice(0, 2).join(' | '));
  await ctx.close();
}

// 2. Телефон: линк от Viber, чат до запитване
const stamp = String(Date.now()).slice(-6);
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await ctx.newPage();
  await page.goto(BASE + '/oferta/maria-koleva/chayka-tristaen-more?k=viber', { waitUntil: 'networkidle' });
  ok(await page.locator('.offer__name').innerText().then((t) => /Мария Колева/.test(t)), 'офертата показва брокера');
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok(over <= 1, 'не се разлива настрани на телефон', String(over));
  await page.locator('.stick .btn--lime').tap();
  await page.waitForSelector('.cpanel');
  const tap = async (t) => { await page.locator('.cpanel .chip', { hasText: new RegExp('^' + t + '$') }).first().tap(); await page.waitForTimeout(900); };
  await tap('Питам за този имот');
  await tap('Искам оглед');
  await tap('Тази седмица');
  await page.locator('.cpanel .clink--mute', { hasText: 'Пропусни' }).tap();
  await page.waitForTimeout(900);
  await page.locator('.cpanel .csend').tap();
  await page.waitForTimeout(700);
  await page.locator('.cform input[name=first_name]').fill('Проба');
  await page.locator('.cform input[name=last_name]').fill('Демо' + stamp);
  await page.locator('.cform input[name=phone]').fill('0899 000 ' + stamp.slice(-3));
  await page.locator('.cform input[type=checkbox]').check();
  await page.locator('.cform .csend').tap();
  await page.waitForSelector('.cdone', { timeout: 20000 });
  ok(await page.locator('.cdone').innerText().then((t) => /Готово, Проба/.test(t) && /Мария/.test(t)), 'запитването се изпраща от телефон');
  await ctx.close();
}

// 3. Брокерът го вижда в панела, шефът влиза, снимка се качва
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/admin/vhod', { waitUntil: 'networkidle' });
  ok(!(await page.evaluate(() => document.body.innerText)).includes('shef2026'), 'паролите не са показани на входа');
  await page.locator('input[name=phone]').fill('0888 555 011');
  await page.locator('input[name=password]').fill('broker2026');
  await page.locator('form button[type=submit], form button').first().click();
  await page.waitForURL((u) => u.pathname === '/admin', { timeout: 20000 });
  await page.goto(BASE + '/admin/zapitvania', { waitUntil: 'networkidle' });
  const t = await page.evaluate(() => document.body.innerText);
  ok(t.includes('Демо' + stamp), 'брокерът вижда новото запитване в панела');
  await page.locator('a', { hasText: 'Демо' + stamp }).first().click();
  await page.waitForURL(/zapitvania\/\d+/);
  await page.waitForLoadState('networkidle');
  const d = await page.evaluate(() => document.body.innerText);
  ok(/Viber/.test(d) && /Ново запитване от сайта/.test(d) && /Иска оглед/.test(d), 'в запитването има съобщението за Viber и отговорите');
  const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0]), Buffer.alloc(600, 7), Buffer.from([0xff, 0xd9])]);
  const up = await ctx.request.post(BASE + '/api/admin/upload', { multipart: { files: { name: 'proba.jpg', mimeType: 'image/jpeg', buffer: jpg } } });
  const uj = await up.json();
  ok(up.ok() && uj.urls?.[0]?.startsWith('/media/'), 'качването на снимка работи в облака', JSON.stringify(uj).slice(0, 120));
  if (uj.urls?.[0]) {
    const g = await ctx.request.get(BASE + uj.urls[0]);
    ok(g.status() === 200 && g.headers()['content-type'] === 'image/jpeg' && (await g.body()).length === jpg.length, 'качената снимка се подава обратно');
  }
  await ctx.close();
  const boss = await browser.newContext();
  const r = await boss.request.post(BASE + '/api/auth/login', { data: { phone: '0888555010', password: 'shef2026' } });
  ok(r.ok(), 'шефът влиза');
  const a = await boss.request.get(BASE + '/admin/analiz');
  ok(a.ok() && /Анализ на чата/.test(await a.text()), 'анализът на чата се отваря за шефа');
  const cl = await browser.newContext();
  const rc = await cl.request.post(BASE + '/api/auth/login', { data: { phone: '0888555099', password: 'klient2026' } });
  const pr = await cl.request.get(BASE + '/profil');
  ok(rc.ok() && /Здравей, (<!-- -->)?Петър/.test(await pr.text()), 'клиентът влиза в профила си');
  await boss.close();
  await cl.close();
}
await browser.close();
console.log(`\nГотово: ${pass} минали, ${fail} неуспешни`);
process.exit(fail ? 1 : 0);
