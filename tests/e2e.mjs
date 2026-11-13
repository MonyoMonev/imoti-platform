// Тест от край до край на публичния сайт. Пуска се срещу работещ сървър:
//   node tests/e2e.mjs [http://localhost:3210]
import { chromium } from 'playwright-core';

const BASE = process.argv[2] || 'http://localhost:3210';
let pass = 0;
let fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) {
    pass++;
    console.log('  ok   ' + name);
  } else {
    fail++;
    console.log('  FAIL ' + name + (extra ? '  -> ' + extra : ''));
  }
};
const peek = async () => (await fetch(BASE + '/api/dev/peek')).json();
const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function fresh(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text().slice(0, 200)));
  return { ctx, page, errors };
}
const chip = (page, text) => page.locator('.cpanel .chip', { hasText: new RegExp('^' + text + '$') }).first();

// ───────── 1. Страниците се зареждат, без грешки и без тирета ─────────
console.log('\n1. Страници');
{
  const { ctx, page, errors } = await fresh();
  const urls = ['/', '/imoti', '/imoti/chayka-tristaen-more', '/oferta/maria-koleva/chayka-tristaen-more', '/brokeri', '/brokeri/maria-koleva', '/za-nas', '/kontakti', '/vhod', '/registracia', '/poveritelnost'];
  for (const u of urls) {
    const res = await page.goto(BASE + u, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(350);
    const text = await page.evaluate(() => document.body.innerText);
    const dashes = (text.match(/[—–]/g) || []).length;
    const hyph = (text.match(/[А-Яа-я]-[А-Яа-я]/g) || []).length;
    const spaced = (text.match(/ - /g) || []).length;
    ok(res.status() === 200, `${u} се зарежда`);
    ok(dashes === 0 && spaced === 0 && hyph === 0, `${u} няма тирета`, `дълги ${dashes}, с интервали ${spaced}, в думи ${hyph}`);
  }
  const nf = await page.goto(BASE + '/imoti/nyama-takav');
  ok(nf.status() === 404, 'липсващ имот дава 404');
  ok(errors.length === 0, 'няма грешки в конзолата', errors.slice(0, 3).join(' | '));
  await ctx.close();
}

// ───────── 2. Началната страница: асансьор и сцена ─────────
console.log('\n2. Начална страница');
{
  const { ctx, page } = await fresh();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const l0 = await page.locator('.cabin__level').innerText();
  ok(l0.trim() === '+21.00', 'асансьорът тръгва от кота +21.00', l0);
  await page.evaluate(() => window.__lenis?.scrollTo(2600, { immediate: true, force: true }) ?? window.scrollTo(0, 2600));
  await page.waitForTimeout(700);
  const l1 = await page.locator('.cabin__level').innerText();
  ok(parseFloat(l1) < 20 && parseFloat(l1) > 0, 'котата намалява при слизане', l1);
  const floor = await page.locator('.cabin__floor').innerText();
  ok(/Етаж/i.test(floor), 'показва текущия етаж', floor);
  const lit0 = await page.evaluate(() => getComputedStyle(document.querySelector('.scene')).getPropertyValue('--lit'));
  await page.evaluate(() => window.__lenis?.scrollTo(999999, { immediate: true, force: true }) ?? window.scrollTo(0, 999999));
  await page.waitForTimeout(900);
  const lit1 = await page.evaluate(() => getComputedStyle(document.querySelector('.scene')).getPropertyValue('--lit'));
  ok(Number(lit1) > 0.9 && Number(lit0) < 0.9, 'долу е вечер и прозорците светят', `${lit0} -> ${lit1}`);
  const l2 = await page.locator('.cabin__level').innerText();
  ok(l2.includes('0.00'), 'асансьорът стига кота нула', l2);
  await page.evaluate(() => window.__lenis?.scrollTo(3000, { immediate: true, force: true }) ?? window.scrollTo(0, 3000));
  await page.waitForTimeout(700);
  await page.locator('.floors a', { hasText: 'Брокери' }).click({ force: true });
  await page.waitForTimeout(2400);
  const inView = await page.evaluate(() => {
    const r = document.querySelector('#brokeri').getBoundingClientRect();
    return r.top < innerHeight * 0.6 && r.bottom > 100;
  });
  ok(inView, 'бутон от списъка с етажи води до етажа');
  await ctx.close();
}

// ───────── 3. Филтри ─────────
console.log('\n3. Списък с имоти и филтри');
{
  const { ctx, page } = await fresh();
  await page.goto(BASE + '/imoti', { waitUntil: 'networkidle' });
  ok((await page.locator('.grid .pcard').count()) === 12, 'показва 12 имота');
  await page.locator('.seg button', { hasText: 'Наем' }).click();
  await page.waitForURL(/deal=rent/);
  await page.waitForTimeout(600);
  const tags = await page.locator('.grid .pcard .pcard__tag:first-child').allInnerTexts();
  ok(tags.length === 3 && tags.every((t) => /наем/i.test(t)), 'филтър „Наем“ оставя само наемите', tags.join(','));
  await page.locator('select').nth(1).selectOption('Чайка');
  await page.waitForURL(/district/);
  await page.waitForTimeout(600);
  ok((await page.locator('.grid .pcard').count()) === 1, 'наем + Чайка дава един имот');
  await page.locator('select').nth(1).selectOption('Владиславово');
  await page.waitForTimeout(700);
  ok(await page.locator('.empty').isVisible(), 'празен резултат показва покана към чата');
  await page.locator('.filters__meta button').click();
  await page.waitForTimeout(600);
  ok((await page.locator('.grid .pcard').count()) === 12, 'изчистване на филтрите връща всички');
  await ctx.close();
}

// ───────── 4. Чатът от оферта: цялото дърво до запитване ─────────
console.log('\n4. Чат от линк на брокер (пълен път „Искам да купя“)');
{
  const { ctx, page, errors } = await fresh();
  await page.goto(BASE + '/oferta/maria-koleva/chayka-tristaen-more?k=fb', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  let d = await peek();
  ok(d.views[0].kind === 'offer' && d.views[0].source === 'fb' && d.views[0].broker_first === undefined, 'посещението е записано като оферта от Facebook', JSON.stringify(d.views[0]).slice(0, 160));
  ok(await page.locator('.offer__name').innerText().then((t) => t.includes('Мария Колева')), 'страницата представя брокера');
  ok(await page.locator('.cstart').first().isVisible(), 'началото на чата е на първия екран');
  ok((await page.locator('.cstart').first().locator('.chip').count()) === 5, 'с имот има пет отговора, включително „Питам за този имот“');

  await page.locator('.cstart').first().locator('.chip', { hasText: 'Искам да купя' }).click();
  await page.waitForSelector('.cpanel');
  ok(await page.locator('.cpanel__who b').innerText().then((t) => t.includes('Мария')), 'чатът е от името на брокера');
  await page.waitForTimeout(600);
  ok(await page.locator('.cpanel .cmsg--bot').last().innerText().then((t) => t.includes('Какъв имот')), 'след първия отговор идва въпрос за вида имот');
  await chip(page, 'Апартамент').click();
  await page.waitForTimeout(600);
  await chip(page, 'Тристаен').click();
  await page.waitForTimeout(600);

  // Назад и смяна на отговора
  await page.locator('.cpanel .cback').click();
  await page.waitForTimeout(600);
  ok(await page.locator('.cpanel .cmsg--bot').last().innerText().then((t) => t.includes('Колко стаи')), '„Назад“ връща предишния въпрос');
  await chip(page, 'Двустаен').click();
  await page.waitForTimeout(600);
  await chip(page, '60 до 90 кв.м').click();
  await page.waitForTimeout(600);

  // Няколко района
  ok(await page.locator('.cpanel .cnext').isDisabled(), 'при районите „Продължи“ чака поне един избор');
  await chip(page, 'Чайка').click();
  await chip(page, 'Бриз').click();
  await page.locator('.cpanel .cnext').click();
  await page.waitForTimeout(600);
  await chip(page, '130 000 до 200 000 €').click();
  await page.waitForTimeout(600);
  await chip(page, 'До три месеца').click();
  await page.waitForTimeout(600);
  await chip(page, 'С ипотечен кредит').click();
  await page.waitForTimeout(600);
  await page.locator('.cpanel textarea').fill('Искаме паркомясто и да не е на последен етаж.');
  await page.locator('.cpanel .ctext button[type=submit]').click();
  await page.waitForTimeout(700);

  const sum = await page.locator('.csum').innerText();
  ok(/Купува/.test(sum) && /Двустаен/.test(sum) && /Чайка, Бриз/.test(sum) && /130 000 до 200 000/.test(sum) && /паркомясто/.test(sum), 'обобщението показва всички отговори', sum.replace(/\n/g, ' | '));
  ok(!/Тристаен/.test(sum), 'смененият отговор не е останал в обобщението');
  await page.locator('.cpanel .csend').click();
  await page.waitForTimeout(600);

  // Формата: проверки
  await page.locator('.cform .csend').click();
  await page.waitForTimeout(500);
  ok(await page.locator('.cform .form-error').isVisible(), 'празна форма дава грешка');
  await page.locator('.cform input[name=first_name]').fill('Тест');
  await page.locator('.cform input[name=last_name]').fill('Тестов');
  await page.locator('.cform input[name=phone]').fill('123');
  await page.locator('.cform .csend').click();
  await page.waitForTimeout(500);
  ok(await page.locator('.cform .form-error').innerText().then((t) => /Телефонът/.test(t)), 'невалиден телефон се отказва');
  await page.locator('.cform input[name=phone]').fill('0888 111 222');
  await page.locator('.cform .csend').click();
  await page.waitForTimeout(500);
  ok(await page.locator('.cform .form-error').innerText().then((t) => /съгласен/.test(t)), 'без съгласие не се изпраща');
  await page.locator('.cform input[type=checkbox]').check();
  await page.locator('.cform .csend').click();
  await page.waitForSelector('.cdone', { timeout: 15000 });
  const done = await page.locator('.cdone').innerText();
  ok(/Готово, Тест/.test(done) && /Мария/.test(done) && /0888 111 222/.test(done), 'потвърждение с името на брокера и телефона', done.replace(/\n/g, ' | ').slice(0, 160));

  d = await peek();
  const lead = d.leads[0];
  ok(lead.first_name === 'Тест' && lead.phone === '+359888111222', 'запитването е записано с нормализиран телефон');
  ok(lead.broker_first === 'Мария', 'запитването е при брокера от линка', lead.broker_first);
  ok(lead.source === 'fb', 'източникът е Facebook', lead.source);
  ok(lead.property_id && lead.intent === 'buy', 'вързано е с имота и целта');
  ok(lead.answers.rooms === 'Двустаен' && Array.isArray(lead.answers.where) && lead.answers.where.length === 2, 'отговорите са запазени');
  ok(/паркомясто/.test(lead.note || ''), 'свободният текст е запазен');
  const n = d.notifications[0];
  ok(n.lead_id === lead.id && n.status === 'simulated' && /Тест Тестов/.test(n.body) && /0888 111 222/.test(n.body) && /Бюджет: 130 000 до 200 000/.test(n.body), 'съобщението за Viber е генерирано', n.body.replace(/\n/g, ' | ').slice(0, 220));
  ok(!/[—–]/.test(n.body), 'съобщението няма тирета');
  const s = d.sessions[0];
  ok(s.submitted && s.reached_form && s.reached_summary && s.lead_id === lead.id, 'сесията на чата е отбелязана като завършена');
  const types = d.events.map((e) => e.type);
  ok(types.includes('open') && types.includes('back') && types.includes('summary') && types.includes('form') && types.includes('submit'), 'всички стъпки са в дневника', types.join(','));

  // Профил само с парола
  ok(await page.locator('.cdone__save').isVisible(), 'предлага профил само с парола');
  await page.locator('.cdone__save input').fill('tajna123');
  await page.locator('.cdone__save button').click();
  await page.waitForSelector('.cdone .form-ok', { timeout: 10000 });
  await page.goto(BASE + '/profil', { waitUntil: 'networkidle' });
  const prof = await page.locator('main').innerText();
  ok(/Здравей, Тест/.test(prof) && /Купува/.test(prof), 'профилът е създаден и показва запитването');
  ok(/Тристаен с гледка към морето/.test(prof), 'профилът показва разгледания имот');
  ok(errors.length === 0, 'няма грешки в конзолата', errors.slice(0, 3).join(' | '));
  await ctx.close();
}

// ───────── 5. Отказване по средата и причина ─────────
console.log('\n5. Чат, изоставен по средата');
{
  const { ctx, page } = await fresh();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.locator('.claunch__btn').click();
  await page.waitForSelector('.cpanel');
  ok((await page.locator('.cpanel .copts .chip').count()) === 4, 'без имот отговорите са четири');
  await chip(page, 'Търся под наем').click();
  await page.waitForTimeout(600);
  await chip(page, 'Апартамент').click();
  await page.waitForTimeout(600);
  await page.locator('.cpanel__close').click();
  await page.waitForTimeout(300);
  ok(await page.locator('.cpanel__foot--exit').isVisible(), 'при затваряне пита какво е спряло човека');
  await page.locator('.cpanel__foot--exit .chip', { hasText: 'Не искам да оставям телефон' }).click();
  await page.waitForTimeout(700);
  ok((await page.locator('.cpanel').count()) === 0, 'чатът се затваря след причината');
  const d = await peek();
  const s = d.sessions[0];
  ok(!s.submitted && s.exit_reason === 'phone' && s.last_step === 'rent.rooms' && s.answered === 2 && s.intent === 'rent', 'записано е докъде е стигнал и защо', JSON.stringify({ last: s.last_step, a: s.answered, r: s.exit_reason }));
  ok(s.broker_id === null, 'от началната страница няма брокер, шефът разпределя');
  // Втори опит: разговорът продължава оттам
  await page.locator('.claunch__btn').click();
  await page.waitForTimeout(500);
  ok(await page.locator('.cpanel .cmsg--bot').last().innerText().then((t) => /Колко стаи/.test(t)), 'при повторно отваряне продължава от същия въпрос');
  await ctx.close();
}

// ───────── 6. Въпрос за конкретен имот и запазен брокер ─────────
console.log('\n6. Страница на имот');
{
  const { ctx, page } = await fresh();
  // Първо идва през линк на друг брокер, после разглежда друг имот
  await page.goto(BASE + '/oferta/desislava-marinova/briz-penthaus?k=ig', { waitUntil: 'networkidle' });
  await page.goto(BASE + '/imoti/vinitsa-kashta', { waitUntil: 'networkidle' });
  ok(await page.locator('.bcard__name').innerText().then((t) => /Николай/.test(t)), 'имотът показва своя брокер');
  ok(await page.locator('.calc__out b').innerText().then((t) => /€/.test(t)), 'има сметка за кредит');
  const pay0 = await page.locator('.calc__out b').innerText();
  await page.locator('.calc input[type=range]').first().fill('50');
  const pay1 = await page.locator('.calc__out b').innerText();
  ok(pay0 !== pay1, 'сметката се преизчислява при промяна на самоучастието', `${pay0} -> ${pay1}`);
  await page.locator('.gal__item').nth(1).click();
  await page.waitForSelector('.lbox');
  ok(await page.locator('.lbox__top span').innerText().then((t) => /2 от 5/.test(t)), 'галерията се отваря на избраната снимка');
  await page.keyboard.press('ArrowRight');
  ok(await page.locator('.lbox__top span').innerText().then((t) => /3 от 5/.test(t)), 'стрелките сменят снимката');
  await page.keyboard.press('Escape');
  ok((await page.locator('.lbox').count()) === 0, 'Escape затваря галерията');
  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  ok(/^https?:\/\/.+vinitsa-kashta\/1\.jpg/.test(og || ''), 'има снимка за споделяне в социалните мрежи', og);
  await page.locator('.side .btn--lime').click();
  await page.waitForSelector('.cpanel');
  await page.waitForTimeout(600);
  ok(await page.locator('.cpanel .cmsg--bot').last().innerText().then((t) => /Какво те интересува/.test(t)), '„Попитай за този имот“ прескача към въпросите за имота');
  await chip(page, 'Искам оглед').click();
  await page.waitForTimeout(600);
  await chip(page, 'През уикенда').click();
  await page.waitForTimeout(600);
  await page.locator('.cpanel .clink--mute', { hasText: 'Пропусни' }).click();
  await page.waitForTimeout(700);
  await page.locator('.cpanel .csend').click();
  await page.waitForTimeout(500);
  await page.locator('.cform input[name=first_name]').fill('Ива');
  await page.locator('.cform input[name=last_name]').fill('Петрова');
  await page.locator('.cform input[name=phone]').fill('+359 899 333 444');
  await page.locator('.cform input[type=checkbox]').check();
  await page.locator('.cform .csend').click();
  await page.waitForSelector('.cdone', { timeout: 15000 });
  const d = await peek();
  ok(d.leads[0].broker_first === 'Николай' && d.leads[0].intent === 'ask', 'на страницата на имота запитването отива при неговия брокер', d.leads[0].broker_first);
  ok(d.leads[0].source === 'ig', 'източникът от първото влизане се пази', d.leads[0].source);
  ok(d.events.some((e) => e.type === 'skip'), 'пропуснатият свободен текст е отбелязан');
  await ctx.close();
}

// ───────── 7. Клиент: регистрация, любими, изход, вход ─────────
console.log('\n7. Клиентски профил');
{
  const { ctx, page } = await fresh();
  const phone = '0897' + String(Math.floor(100000 + Math.random() * 899999));
  await page.goto(BASE + '/registracia', { waitUntil: 'networkidle' });
  await page.locator('input[name=first_name]').fill('Ана');
  await page.locator('input[name=last_name]').fill('Колева');
  await page.locator('input[name=phone]').fill(phone);
  await page.locator('input[name=password]').fill('123');
  await page.locator('form button').click();
  await page.waitForTimeout(600);
  ok(await page.locator('.form-error').innerText().then((t) => /6 знака/.test(t)), 'къса парола се отказва');
  await page.locator('input[name=password]').fill('parola123');
  await page.locator('form button').click();
  await page.waitForURL(/\/profil/, { timeout: 15000 });
  ok(await page.locator('h1').innerText().then((t) => /Здравей, Ана/.test(t)), 'регистрацията води в профила');
  ok(await page.locator('.hdr__account').innerText().then((t) => /Ана/.test(t)), 'в главата се вижда името');

  await page.goto(BASE + '/imoti/briz-penthaus', { waitUntil: 'networkidle' });
  await page.locator('.fav').click();
  await page.waitForTimeout(600);
  ok(await page.locator('.fav').innerText().then((t) => /Запазен/.test(t)), 'имотът се запазва');
  await page.goto(BASE + '/profil', { waitUntil: 'networkidle' });
  const txt = await page.locator('main').innerText();
  ok(/Пентхаус с тераса над Бриз/.test(txt), 'запазеният имот е в профила');

  // Чатът попълва данните на влезлия клиент
  await page.locator('.acct__none .btn').click();
  await page.waitForSelector('.cpanel');
  await chip(page, 'Искам да продам').click();
  await page.waitForTimeout(600);
  await chip(page, 'Къща').click();
  await page.waitForTimeout(600);
  await chip(page, 'Виница').click();
  await page.waitForTimeout(600);
  await chip(page, 'над 120 кв.м').click();
  await page.waitForTimeout(600);
  await chip(page, 'Искам оценка от брокер').click();
  await page.waitForTimeout(600);
  await chip(page, 'Не бързам').click();
  await page.waitForTimeout(600);
  await page.locator('.cpanel .clink--mute', { hasText: 'Пропусни' }).click();
  await page.waitForTimeout(700);
  await page.locator('.cpanel .csend').click();
  await page.waitForTimeout(500);
  ok((await page.locator('.cform input[name=first_name]').inputValue()) === 'Ана', 'формата е попълнена с името от профила');
  await page.locator('.cform input[type=checkbox]').check();
  await page.locator('.cform .csend').click();
  await page.waitForSelector('.cdone', { timeout: 15000 });
  ok((await page.locator('.cdone__save').count()) === 0, 'на влязъл клиент не се предлага нов профил');
  const d = await peek();
  ok(d.leads[0].client_id && d.leads[0].intent === 'sell' && d.leads[0].broker_id === null, 'запитването е вързано с профила на клиента');

  await page.locator('.cdone .clink', { hasText: 'Затвори' }).click();
  await page.locator('.acct__head button', { hasText: 'Изход' }).click();
  await page.waitForURL((u) => u.pathname === '/', { timeout: 15000 });
  await page.goto(BASE + '/profil');
  ok(/\/vhod/.test(page.url()), 'след изход профилът не е достъпен');
  await page.locator('input[name=phone]').fill(phone);
  await page.locator('input[name=password]').fill('greshna');
  await page.locator('form button').click();
  await page.waitForTimeout(600);
  ok(await page.locator('.form-error').innerText().then((t) => /Грешен/.test(t)), 'грешна парола се отказва');
  await page.locator('input[name=password]').fill('parola123');
  await page.locator('form button').click();
  await page.waitForURL(/\/profil/, { timeout: 15000 });
  ok(true, 'вход с телефон и парола');
  await ctx.close();
}

// ───────── 8. Телефон ─────────
console.log('\n8. Телефон (390 px)');
{
  const { ctx, page, errors } = await fresh({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  for (const u of ['/', '/imoti', '/oferta/ivaylo-stoyanov/levski-studio', '/brokeri']) {
    await page.goto(BASE + u, { waitUntil: 'networkidle' });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(over <= 1, `${u} не се разлива настрани`, `излишък ${over}px`);
  }
  await page.goto(BASE + '/oferta/ivaylo-stoyanov/levski-studio', { waitUntil: 'networkidle' });
  ok(await page.locator('.stick').isVisible(), 'има лепкава лента с бутон за чата');
  await page.locator('.stick .btn--lime').click();
  await page.waitForSelector('.cpanel');
  await page.waitForTimeout(800);
  const box = await page.locator('.cpanel').boundingBox();
  ok(box.width >= 389 && box.height >= 800, 'на телефон чатът е на цял екран', JSON.stringify(box));
  await chip(page, 'Питам за този имот').tap();
  await page.waitForTimeout(600);
  ok(await page.locator('.cpanel .cmsg--bot').last().innerText().then((t) => /Какво те интересува/.test(t)), 'отговорите работят с докосване');
  const d = await peek();
  ok(d.sessions[0].device === 'mobile', 'устройството е отбелязано като телефон');
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.locator('.hdr__burger').tap();
  await page.waitForTimeout(500);
  ok(await page.locator('.menu.is-open').isVisible(), 'менюто на телефон се отваря');
  ok(errors.length === 0, 'няма грешки в конзолата', errors.slice(0, 3).join(' | '));
  await ctx.close();
}

await browser.close();
console.log(`\nГотово: ${pass} минали, ${fail} неуспешни`);
process.exit(fail ? 1 : 0);
