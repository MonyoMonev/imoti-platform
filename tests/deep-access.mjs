// Права, чужди данни и вход с боклук: кой какво може да отвори и да промени, и дали сървърът
// отговаря с ясен отказ (4xx), а не с грешка (5xx), когато му пратят нещо невалидно.
//   node tests/deep-access.mjs [http://localhost:3214]
// Иска прясна база с примерните данни. Оставя след себе си пробни записи.
import { request } from 'playwright-core';

const BASE = (process.argv[2] || 'http://localhost:3214').replace(/\/$/, '');
let pass = 0;
let fail = 0;
const ok = (c, n, x = '') => {
  c ? pass++ : fail++;
  console.log((c ? '  ok   ' : '  FAIL ') + n + (c || x === '' ? '' : '  -> ' + String(x).slice(0, 260)));
};

async function ctx(login) {
  const c = await request.newContext({ baseURL: BASE });
  if (login) {
    const r = await c.post('/api/auth/login', { data: { phone: login[0], password: login[1] } });
    if (!r.ok()) throw new Error('входът не стана: ' + login[0]);
  }
  return c;
}
async function call(c, method, path, data, extra = {}) {
  const r = await c.fetch(path, { method, data, maxRedirects: 0, failOnStatusCode: false, ...extra });
  let body = null;
  const text = await r.text().catch(() => '');
  try {
    body = JSON.parse(text);
  } catch {}
  return { status: r.status(), body, text, headers: r.headers() };
}
const ids = (html, re) => [...new Set([...html.matchAll(re)].map((m) => Number(m[1])))];
const health = async (c) => (await call(c, 'GET', '/api/health')).body;

const anon = await ctx();
const boss = await ctx(['0888555010', 'shef2026']);
const maria = await ctx(['0888555011', 'broker2026']);
const client = await ctx(['0888555099', 'klient2026']);
const before = await health(anon);

const PROP = { title: 'Пробен имот за проверка на правата', deal: 'sale', kind: 'apartment', area: 80, price: 100000, district: 'Чайка', status: 'draft' };

// Кой чии записи вижда, по списъците в панела.
const bossLeads = ids((await call(boss, 'GET', '/admin/zapitvania')).text, /\/admin\/zapitvania\/(\d+)/g);
const mariaLeads = ids((await call(maria, 'GET', '/admin/zapitvania')).text, /\/admin\/zapitvania\/(\d+)/g);
const bossProps = ids((await call(boss, 'GET', '/admin/imoti')).text, /\/admin\/imoti\/(\d+)/g);
const mariaProps = ids((await call(maria, 'GET', '/admin/imoti')).text, /\/admin\/imoti\/(\d+)/g);
const bossClients = ids((await call(boss, 'GET', '/admin/klienti')).text, /\/admin\/klienti\/(\d+)/g);
const mariaClients = ids((await call(maria, 'GET', '/admin/klienti')).text, /\/admin\/klienti\/(\d+)/g);
const team = ids((await call(boss, 'GET', '/admin/brokeri')).text, /\/admin\/brokeri\/(\d+)/g);
const foreignLead = bossLeads.find((i) => !mariaLeads.includes(i));
const foreignClient = bossClients.find((i) => !mariaClients.includes(i));
const ownLead = mariaLeads[0];

console.log('\n1. Без вход');
{
  const pagesAdmin = ['/admin', '/admin/zapitvania', `/admin/zapitvania/${bossLeads[0]}`, '/admin/imoti', '/admin/imoti/nov', `/admin/imoti/${bossProps[0]}`,
    '/admin/linkove', '/admin/klienti', `/admin/klienti/${bossClients[0]}`, '/admin/brokeri', `/admin/brokeri/${team[0]}`, '/admin/analiz', '/admin/izvestia', '/admin/profil', '/admin/nastroiki'];
  const leaks = [];
  for (const p of pagesAdmin) {
    const r = await call(anon, 'GET', p);
    const to = r.headers.location || '';
    if (!(r.status >= 300 && r.status < 400 && to.includes('/admin/vhod'))) leaks.push(`${p} ${r.status}`);
  }
  ok(leaks.length === 0, `всичките ${pagesAdmin.length} страници на панела пращат към входа`, leaks.join(', '));
  const prof = await call(anon, 'GET', '/profil');
  ok(prof.status >= 300 && prof.status < 400, 'клиентският профил иска вход', prof.status);

  const apis = [
    ['POST', `/api/admin/brokers/${team[0]}`, { action: 'activate' }],
    ['POST', '/api/admin/invites', {}],
    ['POST', '/api/admin/invites/VARNA7', {}],
    ['POST', `/api/admin/leads/${bossLeads[0]}`, { action: 'note', body: 'x' }],
    ['POST', '/api/admin/profile', { section: 'public' }],
    ['POST', '/api/admin/properties', PROP],
    ['PUT', `/api/admin/properties/${bossProps[0]}`, PROP],
    ['DELETE', `/api/admin/properties/${bossProps[0]}`, undefined],
    ['POST', '/api/admin/settings', { action: 'wipe-demo', confirm: 'ИЗТРИЙ' }],
    ['POST', '/api/admin/upload', undefined],
    ['GET', '/api/admin/viber', undefined],
    ['POST', '/api/admin/viber', { token: 'x'.repeat(40) }],
    ['DELETE', '/api/admin/viber', undefined],
    ['POST', '/api/admin/viber/test', undefined],
  ];
  for (const who of [['без вход', anon], ['клиент', client]]) {
    const open = [];
    for (const [m, p, d] of apis) {
      const r = await call(who[1], m, p, d);
      if (r.status !== 401) open.push(`${m} ${p} ${r.status}`);
    }
    ok(open.length === 0, `${who[0]}: всичките ${apis.length} адреса на панела отказват с 401`, open.join(', '));
  }
  const cp = [];
  for (const p of ['/admin', '/admin/zapitvania', '/admin/nastroiki']) {
    const r = await call(client, 'GET', p);
    if (!(r.status >= 300 && r.status < 400)) cp.push(`${p} ${r.status}`);
  }
  ok(cp.length === 0, 'клиент не влиза в панела', cp.join(', '));
  const fav = await call(anon, 'POST', '/api/favorites', { propertyId: bossProps[0], on: true });
  ok(fav.status === 401, 'запазване на имот иска вход', fav.status);
  const after = await health(anon);
  ok(after.properties === before.properties && after.leads === before.leads && after.users === before.users, 'нищо не е променено в базата', JSON.stringify(after));
}

console.log('\n2. Брокер срещу нещата на шефа и на колегите');
{
  // Брокерът вижда активните имоти на колегите (за да ги споделя), но не и черновите им.
  const fd = await call(boss, 'POST', '/api/admin/properties', { ...PROP, title: 'Чужда чернова за проверка', broker_id: 3, status: 'draft' });
  const fa = await call(boss, 'POST', '/api/admin/properties', { ...PROP, title: 'Чужд активен имот за проверка', broker_id: 3, status: 'active' });
  const foreignDraft = fd.body?.id;
  const foreignProp = fa.body?.id;
  ok(!!foreignLead && !!foreignDraft && !!foreignProp && !!ownLead, 'има чужди и свои записи за пробата', `${foreignLead} ${foreignDraft} ${foreignProp} ${ownLead}`);
  const bossPages = [];
  for (const p of ['/admin/brokeri', `/admin/brokeri/${team[0]}`, '/admin/analiz', '/admin/nastroiki']) {
    const r = await call(maria, 'GET', p);
    if (r.status === 200) bossPages.push(p);
  }
  ok(bossPages.length === 0, 'страниците само за управителя не се отварят', bossPages.join(', '));

  const bossApis = [
    ['POST', '/api/admin/invites', {}],
    ['POST', '/api/admin/invites/VARNA7', {}],
    ['POST', '/api/admin/settings', { action: 'wipe-demo', confirm: 'ИЗТРИЙ' }],
    ['POST', `/api/admin/brokers/${team[0]}`, { action: 'password', password: 'hacked123' }],
    ['POST', `/api/admin/brokers/${team[0]}`, { action: 'deactivate' }],
    ['POST', `/api/admin/brokers/${team[0]}`, { action: 'visibility', visible: false }],
    ['POST', `/api/admin/leads/${ownLead}`, { action: 'assign', broker_id: team[0] }],
  ];
  const open = [];
  for (const [m, p, d] of bossApis) {
    const r = await call(maria, m, p, d);
    if (r.status !== 403) open.push(`${m} ${p} ${JSON.stringify(d)} ${r.status}`);
  }
  ok(open.length === 0, 'действията само за управителя отказват с 403', open.join(' | '));
  const still = await call(await ctx(), 'POST', '/api/auth/login', { phone: '0888555010', password: 'shef2026' });
  ok(still.status === 200, 'паролата на управителя не е сменена');

  const page = await call(maria, 'GET', `/admin/zapitvania/${foreignLead}`);
  ok(page.status === 404, 'чуждо запитване не се отваря', page.status);
  const acts = [];
  for (const d of [{ action: 'note', body: 'чужда бележка' }, { action: 'status', status: 'lost' }, { action: 'assign', broker_id: team[0] }]) {
    const r = await call(maria, 'POST', `/api/admin/leads/${foreignLead}`, d);
    if (r.status !== 404) acts.push(`${d.action} ${r.status}`);
  }
  ok(acts.length === 0, 'по чуждо запитване не може бележка, статус и разпределяне', acts.join(', '));
  const own = await call(maria, 'POST', `/api/admin/leads/${ownLead}`, { action: 'note', body: 'Обадих се, ще гледаме в събота.' });
  ok(own.status === 200, 'по свое запитване бележката се записва', own.status);
  const badStatus = await call(maria, 'POST', `/api/admin/leads/${ownLead}`, { action: 'status', status: 'won' });
  ok(badStatus.status === 400, 'непознат статус се отказва', badStatus.status);

  const fdp = await call(maria, 'GET', `/admin/imoti/${foreignDraft}`);
  ok(fdp.status === 404, 'чужда чернова не се отваря', fdp.status);
  const fp = await call(maria, 'GET', `/admin/imoti/${foreignProp}`);
  ok(fp.status === 200 && !fp.text.includes('name="title"'), 'чужд активен имот се отваря само за преглед, без форма за редакция', fp.status);
  const tries = [];
  for (const id of [foreignDraft, foreignProp]) {
    const put = await call(maria, 'PUT', `/api/admin/properties/${id}`, PROP);
    const del = await call(maria, 'DELETE', `/api/admin/properties/${id}`);
    if (put.status !== 403 || del.status !== 403) tries.push(`${id}: ${put.status} ${del.status}`);
  }
  ok(tries.length === 0, 'чужд имот не се редактира и не се трие', tries.join(', '));
  const left = ids((await call(boss, 'GET', '/admin/imoti')).text, /\/admin\/imoti\/(\d+)/g);
  ok(left.includes(foreignDraft) && left.includes(foreignProp), 'чуждите имоти са си на мястото');
  await call(boss, 'DELETE', `/api/admin/properties/${foreignDraft}`);
  await call(boss, 'DELETE', `/api/admin/properties/${foreignProp}`);

  const mine = await call(maria, 'POST', '/api/admin/properties', { ...PROP, broker_id: team.find((t) => t !== 2) , featured: true });
  ok(mine.status === 200 && mine.body?.id, 'брокер добавя свой имот', mine.status);
  const nowMine = ids((await call(maria, 'GET', '/admin/imoti')).text, /\/admin\/imoti\/(\d+)/g).includes(mine.body?.id);
  ok(nowMine, 'имотът остава на него, дори да е посочил друг брокер');
  const give = await call(maria, 'PUT', `/api/admin/properties/${mine.body?.id}`, { ...PROP, title: 'Пробен имот, прехвърлен', broker_id: 1 });
  const stillMine = ids((await call(maria, 'GET', '/admin/imoti')).text, /\/admin\/imoti\/(\d+)/g).includes(mine.body?.id);
  ok(give.status === 200 && stillMine, 'брокер не може да прехвърли имота си на друг');
  const delMine = await call(maria, 'DELETE', `/api/admin/properties/${mine.body?.id}`);
  const delAgain = await call(maria, 'DELETE', `/api/admin/properties/${mine.body?.id}`);
  ok(delMine.status === 200 && delAgain.status === 404, 'трие своя имот, второто триене дава 404', `${delMine.status} ${delAgain.status}`);

  if (foreignClient) {
    const fc = await call(maria, 'GET', `/admin/klienti/${foreignClient}`);
    ok(fc.status === 404, 'чужд клиент не се отваря', fc.status);
  }
}

console.log('\n3. Управител: невалидни данни дават отказ, не грешка');
{
  const cases = [
    ['запитване с буквен номер', 'POST', '/api/admin/leads/abc', { action: 'note', body: 'x' }, 404],
    ['несъществуващо запитване', 'POST', '/api/admin/leads/999999', { action: 'note', body: 'x' }, 404],
    ['запитване с огромен номер', 'POST', '/api/admin/leads/99999999999', { action: 'note', body: 'x' }, 404],
    ['разпределяне към „abc“', 'POST', `/api/admin/leads/${bossLeads[0]}`, { action: 'assign', broker_id: 'abc' }, 400],
    ['разпределяне без брокер', 'POST', `/api/admin/leads/${bossLeads[0]}`, { action: 'assign' }, 400],
    ['разпределяне към клиент', 'POST', `/api/admin/leads/${bossLeads[0]}`, { action: 'assign', broker_id: 7 }, 400],
    ['разпределяне към огромен номер', 'POST', `/api/admin/leads/${bossLeads[0]}`, { action: 'assign', broker_id: 99999999999 }, 400],
    ['празна бележка', 'POST', `/api/admin/leads/${bossLeads[0]}`, { action: 'note', body: '   ' }, 400],
    ['непознато действие', 'POST', `/api/admin/leads/${bossLeads[0]}`, { action: 'explode' }, 400],
    ['брокер с буквен номер', 'POST', '/api/admin/brokers/abc', { action: 'activate' }, 404],
    ['брокер с огромен номер', 'POST', '/api/admin/brokers/99999999999', { action: 'activate' }, 404],
    ['клиент вместо брокер', 'POST', '/api/admin/brokers/7', { action: 'activate' }, 404],
    ['спиране на себе си', 'POST', '/api/admin/brokers/1', { action: 'deactivate' }, 400],
    ['спиране с прехвърляне към „abc“', 'POST', `/api/admin/brokers/${team.find((t) => t !== 1)}`, { action: 'deactivate', move_to: 'abc' }, 400],
    ['къса парола на брокер', 'POST', `/api/admin/brokers/${team.find((t) => t !== 1)}`, { action: 'password', password: '123' }, 400],
    ['профил на брокер без имена', 'POST', `/api/admin/brokers/${team.find((t) => t !== 1)}`, { action: 'profile', first_name: 'А', last_name: '' }, 400],
    ['отмяна на несъществуваща покана', 'POST', '/api/admin/invites/ZZZZZZ', {}, 404],
    ['триене на примерните данни без потвърждение', 'POST', '/api/admin/settings', { action: 'wipe-demo', confirm: 'да' }, 400],
    ['настройки с непознато действие', 'POST', '/api/admin/settings', { action: 'drop' }, 400],
    ['имот без заглавие', 'POST', '/api/admin/properties', { ...PROP, title: '' }, 400],
    ['имот с непозната сделка', 'POST', '/api/admin/properties', { ...PROP, deal: 'gift' }, 400],
    ['имот с непознат вид', 'POST', '/api/admin/properties', { ...PROP, kind: 'castle' }, 400],
    ['имот с нулева площ', 'POST', '/api/admin/properties', { ...PROP, area: 0 }, 400],
    ['имот с отрицателна цена', 'POST', '/api/admin/properties', { ...PROP, price: -5 }, 400],
    ['имот с цена от букви', 'POST', '/api/admin/properties', { ...PROP, price: 'много' }, 400],
    ['имот с невъзможно голяма цена', 'POST', '/api/admin/properties', { ...PROP, price: 99999999999 }, 400],
    ['имот с невъзможно голяма площ', 'POST', '/api/admin/properties', { ...PROP, area: 99999999999 }, 400],
    ['имот с невъзможен брой стаи', 'POST', '/api/admin/properties', { ...PROP, rooms: 99999999999 }, 400],
    ['имот с невъзможна година', 'POST', '/api/admin/properties', { ...PROP, year_built: 99999999999 }, 400],
    ['имот към несъществуващ брокер', 'POST', '/api/admin/properties', { ...PROP, broker_id: 999999 }, 400],
    ['имот към брокер „abc“', 'POST', '/api/admin/properties', { ...PROP, broker_id: 'abc' }, 400],
    ['редакция на несъществуващ имот', 'PUT', '/api/admin/properties/999999', PROP, 404],
    ['редакция на имот с буквен номер', 'PUT', '/api/admin/properties/abc', PROP, 404],
    ['редакция на имот с огромен номер', 'PUT', '/api/admin/properties/99999999999', PROP, 404],
    ['профил с непознат раздел', 'POST', '/api/admin/profile', { section: 'x' }, 400],
    ['профил с грешен телефон', 'POST', '/api/admin/profile', { section: 'account', first_name: 'Красимир', last_name: 'Данев', phone: '12' }, 400],
    ['профил със зает телефон', 'POST', '/api/admin/profile', { section: 'account', first_name: 'Красимир', last_name: 'Данев', phone: '0888555011' }, 409],
    ['смяна на парола с грешна сегашна', 'POST', '/api/admin/profile', { section: 'password', current: 'nope', next: 'newpass123' }, 403],
    ['Viber токен с интервали', 'POST', '/api/admin/viber', { token: 'a b c d e f g h i j k l m n o p' }, 400],
    ['пробно съобщение без канал', 'POST', '/api/admin/viber/test', undefined, 400],
  ];
  for (const [name, m, p, d, want] of cases) {
    const r = await call(boss, m, p, d);
    ok(r.status === want, `${name}: ${want}`, `дойде ${r.status} ${r.text.slice(0, 120)}`);
  }
  const garbage = await call(boss, 'POST', `/api/admin/leads/${bossLeads[0]}`, undefined, { headers: { 'content-type': 'application/json' }, data: '{"action": "note", ' });
  ok(garbage.status === 400, 'счупен JSON дава 400', garbage.status);
  const nulls = [];
  for (const [c, m, p] of [[boss, 'POST', `/api/admin/leads/${bossLeads[0]}`], [boss, 'POST', '/api/admin/properties'], [boss, 'POST', '/api/admin/profile'], [boss, 'POST', '/api/admin/settings'], [boss, 'POST', '/api/admin/invites'], [boss, 'POST', '/api/admin/viber'],
    [anon, 'POST', '/api/auth/login'], [anon, 'POST', '/api/auth/register'], [anon, 'POST', '/api/auth/invite'], [anon, 'POST', '/api/chat'], [anon, 'POST', '/api/chat/submit'], [anon, 'POST', '/api/track'], [client, 'POST', '/api/favorites']]) {
    for (const raw of ['null', '[]', '"текст"', '42']) {
      const r = await call(c, m, p, undefined, { headers: { 'content-type': 'application/json' }, data: raw });
      if (r.status >= 500) nulls.push(`${p} ${raw} ${r.status}`);
    }
  }
  ok(nulls.length === 0, 'тяло null, списък, текст или число не чупи нито един адрес', nulls.join(', '));

  // Качване на файлове
  const up = (files) => call(boss, 'POST', '/api/admin/upload', undefined, { multipart: files });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const txt = await up({ files: { name: 'virus.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('<script>alert(1)</script>') } });
  ok(txt.status === 400, 'текст, преименуван на .jpg, се отказва', txt.status);
  const svg = await up({ files: { name: 'x.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>') } });
  ok(svg.status === 400, 'SVG се отказва', svg.status);
  const big = await up({ files: { name: 'big.png', mimeType: 'image/png', buffer: Buffer.concat([png, Buffer.alloc(4 * 1024 * 1024 + 10)]) } });
  ok(big.status === 400 || big.status === 413, 'снимка над 4 MB се отказва', big.status);
  const none = await up({ note: 'няма файл' });
  ok(none.status === 400, 'заявка без файл се отказва', none.status);
  const good = await up({ files: { name: 'ok.png', mimeType: 'image/png', buffer: png } });
  const url = good.body?.urls?.[0];
  ok(good.status === 200 && /^\/media\/[a-z0-9]+\.png$/.test(url || ''), 'истинска снимка се качва', `${good.status} ${url}`);
  const got = await call(anon, 'GET', url || '/media/x');
  ok(got.status === 200 && got.headers['content-type'] === 'image/png', 'качената снимка се отваря като снимка', `${got.status} ${got.headers['content-type']}`);
  const paths = [];
  for (const p of ['/media/../../etc/passwd', '/media/%2e%2e%2fpackage.json', '/media/nyama.jpg', '/media/abc', "/media/x'.jpg"]) {
    const r = await call(anon, 'GET', p);
    if (r.status !== 404) paths.push(`${p} ${r.status}`);
  }
  ok(paths.length === 0, 'измислени адреси на снимки дават 404', paths.join(', '));

  // Имот: създаване, редакция, външни снимки се изчистват, триене
  const made = await call(boss, 'POST', '/api/admin/properties', { ...PROP, status: 'active', photos: ['https://evil.example/x.jpg', '/img/../../secret.jpg', url, 'javascript:alert(1)'], features: ['Асансьор', 'Асансьор', '<b>Паркомясто</b>'] });
  ok(made.status === 200 && made.body?.slug, 'имот с опасни снимки се записва', made.status);
  const pub = await call(anon, 'GET', `/imoti/${made.body?.slug}`);
  ok(pub.status === 200 && !pub.text.includes('evil.example') && !pub.text.includes('secret.jpg') && !pub.text.includes('<b>Паркомясто</b>'), 'на сайта излиза само качената снимка, без външни адреси и без чужд HTML');
  const upd = await call(boss, 'PUT', `/api/admin/properties/${made.body?.id}`, { ...PROP, title: 'Пробен имот, редактиран', status: 'боклук' });
  ok(upd.status === 200, 'редакцията минава, непознат статус се пренебрегва', upd.status);
  const gone = await call(boss, 'DELETE', `/api/admin/properties/${made.body?.id}`);
  const pub2 = await call(anon, 'GET', `/imoti/${made.body?.slug}`);
  ok(gone.status === 200 && pub2.status === 404, 'след триене страницата на имота дава 404', `${gone.status} ${pub2.status}`);
}

console.log('\n4. Публичните адреси с невалидни данни');
{
  const sid = () => 'deep' + Math.random().toString(36).slice(2, 14).padEnd(12, 'x');
  const LEAD = { first_name: 'Дарина', last_name: 'Пробна', phone: '0888 700 100', consent: true, answers: { intent: 'buy' } };
  const cases = [
    ['вход без нищо', 'POST', '/api/auth/login', {}, 400],
    ['вход с грешна парола', 'POST', '/api/auth/login', { phone: '0888555010', password: 'greshna' }, 401],
    ['вход с непознат телефон', 'POST', '/api/auth/login', { phone: '0888999999', password: 'x' }, 401],
    ['вход с обекти вместо текст', 'POST', '/api/auth/login', { phone: { a: 1 }, password: ['x'] }, [400, 401]],
    ['вход с опит за SQL', 'POST', '/api/auth/login', { phone: "0888555010' or '1'='1", password: "' or '1'='1" }, [400, 401]],
    ['вход с парола от 20 000 знака', 'POST', '/api/auth/login', { phone: '0888555010', password: 'x'.repeat(20000) }, 401],
    ['GET към входа', 'GET', '/api/auth/login', undefined, 405],
    ['регистрация с къс телефон', 'POST', '/api/auth/register', { first_name: 'Ани', last_name: 'Тест', phone: '0888', password: 'parola123' }, 400],
    ['регистрация с букви вместо телефон', 'POST', '/api/auth/register', { first_name: 'Ани', last_name: 'Тест', phone: 'телефон', password: 'parola123' }, 400],
    ['регистрация с къса парола', 'POST', '/api/auth/register', { first_name: 'Ани', last_name: 'Тест', phone: '0888700200', password: '123' }, 400],
    ['регистрация без фамилия', 'POST', '/api/auth/register', { first_name: 'Ани', last_name: '', phone: '0888700200', password: 'parola123' }, 400],
    ['регистрация със зает телефон', 'POST', '/api/auth/register', { first_name: 'Ани', last_name: 'Тест', phone: '+359 888 555 099', password: 'parola123' }, 409],
    ['профил от запитване без запитване', 'POST', '/api/auth/register-from-lead', { password: 'parola123' }, 400],
    ['покана с измислен код', 'POST', '/api/auth/invite', { code: 'NYAMA1', first_name: 'Ани', last_name: 'Тест', phone: '0888700300', password: 'parola123' }, 404],
    ['покана с къса парола', 'POST', '/api/auth/invite', { code: 'VARNA7', first_name: 'Ани', last_name: 'Тест', phone: '0888700300', password: '123' }, 400],
    ['покана със зает телефон', 'POST', '/api/auth/invite', { code: 'VARNA7', first_name: 'Ани', last_name: 'Тест', phone: '0888555011', password: 'parola123' }, 409],
    ['чат с невалиден номер на разговор', 'POST', '/api/chat', { sid: '../../x', type: 'open' }, 400],
    ['чат с непознато действие', 'POST', '/api/chat', { sid: sid(), type: 'hack' }, 400],
    ['чат с несъществуващ имот и брокер', 'POST', '/api/chat', { sid: sid(), type: 'open', ctx: { propertyId: 999999, brokerId: 999999 } }, 200],
    ['чат с огромни номера', 'POST', '/api/chat', { sid: sid(), type: 'open', ctx: { propertyId: 99999999999, brokerId: 99999999999 } }, 200],
    ['чат с отговори като текст', 'POST', '/api/chat', { sid: sid(), type: 'answer', step: 'start', value: 'buy', answers: 'buy' }, 200],
    ['чат с вложени отговори', 'POST', '/api/chat', { sid: sid(), type: 'answer', step: 'start', value: { a: [1, 2, { b: 3 }] }, answers: { intent: { x: 1 }, where: [[1], { y: 2 }] } }, 200],
    ['чат с дълга стойност', 'POST', '/api/chat', { sid: sid(), type: 'answer', step: 'x'.repeat(500), value: 'я'.repeat(50000), answers: { note: 'я'.repeat(50000) } }, 200],
    ['запитване без име', 'POST', '/api/chat/submit', { ...LEAD, first_name: '' }, 400],
    ['запитване без фамилия', 'POST', '/api/chat/submit', { ...LEAD, last_name: 'П' }, 400],
    ['запитване с грешен телефон', 'POST', '/api/chat/submit', { ...LEAD, phone: '0888 12' }, 400],
    ['запитване без съгласие', 'POST', '/api/chat/submit', { ...LEAD, consent: false }, 400],
    ['разглеждане с боклук', 'POST', '/api/track', { kind: 'x', path: 'я'.repeat(5000), propertyId: 'abc', brokerId: {}, k: ['fb'], ref: 12 }, 200],
    ['разглеждане с огромни номера', 'POST', '/api/track', { kind: 'offer', propertyId: 99999999999, brokerId: 99999999999 }, 200],
    ['разглеждане без тяло', 'POST', '/api/track', undefined, 200],
    ['адрес за Viber', 'POST', '/api/viber/webhook', { event: 'webhook' }, 200],
  ];
  for (const [name, m, p, d, want] of cases) {
    const c = await ctx();
    const r = await call(c, m, p, d);
    const good = Array.isArray(want) ? want.includes(r.status) : r.status === want;
    ok(good, `${name}: ${Array.isArray(want) ? want.join(' или ') : want}`, `дойде ${r.status} ${r.text.slice(0, 120)}`);
    await c.dispose();
  }

  // Телефонът се разпознава във всякакъв запис
  const forms = ['0888 700 401', '+359 888 700 402', '00359888700403', '0888-700-404', '(0888) 700 405', '888700406'];
  const badForms = [];
  for (const f of forms) {
    const c = await ctx();
    const r = await call(c, 'POST', '/api/chat/submit', { ...LEAD, phone: f });
    if (r.status !== 200) badForms.push(`${f} ${r.status}`);
    await c.dispose();
  }
  ok(badForms.length === 0, 'телефонът се приема в шест различни записа', badForms.join(', '));

  // Запитване със странни отговори и с опит за вмъкване на код
  const x = await ctx();
  const XSS = '<img src=x onerror=alert(1)>';
  const weird = await call(x, 'POST', '/api/chat/submit', {
    first_name: XSS, last_name: '<script>alert(2)</script>', phone: '0888700500', consent: true,
    answers: { intent: 'buy', kind: { a: 1 }, where: ['Чайка', 5, null, { z: 1 }], budget: 42, note: `"><svg onload=alert(3)> ${'я'.repeat(3000)}` },
    ctx: { propertyId: 999999, brokerId: 7 },
  });
  ok(weird.status === 200, 'запитване със странни отговори се приема без грешка', `${weird.status} ${weird.text.slice(0, 200)}`);
  const leadPage = await call(boss, 'GET', `/admin/zapitvania/${weird.body?.leadId}`);
  ok(leadPage.status === 200 && !leadPage.text.includes('<img src=x onerror') && !leadPage.text.includes('<svg onload') && !/<script>alert\(2\)<\/script>/.test(leadPage.text),
    'в панела вмъкнатият код се показва като текст, не се изпълнява');
  const listPage = await call(boss, 'GET', '/admin/zapitvania');
  ok(!listPage.text.includes('<img src=x onerror'), 'и в списъка със запитвания е само текст');
  const notif = await call(boss, 'GET', '/admin/izvestia');
  ok(notif.status === 200 && !notif.text.includes('<img src=x onerror'), 'и в известията е само текст');
  ok(weird.body?.broker === null, 'запитване, насочено към клиент вместо към брокер, остава без брокер', JSON.stringify(weird.body?.broker));

  // Ограничение: най много 5 запитвания на час от един посетител
  const many = await ctx();
  const codes = [];
  for (let i = 0; i < 7; i++) codes.push((await call(many, 'POST', '/api/chat/submit', { ...LEAD, phone: `088870060${i}` })).status);
  ok(codes.slice(0, 5).every((s) => s === 200) && codes[5] === 429 && codes[6] === 429, 'шестото запитване от същия посетител за час се спира', codes.join(' '));

  // Запазени имоти
  const favCases = [
    [{ propertyId: bossProps[0], on: true }, 200],
    [{ propertyId: bossProps[0], on: true }, 200],
    [{ propertyId: bossProps[0], on: false }, 200],
    [{ propertyId: 'abc', on: true }, 400],
    [{ propertyId: 999999, on: true }, [400, 404]],
    [{ propertyId: 99999999999, on: true }, [400, 404]],
    [{}, 400],
  ];
  const favBad = [];
  for (const [d, want] of favCases) {
    const r = await call(client, 'POST', '/api/favorites', d);
    if (!(Array.isArray(want) ? want.includes(r.status) : r.status === want)) favBad.push(`${JSON.stringify(d)} ${r.status}`);
  }
  ok(favBad.length === 0, 'запазване на имот: двойно, махане, измислен имот', favBad.join(' | '));
  const staffFav = await call(maria, 'POST', '/api/favorites', { propertyId: bossProps[0], on: true });
  ok(staffFav.status === 401, 'брокер не запазва имоти като клиент', staffFav.status);
}

console.log('\n5. Регистрация, покана и сесии');
{
  const c = await ctx();
  const reg = await call(c, 'POST', '/api/auth/register', { first_name: 'Ралица', last_name: 'Пробна', phone: '+359 888 700 701', password: 'parola123' });
  const cookie = reg.headers['set-cookie'] || '';
  ok(reg.status === 200 && reg.body?.role === 'client', 'клиент се регистрира', reg.status);
  ok(/sid=/.test(cookie) && /httponly/i.test(cookie) && /samesite=lax/i.test(cookie), 'бисквитката на сесията е HttpOnly и SameSite', cookie.slice(0, 160));
  const prof = await call(c, 'GET', '/profil');
  ok(prof.status === 200 && prof.text.includes('Ралица'), 'след регистрация профилът се отваря');
  const again = await call(await ctx(), 'POST', '/api/auth/login', { phone: '0888700701', password: 'parola123' });
  ok(again.status === 200, 'входът работи с телефона, записан по друг начин', again.status);
  const sidValue = (cookie.match(/sid=([^;]+)/) || [])[1];
  await call(c, 'POST', '/api/auth/logout');
  const replay = await request.newContext({ baseURL: BASE, extraHTTPHeaders: { cookie: `sid=${sidValue}` } });
  const after = await call(replay, 'GET', '/profil');
  ok(after.status >= 300 && after.status < 400, 'след изход старата бисквитка вече не важи', after.status);

  // Покана: приемане, повторна употреба, спиране на достъпа
  const inv = await call(boss, 'POST', '/api/admin/invites', { note: 'проба на правата' });
  const code = inv.body?.code;
  ok(inv.status === 200 && /^[A-Z0-9]{6}$/.test(code || ''), 'управителят прави покана с код от 6 знака', `${inv.status} ${code}`);
  const nb = await ctx();
  const acc = await call(nb, 'POST', '/api/auth/invite', { code: (code || '').toLowerCase(), first_name: 'Стоян', last_name: 'Пробен', phone: '0888700801', password: 'parola123' });
  ok(acc.status === 200 && acc.body?.role === 'broker', 'кодът се приема и с малки букви, човекът става брокер', acc.status);
  const reuse = await call(await ctx(), 'POST', '/api/auth/invite', { code, first_name: 'Втори', last_name: 'Човек', phone: '0888700802', password: 'parola123' });
  ok(reuse.status === 409, 'кодът не може да се ползва втори път', reuse.status);
  const dash = await call(nb, 'GET', '/admin');
  ok(dash.status === 200, 'новият брокер влиза в панела', dash.status);
  const hidden = await call(anon, 'GET', '/brokeri');
  ok(!hidden.text.includes('Стоян Пробен'), 'новият брокер не се вижда на сайта, докато управителят не го покаже');
  const newId = ids((await call(boss, 'GET', '/admin/brokeri')).text, /\/admin\/brokeri\/(\d+)/g).find((i) => !team.includes(i));
  const revoked = await call(boss, 'POST', `/api/admin/invites/${code}`, {});
  ok(revoked.status === 404, 'използвана покана не може да се отмени', revoked.status);

  const pw = await call(boss, 'POST', `/api/admin/brokers/${newId}`, { action: 'password', password: 'novaparola1' });
  const kicked = await call(nb, 'GET', '/api/admin/viber');
  ok(pw.status === 200 && kicked.status === 401, 'смяна на паролата от управителя изхвърля брокера от панела', `${pw.status} ${kicked.status}`);
  const relog = await ctx(['0888700801', 'novaparola1']);
  const off = await call(boss, 'POST', `/api/admin/brokers/${newId}`, { action: 'deactivate' });
  const dead = await call(relog, 'GET', '/api/admin/viber');
  const tryLogin = await call(await ctx(), 'POST', '/api/auth/login', { phone: '0888700801', password: 'novaparola1' });
  ok(off.status === 200 && dead.status === 401 && tryLogin.status === 403, 'спрян брокер губи сесията си и не може да влезе пак', `${off.status} ${dead.status} ${tryLogin.status}`);

  const inv2 = await call(boss, 'POST', '/api/admin/invites', {});
  await call(boss, 'POST', `/api/admin/invites/${inv2.body?.code}`, {});
  const dead2 = await call(await ctx(), 'POST', '/api/auth/invite', { code: inv2.body?.code, first_name: 'Трети', last_name: 'Човек', phone: '0888700803', password: 'parola123' });
  ok(dead2.status === 410, 'отменена покана не се приема', dead2.status);
}

console.log('\n6. Странни адреси на страници');
{
  const want404 = ['/imoti/nyama-takav', '/brokeri/nyama-takav', '/oferta/maria-koleva/nyama-takav', '/oferta/nyama/briz-penthaus', '/nyama-takava-stranica', '/admin/nyama', `/imoti/${'a'.repeat(300)}`];
  const bad404 = [];
  for (const p of want404) {
    const r = await call(p.startsWith('/admin') ? boss : anon, 'GET', p);
    if (r.status !== 404) bad404.push(`${p.slice(0, 50)} ${r.status}`);
  }
  ok(bad404.length === 0, 'несъществуващи страници дават 404', bad404.join(', '));
  const want200 = [
    '/imoti?deal=xxx&kind=yyy&rooms=abc&min=-5&max=1e99&district=%27%20or%201%3D1&sort=zzz',
    '/imoti?min=99999999999&max=99999999999999&rooms=99999999999',
    '/imoti?deal=sale&deal=rent&kind[]=apartment',
    '/imoti?q=%3Cscript%3Ealert(1)%3C/script%3E',
    '/oferta/maria-koleva/briz-penthaus?k=%3Cscript%3E',
    '/oferta/maria-koleva/briz-penthaus?k=fb&k=ig',
    '/?utm_source=x&k=viber',
    '/vhod?next=https://evil.example',
    '/admin/pokana?kod=%3Cscript%3Ealert(1)%3C/script%3E',
  ];
  const bad200 = [];
  for (const p of want200) {
    const r = await call(anon, 'GET', p);
    if (r.status !== 200 || r.text.includes('<script>alert(1)</script>')) bad200.push(`${p.slice(0, 60)} ${r.status}`);
  }
  ok(bad200.length === 0, 'страниците издържат на измислени параметри в адреса', bad200.join(', '));
  const adminBad = [];
  for (const p of ['/admin/zapitvania?status=xxx&broker=abc&q=%27', '/admin/zapitvania/abc', '/admin/zapitvania/99999999999', '/admin/imoti/abc', '/admin/imoti/99999999999', '/admin/klienti/abc', '/admin/klienti/99999999999', '/admin/brokeri/abc', '/admin/brokeri/99999999999', '/admin/analiz?from=abc&to=xyz&source=zzz&device=q', '/admin/analiz/nyama-takav-razgovor']) {
    const r = await call(boss, 'GET', p);
    if (r.status >= 500) adminBad.push(`${p} ${r.status}`);
  }
  ok(adminBad.length === 0, 'панелът издържа на измислени номера и филтри', adminBad.join(', '));
  const robots = await call(anon, 'GET', '/');
  ok(/<meta[^>]+name="robots"[^>]+noindex/i.test(robots.text), 'сайтът е скрит от търсачките (noindex)');
}

const end = await health(anon);
ok(end.ok === true, 'сървърът е жив след всичко', JSON.stringify(end));
console.log(`\nГотово: ${pass} минали, ${fail} неуспешни`);
process.exit(fail ? 1 : 0);
