// Минава пътя на клиент през жив сайт: линк от пост, чат, запитване. После проверява
// в панела на брокера дали известието е отбелязано като изпратено.
//   node tests/live-lead.mjs <адрес на оферта> <име> <фамилия> <телефон> <телефон на брокера> <парола>
import { chromium } from 'playwright-core';
const [url, first, last, phone, bPhone, bPass] = process.argv.slice(2);
const base = new URL(url).origin;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'networkidle' });
console.log('отворена оферта:', await p.locator('.offer__name').innerText(), '/', await p.locator('h1').first().innerText());
await p.locator('.cstart').first().locator('.chip', { hasText: 'Искам да купя' }).tap();
await p.waitForSelector('.cpanel');
const tap = async (t) => { await p.waitForTimeout(700); await p.locator('.cpanel .chip', { hasText: new RegExp('^' + t + '$') }).first().tap(); };
await tap('Апартамент');
await tap('Тристаен');
await tap('90 до 120 кв.м');
await tap('Чайка');
await p.locator('.cpanel .chip', { hasText: /^Бриз$/ }).first().tap();
await p.locator('.cpanel .cnext').tap();
await tap('200 000 до 350 000 €');
await tap('До три месеца');
await tap('С ипотечен кредит');
await p.waitForTimeout(700);
await p.locator('.cpanel textarea').fill('Търсим за четиричленно семейство, важно е да има паркомясто и асансьор.');
await p.locator('.cpanel .ctext button[type=submit]').tap();
await p.waitForTimeout(900);
console.log('обобщение:', (await p.locator('.csum').innerText()).replace(/\n+/g, ' | '));
await p.locator('.cpanel .csend').tap();
await p.waitForTimeout(700);
await p.locator('.cform input[name=first_name]').fill(first);
await p.locator('.cform input[name=last_name]').fill(last);
await p.locator('.cform input[name=phone]').fill(phone);
await p.locator('.cform input[type=checkbox]').check();
await p.locator('.cform .csend').tap();
await p.waitForSelector('.cdone', { timeout: 25000 });
console.log('клиентът вижда:', (await p.locator('.cdone').innerText()).split('\n').slice(0, 2).join(' '));
await p.screenshot({ path: 'tests/shots/live-lead-done.png' });
await ctx.close();

const adm = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await adm.request.post(base + '/api/auth/login', { data: { phone: bPhone, password: bPass } });
const a = await adm.newPage();
await a.goto(base + '/admin/izvestia', { waitUntil: 'networkidle' });
const item = a.locator('.nitem').first();
const text = (await item.innerText()).replace(/\n+/g, ' | ');
console.log('в Известия на брокера, най горното:', text.slice(0, 420));
await browser.close();
