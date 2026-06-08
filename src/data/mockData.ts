import { ActivityKey, BeerReply, IconName, LunchRestaurant, MemoryItem, NewsItem } from '../types';

export const activityMeta: Record<ActivityKey, { title: string; accent: string; action: string; icon: IconName }> = {
  obed: { title: 'Oběd', accent: '#0F766E', action: 'Dáme oběd?', icon: 'silverware-fork-knife' },
  pivo: { title: 'Pivo', accent: '#B45309', action: 'Dáme pivo?', icon: 'glass-mug-variant' },
  kolo: { title: 'Kolo', accent: '#2563EB', action: 'Dáme kolo?', icon: 'bike' },
};

export const navItems: Array<{ key: ActivityKey; label: string; icon: IconName }> = [
  { key: 'obed', label: 'Oběd', icon: 'silverware-fork-knife' },
  { key: 'pivo', label: 'Pivo', icon: 'glass-mug-variant' },
  { key: 'kolo', label: 'Kolo', icon: 'bike' },
];

export const lunchRestaurants: LunchRestaurant[] = [
  {
    name: 'Radegastovna Pirát',
    delivery: true,
    items: [
      { name: '0,33l Moravská cibulačka s trhaným uzeným masem, bramborem a chlebovými krutony', price: '85 Kč' },
      { no: '1.', name: '350g Tortilla Caesar s grilovaným kuřecím masem, pancettou, římským salátem, sýrem Grand Biraghi, rajčaty a Caesar dressingem, hranolky, dip dle výběru', price: '295 Kč' },
      { no: '2.', name: '200g Grilovaná vepřová panenka plněná anglickou slaninou, smetanová omáčka se sýrem Pecorino, smažené krokety, čerstvý baby špenát', price: '295 Kč' },
      { no: '3.', name: '250g Telecí rumpsteak', price: '339 Kč' },
    ],
  },
  {
    name: 'Adélka',
    delivery: false,
    items: [
      { name: 'Dršťková polévka s petrželkou', price: '65 Kč' },
      { name: 'Kuřecí vývar, maso, zelenina, nudle', price: '65 Kč' },
      { no: '1.', name: 'Kančí výpečky na černém pivu a česneku, dušená kapusta, restované bramborové šišky s petrželkou', price: '219 Kč' },
      { no: '2.', name: 'Steak z tuňáka v sezamové marinádě, zeleninový salát s citrusovými segmenty, mikrobylinky', price: '295 Kč' },
      { no: '3.', name: 'Bún Chả, grilovaný marinovaný asijský vepřový bůček, restované rýžové nudle s julienne zeleninou, koriandr, sezam, smažená cibulka', price: '259 Kč' },
      { no: '4.', name: 'Wagyu rump steak, pepřová nebo houbová omáčka, pečené brambory s bylinkami, listový salát', price: '499 Kč' },
      { no: '5.', name: 'Citronový koláč s jahodami', price: '75 Kč' },
    ],
  },
  {
    name: 'U Maxíka',
    delivery: true,
    items: [{ name: 'Dle denní nabídky' }],
  },
  { name: 'Restaurace Sport Drnovice', delivery: false, items: [{ no: '1.', name: 'Víkendové menu' }] },
  { name: 'Hotel Allvet', delivery: false, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'Chalupa U Městské brány', delivery: true, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'Pohoda Luleč', delivery: true, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'Cafe Moya', delivery: true, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'Finestra Restaurant', delivery: true, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'Resto Rugby', delivery: true, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'Hospůdka U Nádraží', delivery: false, message: 'Restaurace má tento den zavřeno.', items: [] },
  { name: 'Kojál', delivery: false, message: 'Restaurace má tento den zavřeno.', items: [] },
  { name: 'Bowling Pub', delivery: true, message: 'Restaurace má tento den zavřeno.', items: [] },
  { name: 'Gastrocentrum', delivery: true, message: 'Restaurace má tento den zavřeno.', items: [] },
  { name: 'Cafe & You', delivery: false, message: 'Restaurace má tento den zavřeno.', items: [] },
  { name: 'Restaurace Sokolovna', delivery: false, message: 'Restaurace má tento den zavřeno.', items: [] },
  { name: 'Restaurace Kuchyňa', delivery: true, message: 'Restaurace má tento den zavřeno.', items: [] },
  { name: 'Campos Catering', delivery: false, message: 'Restaurace má tento den zavřeno.', items: [] },
  {
    name: 'Restaurace na Městečku',
    delivery: true,
    items: [
      { name: 'Hovězí vývar s nudlemi', price: '' },
      { no: '1.', name: '150g Pečené králičí stehno na smetaně, domácí houskový knedlík', price: '209 Kč' },
      { no: '2.', name: '150g Vepřový stroganoff, hranolky', price: '189 Kč' },
    ],
  },
  {
    name: 'Restaurace Letiště u Kopinců',
    delivery: false,
    items: [
      { name: 'Hovězí vývar' },
      { no: '1.', name: 'Moravský vrabec, zelí, knedlík', price: '189 Kč' },
      { no: '2.', name: 'Kuřecí kung-pao, jasmínová rýže', price: '189 Kč' },
      { no: '3.', name: 'Smažený kuřecí řízek, bramborový salát', price: '219 Kč' },
      { no: '4.', name: 'Katův šleh, domácí bramboráčky', price: '219 Kč' },
      { no: '5.', name: 'Panenka s houbovou omáčkou, bramborové dolárky', price: '239 Kč' },
      { no: '6.', name: 'Panenka na grilu, bramborové dolárky, tatarka', price: '239 Kč' },
      { no: '7.', name: 'Smažený sýr, hranolky, tatarka', price: '199 Kč' },
      { no: '8.', name: 'Dětský smažený sýr, hranolky, kečup', price: '139 Kč' },
      { no: '9.', name: 'Dětský smažený kuřecí řízeček, hranolky, kečup', price: '139 Kč' },
    ],
  },
  {
    name: 'Hotel Dukla',
    delivery: false,
    items: [
      { name: 'Domácí vývar s masem a nudlemi' },
      { no: '1.', name: '150g Pljeskavica, hranolky, ajvar', price: '184 Kč' },
      { no: '2.', name: '200g Marinovaná krkovička na grilu, šťouchané brambory, zelný salát s koprem', price: '210 Kč' },
      { no: '3.', name: '200g Smažený vepřový řízek, vařené brambory, sterilovaný okurek', price: '185 Kč' },
    ],
  },
  { name: 'zeměznás', delivery: false, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'Hotel Selský dvůr', delivery: true, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'BERNARD BAR Sedmička', delivery: true, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'Statek Olšany', delivery: false, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'Arena', delivery: true, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'Vosíme Vyškov', delivery: true, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
  { name: 'FRULI cafeteria', delivery: true, message: 'Pro tento den nebylo zadáno polední menu.', items: [] },
];

export const memories: MemoryItem[] = [
  {
    title: 'Páteční legenda',
    meta: 'Pivo · včera · 3 fotky',
    text: 'Tomáš konečně dorazil včas a nikdo mu to nevěřil.',
  },
  {
    title: 'Oběd u Radnice',
    meta: 'Oběd · dnes · hlasování skončilo',
    text: 'Vyhrála svíčková. Pavel tvrdí, že to bylo demokratické.',
  },
  {
    title: 'Krátké kolo po práci',
    meta: 'Kolo · sobota · 27 km',
    text: 'Vítr proti nám, nálada pořád dobrá.',
  },
];

export const news: NewsItem[] = [
  {
    title: 'Vyškovsko dnes',
    summary:
      'AI shrne místní článek z Vyškovského deníku do jedné věty a nabídne rychlou akci pro partu.',
    tag: 'Zprávy',
  },
  {
    title: 'Kam vyrazit o víkendu',
    summary:
      'Události v okolí půjdou uložit jako plán: výlet, pivo po akci nebo položka do kroniky.',
    tag: 'Akce',
  },
];

export const beerReplies: BeerReply[] = [
  { name: 'Marek', status: 'Jde', arrival: '19:00' },
  { name: 'Tomáš', status: 'Jde', arrival: 'za 30 min' },
  { name: 'Pavel', status: 'Možná', arrival: '' },
];
