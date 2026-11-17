// Чатът в дълбочина: първо самото дърво с въпроси (всеки възможен път), после 15 истински
// минавания през сайта, по три за всяка цел, на телефон и на компютър. След всяко запитване
// се проверява, че в базата е записано точно това, което човекът е натискал.
//   node tests/deep-chat.mjs [http://localhost:3214]
// Сървърът трябва да е пуснат с ALLOW_DEV_PEEK=1 (или в режим на разработка).
import { chromium } from 'playwright-core';

const BASE = (process.argv[2] || 'http://localhost:3214').replace(/\/$/, '');
let pass = 0;
let fail = 0;
const ok = (c, n, x = '') => {
  c ? pass++ : fail++;
  console.log((c ? '  ok   ' : '  FAIL ') + n + (c || x === '' ? '' : '  -> ' + String(x).slice(0, 300)));
};
const sorted = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]])) : o);
const same = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));

let tree = null;
try {
  tree = await import('../src/lib/chat-tree.ts');
} catch (e) {
  console.log('Дървото не може да се зареди направо (трябва Node 23.6 или по нов): ' + String(e.message).slice(0, 120));
}

console.log('\n1. Дървото с въпроси');
if (tree) {
  const { STEPS, STEP_BY_ID, INTENTS, nextStep, summarize, cleanAnswers } = tree;
  const idsSeen = STEPS.map((s) => s.id);
  ok(new Set(idsSeen).size === idsSeen.length, 'няма две стъпки с едно и също име');
  const targets = [];
  for (const s of STEPS) {
    if (s.next) targets.push([s.id, s.next]);
    for (const o of s.options || []) if (o.next) targets.push([s.id, o.next]);
  }
  const broken = targets.filter(([, t]) => t !== 'summary' && !STEP_BY_ID[t]);
  ok(broken.length === 0, `всичките ${targets.length} прехода водят към съществуваща стъпка`, JSON.stringify(broken));
  const texts = [];
  for (const s of STEPS) {
    texts.push(s.q, s.short, s.placeholder || '');
    for (const o of s.options || []) texts.push(o.label);
  }
  const dashed = texts.filter((t) => /[—–]|\s-\s|(^|[^А-Яа-яA-Za-z])(най|по)-[а-я]/i.test(t));
  const emoji = texts.filter((t) => /\p{Extended_Pictographic}/u.test(t));
  ok(dashed.length === 0 && emoji.length === 0, `в ${texts.filter(Boolean).length} въпроса и отговора няма тирета и емоджита`, [...dashed, ...emoji].join(' | '));
  const emptyQ = STEPS.filter((s) => !s.q.trim() || !s.short.trim() || ((s.type === 'choice' || s.type === 'multi') && !(s.options || []).length));
  ok(emptyQ.length === 0, 'всяка стъпка има въпрос, кратко име и отговори', emptyQ.map((s) => s.id).join(', '));

  // Всички пътища: при въпрос с един избор се минава през всеки отговор.
  let paths = 0;
  let longest = 0;
  const problems = [];
  const reached = new Set();
  const walk = (id, answers, depth) => {
    if (depth > 25) return problems.push('безкраен път при ' + id);
    if (id === 'summary') {
      paths++;
      longest = Math.max(longest, depth);
      const s = summarize(answers);
      if (!Object.values(INTENTS).includes(s.title)) problems.push('обобщение без цел: ' + JSON.stringify(answers));
      if (s.lines.length < 1 || /undefined|null|\[object/.test(s.text)) problems.push('лошо обобщение: ' + s.text);
      if (!same(cleanAnswers(answers), answers)) problems.push('почистването променя отговорите: ' + JSON.stringify(answers));
      return;
    }
    const step = STEP_BY_ID[id];
    reached.add(id);
    if (step.type === 'choice') {
      for (const o of step.options) walk(nextStep(step, o.v), { ...answers, [step.key]: o.v }, depth + 1);
    } else if (step.type === 'multi') {
      const all = step.options.map((o) => o.v);
      walk(nextStep(step, all.slice(0, 1)), { ...answers, [step.key]: all.slice(0, 1) }, depth + 1);
      if (problems.length === 0 && paths < 400) walk(nextStep(step, all), { ...answers, [step.key]: all }, depth + 1);
    } else {
      walk(nextStep(step, 'проба'), { ...answers, [step.key]: 'Търсим нещо тихо, близо до училище.' }, depth + 1);
    }
  };
  walk('start', {}, 0);
  ok(problems.length === 0, `минати са ${paths} пътя до обобщението, най дългият е ${longest} въпроса`, problems.slice(0, 3).join(' | '));
  const orphan = STEPS.filter((s) => !reached.has(s.id)).map((s) => s.id);
  ok(orphan.length === 0, 'няма стъпка, до която да не се стига', orphan.join(', '));
  const dirty = cleanAnswers({ intent: 'buy', where: ['Чайка', 5, null, { z: 1 }, ''], kind: { a: 1 }, budget: 42, note: 'я'.repeat(5000), hack: 'x', __proto__: { y: 1 } });
  ok(same(dirty, { intent: 'buy', where: ['Чайка'], budget: '42', note: 'я'.repeat(1000) }), 'от боклук остават само познатите полета като текст', JSON.stringify(dirty).slice(0, 200));
  ok(same(cleanAnswers(null), {}) && same(cleanAnswers('buy'), {}) && same(cleanAnswers([1, 2]), {}), 'null, текст и списък вместо отговори дават празно');
} else {
  ok(true, 'пропуснато: дървото не се зареди направо');
}

console.log('\n2. Истински минавания през чата');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const PHONE = {
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const START_LABEL = { ask: 'Питам за този имот', buy: 'Искам да купя', rent: 'Търся под наем', sell: 'Искам да продам', let: 'Искам да отдам' };
const peek = async (ctx) => (await ctx.request.get(BASE + '/api/dev/peek')).json();

let runNo = 0;
// Ако компютърът заспи по средата, минаването пада с изтекло време, без да има грешка в сайта.
// Затова такова минаване се повтаря до три пъти, а повторението се отбелязва в името.
async function run(...args) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await once(attempt, ...args);
    if (r !== 'timeout' || attempt === 3) return;
  }
}
async function once(attempt, intent, strategy, startPath, device, wantBroker) {
  runNo++;
  const name = `${intent} / ${strategy} / ${device === PHONE ? 'телефон' : 'компютър'} / ${startPath}` + (attempt > 1 ? ` (опит ${attempt})` : '');
  const ctx = await browser.newContext(device);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
  page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text().slice(0, 160)));
  const expected = { intent };
  const pick = (n) => (strategy === 'first' ? 0 : strategy === 'last' ? n - 1 : Math.floor(n / 2));
  const click = (loc) => (device === PHONE ? loc.tap() : loc.click());
  try {
    await page.goto(BASE + startPath, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    const starter = page.locator('.cstart .chip', { hasText: new RegExp('^' + START_LABEL[intent] + '$') }).first();
    if (await starter.count()) {
      await starter.scrollIntoViewIfNeeded();
      await click(starter);
    } else {
      await click(page.locator('.claunch__btn'));
      await page.waitForSelector('.cpanel');
      await click(page.locator('.cpanel__foot .chip', { hasText: new RegExp('^' + START_LABEL[intent] + '$') }).first());
    }
    await page.waitForSelector('.cpanel');
    let wentBack = false;
    for (let i = 0; i < 20; i++) {
      await page.waitForFunction(() => {
        const p = document.querySelector('.cpanel');
        if (!p || p.querySelector('.cmsg--typing')) return false;
        return !!(p.querySelector('.cform') || p.querySelector('.cpanel__foot .csend') || p.querySelector('.ctext') || p.querySelector('.cpanel__foot .copts .chip'));
      }, null, { timeout: 15000 });
      await page.waitForTimeout(250);
      if (await page.locator('.cpanel .cform').count()) break;
      const turns = await page.locator('.cpanel .cturn').count();
      const moved = (n) =>
        page.waitForFunction((k) => document.querySelectorAll('.cpanel .cturn').length !== k || !!document.querySelector('.cpanel .cform') || !!document.querySelector('.cpanel .csum'), n, { timeout: 15000 });
      if (await page.locator('.cpanel__foot .csend').count()) {
        await click(page.locator('.cpanel__foot .csend'));
        await page.waitForSelector('.cpanel .cform', { timeout: 15000 });
        break;
      }
      const question = (await page.locator('.cpanel .cmsg--bot').last().innerText()).trim();
      const step = tree ? tree.STEPS.find((s) => s.q === question) : null;
      if (await page.locator('.cpanel .ctext').count()) {
        const skip = page.locator('.cpanel .ctext .clink--mute');
        if (strategy === 'first' && (await skip.count())) {
          await click(skip);
          if (step) expected[step.key] = '';
        } else {
          const note = `Проба ${runNo}: търсим тихо място, близо до училище и спирка.`;
          await page.locator('.cpanel .ctext textarea').fill(note);
          await click(page.locator('.cpanel .ctext button[type=submit]'));
          if (step) expected[step.key] = note;
        }
      } else if (await page.locator('.cpanel .cnext').count()) {
        const chips = page.locator('.cpanel__foot .copts .chip');
        const n = await chips.count();
        // „mid“ избира два обикновени отговора и продължава с бутона. „last“ натиска последния,
        // който е „Няма значение“: той отговаря веднага сам, без бутон.
        const chosen = strategy === 'mid' && n > 2 ? [0, n - 2] : [pick(n)];
        let labels = [];
        let auto = false;
        for (const k of chosen) {
          const label = (await chips.nth(k).innerText()).trim();
          await click(chips.nth(k));
          await page.waitForTimeout(200);
          if ((await page.locator('.cpanel .cnext').count()) === 0) {
            labels = [label];
            auto = true;
            break;
          }
          labels.push(label);
        }
        if (!auto) {
          const btn = (await page.locator('.cpanel .cnext').innerText()).trim();
          if (!btn.endsWith(' ' + labels.length)) throw new Error(`бутонът казва „${btn}“ при ${labels.length} избрани`);
          await click(page.locator('.cpanel .cnext'));
        }
        if (step) expected[step.key] = labels.map((l) => step.options.find((o) => o.label === l)?.v ?? l);
      } else {
        const chips = page.locator('.cpanel__foot .copts .chip');
        const n = await chips.count();
        let k = pick(n);
        // Веднъж на минаване се връщаме назад и избираме друг отговор, за да се види, че се записва новият.
        if (strategy === 'mid' && !wentBack && turns >= 1 && n > 1 && (await page.locator('.cpanel .cback').count())) {
          wentBack = true;
          await click(chips.nth(0));
          await moved(turns);
          await page.waitForTimeout(500);
          await click(page.locator('.cpanel .cback').first());
          await moved(turns + 1);
          await page.waitForTimeout(500);
          k = n - 1;
        }
        const now = page.locator('.cpanel__foot .copts .chip');
        const label = (await now.nth(k).innerText()).trim();
        await click(now.nth(k));
        if (step) expected[step.key] = step.options.find((o) => o.label === label)?.v ?? label;
      }
      await moved(turns);
    }
    const first = 'Проба' + String.fromCharCode(1040 + (runNo % 20));
    const phone = '08887' + String(10000 + runNo);
    await page.locator('.cform input[name=first_name]').fill(first);
    await page.locator('.cform input[name=last_name]').fill('Чатова');
    await page.locator('.cform input[name=phone]').fill(phone);
    await page.locator('.cform input[type=checkbox]').check();
    await click(page.locator('.cform .csend'));
    await page.waitForSelector('.cdone', { timeout: 25000 });
    const doneText = (await page.locator('.cdone').innerText()).replace(/\s+/g, ' ');
    const data = await peek(ctx);
    const lead = data.leads.find((l) => l.first_name === first && l.last_name === 'Чатова');
    const note = data.notifications.find((n) => lead && n.lead_id === lead.id);
    const bad = [];
    if (!lead) bad.push('запитването го няма в базата');
    else {
      if (lead.intent !== intent) bad.push(`цел ${lead.intent}`);
      if (tree) {
        const got = lead.answers || {};
        // Пропуснатият свободен текст може да е записан като празен или изобщо да липсва.
        const norm = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null).sort(([a], [b]) => a.localeCompare(b)));
        if (!same(norm(got), norm(expected))) bad.push(`отговори ${JSON.stringify(norm(got))} вместо ${JSON.stringify(norm(expected))}`);
      }
      if ((lead.broker_first || null) !== wantBroker) bad.push(`брокер ${lead.broker_first} вместо ${wantBroker}`);
      if (!lead.summary || /undefined|\[object/.test(lead.summary)) bad.push('обобщение ' + lead.summary);
      if (!note) bad.push('няма запис в известията');
      else if (/[—–]| - /.test(note.body)) bad.push('тире в съобщението до брокера');
    }
    if (!doneText.includes(first)) bad.push('в края не се обръща по име: ' + doneText.slice(0, 80));
    if (errors.length) bad.push('грешки в конзолата: ' + errors.slice(0, 2).join(' | '));
    ok(bad.length === 0, name + (lead ? ` (${Object.keys(lead.answers || {}).length} отговора)` : ''), bad.join('; '));
  } catch (e) {
    const msg = String(e.message).split('\n')[0];
    await page.screenshot({ path: `tests/shots/deep-chat-${runNo}.png` }).catch(() => {});
    await ctx.close().catch(() => {});
    if (/Timeout/i.test(msg) && attempt < 3) {
      console.log(`  ...  ${name}: изтече времето, пробвам пак`);
      return 'timeout';
    }
    ok(false, name, msg);
    return 'failed';
  }
  await ctx.close();
  return 'done';
}

// Оферта от брокер: запитването отива при него, дори имотът да е на друг.
// Страница на имот: при брокера на имота. Обща страница: без брокер, разпределя управителят.
const d = await (await browser.newContext()).request.get(BASE + '/api/dev/peek').then((r) => r.ok()).catch(() => false);
if (!d) {
  ok(false, 'сървърът не дава /api/dev/peek, пусни го с ALLOW_DEV_PEEK=1');
} else {
  const plans = [
    ['ask', 'first', '/oferta/maria-koleva/briz-penthaus?k=fb', PHONE, 'Мария'],
    ['ask', 'last', '/imoti/chayka-tristaen-more', DESKTOP, 'Мария'],
    ['ask', 'mid', '/oferta/ivaylo-stoyanov/briz-penthaus?k=ig', PHONE, 'Ивайло'],
    ['buy', 'first', '/', PHONE, null],
    ['buy', 'last', '/oferta/maria-koleva/chayka-tristaen-more?k=tt', PHONE, 'Мария'],
    ['buy', 'mid', '/imoti', DESKTOP, null],
    ['rent', 'first', '/imoti', PHONE, null],
    ['rent', 'last', '/', DESKTOP, null],
    ['rent', 'mid', '/oferta/maria-koleva/briz-penthaus?k=viber', PHONE, 'Мария'],
    ['sell', 'first', '/brokeri', PHONE, null],
    ['sell', 'last', '/za-nas', DESKTOP, null],
    ['sell', 'mid', '/kontakti', PHONE, null],
    ['let', 'first', '/', DESKTOP, null],
    ['let', 'last', '/imoti', PHONE, null],
    ['let', 'mid', '/oferta/maria-koleva/briz-penthaus', DESKTOP, 'Мария'],
  ];
  for (const p of plans) await run(...p);
}

await browser.close();
console.log(`\nГотово: ${pass} минали, ${fail} неуспешни`);
process.exit(fail ? 1 : 0);
