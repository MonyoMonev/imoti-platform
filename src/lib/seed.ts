import { hashPassword } from './password';
import { STEP_BY_ID, nextStep, summarize, type Answers } from './chat-tree';
import { phoneText } from './format';
import type { SeedClient } from './db';

// Начални данни за демото: шеф, петима брокери, един клиент, дванайсет имота
// и един месец примерна активност, за да има какво да показва админ панелът.
// Всичко примерно е маркирано с demo = true и се трие с един бутон от Настройки.

const PASS = { boss: 'shef2026', broker: 'broker2026', client: 'klient2026' };

type BrokerSeed = {
  key: string;
  role: 'boss' | 'broker';
  first: string;
  last: string;
  phone: string;
  title: string;
  quote: string;
  pitch: string;
  bio: string;
  since: number;
  deals: number;
  areas: string[];
  languages: string[];
  facts: [string, string][];
};

const BROKERS: BrokerSeed[] = [
  {
    key: 'krasimir',
    role: 'boss',
    first: 'Красимир',
    last: 'Данев',
    phone: '+359888555010',
    title: 'Управител',
    quote: 'Една агенция струва колкото думата на брокерите си.',
    pitch:
      'Водя агенцията и още работя по сделки сам, главно с офиси и търговски площи. Ако нещо не е наред с обслужването, телефонът ми е този и го вдигам аз.',
    bio:
      'Започнах в имотите, когато пазарът беше замръзнал и почти никой не купуваше. Тогава се научих да работя бавно, да не обещавам и да казвам „не знам, ще проверя“. Този навик остана и в добрите години.\n\nДнес всеки в екипа отговаря за своите райони. Аз още водя сделки, главно с офиси и търговски площи, и държа всеки нов брокер първите шест месеца да ходи на огледи с някой от старите. Ако нещо в работата ни не ви хареса, искам да го чуя лично.',
    since: 2009,
    deals: 302,
    areas: ['Бизнес имоти', 'Център'],
    languages: ['Български', 'Английски', 'Немски'],
    facts: [
      ['17 г.', 'в недвижимите имоти'],
      ['302', 'лични сделки'],
      ['1', 'телефон, който вдигам сам'],
    ],
  },
  {
    key: 'maria',
    role: 'broker',
    first: 'Мария',
    last: 'Колева',
    phone: '+359888555011',
    title: 'Старши брокер, продажби',
    quote: 'Първо говорим за парите, после за квадратите.',
    pitch:
      'Преди имотите осем години работех в ипотечния отдел на банка. Затова при мен първо смятаме колко можеш да си позволиш спокойно и чак тогава тръгваме по огледи.',
    bio:
      'В имотите съм от 2011 г. Преди това осем години бях в ипотечния отдел на банка и още пазя навика да чета договорите до последния ред. Работя основно в Чайка, Бриз и около Морската градина. Знам кои блокове са санирани, кои входове имат проблем с мазетата и къде след шест вечерта няма къде да спрете.\n\nНе обичам да водя хора на десет огледа за един ден. Предпочитам да видим три жилища, които наистина отговарят на това, което сте ми казали. Повече от половината ми клиенти идват по препоръка на предишни и това е числото, с което се гордея.',
    since: 2011,
    deals: 214,
    areas: ['Чайка', 'Бриз', 'Морска градина'],
    languages: ['Български', 'Английски'],
    facts: [
      ['214', 'сделки от 2011 г. насам'],
      ['8 г.', 'в банковото кредитиране'],
      ['3', 'района, които познавам вход по вход'],
    ],
  },
  {
    key: 'ivaylo',
    role: 'broker',
    first: 'Ивайло',
    last: 'Стоянов',
    phone: '+359888555012',
    title: 'Брокер, ново строителство',
    quote: 'Гледам сградата, преди да гледам апартамента.',
    pitch:
      'По образование съм строителен инженер и на оглед първо слизам в мазето и се качвам на покрива. Ако купуваш на зелено, ще ти кажа честно на кой строител бих дал парите си и на кой не.',
    bio:
      'Завършил съм строително инженерство и шест години работих по обекти във Варна и Златни пясъци, преди да мина от другата страна на масата. Затова на оглед първо гледам фугите, покрива и абонатната, а чак после кухнята.\n\nРаботя предимно с ново строителство в Младост, Левски и Виница и с хора, които купуват, за да отдават под наем. Смятам доходността с реалните наеми, а не с тези от обявите. Ако сметката не излиза, го казвам, дори да остана без комисиона.',
    since: 2016,
    deals: 131,
    areas: ['Младост', 'Левски', 'Ново строителство'],
    languages: ['Български', 'Английски'],
    facts: [
      ['131', 'сделки, от които 60 на зелено'],
      ['6 г.', 'на строителни обекти'],
      ['Акт 16', 'проверявам документите преди капарото'],
    ],
  },
  {
    key: 'desislava',
    role: 'broker',
    first: 'Десислава',
    last: 'Маринова',
    phone: '+359888555013',
    title: 'Брокер, наеми',
    quote: 'Добрият наем е този, при който и двете страни спят спокойно.',
    pitch:
      'Занимавам се само с наеми и познавам по име повечето си наемодатели. Кажи ми бюджет и квартал и до ден ще имаш списък с жилища, които наистина са свободни.',
    bio:
      'Дойдох във Варна като студентка и за четири години смених пет квартири. Знам от първо лице какво е хазяин, който не вдига телефона, и депозит, който не се връща. Сега работя само с наеми и се старая тези истории да не се повтарят.\n\nПроверявам всяко жилище лично, преди да го покажа. При нанасяне снимам състоянието и прилагам снимките към договора, за да няма спорове накрая. Говоря английски и руски и често помагам на хора, които се местят във Варна от чужбина.',
    since: 2019,
    deals: 380,
    areas: ['Наеми', 'Чайка', 'Бриз', 'Център'],
    languages: ['Български', 'Английски', 'Руски'],
    facts: [
      ['380', 'подписани договора за наем'],
      ['24 ч.', 'за списък със свободни жилища'],
      ['3', 'езика, на които водя огледи'],
    ],
  },
  {
    key: 'nikolay',
    role: 'broker',
    first: 'Николай',
    last: 'Желев',
    phone: '+359888555014',
    title: 'Старши брокер, къщи и парцели',
    quote: 'Парцелът не е евтин, ако до него няма ток и път.',
    pitch:
      'От петнайсет години продавам къщи и парцели около Варна. Преди да те заведа на място, вече съм проверил скицата, статута на земята и докъде стигат водата и токът.',
    bio:
      'Роден съм във Виница, когато още беше село, и съм гледал как лозята стават квартали. Работя с къщи, парцели и вилни места от Траката до Галата и познавам кадастъра почти наизуст.\n\nПри земята изненадите са скъпи: сервитути, свлачищни зони, пътища, които съществуват само на хартия. Затова не показвам имот, преди да съм минал през общината и кадастъра. Ако търсите място за къща, елате с удобни обувки, обикаляме пеша.',
    since: 2009,
    deals: 176,
    areas: ['Виница', 'Траката', 'Галата'],
    languages: ['Български', 'Руски'],
    facts: [
      ['176', 'сделки с къщи и земя'],
      ['17 г.', 'обикалям терени около Варна'],
      ['0', 'сделки, развалени заради документи'],
    ],
  },
  {
    key: 'teodora',
    role: 'broker',
    first: 'Теодора',
    last: 'Енчева',
    phone: '+359888555015',
    title: 'Брокер, Център и стари сгради',
    quote: 'Старата сграда има характер, но и история, която трябва да се прочете.',
    pitch:
      'По образование съм юрист и работя главно с имоти в Центъра и Гръцката махала. Ако продаваш, ще ти кажа реална цена, а не тази, която искаш да чуеш.',
    bio:
      'Завърших право и пет години работих в нотариална кантора. Оттам ми останаха уважението към документите и търпението за наследствени имоти с по шестима собственици. Работя главно в Центъра и Гръцката махала, където всяка сграда е отделен случай.\n\nС продавачите съм пряма. Гледам какво реално се е продало на същата улица през последната година и казвам цена, на която имотът ще намери купувач за два до три месеца. После каня фотограф, защото първият оглед отдавна става на телефона.',
    since: 2014,
    deals: 158,
    areas: ['Център', 'Гръцка махала'],
    languages: ['Български', 'Английски', 'Френски'],
    facts: [
      ['158', 'сделки в Центъра'],
      ['5 г.', 'в нотариална кантора'],
      ['74 дни', 'средно до продажба на мой имот'],
    ],
  },
];

type PropSeed = {
  key: string;
  ref: string;
  broker: string;
  title: string;
  deal: 'sale' | 'rent';
  kind: string;
  rooms: number | null;
  area: number;
  yard?: number;
  floor?: number;
  floors?: number;
  district: string;
  address: string;
  price: number;
  year?: number;
  construction?: string;
  heating?: string;
  furnishing?: string;
  features: string[];
  teaser: string;
  description: string;
  photos: number;
  featured?: boolean;
  days: number; // преди колко дни е публикуван
};

const PROPS: PropSeed[] = [
  {
    key: 'chayka-tristaen-more',
    ref: 'K1042',
    broker: 'maria',
    title: 'Тристаен с гледка към морето',
    deal: 'sale',
    kind: 'apartment',
    rooms: 3,
    area: 112,
    floor: 7,
    floors: 9,
    district: 'Чайка',
    address: 'кв. Чайка, до Морската градина',
    price: 245000,
    year: 2008,
    construction: 'Тухла',
    heating: 'ТЕЦ и климатици',
    furnishing: 'Обзаведен',
    features: ['Гледка към морето', 'Асансьор', 'Паркомясто в двора', 'Две тераси', 'Климатици във всяка стая', 'Баня с прозорец'],
    teaser: 'Седми етаж, две тераси и морето от дивана.',
    description:
      'Апартаментът е на седмия етаж в тухлена сграда от 2008 г., на пет минути пеша от Морската градина. Дневната гледа на изток и сутрин слънцето влиза чак до кухнята. От голямата тераса се вижда заливът от Почивка до пристанището.\n\nРазпределението е удобно за семейство: дневна с кухня, две отделни спални, баня с прозорец и втора тоалетна. Собствениците го продават с обзавеждането и с паркомясто в двора. Таксата за входа е 25 € на месец и включва асансьора и почистването.\n\nДокументите са изрядни, имотът е без тежести и може да се купи с кредит.',
    photos: 5,
    featured: true,
    days: 6,
  },
  {
    key: 'gratska-dvustaen',
    ref: 'K1038',
    broker: 'teodora',
    title: 'Двустаен в Гръцката махала',
    deal: 'sale',
    kind: 'apartment',
    rooms: 2,
    area: 68,
    floor: 2,
    floors: 4,
    district: 'Гръцка махала',
    address: 'Гръцка махала, до входа на Морската градина',
    price: 168000,
    year: 1936,
    construction: 'Тухла',
    heating: 'Климатици',
    furnishing: 'Обзаведен',
    features: ['Основен ремонт', 'Висок таван', 'Изба', 'Вътрешен двор', 'Газ до сградата'],
    teaser: 'Стара сграда, нов ремонт и две пресечки до морето.',
    description:
      'Вторият етаж на малка сграда от тридесетте години, на тиха улица между Катедралата и входа на Морската градина. Жилището е основно ремонтирано преди две години: нова електрическа инсталация, ВиК, дограма и изолация по вътрешните стени.\n\nДневната е с кухненски бокс и таван от три метра, спалнята гледа към вътрешния двор и е тиха дори през лятото. Банята е с душ кабина и място за пералня. Към апартамента има избено помещение от 6 кв.м.\n\nПодходящ е и за живеене, и за отдаване. Подобни жилища в района се наемат за 650 до 750 € на месец.',
    photos: 4,
    featured: true,
    days: 11,
  },
  {
    key: 'briz-penthaus',
    ref: 'K1051',
    broker: 'maria',
    title: 'Пентхаус с тераса над Бриз',
    deal: 'sale',
    kind: 'apartment',
    rooms: 4,
    area: 186,
    floor: 8,
    floors: 8,
    district: 'Бриз',
    address: 'кв. Бриз, над Морската градина',
    price: 520000,
    year: 2021,
    construction: 'Тухла',
    heating: 'Термопомпа, подово отопление',
    furnishing: 'Обзаведен',
    features: ['Тераса 70 кв.м', 'Два гаража', 'Подово отопление', 'Асансьор до етажа', 'Три бани', 'Склад'],
    teaser: 'Последен етаж, 70 кв.м тераса и гледка от Галата до Златни пясъци.',
    description:
      'Целият последен етаж на сграда с осем апартамента, завършена през 2021 г. Жилището е 186 кв.м, от които 70 кв.м са тераса с дървена настилка, лятна кухня и място за маса за дванайсет души.\n\nВътре има голяма дневна с кухня с остров, три спални, всяка със собствена баня, и кабинет. Отоплението е подово с термопомпа, дограмата е алуминиева с троен стъклопакет. В цената влизат два гаража и склад в сутерена.\n\nИмотът се показва само с предварителна уговорка.',
    photos: 5,
    featured: true,
    days: 3,
  },
  {
    key: 'vinitsa-kashta',
    ref: 'K1027',
    broker: 'nikolay',
    title: 'Къща с двор във Виница',
    deal: 'sale',
    kind: 'house',
    rooms: 5,
    area: 240,
    yard: 620,
    floors: 2,
    district: 'Виница',
    address: 'кв. Виница',
    price: 410000,
    year: 2015,
    construction: 'Тухла',
    heating: 'Газ',
    furnishing: 'По договаряне',
    features: ['Двор 620 кв.м', 'Камина', 'Навес за две коли', 'Кладенец', 'Газ', 'Барбекю'],
    teaser: 'Два етажа, 620 кв.м двор и десет минути до центъра на Варна.',
    description:
      'Къщата е строена през 2015 г. от собствениците за тях самите и това личи по материалите. Два етажа и 240 кв.м: долу са дневната с камина, кухнята, стая за гости и баня, горе са три спални и втора баня.\n\nДворът е 620 кв.м, равен и ограден, с барбекю, навес за две коли и кладенец за поливане. Улицата е асфалтирана, има канализация и газ. До спирката на автобуса е три минути пеша.\n\nПроверил съм скицата и разрешителните, всичко е въведено в експлоатация.',
    photos: 5,
    featured: true,
    days: 19,
  },
  {
    key: 'levski-studio',
    ref: 'K1046',
    broker: 'ivaylo',
    title: 'Едностаен до Техническия университет',
    deal: 'sale',
    kind: 'apartment',
    rooms: 1,
    area: 42,
    floor: 3,
    floors: 6,
    district: 'Левски',
    address: 'кв. Левски, до Техническия университет',
    price: 79000,
    year: 2019,
    construction: 'Тухла',
    heating: 'Климатик',
    furnishing: 'Обзаведен',
    features: ['Акт 16', 'Асансьор', 'Обзаведен', 'Тераса', 'Отдаден под наем'],
    teaser: 'Нова сграда, акт 16 и наемател, ако го искаш с него.',
    description:
      'Компактно жилище от 42 кв.м на третия етаж в сграда от 2019 г. Една стая с кухненски бокс, баня и тераса към вътрешния двор. Продава се обзаведено, както е на снимките.\n\nВ момента е отдадено за 380 € на месец на студент по медицина с договор до юли. Може да се купи с наемателя или свободно след изтичане на договора. Сградата е с контрол на достъпа и асансьор, таксата за входа е 15 € на месец.\n\nМинал съм през общите части и покрива, няма течове и забележки по изпълнението.',
    photos: 3,
    days: 8,
  },
  {
    key: 'centar-chetiristaen',
    ref: 'K1019',
    broker: 'teodora',
    title: 'Четиристаен с високи тавани в Центъра',
    deal: 'sale',
    kind: 'apartment',
    rooms: 4,
    area: 135,
    floor: 3,
    floors: 4,
    district: 'Център',
    address: 'Център, близо до Операта',
    price: 289000,
    year: 1932,
    construction: 'Тухла, гредоред',
    heating: 'Климатици',
    furnishing: 'Необзаведен',
    features: ['Таван 3,40 м', 'Оригинален паркет', 'Южно изложение', 'Два балкона', 'Таванска стая'],
    teaser: 'Таван 3,40 м, оригинален паркет и три стаи на юг.',
    description:
      'Апартаментът заема целия трети етаж на сграда от 1932 г. близо до Операта. Запазени са оригиналният дъбов паркет, двукрилите врати и гипсовите корнизи. Таваните са 3,40 м.\n\nРазпределението е класическо: антре, дневна, трапезария, две спални, кухня и баня. Три от стаите гледат на юг към улицата, кухнята и едната спалня са към двора. Покривът на сградата е сменен през 2022 г., а входът е ремонтиран от съсобствениците.\n\nНуждае се от освежаване на банята и кухнята. Цената е съобразена с това.',
    photos: 5,
    featured: true,
    days: 27,
  },
  {
    key: 'chayka-dvustaen-naem',
    ref: 'K2011',
    broker: 'desislava',
    title: 'Двустаен под наем в Чайка',
    deal: 'rent',
    kind: 'apartment',
    rooms: 2,
    area: 62,
    floor: 4,
    floors: 8,
    district: 'Чайка',
    address: 'кв. Чайка',
    price: 750,
    year: 2012,
    construction: 'Тухла',
    heating: 'Климатици',
    furnishing: 'Обзаведен',
    features: ['Обзаведен', 'Тераса', 'Съдомиялна', 'Интернет', 'Асансьор'],
    teaser: 'Обзаведен, с тераса и на пет минути от плажа.',
    description:
      'Светъл двустаен апартамент от 62 кв.м на четвъртия етаж. Дневна с кухненски бокс, отделна спалня с голям гардероб и тераса с маса за двама. Има пералня, съдомиялна, два климатика и бърз интернет.\n\nНаемът е 750 € на месец. Депозитът е един наем, договорът е за минимум една година. Сметките са средно 90 € на месец през зимата. Домашни любимци се обсъждат със собственика.\n\nСвободен е от първи декември.',
    photos: 4,
    days: 2,
  },
  {
    key: 'briz-tristaen-naem',
    ref: 'K2014',
    broker: 'desislava',
    title: 'Тристаен под наем в Бриз',
    deal: 'rent',
    kind: 'apartment',
    rooms: 3,
    area: 105,
    floor: 2,
    floors: 5,
    district: 'Бриз',
    address: 'кв. Бриз, затворен комплекс',
    price: 1100,
    year: 2023,
    construction: 'Тухла',
    heating: 'Термопомпа',
    furnishing: 'Обзаведен',
    features: ['Затворен комплекс', 'Подземно паркомясто', 'Две бани', 'Тераса', 'Охрана'],
    teaser: 'Нов, обзаведен и с подземно паркомясто.',
    description:
      'Апартамент от 105 кв.м в затворен комплекс с охрана. Дневна с кухня, две спални, две бани и тераса с частична гледка към морето. Обзаведен е изцяло преди година и никой не е живял в него дълго.\n\nНаемът е 1 100 € на месец и включва подземно паркомясто. Депозитът е два наема. Подходящ е за семейство или за фирма, която настанява служител.\n\nПоказвам го всеки ден след 17 часа.',
    photos: 4,
    featured: true,
    days: 5,
  },
  {
    key: 'centar-ofis',
    ref: 'K3004',
    broker: 'krasimir',
    title: 'Офис на бул. Сливница',
    deal: 'rent',
    kind: 'office',
    rooms: null,
    area: 95,
    floor: 2,
    floors: 5,
    district: 'Център',
    address: 'бул. Сливница',
    price: 1400,
    year: 2006,
    construction: 'Монолитна',
    heating: 'Климатизация',
    furnishing: 'Частично обзаведен',
    features: ['Рецепция', 'Асансьор', 'Заседателна зала', 'Климатизация', 'Паркинг'],
    teaser: 'Открито пространство за дванайсет души и заседателна зала.',
    description:
      'Офис от 95 кв.м на втория етаж в административна сграда на бул. Сливница. Едно открито пространство за десет до дванайсет работни места, отделна заседателна зала, кухненски кът и два санитарни възела.\n\nНаемът е 1 400 € на месец без ДДС. Сградата има рецепция, асансьор и платен паркинг отзад. Оптичен интернет е прокаран до помещението.\n\nСвободен е веднага, възможен е договор за три или пет години.',
    photos: 4,
    days: 14,
  },
  {
    key: 'trakata-parcel',
    ref: 'K4009',
    broker: 'nikolay',
    title: 'Парцел с гледка в местност Траката',
    deal: 'sale',
    kind: 'plot',
    rooms: null,
    area: 820,
    district: 'Траката',
    address: 'местност Траката',
    price: 164000,
    features: ['Гледка към морето', 'Ток и вода', 'Лице на асфалт', 'Извън свлачище', 'УПИ'],
    teaser: '820 кв.м, лице на асфалт и морето в далечината.',
    description:
      'Урегулиран поземлен имот от 820 кв.м в горната част на Траката. Теренът е с лек наклон на изток и от него се вижда морето. Лицето към асфалтовия път е 22 метра.\n\nТок и вода има на границата на имота. Градоустройствените показатели позволяват къща до 10 метра височина със застрояване до 30 процента. Имотът не попада в свлачищна зона, проверил съм в регистъра.\n\nСъседите от двете страни вече са построили и живеят целогодишно.',
    photos: 3,
    days: 33,
  },
  {
    key: 'galata-kashta-more',
    ref: 'K1055',
    broker: 'nikolay',
    title: 'Къща над морето в Галата',
    deal: 'sale',
    kind: 'house',
    rooms: 6,
    area: 310,
    yard: 900,
    floors: 3,
    district: 'Галата',
    address: 'кв. Галата, първа линия',
    price: 690000,
    year: 2018,
    construction: 'Тухла',
    heating: 'Термопомпа',
    furnishing: 'Обзаведен',
    features: ['Първа линия', 'Басейн', 'Двор 900 кв.м', 'Гараж', 'Четири спални с бани'],
    teaser: 'Първа линия, 900 кв.м двор и пътека до плажа.',
    description:
      'Къща на три нива с 310 кв.м площ, на първа линия над плажа на Галата. От всяка стая се вижда морето, а от двора тръгва пътека, която слиза до брега за пет минути.\n\nНа първото ниво са дневната, кухнята и голяма веранда. На второто има четири спални с бани. В сутерена са гаражът, котелното и стая за гости. Дворът е 900 кв.м с басейн, поливна система и стари борове.\n\nИмотът се продава обзаведен. Огледи се правят с предварителна уговорка.',
    photos: 5,
    featured: true,
    days: 9,
  },
  {
    key: 'mladost-dvustaen-novo',
    ref: 'K1049',
    broker: 'ivaylo',
    title: 'Двустаен в нова сграда в Младост',
    deal: 'sale',
    kind: 'apartment',
    rooms: 2,
    area: 71,
    floor: 5,
    floors: 9,
    district: 'Младост',
    address: 'кв. Младост, до парка',
    price: 119000,
    year: 2026,
    construction: 'Тухла',
    heating: 'Климатици',
    furnishing: 'Необзаведен',
    features: ['Ново строителство', 'Южно изложение', 'Подземен гараж', 'Асансьор', 'Плащане по схема'],
    teaser: 'Акт 15 е подписан, плащане по схема и строител, когото познавам.',
    description:
      'Апартамент от 71 кв.м на петия етаж в нова жилищна сграда до парк Младост. Дневна с кухня, спалня, баня, тоалетна и тераса на юг. Предава се на шпакловка и замазка, с поставена дограма и входна врата.\n\nСградата е на акт 15, разрешението за ползване се очаква през март. Строителят е завършил четири сгради в квартала и съм влизал във всяка от тях. Възможно е плащане на три вноски.\n\nИма свободни паркоместа в подземния гараж срещу 14 000 €.',
    photos: 4,
    days: 1,
  },
];

const BROKER_SLUG: Record<string, string> = {
  krasimir: 'krasimir-danev',
  maria: 'maria-koleva',
  ivaylo: 'ivaylo-stoyanov',
  desislava: 'desislava-marinova',
  nikolay: 'nikolay-zhelev',
  teodora: 'teodora-encheva',
};

// Детерминиран генератор, за да са примерните данни еднакви при всяко създаване.
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(r: () => number, items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of items) {
    x -= w;
    if (x <= 0) return v;
  }
  return items[items.length - 1][0];
}

async function insertMany(c: SeedClient, table: string, cols: string[], rows: any[][], jsonCols: string[] = []) {
  const size = 80;
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    const params: any[] = [];
    const values = chunk
      .map((row) => {
        const ph = row.map((v, j) => {
          params.push(jsonCols.includes(cols[j]) ? JSON.stringify(v) : v);
          return `$${params.length}${jsonCols.includes(cols[j]) ? '::jsonb' : ''}`;
        });
        return `(${ph.join(',')})`;
      })
      .join(',');
    await c.query(`insert into ${table} (${cols.join(',')}) values ${values}`, params);
  }
}

const FIRST_M = ['Георги', 'Иван', 'Димитър', 'Петър', 'Стефан', 'Александър', 'Мартин', 'Пламен', 'Даниел', 'Христо', 'Борис', 'Виктор'];
const FIRST_F = ['Елена', 'Гергана', 'Ивелина', 'Силвия', 'Надежда', 'Радостина', 'Виктория', 'Петя', 'Антония', 'Галина', 'Яна', 'Милена'];
const LAST = ['Георгиев', 'Иванов', 'Димитров', 'Петров', 'Николов', 'Тодоров', 'Христов', 'Василев', 'Атанасов', 'Костов', 'Илиев', 'Ангелов', 'Радев', 'Симеонов'];

const NOTES = [
  'Искаме да е до добро училище, имаме две деца.',
  'Задължително паркомясто или гараж.',
  'Работя на смени, удобно ми е да говорим след 18 часа.',
  'Без първи и последен етаж.',
  'Имаме куче, търсим нещо с двор или близо до парк.',
  'Вече имам одобрен кредит от банката.',
  'Гледали сме доста обяви, търсим нещо готово за нанасяне.',
  'Важно е да има асансьор, майка ми ще живее с нас.',
  'Купувам за инвестиция, интересува ме доходността от наем.',
  'Може ли оглед в събота сутрин?',
];

export async function seed(c: SeedClient) {
  const r = rng(20261111);

  // Хора
  const ids: Record<string, number> = {};
  const brokerPhone: Record<number, string> = {};
  for (let i = 0; i < BROKERS.length; i++) {
    const b = BROKERS[i];
    const u = await c.query(
      `insert into users (role, first_name, last_name, phone, password_hash) values ($1,$2,$3,$4,$5) returning id`,
      [b.role, b.first, b.last, b.phone, hashPassword(b.role === 'boss' ? PASS.boss : PASS.broker)]
    );
    const id = u.rows[0].id;
    ids[b.key] = id;
    brokerPhone[id] = b.phone;
    await c.query(
      `insert into broker_profiles (user_id, slug, title, photo, quote, pitch, bio, since_year, deals, areas, languages, facts, notify_phone, sort)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13,$14)`,
      [
        id,
        BROKER_SLUG[b.key],
        b.title,
        `/img/brokers/${b.key}.jpg`,
        b.quote,
        b.pitch,
        b.bio,
        b.since,
        b.deals,
        JSON.stringify(b.areas),
        JSON.stringify(b.languages),
        JSON.stringify(b.facts),
        b.phone,
        b.role === 'boss' ? 90 : (i + 1) * 10,
      ]
    );
  }

  const cl = await c.query(
    `insert into users (role, first_name, last_name, phone, password_hash, created_at) values ('client','Петър','Илиев','+359888555099',$1, now() - interval '12 days') returning id`,
    [hashPassword(PASS.client)]
  );
  const clientId = cl.rows[0].id;

  // Имоти
  const propIds: Record<string, number> = {};
  const propBroker: Record<number, number> = {};
  const propDeal: Record<number, string> = {};
  const propPath: Record<number, { offer: string; page: string }> = {};
  for (const p of PROPS) {
    const photos = Array.from({ length: p.photos }, (_, i) => `/img/properties/${p.key}/${i + 1}.jpg`);
    const res = await c.query(
      `insert into properties (slug, ref, title, deal, kind, rooms, area, yard, floor, floors, district, address, price, year_built,
         construction, heating, furnishing, features, teaser, description, photos, broker_id, featured, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19,$20,$21::jsonb,$22,$23,
         now() - ($24 || ' days')::interval, now() - ($24 || ' days')::interval) returning id`,
      [
        p.key, p.ref, p.title, p.deal, p.kind, p.rooms, p.area, p.yard ?? null, p.floor ?? null, p.floors ?? null,
        p.district, p.address, p.price, p.year ?? null, p.construction ?? null, p.heating ?? null, p.furnishing ?? null,
        JSON.stringify(p.features), p.teaser, p.description, JSON.stringify(photos), ids[p.broker], !!p.featured, String(p.days),
      ]
    );
    propIds[p.key] = res.rows[0].id;
    propBroker[res.rows[0].id] = ids[p.broker];
    propDeal[res.rows[0].id] = p.deal;
    propPath[res.rows[0].id] = { offer: `/oferta/${BROKER_SLUG[p.broker]}/${p.key}`, page: `/imoti/${p.key}` };
  }
  const allProps = Object.values(propIds);

  await c.query(`insert into favorites (user_id, property_id) values ($1,$2),($1,$3)`, [
    clientId,
    propIds['chayka-tristaen-more'],
    propIds['briz-penthaus'],
  ]);

  // Примерна активност за последните 30 дни
  const now = Date.now();
  const DAY = 86400000;
  const sources: [string, number][] = [['fb', 38], ['ig', 22], ['direct', 22], ['google', 12], ['viber', 6]];
  const devices: [string, number][] = [['mobile', 72], ['desktop', 28]];
  const popular: [number, number][] = allProps.map((id, i) => [id, [9, 5, 8, 6, 4, 4, 7, 5, 2, 2, 6, 5][i] || 3]);

  function stamp(daysAgo: number): number {
    const hour = pick(r, [[9, 3], [10, 5], [11, 6], [12, 8], [13, 8], [14, 6], [15, 5], [16, 5], [17, 6], [18, 7], [19, 9], [20, 10], [21, 9], [22, 6], [23, 3], [8, 2]] as [number, number][]);
    const base = new Date(now - daysAgo * DAY);
    base.setHours(hour, Math.floor(r() * 60), Math.floor(r() * 60), 0);
    // Нищо примерно не бива да е в бъдещето: ако часът още не е дошъл днес, отива във вчера.
    let t = base.getTime();
    while (t > now - 45 * 60000) t -= DAY;
    return t;
  }

  // Колко често хората се отказват на всяка стъпка.
  const DROP: Record<string, number> = {
    start: 0.27,
    'buy.kind': 0.04, 'buy.rooms': 0.03, 'buy.area': 0.05, 'buy.where': 0.06, 'buy.budget': 0.21, 'buy.when': 0.04, 'buy.pay': 0.07,
    'rent.kind': 0.04, 'rent.rooms': 0.03, 'rent.where': 0.05, 'rent.budget': 0.13, 'rent.furn': 0.03, 'rent.when': 0.03,
    'sell.kind': 0.05, 'sell.where': 0.05, 'sell.area': 0.04, 'sell.price': 0.12, 'sell.when': 0.04,
    'let.kind': 0.05, 'let.where': 0.05, 'let.furn': 0.03, 'let.price': 0.08,
    'ask.what': 0.06, 'ask.when': 0.05,
    note: 0.06,
    summary: 0.2,
    form: 0.38,
  };

  const visitors: any[][] = [];
  const views: any[][] = [];
  const sessions: any[][] = [];
  const events: any[][] = [];
  const leads: any[] = [];

  const N_VISITORS = 640;
  for (let v = 0; v < N_VISITORS; v++) {
    const vid = `dv${String(v).padStart(4, '0')}`;
    const daysAgo = Math.floor(Math.pow(r(), 1.25) * 30);
    const source = pick(r, sources);
    const device = pick(r, devices);
    const t0 = stamp(daysAgo);
    const pid = r() < 0.82 ? pick(r, popular) : null;
    const brokerId = pid ? propBroker[pid] : null;
    visitors.push([vid, new Date(t0).toISOString(), new Date(t0 + 240000).toISOString(), source, source === 'direct' || source === 'google' ? null : brokerId, device, true]);

    // Разгледани страници
    const social = source !== 'direct' && source !== 'google';
    const landing = pid ? (social ? propPath[pid].offer : propPath[pid].page) : '/';
    const pages = 1 + Math.floor(r() * 4);
    let t = t0;
    for (let k = 0; k < pages; k++) {
      const vp = k === 0 ? pid : r() < 0.6 ? pick(r, popular) : null;
      const offer = !!vp && k === 0 && social;
      const path = vp ? (offer ? propPath[vp].offer : propPath[vp].page) : pick(r, [['/', 5], ['/imoti', 3], ['/brokeri', 2]] as [string, number][]);
      const kind = vp ? (offer ? 'offer' : 'property') : path === '/' ? 'home' : 'page';
      views.push([vid, path, kind, vp, vp ? propBroker[vp] : null, source, true, new Date(t).toISOString()]);
      t += 20000 + Math.floor(r() * 90000);
    }

    // Около 45% отварят чата
    if (r() > 0.45) continue;
    const sid = `demo${String(sessions.length).padStart(4, '0')}`;
    const withProp = !!pid;
    const rentProp = pid ? propDeal[pid] === 'rent' : false;
    const intent = withProp
      ? pick(r, rentProp ? ([['ask', 45], ['rent', 40], ['buy', 8], ['let', 7]] as [string, number][]) : ([['ask', 38], ['buy', 40], ['sell', 14], ['rent', 8]] as [string, number][]))
      : pick(r, [['buy', 44], ['rent', 27], ['sell', 20], ['let', 9]] as [string, number][]);

    let ts = t0 + 15000 + Math.floor(r() * 60000);
    const started = ts;
    events.push([sid, 'open', 'start', null, new Date(ts).toISOString()]);
    const answers: Answers = {};
    let stepId = 'start';
    let answered = 0;
    let last = 'start';
    let dropped = false;
    let guard = 0;
    while (stepId !== 'summary' && guard++ < 20) {
      const step = STEP_BY_ID[stepId];
      last = stepId;
      ts += 4000 + Math.floor(r() * (stepId === 'note' ? 30000 : 14000));
      const slow = device === 'mobile' ? 1.15 : 1;
      if (r() < (DROP[stepId] ?? 0.04) * slow) {
        dropped = true;
        break;
      }
      let value: string | string[];
      if (stepId === 'start') value = intent;
      else if (step.type === 'multi') {
        const opts = step.options!.filter((o) => o.v !== 'Няма значение');
        const n = 1 + Math.floor(r() * 2);
        const chosen = new Set<string>();
        for (let i = 0; i < n; i++) chosen.add(opts[Math.floor(r() * opts.length)].v);
        value = [...chosen];
      } else if (step.type === 'text') {
        value = r() < 0.42 ? NOTES[Math.floor(r() * NOTES.length)] : '';
      } else {
        value = step.options![Math.floor(r() * step.options!.length)].v;
      }
      if (value !== '') answers[step.key] = value;
      answered++;
      events.push([sid, value === '' ? 'skip' : 'answer', stepId, Array.isArray(value) ? value.join(', ') : value, new Date(ts).toISOString()]);
      stepId = nextStep(step, value);
    }

    let reachedSummary = false;
    let reachedForm = false;
    let submitted = false;
    if (!dropped) {
      reachedSummary = true;
      last = 'summary';
      ts += 3000;
      events.push([sid, 'summary', 'summary', null, new Date(ts).toISOString()]);
      if (r() >= DROP.summary) {
        reachedForm = true;
        last = 'form';
        ts += 5000 + Math.floor(r() * 9000);
        events.push([sid, 'form', 'form', null, new Date(ts).toISOString()]);
        if (r() >= DROP.form * (device === 'mobile' ? 1.1 : 0.85)) {
          submitted = true;
          ts += 15000 + Math.floor(r() * 30000);
          events.push([sid, 'submit', 'form', null, new Date(ts).toISOString()]);
        }
      }
    }

    let exit: string | null = null;
    if (!submitted && answered > 0 && r() < 0.44) {
      exit = last === 'form'
        ? pick(r, [['phone', 62], ['later', 20], ['browsing', 18]] as [string, number][])
        : pick(r, [['browsing', 42], ['later', 24], ['long', 20], ['phone', 14]] as [string, number][]);
      ts += 2500;
      events.push([sid, 'exit', last, exit, new Date(ts).toISOString()]);
    }

    let leadIdx: number | null = null;
    if (submitted) {
      const female = r() < 0.5;
      const first = (female ? FIRST_F : FIRST_M)[Math.floor(r() * 12)];
      let lastName = LAST[Math.floor(r() * LAST.length)];
      if (female) lastName += 'а';
      const phone = `+35988${String(5550100 + leads.length).padStart(7, '0')}`;
      const age = (now - ts) / DAY;
      const status = age < 1.5 ? 'new' : pick(r, [['contacted', 36], ['viewing', 26], ['deal', 9], ['lost', 15], ['new', 14]] as [string, number][]);
      leadIdx = leads.length;
      leads.push({
        sid, vid, brokerId, first, lastName, phone, intent, answers: { ...answers },
        note: typeof answers.note === 'string' ? answers.note : null,
        pid, source, status, at: new Date(ts).toISOString(), page: landing,
      });
    }

    sessions.push([
      sid, vid, brokerId, pid, source, landing, device,
      new Date(started).toISOString(), new Date(ts).toISOString(),
      answered > 0 ? intent : null, last, answered, answers, reachedSummary, reachedForm, submitted, exit, true,
    ]);
    void leadIdx;
  }

  await insertMany(c, 'visitors', ['id', 'first_seen', 'last_seen', 'source', 'ref_broker_id', 'device', 'demo'], visitors);
  await insertMany(c, 'page_views', ['visitor_id', 'path', 'kind', 'property_id', 'broker_id', 'source', 'demo', 'created_at'], views);
  await insertMany(
    c,
    'chat_sessions',
    ['id', 'visitor_id', 'broker_id', 'property_id', 'source', 'page', 'device', 'started_at', 'updated_at', 'intent', 'last_step', 'answered', 'answers', 'reached_summary', 'reached_form', 'submitted', 'exit_reason', 'demo'],
    sessions,
    ['answers']
  );
  await insertMany(c, 'chat_events', ['session_id', 'type', 'step', 'value', 'created_at'], events);

  const bossId = ids['krasimir'];
  for (const l of leads) {
    const s = summarize(l.answers);
    const res = await c.query(
      `insert into leads (broker_id, visitor_id, first_name, last_name, phone, intent, summary, answers, note, property_id, source, page, status, chat_session_id, demo, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,true,$15,$15) returning id`,
      [l.brokerId, l.vid, l.first, l.lastName, l.phone, l.intent, s.text, JSON.stringify(l.answers), l.note, l.pid, l.source, l.page, l.status, l.sid, l.at]
    );
    const leadId = res.rows[0].id;
    await c.query(`update chat_sessions set lead_id = $1 where id = $2`, [leadId, l.sid]);
    await c.query(
      `insert into notifications (lead_id, broker_id, channel, recipient, body, status, demo, created_at) values ($1,$2,'viber',$3,$4,'simulated',true,$5)`,
      [
        leadId,
        l.brokerId || bossId,
        brokerPhone[l.brokerId || bossId] || '',
        `Ново запитване от сайта\n\nКлиент: ${l.first} ${l.lastName}\nТелефон: ${phoneText(l.phone)}\n\n${s.title}\n${s.lines.map(([a, b]) => `${a}: ${b}`).join('\n')}`,
        l.at,
      ]
    );
    if (l.status !== 'new') {
      await c.query(`insert into lead_notes (lead_id, user_id, kind, body, created_at) values ($1,$2,'status',$3,$4)`, [
        leadId,
        l.brokerId || bossId,
        { contacted: 'Говорихме по телефона, ще пратя подбор.', viewing: 'Уговорен оглед.', deal: 'Подписан предварителен договор.', lost: 'Отказа се, намерил е друго.' }[l.status as string] || '',
        new Date(new Date(l.at).getTime() + 5 * 3600000).toISOString(),
      ]);
    }
  }

  // Клиентът от демото има едно запитване и история на разглеждане.
  const mariaId = ids['maria'];
  const cpid = propIds['chayka-tristaen-more'];
  const canswers: Answers = { intent: 'ask', what: 'Иска оглед', when: 'През уикенда', note: 'Може ли оглед в събота сутрин?' };
  await c.query(
    `insert into leads (broker_id, client_id, first_name, last_name, phone, intent, summary, answers, note, property_id, source, page, status, demo, created_at, updated_at)
     values ($1,$2,'Петър','Илиев','+359888555099','ask',$3,$4::jsonb,$5,$6,'fb',$7,'viewing',true, now() - interval '3 days', now() - interval '2 days')`,
    [mariaId, clientId, summarize(canswers).text, JSON.stringify(canswers), canswers.note, cpid, propPath[cpid].offer]
  );
  for (const [key, d] of [['chayka-tristaen-more', 3], ['briz-penthaus', 3], ['gratska-dvustaen', 2], ['chayka-tristaen-more', 1]] as [string, number][]) {
    await c.query(
      `insert into page_views (visitor_id, user_id, path, kind, property_id, broker_id, source, demo, created_at)
       values ('dvclient',$1,$5,'property',$2,$3,'fb',true, now() - ($4 || ' days')::interval)`,
      [clientId, propIds[key], propBroker[propIds[key]], String(d), propPath[propIds[key]].page]
    );
  }

  // Една неизползвана покана, за да се вижда как изглежда.
  await c.query(
    `insert into invites (code, created_by, note, expires_at) values ('VARNA7', $1, 'За новия колега от декември', now() + interval '6 days')`,
    [bossId]
  );
}

export const DEMO_ACCOUNTS = {
  boss: { phone: '0888 555 010', password: PASS.boss },
  broker: { phone: '0888 555 011', password: PASS.broker },
  client: { phone: '0888 555 099', password: PASS.client },
};
