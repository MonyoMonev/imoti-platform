// Проверка, че запитванията от публичния чат стигат до правилните хора в админ панела.
// Пуска се веднага след tests/e2e.mjs върху същия сървър.
import { chromium } from 'playwright-core';
const BASE = process.argv[2] || 'http://localhost:3210';
let pass = 0, fail = 0;
const ok = (c, n, x = '') => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + n + (c || !x ? '' : '  -> ' + x)); };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
async function as(phone, password) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const r = await ctx.request.post(BASE + '/api/auth/login', { data: { phone, password } });
  if (!r.ok()) throw new Error('login ' + phone);
  return ctx;
}
const text = async (ctx, url) => {
  const page = await ctx.newPage();
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  const t = await page.evaluate(() => document.body.innerText);
  return { page, t };
};

// Мария: вижда запитването от своя линк, не вижда чуждите
{
  const ctx = await as('0888555011', 'broker2026');
  const { page, t } = await text(ctx, '/admin/zapitvania');
  ok(/Тест Тестов/.test(t), 'Мария вижда запитването, дошло през нейния линк');
  ok(!/Ива Петрова/.test(t), 'Мария не вижда запитването на Николай');
  await page.locator('a', { hasText: 'Тест Тестов' }).first().click();
  await page.waitForURL(/zapitvania\/\d+/);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
  const d = await page.evaluate(() => document.body.innerText);
  ok(/0888 111 222/.test(d) && /Двустаен/.test(d) && /Чайка, Бриз/.test(d) && /паркомясто/.test(d), 'в запитването има телефон, отговори и бележка');
  ok(/Facebook/.test(d), 'вижда се, че е дошло от Facebook');
  ok(/Тристаен с гледка към морето/.test(d), 'вижда се за кой имот');
  ok(/Ново запитване от сайта/.test(d) && /Клиент: Тест Тестов/.test(d), 'вижда се съобщението за Viber');
  const viber = await page.locator('a[href^="viber://"]').first().getAttribute('href');
  ok(viber && viber.includes('%2B359888111222'), 'бутонът за Viber е с номера на клиента', viber);
  await page.screenshot({ path: 'tests/shots/cross-lead.png', fullPage: true });
  const n = await text(ctx, '/admin/izvestia');
  ok(/Тест Тестов/.test(n.t), 'съобщението е в дневника с известия на Мария');
  const l = await text(ctx, '/admin/linkove');
  ok(/Тристаен с гледка към морето/.test(l.t) && /Facebook/.test(l.t), 'линкът от Facebook има отчетено посещение');
  const an = await ctx.request.get(BASE + '/admin/analiz', { maxRedirects: 0, failOnStatusCode: false });
  ok(an.status() !== 200 || !/Анализ на чата/.test(await an.text()), 'брокер няма достъп до анализа на чата');
  await ctx.close();
}
// Николай
{
  const ctx = await as('0888555014', 'broker2026');
  const { t } = await text(ctx, '/admin/zapitvania');
  ok(/Ива Петрова/.test(t) && !/Тест Тестов/.test(t), 'Николай вижда само своето запитване');
  await ctx.close();
}
// Шефът
{
  const ctx = await as('0888555010', 'shef2026');
  const { t } = await text(ctx, '/admin/zapitvania');
  ok(/Тест Тестов/.test(t) && /Ива Петрова/.test(t) && /Ана Колева/.test(t), 'шефът вижда всички запитвания');
  const a = await text(ctx, '/admin/analiz?period=7');
  ok(/Не искам да оставям телефон/.test(a.t), 'анализът показва причината за отказ от чата');
  await a.page.screenshot({ path: 'tests/shots/cross-analiz.png' });
  const k = await text(ctx, '/admin/klienti');
  ok(/Ана Колева/.test(k.t) && /Тест Тестов/.test(k.t), 'регистрираните клиенти са в списъка');
  await ctx.close();
}
// Клиент няма достъп до админ панела
{
  const ctx = await as('0888555099', 'klient2026');
  const page = await ctx.newPage();
  await page.goto(BASE + '/admin');
  ok(/\/admin\/vhod/.test(page.url()), 'клиент не влиза в админ панела', page.url());
  await ctx.close();
}
await browser.close();
console.log(`\nГотово: ${pass} минали, ${fail} неуспешни`);
process.exit(fail ? 1 : 0);
