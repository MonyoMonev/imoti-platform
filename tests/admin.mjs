// Тест на админ панела от край до край.
// Пуска се срещу отделен сървър с прясна база:
//   rm -rf .data/pg-admin .data/uploads-admin
//   NEXT_DIST_DIR=.next-admin PGLITE_DIR=.data/pg-admin UPLOAD_DIR=.data/uploads-admin npx next dev -p 3211
//   node tests/admin.mjs
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.ADMIN_URL || 'http://localhost:3211';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, 'shots', 'admin');
fs.mkdirSync(SHOTS, { recursive: true });

const BOSS = { phone: '0888 555 010', password: 'shef2026' };
const MARIA = { phone: '0888 555 011', password: 'broker2026' };
const CLIENT = { phone: '0888 555 099', password: 'klient2026' };

let passed = 0;
const failures = [];
function check(name, cond, extra = '') {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL ${name} ${extra}`);
  }
}
function section(t) {
  console.log(`\n${t}`);
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function ctxFor(creds, size = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport: size });
  if (creds) {
    const r = await ctx.request.post(`${BASE}/api/auth/login`, { data: creds });
    if (!r.ok()) throw new Error(`login failed for ${creds.phone}: ${await r.text()}`);
  }
  return ctx;
}
async function api(ctx, method, url, data) {
  const r = await ctx.request.fetch(`${BASE}${url}`, { method, data, failOnStatusCode: false });
  let json = null;
  try {
    json = await r.json();
  } catch {}
  return { status: r.status(), json };
}
const text = (page) => page.evaluate(() => document.body.innerText);

/* ---------- Подготовка ---------- */

const health = await (await fetch(`${BASE}/api/health`)).json();
if (!health.leads || !health.chats) {
  console.log('Базата няма примерни данни. Изтрий .data/pg-admin, пусни сървъра наново и опитай пак.');
  await browser.close();
  process.exit(2);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'imoti-admin-'));
const jpeg = path.join(tmp, 'test-photo.jpg');
execFileSync('python3', [
  '-c',
  `from PIL import Image, ImageDraw
im = Image.new('RGB', (1200, 800), (214, 205, 190))
d = ImageDraw.Draw(im)
d.rectangle((120, 160, 1080, 700), fill=(240, 235, 226), outline=(21, 24, 28), width=6)
d.rectangle((220, 260, 520, 600), fill=(15, 58, 68))
d.rectangle((680, 260, 980, 600), fill=(212, 67, 42))
im.save(r'${jpeg}', quality=85)`,
]);
const notImage = path.join(tmp, 'not-a-photo.jpg');
fs.writeFileSync(notImage, 'this is not an image');

const boss = await ctxFor(BOSS);
const maria = await ctxFor(MARIA);
const bossPage = await boss.newPage();
const mariaPage = await maria.newPage();
const pageErrors = [];
for (const p of [bossPage, mariaPage]) p.on('pageerror', (e) => pageErrors.push(e.message));

/* ---------- 1. Вход ---------- */
section('1. Вход и достъп');
{
  const ctx = await ctxFor(null);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin`);
  check('без вход /admin води към входа', page.url().endsWith('/admin/vhod'));

  await page.fill('input[name=phone]', BOSS.phone);
  await page.fill('input[name=password]', 'greshna-parola');
  await page.click('button[type=submit]');
  await page.waitForSelector('.err');
  check('грешна парола дава ясно съобщение', (await page.textContent('.err')).includes('Грешен телефон или парола'));

  await page.fill('input[name=phone]', CLIENT.phone);
  await page.fill('input[name=password]', CLIENT.password);
  await page.click('button[type=submit]');
  await page.waitForFunction(() => document.querySelector('.err')?.textContent.includes('клиентски'));
  check('клиент не влиза през входа за екипа', (await page.textContent('.err')).includes('клиентски профил'));
  await page.goto(`${BASE}/admin`);
  check('след опита клиентът пак е извън панела', page.url().endsWith('/admin/vhod'));

  await page.fill('input[name=phone]', BOSS.phone);
  await page.fill('input[name=password]', BOSS.password);
  await page.click('button[type=submit]');
  await page.waitForURL(`${BASE}/admin`);
  check('шефът влиза и вижда таблото', (await page.textContent('h1')).includes('Табло'));
  await ctx.close();

  const client = await ctxFor(CLIENT);
  const cp = await client.newPage();
  await cp.goto(`${BASE}/admin/zapitvania`);
  check('клиент с жива сесия се връща към входа', cp.url().endsWith('/admin/vhod'));
  const r = await api(client, 'POST', '/api/admin/invites', {});
  check('клиент не може да вика админ API', r.status === 401, `status ${r.status}`);
  const up = await client.request.post(`${BASE}/api/admin/upload`, {
    multipart: { files: { name: 'a.jpg', mimeType: 'image/jpeg', buffer: fs.readFileSync(jpeg) } },
    failOnStatusCode: false,
  });
  check('клиент не може да качва снимки', up.status() === 401, `status ${up.status()}`);
  await client.close();
}

/* ---------- 2. Покана ---------- */
section('2. Покана за брокер');
let inviteCode = '';
const newPhone = `0899 ${String(100 + Math.floor(Math.random() * 900))} ${String(100 + Math.floor(Math.random() * 900))}`;
const NEWB = { phone: newPhone, password: 'novbroker1' };
let newBroker;
let newBrokerPage;
{
  await bossPage.goto(`${BASE}/admin/brokeri`);
  await bossPage.fill('input[name=note]', 'Тестова покана');
  await bossPage.click('text=Покани брокер >> nth=-1');
  await bossPage.waitForSelector('[data-invite]');
  inviteCode = await bossPage.getAttribute('[data-invite]', 'data-invite');
  check('поканата има код от 6 знака', /^[A-Z0-9]{6}$/.test(inviteCode), inviteCode);
  const linkText = await bossPage.textContent('[data-invite] code');
  check('показва се готов линк с кода', linkText.includes(`/admin/pokana?kod=${inviteCode}`));

  newBroker = await ctxFor(null);
  newBrokerPage = await newBroker.newPage();
  await newBrokerPage.goto(`${BASE}/admin/pokana?kod=${inviteCode}`);
  check('кодът е попълнен от линка', (await newBrokerPage.inputValue('input[name=code]')) === inviteCode);
  await newBrokerPage.fill('input[name=first_name]', 'Тест');
  await newBrokerPage.fill('input[name=last_name]', 'Брокеров');
  await newBrokerPage.fill('input[name=phone]', NEWB.phone);
  await newBrokerPage.fill('input[name=password]', NEWB.password);
  await newBrokerPage.click('button[type=submit]');
  await newBrokerPage.waitForURL(/\/admin\/profil/);
  check('новият брокер попада в панела', (await text(newBrokerPage)).includes('Добре дошъл, Тест'));

  await newBrokerPage.goto(`${BASE}/admin/zapitvania`);
  const rows = await newBrokerPage.locator('table.tbl tbody tr').count();
  check('новият брокер не вижда чужди запитвания', rows === 0 && (await text(newBrokerPage)).includes('Още няма запитвания'), `rows ${rows}`);
  await newBrokerPage.goto(`${BASE}/admin/klienti`);
  check('новият брокер не вижда чужди клиенти', (await newBrokerPage.locator('table.tbl tbody tr').count()) === 0);
  await newBrokerPage.goto(`${BASE}/admin/izvestia`);
  check('новият брокер не вижда чужди известия', (await newBrokerPage.locator('.vb').count()) === 0);

  const again = await api(await ctxFor(null), 'POST', '/api/auth/invite', {
    code: inviteCode,
    first_name: 'Втори',
    last_name: 'Опит',
    phone: '0899 000 111',
    password: 'parola123',
  });
  check('кодът не може да се ползва втори път', again.status === 409, `status ${again.status}`);

  // Отменена покана
  const made = await api(boss, 'POST', '/api/admin/invites', { note: 'за отмяна' });
  await api(boss, 'POST', `/api/admin/invites/${made.json.code}`, {});
  const revoked = await api(await ctxFor(null), 'POST', '/api/auth/invite', {
    code: made.json.code,
    first_name: 'Отменен',
    last_name: 'Човек',
    phone: '0899 000 222',
    password: 'parola123',
  });
  check('отменена покана не работи', revoked.status === 410, `status ${revoked.status}`);
}

/* ---------- 3. Права ---------- */
section('3. Права на брокера');
let foreignLead = '';
let foreignProp = '';
let mariaLead = '';
let ivayloId = '';
{
  await bossPage.goto(`${BASE}/admin/brokeri`);
  ivayloId = (await bossPage.getAttribute('a:has-text("Ивайло Стоянов")', 'href')).split('/').pop();
  const mariaId = (await bossPage.getAttribute('a:has-text("Мария Колева")', 'href')).split('/').pop();
  await bossPage.goto(`${BASE}/admin/zapitvania?broker=${ivayloId}`);
  foreignLead = (await bossPage.getAttribute('table.tbl tbody tr td.main a', 'href')).split('/').pop();
  await bossPage.goto(`${BASE}/admin/zapitvania?broker=${mariaId}`);
  mariaLead = (await bossPage.getAttribute('table.tbl tbody tr td.main a', 'href')).split('/').pop();
  await bossPage.goto(`${BASE}/admin/imoti`);
  foreignProp = (await bossPage.getAttribute('table.tbl tbody tr:has-text("Ивайло Стоянов") td.main a', 'href')).split('/').pop();

  for (const [name, method, url, data] of [
    ['покани', 'POST', '/api/admin/invites', {}],
    ['управление на брокери', 'POST', `/api/admin/brokers/${ivayloId}`, { action: 'deactivate' }],
    ['смяна на чужда парола', 'POST', `/api/admin/brokers/${ivayloId}`, { action: 'password', password: 'hacked123' }],
    ['настройки', 'POST', '/api/admin/settings', { action: 'wipe-demo', confirm: 'ИЗТРИЙ' }],
  ]) {
    const r = await api(maria, method, url, data);
    check(`брокер получава 403 за: ${name}`, r.status === 403, `status ${r.status}`);
  }
  for (const p of ['/admin/analiz', '/admin/brokeri', '/admin/nastroiki', `/admin/brokeri/${ivayloId}`]) {
    await mariaPage.goto(`${BASE}${p}`);
    check(`брокер се връща към таблото от ${p}`, mariaPage.url() === `${BASE}/admin`, mariaPage.url());
  }

  const page = await mariaPage.goto(`${BASE}/admin/zapitvania/${foreignLead}`);
  check('брокер не може да отвори чуждо запитване', page.status() === 404, `status ${page.status()}`);
  const s1 = await api(maria, 'POST', `/api/admin/leads/${foreignLead}`, { action: 'status', status: 'lost' });
  check('брокер не може да смени статус на чуждо запитване', s1.status === 404, `status ${s1.status}`);
  const s2 = await api(maria, 'POST', `/api/admin/leads/${foreignLead}`, { action: 'note', body: 'чужда бележка' });
  check('брокер не може да пише бележка по чуждо запитване', s2.status === 404, `status ${s2.status}`);
  const s3 = await api(maria, 'POST', `/api/admin/leads/${mariaLead}`, { action: 'assign', broker_id: Number(ivayloId) });
  check('брокер не може да прехвърля дори свое запитване', s3.status === 403, `status ${s3.status}`);

  const p1 = await api(maria, 'PUT', `/api/admin/properties/${foreignProp}`, {
    title: 'Превзет имот',
    deal: 'sale',
    kind: 'apartment',
    area: 50,
    price: 1,
    district: 'Център',
  });
  check('брокер не може да променя чужд имот', p1.status === 403, `status ${p1.status}`);
  const p2 = await api(maria, 'DELETE', `/api/admin/properties/${foreignProp}`);
  check('брокер не може да трие чужд имот', p2.status === 403, `status ${p2.status}`);
  await mariaPage.goto(`${BASE}/admin/imoti/${foreignProp}`);
  check(
    'чужд активен имот се вижда само за четене',
    (await mariaPage.locator('form').count()) === 0 && (await text(mariaPage)).includes('Направи линк')
  );
  await bossPage.goto(`${BASE}/admin/zapitvania/${foreignLead}`);
  check('шефът вижда същото запитване', (await bossPage.locator('h1').count()) === 1 && !(await text(bossPage)).includes('404'));
}

/* ---------- 4. Имот със снимка ---------- */
section('4. Имот със снимка');
let newPropId = '';
{
  await mariaPage.goto(`${BASE}/admin/imoti/nov`);
  await mariaPage.click('button[type=submit]');
  await mariaPage.waitForSelector('.savebar .err');
  check('празна форма дава ясна грешка', (await mariaPage.textContent('.savebar .err')).includes('заглавие'));

  await mariaPage.fill('input[name=title]', 'Тестов двустаен до плажа');
  await mariaPage.fill('input[name=price]', '135000');
  await mariaPage.fill('input[name=area]', '64');
  await mariaPage.fill('input[name=district]', 'Чайка');
  await mariaPage.fill('input[name=rooms]', '2');
  await mariaPage.fill('input[name=teaser]', 'Четвърти етаж и пет минути до морето.');
  await mariaPage.fill('textarea[name=features]', 'Асансьор\nТераса');

  await mariaPage.setInputFiles('input[name=photos]', notImage);
  await mariaPage.waitForSelector('.photos + .err, .formsec .err');
  check('файл, който не е снимка, се отказва', (await text(mariaPage)).includes('не е снимка'));

  await mariaPage.setInputFiles('input[name=photos]', jpeg);
  await mariaPage.waitForSelector('.photo img');
  const src = await mariaPage.getAttribute('.photo img', 'src');
  check('качената снимка е под /media/', src.startsWith('/media/'), src);
  const img = await maria.request.get(`${BASE}${src}`);
  check('качената снимка се отваря', img.status() === 200 && img.headers()['content-type'] === 'image/jpeg');
  const bad = await maria.request.get(`${BASE}/media/..%2F..%2Fpackage.json`, { failOnStatusCode: false });
  check('от /media не може да се чете друг файл', bad.status() === 404 || bad.status() === 400, `status ${bad.status()}`);

  await mariaPage.click('button[type=submit]');
  await mariaPage.waitForURL(/\/admin\/imoti\/\d+\?nov=1/);
  newPropId = mariaPage.url().match(/imoti\/(\d+)/)[1];
  check('имотът е записан', (await text(mariaPage)).includes('Имотът е записан'));

  await mariaPage.fill('input[name=price]', '129000');
  await mariaPage.click('button[type=submit]');
  await mariaPage.waitForFunction(() => document.querySelector('.savebar .okmsg')?.textContent.includes('Промените са записани'));
  await mariaPage.reload();
  check('редакцията се пази след презареждане', (await mariaPage.inputValue('input[name=price]')) === '129000');
  check('брокерът няма поле за избран имот и за собственик', (await mariaPage.locator('input[name=featured], select[name=broker_id]').count()) === 0);

  const sneaky = await api(maria, 'PUT', `/api/admin/properties/${newPropId}`, {
    title: 'Тестов двустаен до плажа',
    deal: 'sale',
    kind: 'apartment',
    area: 64,
    price: 129000,
    district: 'Чайка',
    photos: [src],
    featured: true,
    broker_id: Number(ivayloId),
  });
  check('заявката минава, но без чужди права', sneaky.status === 200);
  await bossPage.goto(`${BASE}/admin/imoti/${newPropId}`);
  check('брокер не може сам да направи имота избран', !(await bossPage.isChecked('input[name=featured]')));
  check(
    'брокер не може да смени собственика на имота',
    (await bossPage.locator('select[name=broker_id] option:checked').textContent()).includes('Мария Колева')
  );

  await mariaPage.goto(`${BASE}/admin/imoti`);
  check('новият имот е в списъка', (await text(mariaPage)).includes('Тестов двустаен до плажа'));
}

/* ---------- 5. Запитване: статус, бележка, прехвърляне ---------- */
section('5. Работа по запитване');
{
  await mariaPage.goto(`${BASE}/admin/zapitvania/${mariaLead}`);
  await mariaPage.click('.statuspick button:has-text("Оглед")');
  await mariaPage.waitForSelector('.statuspick button[aria-pressed="true"]:has-text("Оглед")');
  check('статусът се сменя на Оглед', true);
  await mariaPage.fill('textarea[name=note]', 'Оглед в събота в 11, идва със съпругата си.');
  await mariaPage.click('text=Запиши бележката');
  await mariaPage.waitForFunction(() => document.body.innerText.includes('Оглед в събота в 11'));
  const t = await text(mariaPage);
  check('бележката и смяната на статуса са в историята', t.includes('Оглед в събота в 11') && t.includes('Статус: Оглед'));

  await bossPage.goto(`${BASE}/admin/zapitvania/${mariaLead}`);
  const before = await bossPage.locator('.vb').count();
  await bossPage.selectOption('select[name=broker]', { label: 'Ивайло Стоянов' });
  await bossPage.click('text=Разпредели');
  await bossPage.waitForSelector('.okmsg');
  await bossPage.reload();
  const after = await bossPage.locator('.vb').count();
  check('при прехвърляне се появява ново известие', after === before + 1, `${before} -> ${after}`);
  const bt = await text(bossPage);
  check('известието е до новия брокер', bt.includes('до Ивайло Стоянов') && bt.includes('Разпределено на Ивайло Стоянов'));
  check('известието съдържа клиента и телефона', /Клиент: .+\nТелефон: 0\d{3} \d{3} \d{3}/.test(bt));
  await bossPage.goto(`${BASE}/admin/izvestia`);
  check('известието е в дневника', (await bossPage.locator('.nitem').first().textContent()).includes('Ивайло Стоянов'));
  const gone = await mariaPage.goto(`${BASE}/admin/zapitvania/${mariaLead}`);
  check('след прехвърлянето предишният брокер вече не го вижда', gone.status() === 404, `status ${gone.status()}`);
}

/* ---------- 6. Анализ на чата ---------- */
section('6. Анализ на чата');
for (const qs of ['', '?dni=7', '?dni=90&device=mobile', '?dni=30&source=fb']) {
  await bossPage.goto(`${BASE}/admin/analiz${qs}`);
  const n = async (k) => Number((await bossPage.textContent(`[data-n=${k}]`)).trim());
  const opened = await n('opened');
  const sent = await n('sent');
  const abandoned = await n('abandoned');
  const stopped = await bossPage.$$eval('[data-stopped]', (els) => els.reduce((s, e) => s + Number(e.getAttribute('data-stopped')), 0));
  const f0 = Number(await bossPage.textContent('[data-funnel="0"]'));
  const f4 = Number(await bossPage.textContent('[data-funnel="4"]'));
  check(
    `числата се връзват ${qs || '(30 дни)'}: ${opened} отворили, ${sent} изпратили, ${stopped} спрели по стъпки`,
    opened > 0 && abandoned === opened - sent && stopped === abandoned && f0 === opened && f4 === sent,
    JSON.stringify({ opened, sent, abandoned, stopped, f0, f4 })
  );
}
{
  await bossPage.goto(`${BASE}/admin/analiz`);
  check('има изводи на обикновен език', (await bossPage.locator('.find').count()) >= 3);
  await bossPage.click('table.tbl tbody tr td.main a >> nth=0');
  await bossPage.waitForURL(/\/admin\/analiz\/.+/);
  check('отваря се един разговор стъпка по стъпка', (await bossPage.locator('.tl li').count()) >= 1);
}

/* ---------- 7. Линкове ---------- */
section('7. Линкове за споделяне');
{
  await mariaPage.goto(`${BASE}/admin/linkove?imot=1`);
  const link = await mariaPage.textContent('code[data-link]');
  check('линкът е с името на брокера и канала', /\/oferta\/maria-koleva\/chayka-tristaen-more\?k=fb$/.test(link), link);
  await mariaPage.click('.statuspick button:has-text("Instagram")');
  check('каналът се сменя в линка', (await mariaPage.textContent('code[data-link]')).endsWith('?k=ig'));
  check('брокерът не може да избере друг представящ', await mariaPage.isDisabled('select[name=broker]'));
  check('има готов текст за поста с линка', (await mariaPage.textContent('[data-post]')).includes('/oferta/maria-koleva/'));
  await bossPage.goto(`${BASE}/admin/linkove?imot=1`);
  await bossPage.selectOption('select[name=broker]', { label: 'Десислава Маринова' });
  check('шефът може да избере кой представя', (await bossPage.textContent('code[data-link]')).includes('/oferta/desislava-marinova/'));
  check('има резултати по канали', (await bossPage.locator('[data-linkstats] tr.chan').count()) > 3);
}

/* ---------- 8. Снимки на всички страници ---------- */
section('8. Снимки, ширина на телефон и тирета');
const leadForShot = foreignLead;
const PAGES = [
  ['boss', '/admin', 'tablo'],
  ['boss', '/admin/zapitvania', 'zapitvania'],
  ['boss', `/admin/zapitvania/${leadForShot}`, 'zapitvane'],
  ['boss', '/admin/imoti', 'imoti'],
  ['boss', '/admin/imoti/nov', 'imot-nov'],
  ['boss', '/admin/imoti/1', 'imot'],
  ['boss', '/admin/brokeri', 'brokeri'],
  ['boss', `/admin/brokeri/${ivayloId}`, 'broker'],
  ['boss', '/admin/klienti', 'klienti'],
  ['boss', '/admin/klienti/7', 'klient'],
  ['boss', '/admin/analiz', 'analiz'],
  ['boss', '/admin/linkove', 'linkove'],
  ['boss', '/admin/izvestia', 'izvestia'],
  ['boss', '/admin/profil', 'profil'],
  ['boss', '/admin/nastroiki', 'nastroiki'],
  ['broker', '/admin', 'broker-tablo'],
  ['broker', '/admin/zapitvania', 'broker-zapitvania'],
  ['broker', '/admin/imoti', 'broker-imoti'],
  ['broker', '/admin/klienti', 'broker-klienti'],
  ['none', '/admin/vhod', 'vhod'],
  ['none', '/admin/pokana?kod=VARNA7', 'pokana'],
];
async function shootAll(suffix = '') {
  for (const [w, h, tag] of [
    [1440, 900, 'desktop'],
    [390, 844, 'phone'],
  ]) {
    const ctxs = {
      boss: await ctxFor(BOSS, { width: w, height: h }),
      broker: await ctxFor(MARIA, { width: w, height: h }),
      none: await ctxFor(null, { width: w, height: h }),
    };
    for (const [role, url, name] of PAGES) {
      const page = await ctxs[role].newPage();
      const errs = [];
      page.on('pageerror', (e) => errs.push(e.message));
      const res = await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.querySelectorAll('img[loading=lazy]').forEach((i) => (i.loading = 'eager')));
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(SHOTS, `${name}${suffix}-${tag}.png`), fullPage: true });
      const info = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
        t: document.body.innerText,
      }));
      const dashes = (info.t.match(/[—–]| - /g) || []).length;
      const okPage = res.status() === 200 && errs.length === 0 && info.sw <= info.cw + 1 && dashes === 0;
      check(`${name}${suffix} ${tag}`, okPage, JSON.stringify({ status: res.status(), errs, sw: info.sw, cw: info.cw, dashes }));
      await page.close();
    }
    for (const c of Object.values(ctxs)) await c.close();
  }
}
await shootAll();

/* ---------- 9. Спиране на достъп ---------- */
section('9. Спиране на достъп');
{
  // Новият брокер си добавя имот, после шефът го спира и прехвърля имота на Мария.
  const made = await api(newBroker, 'POST', '/api/admin/properties', {
    title: 'Имот на новия брокер',
    deal: 'rent',
    kind: 'apartment',
    area: 55,
    price: 600,
    district: 'Левски',
  });
  check('новият брокер може да добави свой имот', made.status === 200 && made.json.ok);

  await bossPage.goto(`${BASE}/admin/brokeri`);
  const row = bossPage.locator('table.tbl tbody tr:has-text("Тест Брокеров")');
  await row.locator('text=Спри достъпа').click();
  await row.locator('select[name=move_to]').selectOption({ label: 'Мария Колева' });
  await row.locator('.stopbox button:has-text("Спри достъпа")').click();
  await bossPage.waitForFunction(() =>
    [...document.querySelectorAll('table.tbl tbody tr')].some((r) => r.textContent.includes('Тест Брокеров') && r.textContent.includes('Спрян'))
  );
  check('брокерът е отбелязан като спрян', true);

  const denied = await api(await ctxFor(null), 'POST', '/api/auth/login', NEWB);
  check('спреният брокер не може да влезе', denied.status === 403 && denied.json.error.includes('спрян'), `status ${denied.status}`);
  await newBrokerPage.goto(`${BASE}/admin`);
  check('старата му сесия вече не важи', newBrokerPage.url().endsWith('/admin/vhod'));
  const blocked = await api(newBroker, 'POST', '/api/admin/properties', { title: 'x' });
  check('със старата сесия не може да вика API', blocked.status === 401, `status ${blocked.status}`);

  const mp = await (await ctxFor(MARIA)).newPage();
  await mp.goto(`${BASE}/admin/imoti`);
  const mine = await mp.locator('.panel >> nth=0').textContent();
  check('имотът му е прехвърлен на избрания колега', mine.includes('Имот на новия брокер'));

  await bossPage.goto(`${BASE}/admin/brokeri`);
  await bossPage.locator('table.tbl tbody tr:has-text("Тест Брокеров")').locator('text=Върни достъпа').click();
  await bossPage.waitForFunction(() =>
    [...document.querySelectorAll('table.tbl tbody tr')].some((r) => r.textContent.includes('Тест Брокеров') && r.textContent.includes('Спри достъпа'))
  );
  const back = await api(await ctxFor(null), 'POST', '/api/auth/login', NEWB);
  check('след връщане на достъпа влиза отново', back.status === 200);

  const self = await api(boss, 'POST', '/api/admin/brokers/1', { action: 'deactivate' });
  check('управителят не може да спре себе си', self.status === 400, `status ${self.status}`);

  // Смяна на парола от шефа
  const pw = await api(boss, 'POST', `/api/admin/brokers/${ivayloId}`, { action: 'password', password: 'novaparola7' });
  const withNew = await api(await ctxFor(null), 'POST', '/api/auth/login', { phone: '0888 555 012', password: 'novaparola7' });
  const withOld = await api(await ctxFor(null), 'POST', '/api/auth/login', { phone: '0888 555 012', password: 'broker2026' });
  check('шефът сменя парола на брокер', pw.status === 200 && withNew.status === 200 && withOld.status === 401);
  await api(boss, 'POST', `/api/admin/brokers/${ivayloId}`, { action: 'password', password: 'broker2026' });
}

/* ---------- 10. Профил ---------- */
section('10. Собствен профил');
{
  const mp = await (await ctxFor(MARIA)).newPage();
  await mp.goto(`${BASE}/admin/profil`);
  await mp.fill('input[name=quote]', 'Първо говорим за парите, после за квадратите. Винаги.');
  await mp.click('text=Запиши профила');
  await mp.waitForFunction(() => document.body.innerText.includes('Профилът е записан'));
  await mp.reload();
  check('публичният профил се записва', (await mp.inputValue('input[name=quote]')).endsWith('Винаги.'));
  const wrong = await api(maria, 'POST', '/api/admin/profile', { section: 'password', current: 'greshna', next: 'novaparola1' });
  check('смяна на парола иска вярната стара', wrong.status === 403, `status ${wrong.status}`);
  const taken = await api(maria, 'POST', '/api/admin/profile', {
    section: 'account',
    first_name: 'Мария',
    last_name: 'Колева',
    phone: '0888 555 010',
  });
  check('не може да вземе чужд телефон', taken.status === 409, `status ${taken.status}`);
}

/* ---------- 11. Изтриване на примерните данни ---------- */
section('11. Примерни данни');
{
  const no = await api(boss, 'POST', '/api/admin/settings', { action: 'wipe-demo', confirm: 'да' });
  check('без точната дума нищо не се трие', no.status === 400);
  await bossPage.goto(`${BASE}/admin/nastroiki`);
  await bossPage.fill('input[name=confirm]', 'изтрий');
  await bossPage.click('text=Изтрий примерните данни');
  await bossPage.waitForFunction(() => document.body.innerText.includes('Примерните данни са изтрити'));
  const h = await (await fetch(`${BASE}/api/health`)).json();
  check('примерните разговори, запитвания и гледания са изтрити', h.chats === 0 && h.leads === 0 && h.views === 0, JSON.stringify(h));
  check('имотите и хората остават', h.properties >= 12 && h.users >= 7, JSON.stringify(h));

  await bossPage.goto(`${BASE}/admin`);
  const t = await text(bossPage);
  check('таблото показва смислени празни състояния', t.includes('Тук ще се появи първото запитване') && t.includes('Още няма запитвания'));
  await bossPage.goto(`${BASE}/admin/analiz`);
  check('анализът показва празно състояние', (await text(bossPage)).includes('Никой не е отварял чата'));

  PAGES.length = 0;
  PAGES.push(
    ['boss', '/admin', 'tablo'],
    ['boss', '/admin/zapitvania', 'zapitvania'],
    ['boss', '/admin/analiz', 'analiz'],
    ['boss', '/admin/klienti', 'klienti'],
    ['boss', '/admin/linkove', 'linkove'],
    ['boss', '/admin/izvestia', 'izvestia'],
    ['boss', '/admin/nastroiki', 'nastroiki'],
    ['broker', '/admin', 'broker-tablo']
  );
  await shootAll('-prazno');
}

check('няма грешки в браузъра по време на теста', pageErrors.length === 0, pageErrors.join(' | '));

await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} минали, ${failures.length} паднали`);
if (failures.length) {
  for (const f of failures) console.log(`  паднал: ${f}`);
  process.exit(1);
}
