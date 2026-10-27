'use strict';
// Сборка главного сайта v2 (unblock-english.ru): тексты — только из _build/texts.json (файл 122, раздел 14 «страница → ключи»),
// раскладка и отступы — по макету автора (site-v2-mockup/Main.dc.html, Session.dc.html), стили — assets/core.css + assets/v2.css.
//   node _build/build.js --write [--date ДД.ММ.ГГГГ] [--live]     собрать страницы
//   node _build/build.js --verify [--date ДД.ММ.ГГГГ] [--live]    страницы совпадают со сборкой
// --live — CONTACT_ENDPOINT_LIVE = true: форма отправляет заявку на сервер. Без флага форма показывает почту и срок ответа.
// Дата редакции условий и политики — --date (по умолчанию сегодня). Старые страницы (assessment.html, after-platforms.html,
// /book/, /workbook) сборка не трогает; session.html — заглушка с переходом на /session/.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const T = JSON.parse(fs.readFileSync(path.join(__dirname, 'texts.json'), 'utf8'));
const SITE = 'https://unblock-english.ru';
const METRIKA = 106913295;
const CONTACT_ENDPOINT = 'https://resi.unblock-english.ru/api/contact';
const OG_IMAGE = { url: `${SITE}/images/og-v2.png`, width: 1200, height: 630 };
const PHOTO = { src: '/images/profile-v2.jpg', width: 240, height: 300 };
const GOALS = { resi: 'home_to_resi', session: 'home_to_session', form: 'contact_form_sent' };
// Вебвизор Метрики (запись действий на странице) выключен намеренно на всех страницах — до решения по тексту политики
// (решение автора 27.10.2026). Карта кликов, trackLinks, accurateTrackBounce и цели остаются.
const METRIKA_WEBVISOR = false;
// шрифты сайта (те же, что на текущих страницах); font-display: swap, таблица стилей шрифтов не блокирует отрисовку
const FONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&amp;family=EB+Garamond:wght@500;600&amp;display=swap';

// ---------- тексты ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function t(k) {
  if (!(k in T) || typeof T[k] !== 'string' || !T[k]) throw new Error(`нет ключа ${k} в _build/texts.json`);
  // ссылки в тексте ключа — markdown «[текст](/адрес)»; других квадратных скобок в текстах быть не должно
  if (/\[|\]/.test(T[k].replace(MD_LINK, ''))) throw new Error(`${k}: квадратные скобки в тексте`);
  return T[k];
}
const MD_LINK = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;
/** Текст ключа в HTML: **жирный** → <strong>; остальное экранируется. */
const rich = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
const h = (k) => rich(t(k));
/** То же, плюс ссылки «[текст](/адрес)» из ключа (только адреса этого сайта). */
const md = (k) => rich(t(k)).replace(MD_LINK, '<a href="$2">$1</a>');
const items = (k) => t(k).split(' / ').map((x) => x.trim());
/** «Текст → адрес» — подпись ссылки до адреса включая стрелку. */
const linkLabel = (k) => { const m = /^(.*→)/.exec(t(k)); if (!m) throw new Error(`${k}: нет «→»`); return esc(m[1].trim()); };
/** Ссылка на часть текста ключа: фраза должна встретиться ровно один раз. */
function linkPart(k, phrase, href, attrs = '') {
  const s = h(k); const p = esc(phrase);
  if (s.split(p).length !== 2) throw new Error(`${k}: фраза «${phrase}» должна встретиться один раз`);
  return s.replace(p, `<a href="${href}"${attrs}>${p}</a>`);
}
const goal = (g) => ` onclick="if(window.ym)ym(${METRIKA},'reachGoal','${g}')"`;

// ---------- общие части ----------
function head({ seo, url, extraHead = '' }) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(t(`seo.${seo}.title`))}</title>
<meta name="description" content="${esc(t(`seo.${seo}.description`))}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<meta property="og:title" content="${esc(t(`seo.${seo}.og.title`))}">
<meta property="og:description" content="${esc(t(`seo.${seo}.og.description`))}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${OG_IMAGE.url}">
<meta property="og:image:width" content="${OG_IMAGE.width}">
<meta property="og:image:height" content="${OG_IMAGE.height}">
<link rel="icon" href="/favicon.ico" type="image/x-icon">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="${FONTS}" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="${FONTS}"></noscript>
<link rel="stylesheet" href="/assets/core.css">
<link rel="stylesheet" href="/assets/v2.css">
${extraHead}<script>
(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');
ym(${METRIKA},'init',{ssr:true,webvisor:${METRIKA_WEBVISOR},clickmap:true,referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});
</script>
</head>
<body class="v2">
`;
}

/** Шапка: одна на всех страницах (nav.*). На главной «Как проходит работа» и «Инструменты» — якоря блоков. */
function header(page) {
  const home = page === 'home';
  const brand = home ? `<div class="logo">${h('nav.brand')}</div>` : `<a class="logo" href="/">${h('nav.brand')}</a>`;
  const cur = (p) => (p === page ? ' aria-current="page"' : '');
  const howHref = page === 'how' ? '/how-it-works/' : home ? '#rhythm' : '/#rhythm';
  return `<header class="container navbar">
  ${brand}
  <nav class="nav">
    <a href="${howHref}"${cur('how')}>${h('nav.how')}</a><a href="/session/"${cur('session')}${home ? goal(GOALS.session) : ''}>${h('nav.session')}</a><a href="${home ? '#tools' : '/#tools'}">${h('nav.tools')}</a>
  </nav>
</header>
`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="container">
    <div class="footer-name">${h('footer.brand')}</div>
    <p class="footer-line">${h('terms.seller')}</p>
    <a class="footer-small" href="/terms/">${esc(t('terms.offer').split(' → ')[0])}</a>
    <a class="footer-small" href="/privacy/">${esc(t('terms.privacy').split(' → ')[0])}</a>
  </div>
</footer>
` + cookieNote();
}

/**
 * Уведомление о cookie (файл 122, раздел 8.1) на всех страницах v2. Только уведомление: Метрика работает сразу,
 * не дожидаясь «Понятно». Плашка у нижнего края окна, страницу не блокирует; пока она видна, у страницы нижний отступ
 * на её высоту и scroll-padding (поле формы в фокусе не уходит под плашку). «Понятно» запоминается в localStorage
 * в try/catch: если хранилище недоступно, плашка показывается при каждой загрузке. Своих cookie сайт не ставит.
 */
function cookieNote() {
  return `<div class="cookie-note" id="cookie-note" role="region" aria-label="Уведомление о cookie" hidden>
  <p>${h('cookie.text')} ${md('cookie.link')}</p>
  <button type="button" class="cookie-ok" id="cookie-ok">${h('cookie.button')}</button>
</div>
<script>
(function () {
  var KEY = 'ue_cookie_note', n = document.getElementById('cookie-note'), de = document.documentElement, seen = false;
  try { seen = localStorage.getItem(KEY) === '1'; } catch (e) { /* хранилище недоступно — показываем */ }
  if (seen || !n) return;
  n.hidden = false;
  function pad() { var h = n.offsetHeight; document.body.style.paddingBottom = h + 'px'; de.style.scrollPaddingBottom = h + 'px'; }
  pad(); window.addEventListener('resize', pad);
  document.getElementById('cookie-ok').addEventListener('click', function () {
    n.hidden = true; document.body.style.paddingBottom = ''; de.style.scrollPaddingBottom = ''; window.removeEventListener('resize', pad);
    try { localStorage.setItem(KEY, '1'); } catch (e) { /* не запомнится — плашка появится при следующей загрузке */ }
  });
})();
</script>
`;
}

const ul = (k) => `<ul class="dash">\n${items(k).map((x) => `      <li>${rich(x)}</li>`).join('\n')}\n    </ul>`;
const section = (body, { id = '', cls = '' } = {}) => `<section${id ? ` id="${id}"` : ''}${cls ? ` class="${cls}"` : ''}>
  <div class="container">
    ${body}
  </div>
</section>
`;
const jsonld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>\n`;
const PERSON = { '@type': 'Person', name: t('seo.home.schema.provider') };

// ---------- главная ----------
function home() {
  const ld = jsonld({ '@context': 'https://schema.org', '@graph': [
    { ...PERSON, '@id': `${SITE}/#person`, url: `${SITE}/` },
    { '@type': 'Service', '@id': `${SITE}/#service`, url: `${SITE}/`, description: t('seo.home.schema.service'),
      audience: { '@type': 'Audience', audienceType: t('seo.home.schema.audience') }, provider: { '@id': `${SITE}/#person` } },
  ] });
  const card = (name, price, text, extra, link, href, attrs = '') => `<div class="card">
        <h3>${h(name)}</h3>
        <p class="card-price">${h(price)}</p>
        <p class="card-text">${h(text)}</p>${extra ? `\n        <p class="card-text">${h(extra)}</p>` : ''}
        <a class="more" href="${href}"${attrs}>${linkLabel(link)}</a>
      </div>`;
  const rhythm = ['home.rhythm.step1', 'home.rhythm.step2', 'home.rhythm.ai', 'home.rhythm.step4', 'home.rhythm.step5', 'home.rhythm.step6']
    .map((k) => `      <li${k === 'home.rhythm.step5' ? ' class="event"' : ''}>${h(k)}</li>`).join('\n');
  return head({ seo: 'home', url: `${SITE}/`, extraHead: ld }) + header('home') + `<main>
<section class="hero-v2">
  <div class="container narrow">
    <p class="kicker">${h('home.kicker')}</p>
    <h1>${h('home.h1')}</h1>
    <p>${h('home.lead')}</p>
    <p>${h('home.hero.result')}</p>
    <p class="muted">${h('home.hero.normal')}</p>
    <div class="actions">
      <a class="cta cta-primary" href="/session/"${goal(GOALS.session)}>${h('home.hero.cta')}</a>
      <a class="soft" href="#tools">${h('home.hero.alt_link')}</a>
    </div>
    <p class="note">${h('home.hero.note')}</p>
  </div>
</section>

` + section(`<h2>${h('home.rhythm.title')}</h2>
    <ul class="dash">
${rhythm}
    </ul>
    <p class="muted after-list">${h('home.rhythm.nodate')}</p>
    <p class="statement">${h('home.rhythm.close')}</p>`, { id: 'rhythm' }) + `
` + section(`<h2>${h('home.about_title')}</h2>
    <div class="about">
      <img class="photo" src="${PHOTO.src}" width="${PHOTO.width}" height="${PHOTO.height}" alt="${esc(t('home.about_title'))}" loading="lazy" decoding="async">
      <div class="about-text">
        <p>${h('home.about_text')}</p>
        <a class="more" href="/how-it-works/">${linkLabel('home.about_link')}</a>
      </div>
    </div>`) + `
` + section(`<h2>${h('products.title')}</h2>
    <p class="muted lead-cards">${h('products.lead')}</p>
    <div class="cards">
      ${card('products.journal_name', 'products.journal_price', 'products.journal_text', '', 'products.journal_link', 'https://journal.unblock-english.ru/')}
      ${card('products.resi_name', 'products.resi_price', 'products.resi_text', 'tools.resi.ai', 'products.resi_link', 'https://resi.unblock-english.ru/', goal(GOALS.resi))}
      ${card('products.book_name', 'products.book_price', 'products.book_text', '', 'products.book_link', '/book/')}
    </div>
    <p class="after-cards">${linkPart('home.tools.choose', 'записаться на первую сессию', '/session/', goal(GOALS.session))}</p>`, { id: 'tools' }) + `
` + section(`<h2>${h('home.notfit_title')}</h2>
    ${ul('home.notfit_items')}
    <p class="after-list">${h('home.notfit_close')}</p>
    <p>${h('home.fit.scope')}</p>`) + `
` + section(`<div class="cols">
      <div class="col">
        <h2>${h('home.apply.title')}</h2>
        <p>${h('home.apply.text')}</p>
        <a class="cta cta-primary" href="/session/#form"${goal(GOALS.session)}>${h('home.apply.button')}</a>
      </div>
      <div class="col">
        <h2>${h('home.contacts_title')}</h2>
        <p class="tight">${contactEmail()}</p>
        <p class="tight">${contactTelegram()}</p>
        <p class="muted">${h('contacts.reply')}</p>
      </div>
    </div>`, { id: 'contacts' }) + `</main>
` + footer() + `</body>
</html>
`;
}
const contactEmail = () => linkPart('contacts.email', 'unblock-english@yandex.ru', 'mailto:unblock-english@yandex.ru');
const contactTelegram = () => linkPart('contacts.telegram', '@unblock_eng', 'https://t.me/unblock_eng');

// ---------- /session/ ----------
function sessionPage({ live, consentVersion }) {
  const ld = jsonld({ '@context': 'https://schema.org', '@type': 'Service', url: `${SITE}/session/`, name: t('session.h1'),
    description: t('seo.session.description'), provider: PERSON,
    offers: { '@type': 'Offer', price: '4000', priceCurrency: 'RUB', url: `${SITE}/session/` } });
  const flow = items('session.flow_items').map((x) => x.replace(/^\d+\.\s*/, ''));
  const card = (title, text, link) => `<div class="card">
        <h3>${h(title)}</h3>
        <p class="card-text">${h(text)}</p>${link ? `\n        <a class="more" href="/how-it-works/">${linkLabel(link)}</a>` : ''}
      </div>`;
  const consent = md('form.consent');
  if (!consent.includes('<a href="/privacy/">')) throw new Error('form.consent: нет ссылки на /privacy/');
  if (!md('form.terms_link').includes('<a href="/terms/">')) throw new Error('form.terms_link: нет ссылки на /terms/');
  return head({ seo: 'session', url: `${SITE}/session/`, extraHead: ld }) + header('session') + `<main>
<section class="hero-v2 hero-session">
  <div class="container narrow">
    <h1>${h('session.h1')}</h1>
    <p>${h('session.lead')}</p>
    <p class="price">${h('session.price')}</p>
    <p class="muted">${h('session.where')}</p>
    <p>${h('session.top_note')}</p>
    <a class="cta cta-primary" href="#form">${h('session.top_cta')}</a>
  </div>
</section>

` + section(`<h2>${h('session.bring_title')}</h2>
    ${ul('session.bring_items')}
    <p class="muted after-list">${h('session.bring.ai')}</p>`) + `
` + section(`<h2>${h('session.flow_title')}</h2>
    <ol class="num">
${flow.map((x) => `      <li>${rich(x)}</li>`).join('\n')}
    </ol>`) + `
` + section(`<h2>${h('session.result_title')}</h2>
    ${ul('session.result_items')}`) + `
` + section(`<div class="cards four">
      ${card('session.book_title', 'session.book_text')}
      ${card('session.pay_title', 'session.pay_text')}
      ${card('session.refund_title', 'session.refund_text')}
      ${card('session.next_title', 'session.next_text', 'session.next_link')}
    </div>`) + `
<section id="form">
  <div class="container">
    <form id="contact-form" class="v2-form" novalidate>
      <div>
        <h2>${h('form.title')}</h2>
        <p class="muted form-lead">${h('form.lead')}</p>
      </div>
      <div class="field">
        <label for="f-email">${h('form.email_label')}</label>
        <input class="fld" id="f-email" name="email" type="email" autocomplete="email" inputmode="email" required aria-describedby="f-email-hint f-email-err">
        <span class="hint" id="f-email-hint">${h('form.email_hint')}</span>
        <span class="err" id="f-email-err" hidden>${h('form.error_email')}</span>
      </div>
      <div class="field">
        <label for="f-name">${h('form.name_label')}</label>
        <input class="fld" id="f-name" name="name" type="text" autocomplete="nickname" maxlength="100" aria-describedby="f-name-hint">
        <span class="hint" id="f-name-hint">${h('form.name_hint')}</span>
      </div>
      <div class="field">
        <label for="f-situation">${h('form.situation_label')}</label>
        <span class="hint above" id="f-situation-hint">${h('form.situation_hint')}</span>
        <textarea class="fld" id="f-situation" name="situation" rows="4" maxlength="1000" aria-describedby="f-situation-hint f-situation-note"></textarea>
        <span class="hint" id="f-situation-note">${h('form.situation_note')}</span>
      </div>
      <div class="hp" aria-hidden="true"><input type="text" id="f-website" name="website" tabindex="-1" autocomplete="off"></div>
      <div class="field">
        <div class="check">
          <input type="checkbox" id="f-consent" name="consent" required aria-describedby="f-consent-err">
          <label for="f-consent">${consent}</label>
        </div>
        <span class="err" id="f-consent-err" hidden>${h('form.error_consent')}</span>
      </div>
      <div class="field">
        <button type="submit" class="cta cta-primary">${h('form.submit')}</button>
        <p class="terms-link">${md('form.terms_link')}</p>
        <p class="err form-err" id="f-form-err" role="alert" hidden></p>
      </div>
    </form>
    <div id="contact-done" class="v2-done" hidden tabindex="-1">
      <h2>${h('form.success_title')}</h2>
      <p>${esc(t('form.success')).replace('{email}', '<span id="contact-done-email"></span>')}</p>
    </div>
    <div id="contact-offline" class="v2-done" hidden tabindex="-1">
      <p class="tight">${contactEmail()}</p>
      <p class="muted">${h('contacts.reply')}</p>
    </div>
  </div>
</section>
</main>
` + footer() + formScript({ live, consentVersion }) + `</body>
</html>
`;
}

/** Форма: проверка полей, отправка JSON. Данные заявки не попадают в адрес страницы, хранилище браузера и Метрику. */
function formScript({ live, consentVersion }) {
  return `<script>
(function () {
  var CONTACT_ENDPOINT_LIVE = ${live ? 'true' : 'false'};
  var ENDPOINT = '${CONTACT_ENDPOINT}';
  var CONSENT_VERSION = '${consentVersion}';
  var MSG = { rate: ${JSON.stringify(t('form.error_rate'))}, server: ${JSON.stringify(t('form.error_server'))} };
  var f = document.getElementById('contact-form'); if (!f) return;
  var email = f.elements.email, consent = f.elements.consent;
  var errEmail = document.getElementById('f-email-err'), errConsent = document.getElementById('f-consent-err'), errForm = document.getElementById('f-form-err');
  var btn = f.querySelector('button[type=submit]'); var busy = false;
  function show(el, input, on) { el.hidden = !on; if (input) { if (on) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); } }
  function emailOk() { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email.value.trim()); }
  function swap(id) { f.hidden = true; var b = document.getElementById(id); b.hidden = false; b.focus(); }
  email.addEventListener('input', function () { if (!errEmail.hidden && emailOk()) show(errEmail, email, false); });
  consent.addEventListener('change', function () { if (consent.checked) show(errConsent, consent, false); });
  f.addEventListener('submit', function (e) {
    e.preventDefault(); if (busy) return;
    errForm.hidden = true;
    var okE = emailOk(), okC = consent.checked;
    show(errEmail, email, !okE); show(errConsent, consent, !okC);
    if (!okE) { email.focus(); return; } if (!okC) { consent.focus(); return; }
    if (!CONTACT_ENDPOINT_LIVE) { swap('contact-offline'); return; }
    busy = true; btn.setAttribute('aria-busy', 'true');
    var body = JSON.stringify({ email: email.value.trim(), name: f.elements.name.value.trim(), situation: f.elements.situation.value.trim(),
      consent: true, consent_version: CONSENT_VERSION, website: f.elements.website.value });
    fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then(function (r) {
        if (r.ok) { document.getElementById('contact-done-email').textContent = email.value.trim(); swap('contact-done'); if (window.ym) ym(${METRIKA}, 'reachGoal', '${GOALS.form}'); return; }
        errForm.textContent = r.status === 429 ? MSG.rate : MSG.server; errForm.hidden = false;
      })
      .catch(function () { errForm.textContent = MSG.server; errForm.hidden = false; })
      .then(function () { busy = false; btn.removeAttribute('aria-busy'); });
  });
})();
</script>
`;
}

// ---------- /how-it-works/ ----------
function howPage() {
  const proto = t('work.protocol_line');
  const m = /^(.*?) (О протоколе →) protocol\.unblock-english\.ru$/.exec(proto);
  if (!m) throw new Error('work.protocol_line: другой вид строки');
  return head({ seo: 'how', url: `${SITE}/how-it-works/` }) + header('how') + `<main>
<section class="hero-v2 hero-session">
  <div class="container narrow">
    <h1>${h('work.h1')}</h1>
    <p>${h('work.lead')}</p>
  </div>
</section>

` + section(`<h2>${h('work.session_title')}</h2>
    ${ul('work.session_items')}`) + `
` + section(`<h2>${h('work.track_title')}</h2>
    ${ul('work.track_items')}
    <p class="muted after-list">${h('work.track_note')}</p>`) + `
` + section(`<h2>${h('how.ai.title')}</h2>
    <p>${h('how.ai.text')}</p>
    <h3>${h('how.ai.rules_title')}</h3>
    ${ul('how.ai.rules')}
    <p class="statement">${h('how.ai.privacy')}</p>`) + `
` + section(`<h2>${h('work.out_title')}</h2>
    ${ul('work.out_items')}`) + `
` + section(`<h2>${h('work.length_title')}</h2>
    <p>${h('work.length_text')}</p>
    <p class="statement">${h('work.price_next')}</p>
    <p>${rich(m[1])} <a href="https://protocol.unblock-english.ru/">${esc(m[2])}</a></p>
    <a class="cta cta-primary" href="/session/">${h('work.cta')}</a>`) + `</main>
` + footer() + `</body>
</html>
`;
}

// ---------- /terms/, /privacy/ ----------
function legalBlock(md) {
  const parts = md.split('\n\n');
  return parts.map((p) => {
    if (p.startsWith('|')) {
      const rows = p.split('\n').filter((l) => !/^\|---/.test(l)).map((l) => l.replace(/^\| ?| ?\|$/g, '').split(' | '));
      const [head, ...body] = rows;
      return `<div class="table-wrap"><table>
      <thead><tr>${head.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>
${body.map((r) => `        <tr>${r.map((c, i) => `<td data-label="${esc(head[i])}">${esc(c)}</td>`).join('')}</tr>`).join('\n')}
      </tbody>
    </table></div>`;
    }
    return `<p>${rich(p)}</p>`;
  }).join('\n    ');
}
function legalPage(p, seo, url, date) {
  const body = [];
  for (let i = 1; T[`${p}.page.${i}`]; i++) body.push(legalBlock(t(`${p}.page.${i}`)));
  return head({ seo, url }) + header(p) + `<main>
<section class="hero-v2 hero-session legal">
  <div class="container narrow">
    <h1>${h(`${p}.page.title`)}</h1>
    <p class="muted">${esc(t(`${p}.page.date`).replace('[ДАТА РЕДАКЦИИ]', date))}</p>
${T[`${p}.page.offer`] ? `    <p>${h(`${p}.page.offer`)}</p>\n` : ''}    ${body.join('\n    ')}
  </div>
</section>
</main>
` + footer() + `</body>
</html>
`;
}

// ---------- 404 ----------
function notFound() {
  return head({ seo: '404', url: `${SITE}/404.html` }) + header('404') + `<main>
<section class="hero-v2 hero-session">
  <div class="container narrow">
    <h1>${h('404.title')}</h1>
    <p>${h('404.text')}</p>
    <ul class="dash">
      <li><a href="/">${h('404.home')}</a></li>
      <li><a href="/book/">${h('404.book')}</a></li>
      <li><a href="https://resi.unblock-english.ru/">${h('404.resi')}</a></li>
    </ul>
    <div lang="en" class="en">
      <p><strong>${h('404.title.en')}</strong></p>
      <p>${h('404.text.en')} <a href="/">${h('404.home.en')}</a></p>
    </div>
  </div>
</section>
</main>
` + footer() + `</body>
</html>
`;
}

// ---------- session.html: заглушка ----------
function sessionStub() {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(t('seo.session.title'))}</title>
<meta name="description" content="${esc(t('seo.session.description'))}">
<link rel="canonical" href="${SITE}/session/">
<meta http-equiv="refresh" content="0; url=/session/">
<link rel="stylesheet" href="/assets/core.css">
</head>
<body>
<div class="container"><p><a href="/session/">${h('nav.session')}</a></p></div>
</body>
</html>
`;
}

// ---------- sitemap, robots ----------
function sitemap(isoDate) {
  const urls = [['/', isoDate, '1.00'], ['/session/', isoDate, '0.90'], ['/how-it-works/', isoDate, '0.80'], ['/book/', '2026-10-26', '0.80'],
    ['/assessment.html', '2026-02-19', '0.60'], ['/after-platforms.html', '2026-02-19', '0.50'], ['/terms/', isoDate, '0.30'], ['/privacy/', isoDate, '0.30']];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, d, p]) => `  <url>\n    <loc>${SITE}${u}</loc>\n    <lastmod>${d}</lastmod>\n    <priority>${p}</priority>\n  </url>`).join('\n')}
</urlset>
`;
}
const robots = () => `User-agent: *
Allow: /
Disallow: /404.html

Sitemap: ${SITE}/sitemap.xml
`;

/** Версия текста согласия — ключ form.consent_version (сохраняется с заявкой). */
function consentVersion() {
  const v = t('form.consent_version');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error(`form.consent_version: ${v}`);
  return v;
}

function build({ date, live }) {
  const [dd, mm, yyyy] = date.split('.');
  const iso = `${yyyy}-${mm}-${dd}`;
  return {
    'index.html': home(),
    'session/index.html': sessionPage({ live, consentVersion: consentVersion() }),
    'how-it-works/index.html': howPage(),
    'terms/index.html': legalPage('terms', 'terms', `${SITE}/terms/`, date),
    'privacy/index.html': legalPage('privacy', 'privacy', `${SITE}/privacy/`, date),
    '404.html': notFound(),
    'session.html': sessionStub(),
    'sitemap.xml': sitemap(iso),
    'robots.txt': robots(),
  };
}

if (require.main === module) {
  const i = process.argv.indexOf('--date');
  const now = new Date();
  const date = i > 0 ? process.argv[i + 1] : `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(date)) { console.error('✗ --date ДД.ММ.ГГГГ'); process.exit(1); }
  const live = process.argv.includes('--live');
  try {
    const files = build({ date, live });
    if (process.argv.includes('--write')) {
      for (const [p, c] of Object.entries(files)) { const f = path.join(ROOT, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c); }
      console.log(`✓ собрано (тексты: файл 122, редакция ${T._revision}; дата редакции ${date}; CONTACT_ENDPOINT_LIVE=${live}): ${Object.keys(files).join(', ')}`);
    } else if (process.argv.includes('--verify')) {
      const bad = Object.entries(files).filter(([p, c]) => { const f = path.join(ROOT, p); return !fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== c; }).map(([p]) => p);
      if (bad.length) { console.error(`✗ не совпадает со сборкой: ${bad.join(', ')}`); process.exitCode = 1; } else console.log('✓ страницы совпадают со сборкой');
    }
  } catch (e) { console.error(`✗ ${e.message}`); process.exitCode = 1; }
}

module.exports = { build };
