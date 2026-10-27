'use strict';
// Тексты сайта v2 из файла 122 (docs/plans_2026-10-16/122_RESI_texts_main_site_v2_2026-10-27.md репозитория RESI) → _build/texts.json.
//   node _build/extract-texts.js <путь к файлу 122> --write     записать texts.json
//   node _build/extract-texts.js <путь к файлу 122> --verify    texts.json совпадает с файлом
// Берутся только таблицы «ключ | текст» разделов 1–8, 12 и 13.1 и пункты разделов 7.1 и 7.2 (terms.page.*, privacy.page.*).
// Тексты не меняются: снимаются только служебные пометки в ячейке ключа и пояснения в скобках, которые файл помечает как пометки.
// Папка _build на сайт не попадает (GitHub Pages / Jekyll не публикует папки с «_» в начале имени).

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const OUT = path.join(__dirname, 'texts.json');

/** Пометки редакций внутри текста («**[ред. 15]**», «**[ред. 15; изменено, ред. 16]**») — не текст сайта. */
const unmark = (s) => s.replace(/ ?\*\*\[(?:новое, )?ред\. [^\]]*\]\*\*/g, '');

function extract(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const rev = String(Math.max(...[...md.matchAll(/\*\*Редакция (\d+) \(/g)].map((m) => Number(m[1]))));
  const T = {};
  const notes = [];
  let section = '';
  const set = (k, v, why) => { T[k] = v; if (why) notes.push(`${k}: ${why}`); };

  // 1) таблицы «ключ | текст»
  for (const line of lines) {
    const h = /^(#{2,3}) (\d+(?:\.\d+)?)\./.exec(line);
    if (h) section = h[2];
    if (!line.startsWith('| `')) continue;
    const top = section.split('.')[0];
    const ok = ['1', '2', '3', '5', '6', '7', '8', '12'].includes(top) || section === '13.1';
    if (!ok) continue;
    const cells = line.split(' | ').map((c) => c.replace(/^\| ?/, '').replace(/ ?\|$/, ''));
    const key = /^`([a-z0-9_.]+)`/i.exec(cells[0]);
    if (!key) continue;
    const k = key[1];
    const mark = cells[0];
    if (/НЕ ИСПОЛЬЗУЕТСЯ|не используется|ОТЛОЖЕНО|служебное/.test(mark)) continue;
    if (/запасной вариант/.test(mark)) continue;
    if (section === '8') { set(k, cells[1]); if (cells[2] && cells[2] !== '—') set(`${k}.en`, cells[2]); continue; }
    if (section === '1.2' && cells.length > 2) continue; // три входа — не используются в v2
    let v = unmark(cells[1]);
    if (/основной вариант/.test(mark)) notes.push(`${k}: основной вариант (ред. 11, решение автора)`);
    else if (k === 'home.about_text' && T[k]) continue; // основной вариант ред. 11 уже взят — прежняя строка ред. 6 его не заменяет
    set(k, v);
  }
  // ссылки «как `ключ`» и пометки
  for (const [k, v] of Object.entries(T)) {
    const ref = /^как `([a-z0-9_.]+)`$/.exec(v);
    if (ref) set(k, T[ref[1]], `= ${ref[1]}`);
    if (/^совпадает с/.test(v)) delete T[k];
  }
  // пометки в скобках, которые файл даёт как пояснение, а не как текст
  T['form.consent'] = T['form.consent'].replace(/ \(обязательная отметка:[^)]*\)$/, '');
  T['form.consent_version'] = T['form.consent_version'].replace(/ \(сохраняется[^)]*\)$/, '');
  T['form.terms_link'] = T['form.terms_link'].replace(/ — строка под кнопкой «Отправить заявку»$/, '');
  T['seo.home.schema.provider'] = T['seo.home.schema.provider'].replace(/ \(только имя, другого текста нет\)$/, '');
  T['home.review.enabled'] = T['home.review.enabled'].startsWith('false') ? 'false' : T['home.review.enabled'];

  // 2) пункты страниц условий (7.1) и политики (7.2)
  const block = (from, to) => md.slice(md.indexOf(from) + from.length, md.indexOf(to)).replace(/\r\n/g, '\n').trim();
  const pages = { terms: block('### 7.1. Условия оказания услуг (страница)', '### 7.2.'), privacy: block('### 7.2. Политика обработки персональных данных (страница)', '### 7.3.') };
  const titles = { terms: 'Условия оказания услуг', privacy: 'Политика обработки персональных данных' };
  for (const [p, text] of Object.entries(pages)) {
    const parts = unmark(text).split(/\n\n(?=\*\*\d+\. )/);
    set(`${p}.page.title`, titles[p]);
    // до пункта 1: строка даты и (в условиях, ред. 15) абзац «Публичная оферта» — ключ terms.page.offer
    const [date, ...lead] = parts[0].split('\n\n');
    set(`${p}.page.date`, date.trim());
    if (lead.length) { if (p !== 'terms' || lead.length !== 1 || !lead[0].startsWith('**Публичная оферта.**')) throw new Error(`${p}: неожиданный текст до п. 1`); set('terms.page.offer', lead[0].trim()); }
    parts.slice(1).forEach((part, i) => set(`${p}.page.${i + 1}`, part.trim()));
  }
  return { rev, texts: T, notes };
}

if (require.main === module) {
  const src = process.argv[2];
  if (!src || !fs.existsSync(src)) { console.error('✗ укажите путь к файлу 122'); process.exit(1); }
  const md = fs.readFileSync(src, 'utf8');
  const { rev, texts, notes } = extract(md);
  const out = JSON.stringify({ _source: path.basename(src), _revision: rev, _sha256: crypto.createHash('sha256').update(md).digest('hex'), ...texts }, null, 1) + '\n';
  if (process.argv.includes('--write')) { fs.writeFileSync(OUT, out); console.log(`✓ _build/texts.json: ${Object.keys(texts).length} ключей, редакция ${rev}`); notes.forEach((n) => console.log(`  · ${n}`)); }
  else if (process.argv.includes('--verify')) {
    const same = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === out;
    console.log(same ? `✓ _build/texts.json совпадает с файлом 122 (редакция ${rev})` : '✗ _build/texts.json не совпадает с файлом 122'); if (!same) process.exitCode = 1;
  } else { console.log(out); }
}

module.exports = { extract };
