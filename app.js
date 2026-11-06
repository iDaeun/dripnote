import * as db from './db.js';
import { FLAVOR_TREE, flavorOf, canonicalFlavor, inkOn, noteMatched } from './flavors.js';

// 맛이 아니라 추출 상태에 가까운 느낌. 맛은 플레이버 휠(flavors.js)로 고른다.
const TASTE_TAGS = ['산미 강함', '쓴맛', '떫다', '묽다', '진하다'];
const PROCESSES = ['워시드', '내추럴', '허니', '기타'];
const ROASTS = ['라이트', '미디엄', '다크'];
const RATIOS = [14, 15, 16, 17];
const MAX_PHOTOS = 5;

const ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/></svg>',
  starFill: '<svg class="filled" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="filled" d="M9 7l8 5-8 5z"/></svg>',
  bean: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="6.5" ry="9" transform="rotate(30 12 12)"/><path d="M9 4.5c3 3 3 12 6 15"/></svg>',
  cup: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h11v5a5 5 0 01-5 5h-1a5 5 0 01-5-5z"/><path d="M16 10.5h1.5a2.5 2.5 0 010 5H15.5M8.5 3.5v2.5M12 3.5v2.5"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18.5h10.5a4 4 0 00.6-8 6 6 0 00-11.6 1.5A3.3 3.3 0 007 18.5z"/><path d="M12 11v5M9.8 13.2L12 11l2.2 2.2"/></svg>',
  note: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8.5h5M9 12.5h7M9 16h5"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19h3l10-10-3-3L5 16z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15V6a1 1 0 011-1h9"/></svg>',
};

const app = document.getElementById('app');
// 레시피 화면에서 고른 원두. 화면 사이에서만 유지하고 저장하지 않는다.
const session = { beanId: '' };
let renderToken = 0;
let objectUrls = [];

// ---------- 공용 도구 ----------

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const nowIso = () => new Date().toISOString();
const go = hash => { location.hash = hash; };
const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const round1 = n => Math.round(n * 10) / 10;
const total = stages => (stages || []).reduce((sum, s) => sum + num(s.water), 0);
const totalSec = stages => (stages || []).reduce((sum, s) => sum + num(s.sec), 0);
const fmtTime = sec => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
const fmtCum = (water, sec) => `${fmtTime(sec)} / ${round1(water)}g`;
const ratioText = (beanG, water) => (beanG > 0 && water > 0 ? `1:${round1(water / beanG)}` : '-');
const byId = list => Object.fromEntries(list.map(x => [x.id, x]));
const byNewest = (a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '');
const byRecipe = (a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || (b.updatedAt || '').localeCompare(a.updatedAt || '');

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const dayDiff = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 864e5);
const fmtDate = s => { const [, m, d] = s.split('-').map(Number); return `${m}월 ${d}일`; };
const shortDate = s => { const [, m, d] = s.split('-').map(Number); return `${m}/${d}`; };

function objUrl(blob) {
  const url = URL.createObjectURL(blob);
  objectUrls.push(url);
  return url;
}

async function photoUrl(id) {
  const p = await db.get('photos', id);
  return p ? objUrl(p.blob) : '';
}

function host(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function youtubeId(url) {
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : '';
}

function roastDays(bean, date) {
  if (!bean?.roastDate) return null;
  const d = dayDiff(bean.roastDate, date);
  return d >= 0 ? d : null;
}

// 원두별 사용량: 남은 양 계산에 쓴다.
function usageByBean(brews) {
  const map = {};
  for (const b of [...brews].sort(byNewest)) {
    if (!b.beanId) continue;
    const u = map[b.beanId] || (map[b.beanId] = { used: 0, lastG: num(b.beanG), count: 0 });
    u.used += num(b.beanG);
    u.count += 1;
  }
  return map;
}

function remaining(bean, usage) {
  if (!num(bean.purchasedG)) return null;
  const u = usage[bean.id] || { used: 0, lastG: 0 };
  const left = Math.max(0, round1(num(bean.purchasedG) - u.used));
  const per = u.lastG || 15;
  return { left, total: num(bean.purchasedG), times: Math.floor(left / per), ratio: left / num(bean.purchasedG) };
}

// 사진은 긴 변 1600px JPEG로 줄여서 저장한다.
async function resizeImage(file, max = 1600) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('사진을 읽지 못했어요.'));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  } finally {
    URL.revokeObjectURL(url);
  }
}

function showPhoto(url) {
  const el = document.createElement('div');
  el.className = 'viewer';
  el.innerHTML = `<img src="${url}" alt=""><button class="icon-btn" aria-label="닫기">${ICON.x}</button>`;
  el.addEventListener('click', () => el.remove());
  document.body.append(el);
}

// ---------- 공용 조각 ----------

// 탭 첫 화면 오른쪽 위에는 백업 버튼을 둔다.
function bar(title, { back = '', right = '' } = {}) {
  if (!back) return `<header class="bar root"><h1>${title}</h1><div class="bar-right">${right}<a class="icon-btn" href="#/backup" aria-label="백업">${ICON.cloud}</a></div></header>`;
  return `<header class="bar"><a class="icon-btn" href="${back}" aria-label="뒤로">${ICON.back}</a><h1>${title}</h1><div class="bar-right">${right}</div></header>`;
}

const thumbHtml = url => (url ? `<img class="thumb" src="${url}" alt="">` : `<div class="thumb ph">${ICON.bean}</div>`);

function starsHtml(rating) {
  return `<span class="stars" role="img" aria-label="별점 ${rating}점"><span class="s-bg">★★★★★</span><span class="s-fg" style="width:${(rating / 5) * 100}%">★★★★★</span></span>`;
}

// 플레이버 휠에 있는 맛은 휠 색으로, 없는 말은 기본 칩으로 보여준다.
function flavorChip(name, { removable = false, matched = false } = {}) {
  const f = flavorOf(name);
  const style = f ? ` style="background:${f.color};color:${inkOn(f.color)}"` : '';
  return `<span class="fchip${f ? '' : ' plain'}"${style}>${esc(name)}${matched ? ' ✓' : ''}${removable ? `<button type="button" data-unpick="${esc(name)}" aria-label="${esc(name)} 빼기">×</button>` : ''}</span>`;
}

// 고른 맛들의 색을 한 줄 띠로 이어 붙인다.
function colorBand(names) {
  const colors = names.map(n => flavorOf(n)?.color).filter(Boolean);
  return colors.length ? `<div class="band" aria-hidden="true">${colors.map(c => `<i style="background:${c}"></i>`).join('')}</div>` : '';
}

function beanCardHtml(bean, date, thumb, asLink) {
  if (!bean) return '<div class="bean-card empty">원두를 고르지 않았어요</div>';
  const days = roastDays(bean, date);
  const meta = [bean.roastery, bean.process, bean.roast].filter(Boolean).join(' · ');
  const body = `${thumbHtml(thumb)}<div class="item-main"><div class="item-title">${esc(bean.name)}</div>${meta ? `<div class="sub">${esc(meta)}</div>` : ''}${days !== null ? `<div class="accent-text">로스팅 후 ${days}일째</div>` : ''}</div>`;
  return asLink ? `<a class="bean-card" href="#/bean/${bean.id}">${body}${ICON.chev}</a>` : `<div class="bean-card">${body}</div>`;
}

function stagesTable(stages) {
  let cum = 0, cumSec = 0;
  return `<div class="stage-table"><div class="st-row head"><span>차수</span><span>초 / 물</span><span>누적</span></div>${stages.map((s, i) => {
    cum += num(s.water);
    cumSec += num(s.sec);
    return `<div class="st-row"><span>${i + 1}차${s.label ? ` <small>${esc(s.label)}</small>` : ''}${s.memo ? `<em>${esc(s.memo)}</em>` : ''}</span><span>${num(s.sec) ? `${num(s.sec)}초` : '-'}<em>${round1(num(s.water))} g</em></span><strong>${fmtCum(cum, cumSec)}</strong></div>`;
  }).join('')}</div>`;
}

const recipeMemoLine = r => (r.memo ? `<div class="sub memo-line">${esc(r.memo)}</div>` : '');
const recipeSummary = r => `${num(r.beanG)}g · ${round1(total(r.stages))}g · ${ratioText(num(r.beanG), total(r.stages))} · ${r.stages.length}차${totalSec(r.stages) ? ` · ${fmtTime(totalSec(r.stages))}` : ''}`;

function notFound(back) {
  return { html: `${bar('찾을 수 없어요', { back })}<main class="page"><p class="empty">삭제됐거나 없는 항목이에요.</p></main>` };
}

// 목표 물량에 맞춰 차수별 물량을 비례 조정한다. 반올림 차이는 마지막 차수가 받는다.
function rescaleTo(recipe, target) {
  target = Math.round(target);
  const stages = recipe.stages;
  if (!target || !stages.length) return;
  const current = total(stages);
  if (current > 0) {
    let acc = 0;
    stages.forEach((s, i) => {
      if (i === stages.length - 1) s.water = Math.max(0, target - acc);
      else { s.water = Math.round((num(s.water) * target) / current); acc += s.water; }
    });
    return;
  }
  // 물량이 비어 있으면 뜸들이기(원두의 2배) 후 나머지를 똑같이 나눈다.
  if (stages.length === 1) { stages[0].water = target; return; }
  const bloom = Math.min(Math.round(num(recipe.beanG) * 2), target);
  stages[0].water = bloom;
  const rest = target - bloom;
  let acc = 0;
  for (let i = 1; i < stages.length; i++) {
    const w = i === stages.length - 1 ? rest - acc : Math.round(rest / (stages.length - 1));
    stages[i].water = w;
    acc += w;
  }
}

function newRecipe() {
  const t = nowIso();
  return {
    id: uid(),
    name: '새 레시피',
    beanG: 15,
    stages: [
      { water: 30, sec: 30, memo: '', label: '뜸들이기' },
      { water: 70, sec: 30, memo: '', label: '' },
      { water: 60, sec: 30, memo: '', label: '' },
      { water: 65, sec: 60, memo: '', label: '' },
    ],
    links: [],
    favorite: false,
    createdAt: t,
    updatedAt: t,
  };
}

// ---------- 맛·사진 입력 (기록과 카페 기록이 같이 쓴다) ----------

const flavorField = label => `<div class="field"><span>${label}</span><div id="fpicked"></div><div class="fpicker" id="fpicker"></div></div>`;

// 플레이버 휠을 한 단계씩 내려가며 고른다. 고른 맛은 item.flavors에 담긴다.
function bindFlavorPicker(item) {
  let flavorPath = [];
  const renderFlavors = () => {
    $('#fpicked').innerHTML = item.flavors.length
      ? `${colorBand(item.flavors)}<div class="pills wrap">${item.flavors.map(n => flavorChip(n, { removable: true })).join('')}</div>`
      : '<p class="sub">아래에서 느낀 맛을 골라요. 큰 분류만 골라도 돼요.</p>';
    const current = flavorPath.at(-1);
    const options = current ? current.children : FLAVOR_TREE;
    $('#fpicker').innerHTML = `
      <div class="fcrumbs"><button type="button" data-crumb="-1">전체</button>${flavorPath.map((n, i) => ` › <button type="button" data-crumb="${i}">${esc(n.name)}</button>`).join('')}</div>
      <div class="fopts">
        ${current ? `<button type="button" class="fopt group ${item.flavors.includes(current.name) ? 'on' : ''}" style="--c:${current.color}" data-pick="${esc(current.name)}"><i></i>${esc(current.name)} (으)로 고르기</button>` : ''}
        ${options.map(n => `<button type="button" class="fopt ${item.flavors.includes(n.name) ? 'on' : ''}" style="--c:${n.color}" data-node="${esc(n.name)}"><i></i>${esc(n.name)}<small>${esc(n.en)}</small>${n.children.length ? ' ›' : ''}</button>`).join('')}
      </div>`;
  };
  const togglePick = name => {
    item.flavors = item.flavors.includes(name) ? item.flavors.filter(x => x !== name) : [...item.flavors, name];
    renderFlavors();
  };
  renderFlavors();

  $('#fpicked').addEventListener('click', e => {
    const btn = e.target.closest('[data-unpick]');
    if (btn) togglePick(btn.dataset.unpick);
  });
  $('#fpicker').addEventListener('click', e => {
    const crumb = e.target.closest('[data-crumb]');
    if (crumb) { flavorPath = flavorPath.slice(0, +crumb.dataset.crumb + 1); return renderFlavors(); }
    const pick = e.target.closest('[data-pick]');
    if (pick) return togglePick(pick.dataset.pick);
    const opt = e.target.closest('[data-node]');
    if (!opt) return;
    const node = flavorOf(opt.dataset.node);
    if (node.children.length) { flavorPath = node.path.map(flavorOf); renderFlavors(); }
    else togglePick(node.name);
  });
}

const photoField = () => `<div class="field"><span>사진 (최대 ${MAX_PHOTOS}장, 첫 장이 대표)</span><div class="photos" id="photos"></div><input type="file" id="file" accept="image/*" multiple hidden></div>
      <p class="err" id="err" hidden></p>`;

// 별을 탭한 위치로 0.5점 단위 별점을 고른다. 같은 점수를 다시 누르면 지운다.
function bindRating(item) {
  const render = () => {
    $('#rating').innerHTML = `${starsHtml(item.rating)}<span class="rating-num">${item.rating ? item.rating.toFixed(1) : '탭해서 선택'}</span>`;
  };
  render();
  $('#rating').addEventListener('click', e => {
    const stars = e.target.closest('.stars');
    if (!stars) return;
    const rect = stars.getBoundingClientRect();
    const value = Math.min(5, Math.max(0.5, Math.ceil(((e.clientX - rect.left) / rect.width) * 10) / 2));
    item.rating = value === item.rating ? 0 : value;
    render();
  });
}

async function loadPhotos(ids) {
  return (await Promise.all((ids || []).map(async pid => {
    const p = await db.get('photos', pid);
    return p ? { id: pid, blob: p.blob, url: objUrl(p.blob), isNew: false } : null;
  }))).filter(Boolean);
}

// photos는 화면에 보이는 사진, removed는 지운 기존 사진. 저장은 savePhotos가 한다.
function bindPhotoEditor(photos, removed) {
  const renderPhotos = () => {
    $('#photos').innerHTML = photos.map((p, i) => `<div class="ph-item">
      <img src="${p.url}" alt="">
      <button type="button" class="ph-del" data-del="${i}" aria-label="사진 삭제">${ICON.x}</button>
      ${i === 0 ? '<span class="ph-badge">대표</span>' : `<button type="button" class="ph-badge ghost" data-first="${i}">대표로</button>`}
    </div>`).join('') + (photos.length < MAX_PHOTOS ? `<button type="button" class="ph-add" id="phAdd" aria-label="사진 추가">${ICON.camera}</button>` : '');
  };
  renderPhotos();

  $('#photos').addEventListener('click', e => {
    if (e.target.closest('#phAdd')) return $('#file').click();
    const del = e.target.closest('[data-del]');
    if (del) {
      const [p] = photos.splice(+del.dataset.del, 1);
      if (!p.isNew) removed.push(p);
      return renderPhotos();
    }
    const first = e.target.closest('[data-first]');
    if (first) {
      const [p] = photos.splice(+first.dataset.first, 1);
      photos.unshift(p);
      return renderPhotos();
    }
    const img = e.target.closest('img');
    if (img) showPhoto(img.src);
  });
  $('#file').addEventListener('change', async e => {
    const files = [...e.target.files].slice(0, MAX_PHOTOS - photos.length);
    e.target.value = '';
    const err = $('#err');
    err.hidden = true;
    if (files.length) $('#photos').insertAdjacentHTML('beforeend', '<span class="sub">사진 처리 중…</span>');
    for (const f of files) {
      try {
        const blob = await resizeImage(f);
        photos.push({ id: uid(), blob, url: objUrl(blob), isNew: true });
      } catch (ex) {
        err.textContent = ex.message;
        err.hidden = false;
      }
    }
    renderPhotos();
  });
}

async function savePhotos(photos, removed, owner) {
  for (const p of photos) if (p.isNew) await db.put('photos', { id: p.id, blob: p.blob, owner });
  for (const p of removed) await db.del('photos', p.id);
  return photos.map(p => p.id);
}

// ---------- 기록 탭 ----------

async function viewRecords() {
  const [brews, beans] = await Promise.all([db.all('brews'), db.all('beans')]);
  const beanMap = byId(beans);
  brews.sort(byNewest);
  const items = await Promise.all(brews.map(async b => {
    const bean = beanMap[b.beanId];
    const thumb = b.photoIds?.[0] ? await photoUrl(b.photoIds[0]) : '';
    const search = [bean?.name, bean?.roastery, b.recipeName, b.memo, ...(b.tags || []), ...(b.flavors || [])].join(' ').toLowerCase();
    return `<a class="item" href="#/brew/${b.id}" data-search="${esc(search)}" data-fav="${b.favorite ? 1 : 0}" data-rating="${b.rating || 0}">
      ${thumbHtml(thumb)}
      <div class="item-main">
        <div class="item-title">${esc(bean?.name || '원두 미지정')}${b.favorite ? `<span class="fav">${ICON.starFill}</span>` : ''}</div>
        <div class="sub">${shortDate(b.date)} · ${num(b.beanG)}g ${ratioText(num(b.beanG), total(b.stages))} · ${b.rating ? `${b.rating.toFixed(1)}점` : '별점 없음'}</div>
        ${colorBand(b.flavors || [])}
      </div></a>`;
  }));

  const body = brews.length
    ? `<div class="toolbar"><input type="search" id="q" placeholder="원두, 로스터리, 메모 검색" aria-label="기록 검색"></div>
       <div class="pills" id="filters"><button class="pill on" data-f="all">전체</button><button class="pill" data-f="fav">즐겨찾기</button><button class="pill" data-f="4">4점 이상</button></div>
       <div class="list" id="list">${items.join('')}</div>
       <p class="empty" id="none" hidden>조건에 맞는 기록이 없어요.</p>`
    : `<div class="empty-state"><p>첫 기록을 남겨보세요</p><p class="sub">레시피를 고르고, 그 레시피를 보면서 내린 뒤 감상을 남겨요.</p><a class="btn primary" href="#/pick-recipe">새 기록 시작</a></div>`;

  const last = lastBackup();
  const remind = brews.length && (!last || dayDiff(last.slice(0, 10), today()) >= BACKUP_REMIND_DAYS)
    ? `<a class="notice" href="#/backup">${ICON.cloud}<span>${last ? `마지막 백업이 ${dayDiff(last.slice(0, 10), today())}일 전이에요.` : '아직 백업한 적이 없어요.'} iCloud Drive에 백업해두세요 ›</span></a>`
    : '';
  return {
    html: `${bar('기록')}<main class="page">${remind}${body}</main><a class="fab" href="#/pick-recipe" aria-label="새 기록">${ICON.plus}</a>`,
    bind() {
      if (!brews.length) return;
      let filter = 'all';
      const apply = () => {
        const term = $('#q').value.trim().toLowerCase();
        let shown = 0;
        $$('#list .item').forEach(el => {
          const ok = (!term || el.dataset.search.includes(term))
            && (filter !== 'fav' || el.dataset.fav === '1')
            && (filter !== '4' || num(el.dataset.rating) >= 4);
          el.hidden = !ok;
          if (ok) shown++;
        });
        $('#none').hidden = shown > 0;
      };
      $('#q').addEventListener('input', apply);
      $('#filters').addEventListener('click', e => {
        const btn = e.target.closest('[data-f]');
        if (!btn) return;
        filter = btn.dataset.f;
        $$('#filters .pill').forEach(p => p.classList.toggle('on', p === btn));
        apply();
      });
    },
  };
}

async function viewPickRecipe() {
  const recipes = (await db.all('recipes')).sort(byRecipe);
  const list = recipes.map(r => `<a class="item" href="#/recipe/${r.id}?via=pick"><div class="item-main"><div class="item-title">${esc(r.name)}${r.favorite ? `<span class="fav">${ICON.starFill}</span>` : ''}</div><div class="sub">${recipeSummary(r)}</div>${recipeMemoLine(r)}</div>${ICON.chev}</a>`).join('');
  return {
    html: `${bar('어떤 레시피로 내릴까요?', { back: '#/records' })}<main class="page">
      <a class="item new" href="#/recipe/new?via=pick">${ICON.plus}<span>새 레시피로 시작</span></a>
      ${recipes.length ? `<h2 class="sec-title">내 레시피</h2><div class="list">${list}</div>` : ''}
    </main>`,
  };
}

async function viewBrewForm({ name, id, q }) {
  const editing = name === 'brew-edit';
  const beans = (await db.all('beans')).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  let b;
  if (editing) {
    b = await db.get('brews', id);
    if (!b) return notFound('#/records');
    b = structuredClone(b);
  } else {
    const recipe = await db.get('recipes', q.get('recipe'));
    const recent = (await db.all('brews')).sort(byNewest)[0];
    b = {
      id: uid(),
      date: today(),
      beanId: q.get('bean') || '',
      recipeId: recipe?.id || '',
      recipeName: recipe?.name || '',
      beanG: num(recipe?.beanG),
      stages: (recipe?.stages || []).map(s => ({ water: num(s.water), sec: num(s.sec), memo: s.memo || '', label: s.label || '' })),
      dripper: recent?.dripper || '',
      rating: 0,
      tags: [],
      flavors: [],
      memo: '',
      photoIds: [],
      parentId: q.get('from') || '',
      favorite: false,
      createdAt: nowIso(),
    };
  }
  const beanThumbs = {};
  for (const bean of beans) if (bean.photoId) beanThumbs[bean.id] = await photoUrl(bean.photoId);
  const photos = await loadPhotos(b.photoIds);
  const removed = [];
  const back = editing ? `#/brew/${b.id}` : (b.recipeId ? `#/recipe/${b.recipeId}` : '#/records');
  const selectable = beans.filter(x => !x.finished || x.id === b.beanId);
  b.flavors = [...new Set((b.flavors || []).map(canonicalFlavor))];
  b.tags = b.tags || [];

  return {
    html: `${bar(editing ? '기록 수정' : '기록 남기기', { back, right: '<button class="text-btn" id="save">완료</button>' })}
    <main class="page form">
      <label class="field inline"><span>날짜</span><input type="date" id="date" value="${esc(b.date)}"></label>
      <div id="beanCard"></div>
      <label class="field inline"><span>원두</span><select id="bean"><option value="">선택 안 함</option>${selectable.map(x => `<option value="${x.id}" ${x.id === b.beanId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
      <div class="box">
        <div class="row"><span class="label">레시피</span><span>${esc(b.recipeName || '레시피 없음')} · ${num(b.beanG)}g ${ratioText(num(b.beanG), total(b.stages))}</span></div>
        ${b.stages.length ? `<details><summary>차수 보기</summary>${stagesTable(b.stages)}</details>` : ''}
      </div>
      <label class="field"><span>드리퍼</span><input id="dripper" value="${esc(b.dripper)}" placeholder="V60, 칼리타 웨이브"></label>
      <div class="field"><span>별점</span><div class="rating-input" id="rating"></div></div>
      ${flavorField('느낀 맛 (색으로 기억해요)')}
      <div class="field"><span>추출 느낌</span><div class="pills wrap" id="tags">${TASTE_TAGS.map(t => `<button type="button" class="pill ${b.tags.includes(t) ? 'on' : ''}" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>
      <label class="field"><span>메모</span><textarea id="memo" rows="4" placeholder="맛, 향, 다음에 바꿔볼 점">${esc(b.memo)}</textarea></label>
      ${photoField()}
    </main>`,
    bind() {
      const renderBean = () => {
        const bean = beans.find(x => x.id === b.beanId);
        $('#beanCard').innerHTML = beanCardHtml(bean, b.date, beanThumbs[b.beanId], false);
      };
      renderBean();
      bindRating(b);
      bindFlavorPicker(b);
      bindPhotoEditor(photos, removed);

      $('#date').addEventListener('change', e => { b.date = e.target.value || today(); renderBean(); });
      $('#bean').addEventListener('change', e => { b.beanId = e.target.value; renderBean(); });
      $('#tags').addEventListener('click', e => {
        const btn = e.target.closest('[data-t]');
        if (!btn) return;
        const t = btn.dataset.t;
        b.tags = b.tags.includes(t) ? b.tags.filter(x => x !== t) : [...b.tags, t];
        btn.classList.toggle('on');
      });
      $('#save').addEventListener('click', async e => {
        e.target.disabled = true;
        b.date = $('#date').value || today();
        b.dripper = $('#dripper').value.trim();
        b.memo = $('#memo').value.trim();
        b.photoIds = await savePhotos(photos, removed, b.id);
        b.updatedAt = nowIso();
        await db.put('brews', b);
        location.replace(`#/brew/${b.id}`);
      });
    },
  };
}

async function viewBrew({ id }) {
  const b = await db.get('brews', id);
  if (!b) return notFound('#/records');
  const [bean, recipe, parent] = await Promise.all([db.get('beans', b.beanId), db.get('recipes', b.recipeId), db.get('brews', b.parentId)]);
  const beanThumb = bean?.photoId ? await photoUrl(bean.photoId) : '';
  const photos = (await Promise.all((b.photoIds || []).map(photoUrl))).filter(Boolean);
  const favBtn = () => `<button class="icon-btn fav-btn ${b.favorite ? 'on' : ''}" id="fav" aria-label="즐겨찾기">${b.favorite ? ICON.starFill : ICON.star}</button>`;
  const water = total(b.stages);
  b.flavors = (b.flavors || []).map(canonicalFlavor);

  return {
    html: `${bar(fmtDate(b.date), { back: '#/records', right: `<a class="icon-btn" href="#/brew-edit/${b.id}" aria-label="수정">${ICON.edit}</a>${favBtn()}` })}
    <main class="page">
      ${beanCardHtml(bean, b.date, beanThumb, true)}
      <div class="box">
        <div class="row"><span class="label">레시피</span>${recipe ? `<a href="#/recipe/${recipe.id}">${esc(b.recipeName)}</a>` : `<span>${esc(b.recipeName || '레시피 없음')}</span>`}</div>
        ${b.stages.length ? stagesTable(b.stages) : ''}
        <div class="row total-row"><span>원두 ${num(b.beanG)} g · 총 ${round1(water)} g${totalSec(b.stages) ? ` · ${fmtTime(totalSec(b.stages))}` : ''}</span><strong>${ratioText(num(b.beanG), water)}</strong></div>
        ${b.dripper ? `<div class="row"><span class="label">드리퍼</span><span>${esc(b.dripper)}</span></div>` : ''}
      </div>
      <div class="rating-view">${starsHtml(b.rating || 0)}<span class="rating-num">${b.rating ? b.rating.toFixed(1) : '별점 없음'}</span></div>
      ${b.flavors?.length ? `<div class="flavor-view">${colorBand(b.flavors)}<div class="pills wrap">${b.flavors.map(n => flavorChip(n)).join('')}</div></div>` : ''}
      ${bean?.notes?.length ? (() => {
        const found = bean.notes.filter(n => noteMatched(n, b.flavors || [])).length;
        return `<div class="box"><div class="row"><span class="label">원두 컵노트</span><span class="sub">${found} / ${bean.notes.length} 찾음</span></div><div class="pills wrap">${bean.notes.map(n => flavorChip(n, { matched: noteMatched(n, b.flavors || []) })).join('')}</div></div>`;
      })() : ''}
      ${b.tags?.length ? `<div class="pills wrap">${b.tags.map(t => `<span class="pill on">${esc(t)}</span>`).join('')}</div>` : ''}
      ${b.memo ? `<p class="memo">${esc(b.memo)}</p>` : ''}
      ${photos.length ? `<div class="photos view">${photos.map(u => `<img src="${u}" alt="">`).join('')}</div>` : ''}
      ${parent ? `<a class="sub link" href="#/brew/${parent.id}">${fmtDate(parent.date)} 기록에서 이어짐</a>` : ''}
      <button class="btn primary block" id="again">이대로 다시 내리기</button>
      <button class="btn danger-text block" id="del">기록 삭제</button>
    </main>`,
    bind() {
      $('#fav').addEventListener('click', async e => {
        const btn = e.currentTarget;
        b.favorite = !b.favorite;
        await db.put('brews', b);
        btn.classList.toggle('on', b.favorite);
        btn.innerHTML = b.favorite ? ICON.starFill : ICON.star;
      });
      $('#again').addEventListener('click', async () => {
        let recipeId = recipe?.id;
        if (!recipeId) {
          const r = newRecipe();
          r.name = b.recipeName || '다시 내리기 레시피';
          r.beanG = num(b.beanG);
          r.stages = b.stages.map(s => ({ ...s }));
          await db.put('recipes', r);
          recipeId = r.id;
        }
        go(`#/recipe/${recipeId}?from=${b.id}${b.beanId ? `&bean=${b.beanId}` : ''}`);
      });
      $('#del').addEventListener('click', async () => {
        if (!confirm('이 기록을 삭제할까요? 사진도 함께 삭제돼요.')) return;
        for (const pid of b.photoIds || []) await db.del('photos', pid);
        await db.del('brews', b.id);
        location.replace('#/records');
      });
      $$('.photos.view img').forEach(img => img.addEventListener('click', () => showPhoto(img.src)));
    },
  };
}

// ---------- 레시피 탭 ----------

async function viewRecipes() {
  const recipes = (await db.all('recipes')).sort(byRecipe);
  const list = recipes.map(r => `<a class="item" href="#/recipe/${r.id}"><div class="item-main"><div class="item-title">${esc(r.name)}${r.favorite ? `<span class="fav">${ICON.starFill}</span>` : ''}</div><div class="sub">${recipeSummary(r)}${r.links?.length ? ` · 링크 ${r.links.length}` : ''}</div>${recipeMemoLine(r)}</div><button type="button" class="icon-btn copy-btn" data-copy="${r.id}" aria-label="레시피 복사">${ICON.copy}</button>${ICON.chev}</a>`).join('');
  return {
    html: `${bar('레시피')}<main class="page">
      ${recipes.length ? `<div class="list">${list}</div>` : `<div class="empty-state"><p>내 레시피를 만들어보세요</p><p class="sub">원두량과 차수별 물량을 넣으면 누적 g을 계산해줘요.</p><a class="btn primary" href="#/recipe/new">새 레시피</a></div>`}
    </main><a class="fab" href="#/recipe/new" aria-label="새 레시피">${ICON.plus}</a>`,
    bind() {
      // 복사본은 즐겨찾기를 빼고, 맨 위에 오도록 새로 만든 것으로 저장한다.
      $$('[data-copy]').forEach(btn => btn.addEventListener('click', async e => {
        e.preventDefault();
        e.stopPropagation();
        const src = recipes.find(r => r.id === btn.dataset.copy);
        if (!src) return;
        const t = nowIso();
        const copy = structuredClone(src);
        Object.assign(copy, { id: uid(), name: `${src.name} (복사)`, favorite: false, createdAt: t, updatedAt: t });
        copy.links = (copy.links || []).map(l => ({ ...l, id: uid() }));
        await db.put('recipes', copy);
        go(`#/recipe/${copy.id}`);
      }));
    },
  };
}

async function viewRecipe({ id, q }) {
  const isNew = id === 'new';
  const r = isNew ? newRecipe() : await db.get('recipes', id);
  if (!r) return notFound('#/recipes');
  r.links = r.links || [];
  if (q.get('bean')) session.beanId = q.get('bean');
  const [allBeans, allBrews] = await Promise.all([db.all('beans'), db.all('brews')]);
  const beans = allBeans.filter(b => !b.finished || b.id === session.beanId).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  if (session.beanId && !beans.some(b => b.id === session.beanId)) session.beanId = '';
  const beanMap = byId(allBeans);
  const related = allBrews.filter(b => b.recipeId === r.id).sort(byNewest);
  const from = q.get('from') || '';
  const back = from ? `#/brew/${from}` : q.get('via') === 'pick' ? '#/pick-recipe' : '#/recipes';
  const extra = new URLSearchParams(q);
  extra.delete('bean');
  const qs = extra.toString() ? `?${extra}` : '';
  let saved = !isNew;
  let active = -1;
  let timer;

  const favIcon = () => (r.favorite ? ICON.starFill : ICON.star);

  return {
    html: `<header class="bar">
      <a class="icon-btn" href="${back}" aria-label="뒤로">${ICON.back}</a>
      <h1 id="title">${esc(r.name)}</h1>
      <div class="bar-right"><span class="saved" id="saved"></span><button class="icon-btn fav-btn ${r.favorite ? 'on' : ''}" id="fav" aria-label="즐겨찾기">${favIcon()}</button></div>
    </header>
    <main class="page">
      <label class="field"><span>레시피 이름</span><input id="name" value="${isNew ? '' : esc(r.name)}" placeholder="V60 기본 4회"></label>
      <label class="field"><span>메모</span><textarea id="rMemo" rows="2" placeholder="분쇄도, 물 온도, 이 레시피의 특징">${esc(r.memo || '')}</textarea></label>
      <label class="field inline"><span>원두</span><select id="bean"><option value="">선택 안 함</option>${beans.map(b => `<option value="${b.id}" ${b.id === session.beanId ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}<option value="__new">+ 원두 등록</option></select></label>
      <div class="row-field"><span class="label">원두량</span><span class="unit-input"><input id="beanG" inputmode="decimal" value="${num(r.beanG) || ''}" aria-label="원두량"><em>g</em></span></div>
      <div class="row-field"><span class="label">비율</span><div class="pills" id="ratios">${RATIOS.map(x => `<button class="pill" data-r="${x}">1:${x}</button>`).join('')}</div></div>
      <div class="stage-head"><span>차수</span><span>초</span><span>물(g)</span><span>누적</span><span></span></div>
      <div id="stages"></div>
      <button class="add-row" id="addStage">+ 차수 추가</button>
      <div class="total" id="total"></div>
      <p class="hint">차수를 누르면 현재 차수로 표시돼요. 같은 차수를 다시 누르면 꺼져요.</p>
      <details class="calc">
        <summary>비율 계산기</summary>
        <p class="sub">마실 양(물 총량)으로 원두량을 구해요. 1ml는 약 1g이에요.</p>
        <div class="calc-row">
          <span class="unit-input"><input id="cWater" inputmode="decimal" placeholder="250" aria-label="물 총량"><em>g</em></span>
          <span>÷ 1:</span>
          <span class="unit-input small"><input id="cRatio" inputmode="decimal" value="15" aria-label="비율"></span>
          <span>=</span><strong id="cBeans">-</strong>
        </div>
        <button class="btn" id="cApply">이 값으로 레시피 맞추기</button>
      </details>
      <section>
        <h2 class="sec-title">참고 링크</h2>
        <div id="links"></div>
        <details class="add-link">
          <summary>+ 링크 추가</summary>
          <input id="lkUrl" type="url" inputmode="url" placeholder="https://youtube.com/watch?v=..." aria-label="링크 주소">
          <input id="lkTitle" placeholder="제목 (비우면 주소로 표시)" aria-label="링크 제목">
          <input id="lkMemo" placeholder="메모 (예: 3:20부터 추출 시작)" aria-label="링크 메모">
          <p class="err" id="lkErr" hidden></p>
          <button class="btn" id="lkAdd">추가</button>
        </details>
      </section>
      <button class="btn primary block" id="toBrew">이 레시피로 기록 남기기</button>
      <details class="related">
        <summary>이 레시피로 내린 기록 (${related.length})</summary>
        ${related.length ? `<div class="list">${related.map(b => `<a class="item compact" href="#/brew/${b.id}"><div class="item-main"><div class="row"><span>${shortDate(b.date)} · ${esc(beanMap[b.beanId]?.name || '원두 미지정')}</span><span>${b.rating ? b.rating.toFixed(1) : '-'}</span></div><div class="sub">${num(b.beanG)}g ${ratioText(num(b.beanG), total(b.stages))}${b.memo ? ` · ${esc(b.memo)}` : ''}</div></div></a>`).join('')}</div>` : '<p class="sub">아직 이 레시피로 남긴 기록이 없어요.</p>'}
      </details>
      ${isNew ? '' : '<button class="btn danger-text block" id="del">레시피 삭제</button>'}
    </main>`,
    bind() {
      const stagesEl = $('#stages');
      const savedEl = $('#saved');

      async function save() {
        clearTimeout(timer);
        r.updatedAt = nowIso();
        await db.put('recipes', r);
        savedEl.textContent = '저장됨';
        if (!saved) {
          saved = true;
          history.replaceState(null, '', `#/recipe/${r.id}${qs}`);
        }
      }
      const changed = () => {
        savedEl.textContent = '저장 중';
        clearTimeout(timer);
        timer = setTimeout(save, 400);
      };

      const updateTotals = () => {
        const t = total(r.stages);
        const sec = totalSec(r.stages);
        $('#total').innerHTML = `<span>총 ${round1(t)} g${sec ? ` · ${fmtTime(sec)}` : ''}</span><strong>${ratioText(num(r.beanG), t)}</strong>`;
        const current = num(r.beanG) > 0 ? round1(t / num(r.beanG)) : 0;
        $$('#ratios .pill').forEach(p => p.classList.toggle('on', +p.dataset.r === current));
      };
      const updateCums = () => {
        let cum = 0, cumSec = 0;
        $$('.stage', stagesEl).forEach((el, i) => {
          cum += num(r.stages[i].water);
          cumSec += num(r.stages[i].sec);
          $('.st-cum', el).textContent = fmtCum(cum, cumSec);
        });
        updateTotals();
      };
      const applyActive = () => {
        $$('.stage', stagesEl).forEach((el, i) => {
          el.classList.toggle('active', i === active);
          el.classList.toggle('done', active >= 0 && i < active);
        });
      };
      // 메모는 평소엔 글자로만 보여서 행 어디를 눌러도 하이라이트된다. 편집은 버튼으로만 연다.
      const memoLine = (s, i) => `${s.memo ? `<span class="st-memo-text">${esc(s.memo)}</span>` : ''}<button class="st-memo-btn" aria-label="${i + 1}차 메모 ${s.memo ? '수정' : '추가'}">${s.memo ? '수정' : '+ 메모'}</button>`;
      const renderStages = () => {
        stagesEl.innerHTML = r.stages.map((s, i) => `<div class="stage" data-i="${i}">
          <div class="st-name">${i + 1}차${s.label ? ` <small>${esc(s.label)}</small>` : ''}</div>
          <input class="st-sec" inputmode="numeric" value="${num(s.sec) || ''}" aria-label="${i + 1}차 시간(초)">
          <input class="st-water" inputmode="decimal" value="${num(s.water) || ''}" aria-label="${i + 1}차 물량(g)">
          <div class="st-cum"></div>
          <button class="st-del" aria-label="${i + 1}차 삭제">${ICON.x}</button>
          <div class="st-memo-line">${memoLine(s, i)}</div>
        </div>`).join('');
        updateCums();
        applyActive();
      };
      const renderLinks = () => {
        $('#links').innerHTML = r.links.length ? r.links.map((l, i) => {
          const yt = youtubeId(l.url);
          const thumb = yt
            ? `<span class="lk-thumb"><img src="https://i.ytimg.com/vi/${yt}/mqdefault.jpg" alt="" loading="lazy">${ICON.play}</span>`
            : `<span class="lk-thumb ph">${ICON.link}</span>`;
          return `<div class="link-card"><a href="${esc(l.url)}" target="_blank" rel="noopener">${thumb}<span class="lk-text"><span class="lk-title">${esc(l.title || l.url)}</span><span class="sub">${esc(host(l.url))}${l.memo ? ` · ${esc(l.memo)}` : ''}</span></span></a><button class="st-del" data-li="${i}" aria-label="링크 삭제">${ICON.x}</button></div>`;
        }).join('') : '<p class="sub">참고한 영상이나 글이 있으면 추가해두세요.</p>';
      };
      renderStages();
      renderLinks();
      savedEl.textContent = isNew ? '' : '저장됨';

      $('#name').addEventListener('input', e => {
        r.name = e.target.value.trim() || '새 레시피';
        $('#title').textContent = r.name;
        changed();
      });
      $('#rMemo').addEventListener('input', e => { r.memo = e.target.value; changed(); });
      $('#fav').addEventListener('click', e => {
        r.favorite = !r.favorite;
        const btn = e.currentTarget;
        btn.classList.toggle('on', r.favorite);
        btn.innerHTML = favIcon();
        changed();
      });
      $('#bean').addEventListener('change', async e => {
        if (e.target.value === '__new') {
          await save();
          go(`#/bean-edit/new?return=${encodeURIComponent(`#/recipe/${r.id}${qs}`)}`);
          return;
        }
        session.beanId = e.target.value;
      });
      $('#beanG').addEventListener('input', e => { r.beanG = num(e.target.value); updateTotals(); changed(); });
      $('#ratios').addEventListener('click', e => {
        const btn = e.target.closest('[data-r]');
        if (!btn || !num(r.beanG)) return;
        rescaleTo(r, num(r.beanG) * +btn.dataset.r);
        renderStages();
        changed();
      });

      stagesEl.addEventListener('input', e => {
        const row = e.target.closest('.stage');
        if (!row) return;
        const s = r.stages[+row.dataset.i];
        if (e.target.classList.contains('st-water')) { s.water = num(e.target.value); updateCums(); }
        if (e.target.classList.contains('st-sec')) { s.sec = num(e.target.value); updateCums(); }
        if (e.target.classList.contains('st-memo')) s.memo = e.target.value;
        changed();
      });
      stagesEl.addEventListener('click', e => {
        const row = e.target.closest('.stage');
        if (!row) return;
        const i = +row.dataset.i;
        if (e.target.closest('.st-del')) {
          if (r.stages.length === 1) return;
          if (!confirm(`${i + 1}차를 삭제할까요?`)) return;
          r.stages.splice(i, 1);
          if (active === i) active = -1;
          else if (active > i) active -= 1;
          renderStages();
          changed();
          return;
        }
        if (e.target.closest('.st-memo-btn')) {
          const line = $('.st-memo-line', row);
          line.innerHTML = `<input class="st-memo" value="${esc(r.stages[i].memo || '')}" placeholder="이 차수 메모 (예: 원을 그리며 천천히)" aria-label="${i + 1}차 메모">`;
          const input = $('.st-memo', line);
          input.focus();
          const close = () => { line.innerHTML = memoLine(r.stages[i], i); };
          input.addEventListener('blur', close, { once: true });
          input.addEventListener('keydown', ev => { if (ev.key === 'Enter') input.blur(); });
          return;
        }
        if (e.target.closest('input')) return;
        active = active === i ? -1 : i;
        applyActive();
      });
      $('#addStage').addEventListener('click', () => {
        r.stages.push({ water: 0, sec: 0, memo: '', label: '' });
        renderStages();
        $$('.st-sec', stagesEl).at(-1).focus();
        changed();
      });

      const calc = () => {
        const water = num($('#cWater').value), ratio = num($('#cRatio').value);
        const beans = water > 0 && ratio > 0 ? round1(water / ratio) : 0;
        $('#cBeans').textContent = beans ? `원두 ${beans} g` : '-';
        return { water, beans };
      };
      $('#cWater').addEventListener('input', calc);
      $('#cRatio').addEventListener('input', calc);
      $('#cApply').addEventListener('click', () => {
        const { water, beans } = calc();
        if (!beans) return;
        r.beanG = beans;
        $('#beanG').value = beans;
        rescaleTo(r, water);
        renderStages();
        changed();
      });

      $('#links').addEventListener('click', e => {
        const del = e.target.closest('[data-li]');
        if (!del) return;
        r.links.splice(+del.dataset.li, 1);
        renderLinks();
        changed();
      });
      $('#lkUrl').addEventListener('input', () => { $('#lkErr').hidden = true; });
      $('#lkAdd').addEventListener('click', () => {
        const raw = $('#lkUrl').value.trim();
        let url;
        try {
          url = new URL(raw);
          if (!/^https?:$/.test(url.protocol)) throw new Error();
        } catch {
          $('#lkErr').textContent = 'https://로 시작하는 주소를 넣어주세요.';
          $('#lkErr').hidden = false;
          return;
        }
        r.links.push({ id: uid(), url: url.href, title: $('#lkTitle').value.trim(), memo: $('#lkMemo').value.trim() });
        $('#lkUrl').value = $('#lkTitle').value = $('#lkMemo').value = '';
        renderLinks();
        changed();
      });

      $('#toBrew').addEventListener('click', async () => {
        await save();
        const params = new URLSearchParams({ recipe: r.id });
        if (session.beanId) params.set('bean', session.beanId);
        if (from) params.set('from', from);
        go(`#/brew-new?${params}`);
      });
      $('#del')?.addEventListener('click', async () => {
        if (!confirm('이 레시피를 삭제할까요? 이 레시피로 남긴 기록은 그대로 남아요.')) return;
        clearTimeout(timer);
        await db.del('recipes', r.id);
        location.replace('#/recipes');
      });
    },
  };
}

// ---------- 원두 탭 ----------

async function viewBeans() {
  const [beans, brews] = await Promise.all([db.all('beans'), db.all('brews')]);
  const usage = usageByBean(brews);
  beans.sort((a, b) => (b.roastDate || '').localeCompare(a.roastDate || '') || a.name.localeCompare(b.name, 'ko'));
  const items = await Promise.all(beans.map(async bean => {
    const thumb = bean.photoId ? await photoUrl(bean.photoId) : '';
    const days = roastDays(bean, today());
    const left = remaining(bean, usage);
    const meta = [bean.roastery, days !== null ? `로스팅 후 ${days}일째` : ''].filter(Boolean).join(' · ');
    return `<a class="item" href="#/bean/${bean.id}" data-finished="${bean.finished ? 1 : 0}">
      ${thumbHtml(thumb)}
      <div class="item-main">
        <div class="item-title">${esc(bean.name)}</div>
        ${meta ? `<div class="sub">${esc(meta)}</div>` : ''}
        ${left ? `<div class="meter ${left.ratio < 0.25 ? 'low' : ''}"><span style="width:${left.ratio * 100}%"></span></div><div class="sub">${left.left} / ${left.total} g · 약 ${left.times}번</div>` : ''}
      </div></a>`;
  }));
  const activeCount = beans.filter(b => !b.finished).length;

  return {
    html: `${bar('원두')}<main class="page">
      ${beans.length ? `<div class="pills" id="filters"><button class="pill on" data-f="0">사용 중 ${activeCount}</button><button class="pill" data-f="1">소진 ${beans.length - activeCount}</button></div>
        <div class="list" id="list">${items.join('')}</div><p class="empty" id="none" hidden>여기에 해당하는 원두가 없어요.</p>`
      : `<div class="empty-state"><p>원두를 등록해보세요</p><p class="sub">한 번 등록하면 여러 기록에서 불러 쓸 수 있어요.</p><a class="btn primary" href="#/bean-edit/new">원두 등록</a></div>`}
    </main><a class="fab" href="#/bean-edit/new" aria-label="원두 등록">${ICON.plus}</a>`,
    bind() {
      if (!beans.length) return;
      const apply = f => {
        let shown = 0;
        $$('#list .item').forEach(el => { el.hidden = el.dataset.finished !== f; if (!el.hidden) shown++; });
        $('#none').hidden = shown > 0;
        $$('#filters .pill').forEach(p => p.classList.toggle('on', p.dataset.f === f));
      };
      apply('0');
      $('#filters').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) apply(b.dataset.f); });
    },
  };
}

async function viewBean({ id }) {
  const bean = await db.get('beans', id);
  if (!bean) return notFound('#/beans');
  const brews = (await db.all('brews')).filter(b => b.beanId === id).sort(byNewest);
  const usage = usageByBean(brews);
  const thumb = bean.photoId ? await photoUrl(bean.photoId) : '';
  const days = roastDays(bean, today());
  const left = remaining(bean, usage);
  const best = brews.reduce((top, b) => (num(b.rating) > num(top?.rating) ? b : top), null);
  const meta = [bean.roastery, bean.process, bean.roast].filter(Boolean).join(' · ');
  const details = [
    ['산지', bean.origin], ['품종', bean.variety], ['로스팅 날짜', bean.roastDate],
    ['구매', [num(bean.purchasedG) ? `${num(bean.purchasedG)} g` : '', num(bean.price) ? `${num(bean.price).toLocaleString('ko-KR')}원` : ''].filter(Boolean).join(' / ')],
  ].filter(([, v]) => v);

  return {
    html: `${bar('원두 상세', { back: '#/beans', right: `<a class="icon-btn" href="#/bean-edit/${bean.id}" aria-label="수정">${ICON.edit}</a>` })}
    <main class="page">
      <div class="bean-head">${thumbHtml(thumb)}<div><div class="item-title big">${esc(bean.name)}</div>${meta ? `<div class="sub">${esc(meta)}</div>` : ''}</div></div>
      ${bean.notes?.length ? `<div class="pills wrap">${bean.notes.map(n => flavorChip(n)).join('')}</div>` : ''}
      <div class="stats">
        <div class="box"><div class="label">로스팅 후</div><div class="stat">${days !== null ? `${days}일째` : '-'}</div></div>
        <div class="box"><div class="label">남은 양</div><div class="stat">${left ? `${left.left} g` : '-'}</div>${left ? `<div class="sub">약 ${left.times}번</div>` : ''}</div>
      </div>
      ${details.length ? `<div class="box">${details.map(([k, v]) => `<div class="row"><span class="label">${k}</span><span>${esc(v)}</span></div>`).join('')}</div>` : ''}
      <h2 class="sec-title">이 원두로 내린 기록</h2>
      ${brews.length ? `<div class="list">${brews.map(b => `<a class="item compact" href="#/brew/${b.id}"><div class="item-main"><div class="row"><span>${shortDate(b.date)} · ${esc(b.recipeName || '레시피 없음')} · ${ratioText(num(b.beanG), total(b.stages))}</span><span>${b.rating ? b.rating.toFixed(1) : '-'}${b === best ? ' <span class="badge">베스트</span>' : ''}</span></div></div></a>`).join('')}</div>` : '<p class="sub">아직 기록이 없어요.</p>'}
      <button class="btn block" id="finish">${bean.finished ? '사용 중으로 되돌리기' : '다 썼어요 (소진 처리)'}</button>
    </main>`,
    bind() {
      $('#finish').addEventListener('click', async () => {
        bean.finished = !bean.finished;
        bean.updatedAt = nowIso();
        await db.put('beans', bean);
        render();
      });
    },
  };
}

async function viewBeanEdit({ id, q }) {
  const isNew = id === 'new';
  const all = await db.all('beans');
  const bean = isNew ? { id: uid(), name: '', notes: [], finished: false, createdAt: nowIso() } : all.find(b => b.id === id);
  if (!bean) return notFound('#/beans');
  const returnTo = q.get('return') || '';
  const back = returnTo || (isNew ? '#/beans' : `#/bean/${bean.id}`);
  const roasteries = [...new Set(all.map(b => b.roastery).filter(Boolean))];
  let photo = bean.photoId ? { id: bean.photoId, url: await photoUrl(bean.photoId), isNew: false } : null;
  const oldPhotoId = bean.photoId || '';
  const opt = (list, value) => `<option value="">선택 안 함</option>${list.map(x => `<option ${x === value ? 'selected' : ''}>${x}</option>`).join('')}`;

  return {
    html: `${bar(isNew ? '원두 등록' : '원두 수정', { back, right: '<button class="text-btn" id="save">저장</button>' })}
    <main class="page form">
      <div class="field"><span>사진</span><div class="photos" id="photo"></div><input type="file" id="file" accept="image/*" hidden></div>
      <label class="field"><span>원두 이름 *</span><input id="name" value="${esc(bean.name)}" placeholder="에티오피아 예가체프 코케"></label>
      <label class="field"><span>로스터리</span><input id="roastery" list="roasteries" value="${esc(bean.roastery)}"><datalist id="roasteries">${roasteries.map(x => `<option value="${esc(x)}">`).join('')}</datalist></label>
      <label class="field"><span>산지</span><input id="origin" value="${esc(bean.origin)}" placeholder="에티오피아 / 예가체프"></label>
      <label class="field"><span>품종</span><input id="variety" value="${esc(bean.variety)}" placeholder="에어룸"></label>
      <div class="two">
        <label class="field"><span>가공 방식</span><select id="process">${opt(PROCESSES, bean.process)}</select></label>
        <label class="field"><span>로스팅 정도</span><select id="roast">${opt(ROASTS, bean.roast)}</select></label>
      </div>
      <label class="field"><span>컵노트 (쉼표로 구분, 플레이버 휠 이름과 같으면 색이 붙어요)</span><input id="notes" value="${esc((bean.notes || []).join(', '))}" placeholder="자스민, 레몬, 홍차"></label>
      <label class="field"><span>로스팅 날짜</span><input type="date" id="roastDate" value="${esc(bean.roastDate)}"></label>
      <div class="two">
        <label class="field"><span>구매 용량 (g)</span><input id="purchasedG" inputmode="decimal" value="${num(bean.purchasedG) || ''}" placeholder="200"></label>
        <label class="field"><span>가격 (원)</span><input id="price" inputmode="numeric" value="${num(bean.price) || ''}" placeholder="18000"></label>
      </div>
      <p class="err" id="err" hidden></p>
      ${isNew ? '' : '<button class="btn danger-text block" id="del">원두 삭제</button>'}
    </main>`,
    bind() {
      const renderPhoto = () => {
        $('#photo').innerHTML = photo
          ? `<div class="ph-item"><img src="${photo.url}" alt=""><button type="button" class="ph-del" id="phDel" aria-label="사진 삭제">${ICON.x}</button></div>`
          : `<button type="button" class="ph-add" id="phAdd" aria-label="사진 추가">${ICON.camera}</button>`;
      };
      renderPhoto();
      $('#photo').addEventListener('click', e => {
        if (e.target.closest('#phAdd')) $('#file').click();
        if (e.target.closest('#phDel')) { photo = null; renderPhoto(); }
      });
      $('#file').addEventListener('change', async e => {
        const f = e.target.files[0];
        e.target.value = '';
        if (!f) return;
        try {
          const blob = await resizeImage(f, 1200);
          photo = { id: uid(), blob, url: objUrl(blob), isNew: true };
          renderPhoto();
        } catch (ex) {
          $('#err').textContent = ex.message;
          $('#err').hidden = false;
        }
      });
      $('#name').addEventListener('input', () => { $('#err').hidden = true; });
      $('#save').addEventListener('click', async e => {
        const name = $('#name').value.trim();
        if (!name) {
          $('#err').textContent = '원두 이름을 넣어주세요.';
          $('#err').hidden = false;
          $('#name').focus();
          return;
        }
        e.target.disabled = true;
        Object.assign(bean, {
          name,
          roastery: $('#roastery').value.trim(),
          origin: $('#origin').value.trim(),
          variety: $('#variety').value.trim(),
          process: $('#process').value,
          roast: $('#roast').value,
          notes: $('#notes').value.split(/[,，]/).map(s => s.trim()).filter(Boolean),
          roastDate: $('#roastDate').value,
          purchasedG: num($('#purchasedG').value),
          price: num($('#price').value),
          updatedAt: nowIso(),
        });
        if (photo?.isNew) await db.put('photos', { id: photo.id, blob: photo.blob, owner: bean.id });
        if (oldPhotoId && photo?.id !== oldPhotoId) await db.del('photos', oldPhotoId);
        bean.photoId = photo?.id || '';
        await db.put('beans', bean);
        if (returnTo) location.replace(`${returnTo}${returnTo.includes('?') ? '&' : '?'}bean=${bean.id}`);
        else location.replace(`#/bean/${bean.id}`);
      });
      $('#del')?.addEventListener('click', async () => {
        if (!confirm('이 원두를 삭제할까요? 이 원두로 남긴 기록은 남지만 원두 정보는 사라져요.')) return;
        if (oldPhotoId) await db.del('photos', oldPhotoId);
        await db.del('beans', bean.id);
        location.replace('#/beans');
      });
    },
  };
}

// ---------- 카페 탭 ----------

// 네이버 지도 '공유 → 복사'로 붙여넣은 글에서 가게 이름·주소·링크를 뽑는다.
// 예: "[네이버 지도]\n블루보틀 성수\n서울 성동구 아차산로 7\nhttps://naver.me/xxxx"
function parsePlace(text) {
  const url = String(text).match(/https?:\/\/\S+/)?.[0] || '';
  const lines = String(text).replace(url, '').split('\n').map(l => l.trim())
    .filter(l => l && !/^\[?\s*네이버\s*지도\s*\]?$/.test(l));
  return url || lines.length ? { url, name: lines[0] || '', address: lines[1] || '' } : null;
}

const placeText = p => (p ? [p.name, p.address, p.url].filter(Boolean).join('\n') : '');

function placeCardHtml(place, fallbackName) {
  if (!place) return '';
  const naver = /naver\.(me|com)/.test(place.url);
  const body = `<span class="pl-pin${naver ? ' naver' : ''}">${ICON.pin}</span><span class="lk-text"><span class="lk-title">${esc(place.name || fallbackName || '위치')}</span>${place.address ? `<span class="sub">${esc(place.address)}</span>` : ''}${place.url ? `<span class="pl-open">${naver ? '네이버 지도에서 보기' : esc(host(place.url))} ›</span>` : ''}</span>`;
  return place.url ? `<a class="place-card" href="${esc(place.url)}" target="_blank" rel="noopener">${body}</a>` : `<div class="place-card">${body}</div>`;
}

const cafeMeta = c => [c.menu, c.beanName, c.roast].filter(Boolean).join(' · ');

async function viewCafes() {
  const visits = (await db.all('cafes')).sort(byNewest);
  const items = await Promise.all(visits.map(async c => {
    const thumb = c.photoIds?.[0] ? await photoUrl(c.photoIds[0]) : '';
    const search = [c.cafeName, c.place?.name, c.place?.address, c.menu, c.beanName, c.memo, ...(c.flavors || [])].join(' ').toLowerCase();
    return `<a class="item" href="#/cafe/${c.id}" data-search="${esc(search)}">
      ${thumb ? `<img class="thumb" src="${thumb}" alt="">` : `<div class="thumb ph">${ICON.cup}</div>`}
      <div class="item-main">
        <div class="item-title">${esc(c.cafeName || '이름 없는 카페')}</div>
        <div class="sub">${shortDate(c.date)}${cafeMeta(c) ? ` · ${esc(cafeMeta(c))}` : ''} · ${c.rating ? `${c.rating.toFixed(1)}점` : '별점 없음'}</div>
        ${colorBand(c.flavors || [])}
      </div></a>`;
  }));

  const body = visits.length
    ? `<div class="toolbar"><input type="search" id="q" placeholder="카페, 원두, 맛, 메모 검색" aria-label="카페 기록 검색"></div>
       <div class="list" id="list">${items.join('')}</div>
       <p class="empty" id="none" hidden>조건에 맞는 기록이 없어요.</p>`
    : `<div class="empty-state"><p>카페에서 마신 커피를 남겨보세요</p><p class="sub">원두와 맛을 색으로 기억하고, 네이버 지도 위치도 붙여둘 수 있어요.</p><a class="btn primary" href="#/cafe-edit/new">카페 기록 남기기</a></div>`;

  return {
    html: `${bar('카페')}<main class="page">${body}</main><a class="fab" href="#/cafe-edit/new" aria-label="새 카페 기록">${ICON.plus}</a>`,
    bind() {
      if (!visits.length) return;
      $('#q').addEventListener('input', () => {
        const term = $('#q').value.trim().toLowerCase();
        let shown = 0;
        $$('#list .item').forEach(el => {
          el.hidden = !!term && !el.dataset.search.includes(term);
          if (!el.hidden) shown++;
        });
        $('#none').hidden = shown > 0;
      });
    },
  };
}

async function viewCafeForm({ id }) {
  const editing = id && id !== 'new';
  let c;
  if (editing) {
    c = await db.get('cafes', id);
    if (!c) return notFound('#/cafes');
    c = structuredClone(c);
  } else {
    c = { id: uid(), date: today(), cafeName: '', place: null, menu: '', beanName: '', roast: '', rating: 0, flavors: [], memo: '', photoIds: [], createdAt: nowIso() };
  }
  c.flavors = [...new Set((c.flavors || []).map(canonicalFlavor))];
  const photos = await loadPhotos(c.photoIds);
  const removed = [];
  const back = editing ? `#/cafe/${c.id}` : '#/cafes';

  return {
    html: `${bar(editing ? '카페 기록 수정' : '카페 기록', { back, right: '<button class="text-btn" id="save">완료</button>' })}
    <main class="page form">
      <label class="field inline"><span>날짜</span><input type="date" id="date" value="${esc(c.date)}"></label>
      <label class="field"><span>카페 이름</span><input id="cafeName" value="${esc(c.cafeName)}" placeholder="블루보틀 성수"></label>
      <div class="field"><span>위치</span>
        <textarea id="place" rows="2" placeholder="네이버 지도에서 공유 → 복사한 내용을 붙여넣어요">${esc(placeText(c.place))}</textarea>
        <div id="placeCard"></div>
      </div>
      <label class="field"><span>메뉴</span><input id="menu" value="${esc(c.menu)}" placeholder="핸드드립, 필터 커피"></label>
      <label class="field"><span>원두 이름</span><input id="beanName" value="${esc(c.beanName)}" placeholder="에티오피아 예가체프 코체레"></label>
      <div class="field"><span>로스팅</span><div class="pills wrap" id="roast">${ROASTS.map(r => `<button type="button" class="pill ${c.roast === r ? 'on' : ''}" data-r="${r}">${r}</button>`).join('')}</div></div>
      <div class="field"><span>별점</span><div class="rating-input" id="rating"></div></div>
      ${flavorField('컵노트 (색으로 기억해요)')}
      <label class="field"><span>메모</span><textarea id="memo" rows="4" placeholder="분위기, 바리스타 설명, 다시 갈지">${esc(c.memo)}</textarea></label>
      ${photoField()}
    </main>`,
    bind() {
      const renderPlace = () => {
        c.place = parsePlace($('#place').value);
        $('#placeCard').innerHTML = placeCardHtml(c.place, $('#cafeName').value.trim());
      };
      renderPlace();
      bindRating(c);
      bindFlavorPicker(c);
      bindPhotoEditor(photos, removed);

      $('#place').addEventListener('input', () => {
        renderPlace();
        // 카페 이름이 비어 있으면 지도에서 가져온 이름을 채운다.
        if (c.place?.name && !$('#cafeName').value.trim()) $('#cafeName').value = c.place.name;
      });
      $('#cafeName').addEventListener('input', renderPlace);
      $('#roast').addEventListener('click', e => {
        const btn = e.target.closest('[data-r]');
        if (!btn) return;
        c.roast = c.roast === btn.dataset.r ? '' : btn.dataset.r;
        $$('#roast .pill').forEach(p => p.classList.toggle('on', p.dataset.r === c.roast));
      });
      $('#save').addEventListener('click', async e => {
        e.target.disabled = true;
        c.date = $('#date').value || today();
        c.cafeName = $('#cafeName').value.trim();
        c.place = parsePlace($('#place').value);
        c.menu = $('#menu').value.trim();
        c.beanName = $('#beanName').value.trim();
        c.memo = $('#memo').value.trim();
        c.photoIds = await savePhotos(photos, removed, c.id);
        c.updatedAt = nowIso();
        await db.put('cafes', c);
        location.replace(`#/cafe/${c.id}`);
      });
    },
  };
}

async function viewCafe({ id }) {
  const c = await db.get('cafes', id);
  if (!c) return notFound('#/cafes');
  const photos = (await Promise.all((c.photoIds || []).map(photoUrl))).filter(Boolean);
  c.flavors = (c.flavors || []).map(canonicalFlavor);
  const rows = [['메뉴', c.menu], ['원두', c.beanName], ['로스팅', c.roast]].filter(([, v]) => v);

  return {
    html: `${bar(esc(c.cafeName || fmtDate(c.date)), { back: '#/cafes', right: `<a class="icon-btn" href="#/cafe-edit/${c.id}" aria-label="수정">${ICON.edit}</a>` })}
    <main class="page">
      <p class="sub">${fmtDate(c.date)}</p>
      ${placeCardHtml(c.place, c.cafeName)}
      ${rows.length ? `<div class="box">${rows.map(([k, v]) => `<div class="row"><span class="label">${k}</span><span>${esc(v)}</span></div>`).join('')}</div>` : ''}
      <div class="rating-view">${starsHtml(c.rating || 0)}<span class="rating-num">${c.rating ? c.rating.toFixed(1) : '별점 없음'}</span></div>
      ${c.flavors.length ? `<div class="flavor-view">${colorBand(c.flavors)}<div class="pills wrap">${c.flavors.map(n => flavorChip(n)).join('')}</div></div>` : ''}
      ${c.memo ? `<p class="memo">${esc(c.memo)}</p>` : ''}
      ${photos.length ? `<div class="photos view">${photos.map(u => `<img src="${u}" alt="">`).join('')}</div>` : ''}
      <button class="btn danger-text block" id="del">기록 삭제</button>
    </main>`,
    bind() {
      $('#del').addEventListener('click', async () => {
        if (!confirm('이 카페 기록을 삭제할까요? 사진도 함께 삭제돼요.')) return;
        for (const pid of c.photoIds || []) await db.del('photos', pid);
        await db.del('cafes', c.id);
        location.replace('#/cafes');
      });
      $$('.photos.view img').forEach(img => img.addEventListener('click', () => showPhoto(img.src)));
    },
  };
}

// ---------- 메모 탭 ----------

const byEdited = (a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
const isoDate = iso => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

async function viewNotes() {
  const notes = (await db.all('notes')).sort(byEdited);
  const items = await Promise.all(notes.map(async n => {
    const thumb = n.photoIds?.[0] ? await photoUrl(n.photoIds[0]) : '';
    const search = [n.title, n.body].join(' ').toLowerCase();
    return `<a class="item" href="#/note/${n.id}" data-search="${esc(search)}">
      <div class="item-main">
        <div class="item-title">${esc(n.title || '제목 없음')}</div>
        <div class="sub">${shortDate(isoDate(n.updatedAt || n.createdAt))}${n.body ? ` · ${esc(n.body.split('\n')[0])}` : ''}</div>
      </div>${thumb ? `<img class="thumb" src="${thumb}" alt="">` : ''}</a>`;
  }));

  const body = notes.length
    ? `<div class="toolbar"><input type="search" id="q" placeholder="제목, 내용 검색" aria-label="메모 검색"></div>
       <div class="list" id="list">${items.join('')}</div>
       <p class="empty" id="none" hidden>조건에 맞는 메모가 없어요.</p>`
    : `<div class="empty-state"><p>커피에 관한 무엇이든 적어두세요</p><p class="sub">배운 것, 사고 싶은 도구, 가보고 싶은 카페.</p><a class="btn primary" href="#/note-edit/new">새 메모</a></div>`;

  return {
    html: `${bar('메모')}<main class="page">${body}</main><a class="fab" href="#/note-edit/new" aria-label="새 메모">${ICON.plus}</a>`,
    bind() {
      if (!notes.length) return;
      $('#q').addEventListener('input', () => {
        const term = $('#q').value.trim().toLowerCase();
        let shown = 0;
        $$('#list .item').forEach(el => {
          el.hidden = !!term && !el.dataset.search.includes(term);
          if (!el.hidden) shown++;
        });
        $('#none').hidden = shown > 0;
      });
    },
  };
}

async function viewNoteForm({ id }) {
  const editing = id && id !== 'new';
  let n;
  if (editing) {
    n = await db.get('notes', id);
    if (!n) return notFound('#/notes');
    n = structuredClone(n);
  } else {
    n = { id: uid(), title: '', body: '', photoIds: [], createdAt: nowIso() };
  }
  const photos = await loadPhotos(n.photoIds);
  const removed = [];

  return {
    html: `${bar(editing ? '메모 수정' : '새 메모', { back: editing ? `#/note/${n.id}` : '#/notes', right: '<button class="text-btn" id="save">완료</button>' })}
    <main class="page form">
      <label class="field"><span>제목</span><input id="title" value="${esc(n.title)}" placeholder="제목"></label>
      <label class="field"><span>메모</span><textarea id="body" rows="10" placeholder="자유롭게 적어요">${esc(n.body)}</textarea></label>
      ${photoField()}
    </main>`,
    bind() {
      bindPhotoEditor(photos, removed);
      $('#save').addEventListener('click', async e => {
        e.target.disabled = true;
        n.title = $('#title').value.trim();
        n.body = $('#body').value.trim();
        n.photoIds = await savePhotos(photos, removed, n.id);
        n.updatedAt = nowIso();
        await db.put('notes', n);
        location.replace(`#/note/${n.id}`);
      });
    },
  };
}

async function viewNote({ id }) {
  const n = await db.get('notes', id);
  if (!n) return notFound('#/notes');
  const photos = (await Promise.all((n.photoIds || []).map(photoUrl))).filter(Boolean);
  const edited = isoDate(n.updatedAt || n.createdAt);

  return {
    html: `${bar('메모', { back: '#/notes', right: `<a class="icon-btn" href="#/note-edit/${n.id}" aria-label="수정">${ICON.edit}</a>` })}
    <main class="page">
      <h2 class="note-title">${esc(n.title || '제목 없음')}</h2>
      <p class="sub">${fmtDate(edited)} 수정</p>
      ${n.body ? `<p class="memo">${esc(n.body)}</p>` : ''}
      ${photos.length ? `<div class="photos view">${photos.map(u => `<img src="${u}" alt="">`).join('')}</div>` : ''}
      <button class="btn danger-text block" id="del">메모 삭제</button>
    </main>`,
    bind() {
      $('#del').addEventListener('click', async () => {
        if (!confirm('이 메모를 삭제할까요? 사진도 함께 삭제돼요.')) return;
        for (const pid of n.photoIds || []) await db.del('photos', pid);
        await db.del('notes', n.id);
        location.replace('#/notes');
      });
      $$('.photos.view img').forEach(img => img.addEventListener('click', () => showPhoto(img.src)));
    },
  };
}

// ---------- 백업 ----------

// 모든 기록과 사진을 JSON 파일 하나에 담는다. 사진은 data URL 글자로 바꿔 넣는다.
const BACKUP_STORES = ['beans', 'recipes', 'brews', 'cafes', 'notes'];
const LAST_BACKUP_KEY = 'dripnote.lastBackup';
const BACKUP_REMIND_DAYS = 14;

function lastBackup() {
  try { return localStorage.getItem(LAST_BACKUP_KEY) || ''; } catch { return ''; }
}

const blobToDataUrl = blob => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

async function makeBackupFile() {
  const data = {};
  for (const store of BACKUP_STORES) data[store] = await db.all(store);
  data.photos = await Promise.all((await db.all('photos')).map(async p => ({ id: p.id, owner: p.owner || '', data: await blobToDataUrl(p.blob) })));
  const json = JSON.stringify({ app: 'dripnote', version: 1, exportedAt: nowIso(), data });
  const d = new Date();
  const stamp = `${today()}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  return new File([json], `dripnote-${stamp}.json`, { type: 'application/json' });
}

// 같은 id가 이미 있으면 더 최근에 고친 쪽을 남긴다. 지운 기록은 되살아날 수 있다.
async function restoreBackup(file) {
  let parsed;
  try { parsed = JSON.parse(await file.text()); } catch { throw new Error('드립노트 백업 파일이 아니에요.'); }
  if (parsed?.app !== 'dripnote' || !parsed.data) throw new Error('드립노트 백업 파일이 아니에요.');
  const stamp = x => x.updatedAt || x.createdAt || '';
  const count = { added: 0, updated: 0, kept: 0 };
  for (const store of BACKUP_STORES) {
    const local = byId(await db.all(store));
    for (const item of parsed.data[store] || []) {
      const mine = local[item.id];
      if (mine && stamp(mine) > stamp(item)) { count.kept++; continue; }
      await db.put(store, item);
      count[mine ? 'updated' : 'added']++;
    }
  }
  const havePhotos = new Set((await db.all('photos')).map(p => p.id));
  for (const p of parsed.data.photos || []) {
    if (havePhotos.has(p.id)) continue;
    const blob = await (await fetch(p.data)).blob();
    await db.put('photos', { id: p.id, blob, owner: p.owner });
  }
  return count;
}

async function viewBackup() {
  const counts = await Promise.all([...BACKUP_STORES, 'photos'].map(async st => (await db.all(st)).length));
  const [beans, recipes, brews, cafes, notes, photos] = counts;
  const last = lastBackup();
  const lastText = last ? `${fmtDate(last.slice(0, 10))} (${dayDiff(last.slice(0, 10), today())}일 전)` : '아직 없어요';

  return {
    html: `${bar('백업', { back: '#/records' })}
    <main class="page">
      <div class="box">
        <div class="bk-stats">${[['원두', beans], ['레시피', recipes], ['기록', brews], ['카페', cafes], ['메모', notes], ['사진', photos]].map(([k, v]) => `<div><strong>${v}</strong><span>${k}</span></div>`).join('')}</div>
        <div class="row"><span class="label">마지막 백업</span><span>${lastText}</span></div>
      </div>
      <h2 class="sec-title">내보내기</h2>
      <p class="sub">모든 기록과 사진을 파일 하나로 만들어요. 공유 화면에서 <b>파일에 저장 → iCloud Drive</b>를 고르면 다른 애플 기기에서도 열 수 있어요.</p>
      <button class="btn primary block" id="make">백업 파일 만들기</button>
      <div id="ready" hidden>
        <p class="sub" id="readyText"></p>
        <button class="btn primary block" id="share">iCloud Drive에 저장하기</button>
      </div>
      <h2 class="sec-title">가져오기</h2>
      <p class="sub">다른 기기에서 만든 백업 파일을 골라요. 이 기기의 기록에 합쳐지고, 같은 기록은 더 최근에 고친 쪽이 남아요. 지우는 것은 없어요.</p>
      <button class="btn block" id="pick">백업 파일 가져오기</button>
      <input type="file" id="restoreFile" accept="application/json,.json" hidden>
      <p class="err" id="err" hidden></p>
      <p class="sub" id="done" hidden></p>
    </main>`,
    bind() {
      let file;
      const showErr = msg => { $('#err').textContent = msg; $('#err').hidden = false; };
      const markSaved = () => { try { localStorage.setItem(LAST_BACKUP_KEY, today()); } catch {} };

      // 사파리는 탭한 직후에만 공유 화면을 열어줘서, 파일을 먼저 만들고 한 번 더 탭하게 한다.
      $('#make').addEventListener('click', async e => {
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.textContent = '만드는 중…';
        $('#err').hidden = true;
        try {
          file = await makeBackupFile();
          $('#readyText').textContent = `${file.name} · ${(file.size / 1048576).toFixed(1)}MB`;
          $('#ready').hidden = false;
          btn.hidden = true;
        } catch (ex) {
          showErr(`백업 파일을 만들지 못했어요: ${ex.message}`);
          btn.disabled = false;
          btn.textContent = '백업 파일 만들기';
        }
      });
      $('#share').addEventListener('click', async () => {
        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file] });
            markSaved();
            $('#done').textContent = '저장했어요.';
            $('#done').hidden = false;
          } catch (ex) {
            if (ex.name !== 'AbortError') showErr(`저장하지 못했어요: ${ex.message}`);
          }
          return;
        }
        // 공유 화면이 없는 브라우저(맥 등)에서는 내려받기로 저장한다.
        const a = document.createElement('a');
        a.href = objUrl(file);
        a.download = file.name;
        a.click();
        markSaved();
        $('#done').textContent = '내려받았어요. iCloud Drive 폴더로 옮겨두세요.';
        $('#done').hidden = false;
      });

      $('#pick').addEventListener('click', () => $('#restoreFile').click());
      $('#restoreFile').addEventListener('change', async e => {
        const f = e.target.files[0];
        e.target.value = '';
        if (!f) return;
        $('#err').hidden = true;
        $('#done').hidden = true;
        $('#pick').disabled = true;
        $('#pick').textContent = '가져오는 중…';
        try {
          const c = await restoreBackup(f);
          $('#done').textContent = `가져왔어요. 새로 ${c.added}개, 바뀐 것 ${c.updated}개${c.kept ? `, 이 기기 쪽이 더 최근이라 그대로 둔 것 ${c.kept}개` : ''}.`;
          $('#done').hidden = false;
        } catch (ex) {
          showErr(ex.message);
        }
        $('#pick').disabled = false;
        $('#pick').textContent = '백업 파일 가져오기';
      });
    },
  };
}

// ---------- 라우터 ----------

const VIEWS = {
  records: viewRecords,
  'pick-recipe': viewPickRecipe,
  'brew-new': viewBrewForm,
  'brew-edit': viewBrewForm,
  brew: viewBrew,
  recipes: viewRecipes,
  recipe: viewRecipe,
  beans: viewBeans,
  bean: viewBean,
  'bean-edit': viewBeanEdit,
  cafes: viewCafes,
  cafe: viewCafe,
  'cafe-edit': viewCafeForm,
  notes: viewNotes,
  note: viewNote,
  'note-edit': viewNoteForm,
  backup: viewBackup,
};
const TAB_OF = { recipes: 'recipes', recipe: 'recipes', beans: 'beans', bean: 'beans', 'bean-edit': 'beans', cafes: 'cafes', cafe: 'cafes', 'cafe-edit': 'cafes', notes: 'notes', note: 'notes', 'note-edit': 'notes' };

function parseHash() {
  const [path, query = ''] = (location.hash.slice(1) || '/records').split('?');
  return { parts: path.split('/').filter(Boolean), q: new URLSearchParams(query) };
}

async function render() {
  const token = ++renderToken;
  const { parts, q } = parseHash();
  const name = VIEWS[parts[0]] ? parts[0] : 'records';
  const previous = objectUrls;
  objectUrls = [];
  let out;
  try {
    out = await VIEWS[name]({ name, id: parts[1], q });
  } catch (e) {
    console.error(e);
    out = { html: `${bar('문제가 생겼어요', { back: '#/records' })}<main class="page"><p class="empty">${esc(e.message)}</p></main>` };
  }
  if (token !== renderToken) return;
  previous.forEach(u => URL.revokeObjectURL(u));
  app.innerHTML = out.html;
  $$('.tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === (TAB_OF[name] || 'records')));
  out.bind?.();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);
render();

// 브라우저가 저장 공간이 부족할 때 이 앱 데이터를 지우지 않도록 요청한다.
navigator.storage?.persist?.().catch(() => {});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
