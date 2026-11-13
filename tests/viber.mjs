// Тест на известията през Viber канал срещу имитация на сървъра на Viber.
// Приложението се пуска с VIBER_API_BASE=http://localhost:3999 VIBER_WEBHOOK_URL=https://example.org/hook ALLOW_DEV_PEEK=1
//   node tests/viber.mjs [http://localhost:3212]
import http from 'node:http';
import { chromium } from 'playwright-core';

const BASE = process.argv[2] || 'http://localhost:3212';
const GOOD = 'tok_' + 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8';
const BAD = 'bad_' + 'ffffffffffffffffffffffffffffffffffff';
let pass = 0, fail = 0;
const ok = (c, n, x = '') => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + n + (c || !x ? '' : '  -> ' + x)); };

// Имитация на chatapi.viber.com
const calls = [];
const mock = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (d) => (raw += d));
  req.on('end', () => {
    const body = raw ? JSON.parse(raw) : {};
    calls.push({ path: req.url, body, header: req.headers['x-viber-auth-token'] });
    const json = (o) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (body.auth_token !== GOOD) return json({ status: 2, status_message: 'invalidAuthToken' });
    if (req.url === '/pa/set_webhook') return json({ status: 0, status_message: 'ok' });
    if (req.url === '/pa/get_account_info') {
      return json({ status: 0, status_message: 'ok', Id: 'pa:123', name: 'Запитвания Мария', members: [{ id: 'ADMIN9', name: 'Друг', role: 'admin' }, { id: 'SUPER1', name: 'Мария', role: 'superadmin' }] });
    }
    if (req.url === '/pa/post') return json({ status: 0, status_message: 'ok', message_token: Date.now() });
    json({ status: 3 });
  });
});
await new Promise((r) => mock.listen(3999, r));
const posts = () => calls.filter((c) => c.path === '/pa/post');
const peek = async () => (await fetch(BASE + '/api/dev/peek')).json();

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const admin = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await admin.newPage();
await admin.request.post(BASE + '/api/auth/login', { data: { phone: '0888555011', password: 'broker2026' } });

async function lead(path, first, last, phone) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + path, { waitUntil: 'networkidle' });
  await p.locator('.cstart').first().locator('.chip', { hasText: 'Питам за този имот' }).click();
  await p.waitForSelector('.cpanel');
  const chip = async (t) => { await p.locator('.cpanel .chip', { hasText: new RegExp('^' + t + '$') }).first().click(); await p.waitForTimeout(650); };
  await p.waitForTimeout(600);
  await chip('Искам оглед');
  await chip('През уикенда');
  await p.locator('.cpanel textarea').fill('Удобно ми е след 17 часа.');
  await p.locator('.cpanel .ctext button[type=submit]').click();
  await p.waitForTimeout(700);
  await p.locator('.cpanel .csend').click();
  await p.waitForTimeout(500);
  await p.locator('.cform input[name=first_name]').fill(first);
  await p.locator('.cform input[name=last_name]').fill(last);
  await p.locator('.cform input[name=phone]').fill(phone);
  await p.locator('.cform input[type=checkbox]').check();
  await p.locator('.cform .csend').click();
  await p.waitForSelector('.cdone', { timeout: 20000 });
  await ctx.close();
}

console.log('\n1. Свързване на канала от профила');
await page.goto(BASE + '/admin/profil', { waitUntil: 'networkidle' });
let t = await page.evaluate(() => document.body.innerText);
ok(/Известия във Viber/i.test(t) && /Developer Tools/.test(t), 'профилът обяснява как се свързва канал');
ok(await page.locator('.viber button[type=submit]').isDisabled(), 'бутонът чака токен');

await page.locator('.viber input').fill('къс токен 123');
await page.locator('.viber button[type=submit]').click();
await page.waitForSelector('.viber .err');
ok(/не прилича на токен/.test(await page.locator('.viber .err').innerText()), 'нещо, което не е токен, се отказва без да се пита Viber');
ok(calls.length === 0, 'към Viber не е тръгнала заявка');

await page.locator('.viber input').fill(BAD);
await page.locator('.viber button[type=submit]').click();
await page.waitForFunction(() => /не е верен/.test(document.querySelector('.viber .err')?.textContent || ''), null, { timeout: 15000 });
ok(true, 'грешен токен дава ясна грешка от Viber');
ok(posts().length === 0, 'с грешен токен нищо не се публикува');

await page.locator('.viber input').fill('  ' + GOOD + '  ');
await page.locator('.viber button[type=submit]').click();
await page.waitForSelector('.viber .st-deal', { timeout: 15000 });
t = await page.locator('.viber').innerText();
ok(/Свързан/.test(t) && /Запитвания Мария/.test(t), 'каналът е свързан и се вижда името му', t.replace(/\n/g, ' | ').slice(0, 120));
const hook = calls.find((c) => c.path === '/pa/set_webhook' && c.body.auth_token === GOOD);
ok(hook && hook.body.url === 'https://example.org/hook' && hook.header === GOOD, 'първо се задава адрес за обратна връзка', JSON.stringify(hook?.body));
ok(posts().length === 1 && posts()[0].body.from === 'SUPER1' && posts()[0].body.type === 'text' && /Каналът е свързан/.test(posts()[0].body.text), 'приветственото съобщение е от името на собственика на канала', JSON.stringify(posts()[0]?.body).slice(0, 160));
const html = await page.content();
ok(!html.includes(GOOD), 'токенът не се връща към браузъра');

await page.locator('.viber button', { hasText: 'Прати пробно съобщение' }).click();
await page.waitForSelector('.viber .okmsg', { timeout: 15000 });
ok(posts().length === 2 && /Пробно съобщение/.test(posts()[1].body.text), 'пробното съобщение стига до канала');

console.log('\n2. Истинско запитване стига до канала на брокера');
await lead('/oferta/maria-koleva/chayka-tristaen-more?k=fb', 'Калин', 'Вайберов', '0888 444 555');
let d = await peek();
let n = d.notifications[0];
ok(posts().length === 3, 'при запитване се публикува едно съобщение', String(posts().length));
const body = posts()[2]?.body.text || '';
ok(/Ново запитване от сайта/.test(body) && /Клиент: Калин Вайберов/.test(body) && /Телефон: 0888 444 555/.test(body) && /Иска оглед/.test(body) && /след 17 часа/.test(body) && /Тристаен с гледка към морето/.test(body) && /Facebook/.test(body), 'в съобщението са клиентът, телефонът, какво иска, бележката, имотът и източникът', body.replace(/\n/g, ' | ').slice(0, 260));
ok(!/[—–]/.test(body), 'съобщението няма тирета');
ok(n.status === 'sent' && n.channel === 'viber' && /канал/.test(n.recipient) && !n.error, 'в дневника е отбелязано като изпратено', JSON.stringify({ s: n.status, r: n.recipient, e: n.error }));
await page.goto(BASE + '/admin/izvestia', { waitUntil: 'networkidle' });
t = await page.evaluate(() => document.body.innerText);
ok(/Калин Вайберов/.test(t) && /Изпратено/i.test(t) && !/Още не си свързал/.test(t), 'брокерът го вижда в Известия като изпратено');

console.log('\n3. Брокер без канал и изключване');
await lead('/oferta/ivaylo-stoyanov/levski-studio', 'Борис', 'Безканалов', '0888 444 666');
d = await peek();
ok(posts().length === 3 && d.notifications[0].status === 'simulated', 'за брокер без канал нищо не излиза, остава симулация', d.notifications[0].status);

await page.goto(BASE + '/admin/profil', { waitUntil: 'networkidle' });
await page.locator('.viber button', { hasText: 'Изключи канала' }).click();
await page.waitForSelector('.viber input', { timeout: 15000 });
ok(true, 'каналът се изключва от профила');
await lead('/oferta/maria-koleva/chayka-tristaen-more', 'Вера', 'Следизключване', '0888 444 777');
d = await peek();
ok(posts().length === 3 && d.notifications[0].status === 'simulated', 'след изключване съобщенията пак само се записват');
const pt = await page.evaluate(() => document.body.innerText);
ok(!/[—–]/.test(pt) && !/ - /.test(pt), 'в профила няма тирета');

console.log('\n4. Достъп');
const anon = await browser.newContext();
const r1 = await anon.request.post(BASE + '/api/admin/viber', { data: { token: GOOD } });
ok(r1.status() === 401, 'без вход не може да се свързва канал', String(r1.status()));
const r2 = await anon.request.post(BASE + '/api/viber/webhook', { data: { event: 'webhook' } });
ok(r2.status() === 200, 'адресът за обратна връзка отговаря с 200');

await browser.close();
mock.close();
console.log(`\nГотово: ${pass} минали, ${fail} неуспешни`);
process.exit(fail ? 1 : 0);
