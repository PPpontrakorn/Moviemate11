// src/app.js
import { getPopularMovies, searchMovies, posterUrl, getTopRatedMovies } from './api/tmdb.js';
import { renderMovieCard } from './ui/renderMovieCard.js';
import { openMovieModal } from './ui/renderDetailModal.js';
import { $, clear, setText, showSpinner } from './utils/dom.js';

const els = {};
let currentSpotlight = null;

/* ===== Watchlist (localStorage) ===== */
const WATCH_KEY = 'moviemate_watchlist';

function getWatchlist() {
  try { return JSON.parse(localStorage.getItem(WATCH_KEY)) || []; }
  catch { return []; }
}
function setWatchlist(list) {
  localStorage.setItem(WATCH_KEY, JSON.stringify(list));
  updateWatchBadge();
}
function isSaved(id) {
  const list = getWatchlist();
  return list.some(x => String(x.id) === String(id));
}
function toggleSave(movieObj) {
  const list = getWatchlist();
  const idx = list.findIndex(x => String(x.id) === String(movieObj.id));
  if (idx >= 0) list.splice(idx, 1);
  else list.push(movieObj);
  setWatchlist(list);
  renderWatchlistGrid();
}
function updateWatchBadge() {
  const badge = document.getElementById('watch-count');
  if (badge) badge.textContent = getWatchlist().length;
}
function renderWatchlistGrid() {
  const wrap = document.getElementById('watchlist-grid');
  if (!wrap) return;
  wrap.innerHTML = '';
  const list = getWatchlist();
  if (!list.length) {
    const p = document.createElement('div');
    p.className = 'empty';
    p.textContent = 'ยังไม่มีรายการบันทึก';
    wrap.append(p);
    return;
  }
  list.forEach(item => {
    const article = document.createElement('article');
    article.className = 'card';
    article.dataset.id = item.id;

    const img = document.createElement('img');
    img.src = posterUrl(item.poster_path, 'w342');
    img.alt = item.title;
    img.loading = 'lazy';
    img.onerror = () => { img.src = './assets/images/placeholder-poster.jpg'; };

    const info = document.createElement('div'); info.className = 'info';
    const title = document.createElement('div'); title.className = 'title'; title.textContent = item.title;
    const meta = document.createElement('div'); meta.className = 'meta';
    const year = (item.release_date || '').slice(0,4) || '-';
    const score = item.vote_average != null ? Number(item.vote_average).toFixed(1) : '—';
    meta.textContent = `คะแนน ${score} • ปี ${year}`;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button'; removeBtn.className = 'btn icon-btn save-btn saved';
    removeBtn.textContent = 'ลบออก';
    removeBtn.addEventListener('click', () => toggleSave(item));

    info.append(title, meta, removeBtn);
    article.append(img, info);
    wrap.append(article);
  });
}

/* ===== Suggestions (Auto-complete) ===== */
let suggestState = { open:false, items:[], activeIndex:-1, aborter:null };

function cacheElements() {
  els.form = $('#search-form');
  els.input = $('#search-input');
  els.randomBtn = $('#random-btn');
  els.grid = $('#results-grid');
  els.spotlight = $('#movie-spotlight');
  els.suggestBox = document.getElementById('suggestions'); // ต้องมี <div id="suggestions">
}

function setSpotlight(movie) {
  const poster = els.spotlight.querySelector('.poster');
  poster.style.backgroundImage = `url('${posterUrl(movie.poster_path, 'w500')}')`;
  poster.style.backgroundSize = 'cover';
  poster.style.backgroundPosition = 'center';
  const titleEl = els.spotlight.querySelector('.meta .title');
  const subEl   = els.spotlight.querySelector('.meta .subtitle');
  const year  = (movie.release_date || '').slice(0,4) || '-';
  const score = movie.vote_average ? movie.vote_average.toFixed(1) : '—';
  setText(titleEl, movie.title || movie.name || '—');
  setText(subEl, `คะแนน ${score} • ปี ${year}`);
  currentSpotlight = movie;
  const sBtn = document.getElementById('save-spotlight');
  if (sBtn) sBtn.classList.toggle('saved', isSaved(movie.id));
}

async function handleRandom() {
  try {
    els.randomBtn.disabled = true;
    const spin = showSpinner(els.spotlight);
    const { results } = await getPopularMovies(1);
    spin.remove();
    if (!results?.length) return;
    const pick = results[Math.floor(Math.random() * results.length)];
    setSpotlight(pick);
  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดขณะดึงหนังยอดนิยม');
  } finally { els.randomBtn.disabled = false; }
}

async function handleSearch(e) {
  e.preventDefault();
  const q = els.input.value.trim();
  clear(els.grid);
  closeSuggestions();
  hideLoadMore(); // ซ่อนปุ่มโหลดเพิ่มเมื่อเป็นโหมดค้นหา
  if (!q) return;

  const spin = showSpinner(els.grid);
  try {
    const { results } = await searchMovies(q, 1);
    spin.remove();
    if (!results?.length) {
      const p = document.createElement('div'); p.className = 'empty';
      p.textContent = 'ไม่พบผลลัพธ์ที่ตรงกับคำค้น'; els.grid.append(p); return;
    }
    results.forEach(m => {
      const el = renderMovieCard(m);
      const btn = el.querySelector('.save-btn');
      if (btn) btn.classList.toggle('saved', isSaved(m.id));
      els.grid.append(el);
    });
  } catch (err) {
    console.error(err); spin.remove();
    const p = document.createElement('div'); p.className = 'error';
    p.textContent = 'ดึงข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง'; els.grid.append(p);
  }
}

/* ===== Suggestions render/logic ===== */
function renderSuggestions(items) {
  if (!els.suggestBox) return;
  els.suggestBox.innerHTML = '';
  const list = document.createElement('div'); list.className = 'list';
  if (!items.length) {
    const empty = document.createElement('div'); empty.className = 'empty';
    empty.textContent = 'ไม่พบคำแนะนำ'; list.append(empty);
  } else {
    items.forEach((m, idx) => {
      const row = document.createElement('div'); row.className = 'item';
      row.dataset.id = m.id; row.dataset.index = idx;
      const img = document.createElement('img'); img.className = 'thumb';
      img.src = posterUrl(m.poster_path, 'w92'); img.alt = m.title || m.name || 'poster';
      img.onerror = () => { img.src = './assets/images/placeholder-poster.jpg'; };
      const text = document.createElement('div'); text.className='text';
      const year = (m.release_date || '').slice(0,4) || '-';
      text.innerHTML = `<div class="title">${m.title || m.name}</div>
                        <div class="meta">ปี ${year} • คะแนน ${m.vote_average ? m.vote_average.toFixed(1) : '—'}</div>`;
      row.append(img, text); list.append(row);
    });
  }
  els.suggestBox.append(list);
  suggestState.open = true; suggestState.activeIndex = -1;
}
function highlightActive() {
  if (!els.suggestBox) return;
  const rows = Array.from(els.suggestBox.querySelectorAll('.item'));
  rows.forEach(r => r.classList.remove('active'));
  if (suggestState.activeIndex >= 0 && rows[suggestState.activeIndex]) {
    rows[suggestState.activeIndex].classList.add('active');
    rows[suggestState.activeIndex].scrollIntoView({ block: 'nearest' });
  }
}
function closeSuggestions() {
  suggestState.open = false; suggestState.items = []; suggestState.activeIndex = -1;
  if (els.suggestBox) els.suggestBox.innerHTML = '';
}
let debounceTimer = null;
function debounce(fn, ms = 300) {
  return (...args) => { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => fn(...args), ms); };
}
const onTypeSuggest = debounce(async (q) => {
  if (suggestState.aborter) suggestState.aborter.abort();
  suggestState.aborter = new AbortController();
  if (!q || q.length < 2) { closeSuggestions(); return; }
  try {
    const { results } = await searchMovies(q, 1);
    const items = (results || []).slice(0, 6);
    suggestState.items = items; renderSuggestions(items);
  } catch (e) { if (e.name !== 'AbortError') console.error(e); }
}, 300);
function wireSuggestions() {
  if (!els.input || !els.suggestBox) return;
  els.input.addEventListener('input', (e) => onTypeSuggest(e.target.value.trim()));
  els.suggestBox.addEventListener('click', (e) => {
    const row = e.target.closest('.item'); if (!row) return;
    const idx = Number(row.dataset.index); const item = suggestState.items[idx]; if (!item) return;
    els.input.value = item.title || item.name || ''; closeSuggestions();
    els.form.dispatchEvent(new Event('submit', { cancelable: true }));
  });
  document.addEventListener('click', (e) => { const inSearch = e.target.closest('.search-wrap'); if (!inSearch) closeSuggestions(); });
  els.input.addEventListener('keydown', (e) => {
    if (!suggestState.open || !suggestState.items.length) return;
    if (['ArrowDown','ArrowUp','Enter','Escape'].includes(e.key)) e.preventDefault();
    if (e.key === 'ArrowDown') { suggestState.activeIndex = (suggestState.activeIndex + 1) % suggestState.items.length; highlightActive(); }
    else if (e.key === 'ArrowUp') { suggestState.activeIndex = (suggestState.activeIndex - 1 + suggestState.items.length) % suggestState.items.length; highlightActive(); }
    else if (e.key === 'Enter') {
      const idx = suggestState.activeIndex >= 0 ? suggestState.activeIndex : 0;
      const item = suggestState.items[idx]; if (item) {
        els.input.value = item.title || item.name || ''; closeSuggestions();
        els.form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    } else if (e.key === 'Escape') closeSuggestions();
  });
  els.input.addEventListener('blur', () => setTimeout(closeSuggestions, 120));
}

/* ===== Auto-load Popular ===== */
async function showPopularSpotlight() {
  try {
    const { results } = await getPopularMovies(1);
    if (results?.length) setSpotlight(results[0]);
  } catch (e) { console.error(e); }
}
async function fillPopularGrid() {
  try {
    const { results } = await getPopularMovies(1);
    if (els.grid) results?.slice(0, 12).forEach(m => {
      const el = renderMovieCard(m);
      const btn = el.querySelector('.save-btn');
      if (btn) btn.classList.toggle('saved', isSaved(m.id));
      els.grid.append(el);
    });
  } catch (e) { console.error(e); }
}

/* ===== Top Rated Mode + Load More ===== */
let browseMode = null;   // 'toprated' | null
let browsePage = 1;
let loadMoreBtn = null;

function ensureLoadMoreButton() {
  if (loadMoreBtn) return loadMoreBtn;
  loadMoreBtn = document.createElement('button');
  loadMoreBtn.className = 'btn large';
  loadMoreBtn.textContent = 'โหลดเพิ่ม';
  loadMoreBtn.style.display = 'block';
  loadMoreBtn.style.margin = '18px auto 64px';
  loadMoreBtn.addEventListener('click', loadMoreTopRated);
  // ใส่หลังกริดผลลัพธ์ (อยู่ใน section เดียวกัน)
  els.grid.parentElement.append(loadMoreBtn);
  return loadMoreBtn;
}
function hideLoadMore() { if (loadMoreBtn) loadMoreBtn.style.display = 'none'; }
function showLoadMore() { if (loadMoreBtn) loadMoreBtn.style.display = 'block'; }

async function loadTopRatedPage(page = 1) {
  const spin = showSpinner(els.grid);
  try {
    const { results, total_pages } = await getTopRatedMovies(page);
    if (!results?.length) { hideLoadMore(); return; }

    results
      .slice()
      .sort((a,b) => (b.vote_average||0) - (a.vote_average||0))
      .forEach(m => {
        const el = renderMovieCard(m);
        const btn = el.querySelector('.save-btn');
        if (btn) btn.classList.toggle('saved', isSaved(m.id));
        els.grid.append(el);
      });

    if (page >= (total_pages || 1)) hideLoadMore(); else showLoadMore();
  } catch (e) {
    console.error(e); hideLoadMore();
    const p = document.createElement('div'); p.className = 'error';
    p.textContent = 'โหลดรายการคะแนนสูงไม่สำเร็จ'; els.grid.append(p);
  } finally { spin.remove(); }
}

async function enterTopRatedMode() {
  browseMode = 'toprated';
  browsePage = 1;
  clear(els.grid);
  ensureLoadMoreButton();

  const h1 = document.querySelector('.hero h1');
  if (h1) h1.textContent = 'จัดอันดับภาพยนตร์ตามคะแนน';

  await loadTopRatedPage(browsePage);
}
async function loadMoreTopRated() {
  if (browseMode !== 'toprated') return;
  browsePage += 1;
  await loadTopRatedPage(browsePage);
}

/* ===== Boot ===== */
function main() {
  cacheElements();

  // ปุ่มสุ่ม
  els.randomBtn?.addEventListener('click', handleRandom);

  // ค้นหา
  els.form?.addEventListener('submit', handleSearch);

  // modal + save จากกริด (delegation)
  els.grid?.addEventListener('click', (e) => {
    const card = e.target.closest('.card'); if (!card) return;

    // 1) ถ้าคลิกปุ่มบันทึกในการ์ด
    if (e.target.closest('.save-btn')) {
      const obj = {
        id: card.dataset.id,
        title: card.dataset.title || '',
        poster_path: card.dataset.poster || '',
        release_date: card.dataset.release || '',
        vote_average: card.dataset.vote ? Number(card.dataset.vote) : null
      };
      toggleSave(obj);
      const btn = e.target.closest('.save-btn');
      btn?.classList.toggle('saved', isSaved(obj.id));
      return;
    }

    // 2) ไม่ใช่ปุ่มบันทึก → เปิดรายละเอียด
    if (card?.dataset.id) openMovieModal(card.dataset.id);
  });

  // modal จาก Spotlight
  const poster = els.spotlight.querySelector('.poster');
  poster.style.cursor = 'pointer';
  poster.addEventListener('click', () => {
    if (currentSpotlight?.id) openMovieModal(currentSpotlight.id);
  });

  // ปุ่มบันทึก Spotlight
  const sBtn = document.getElementById('save-spotlight');
  sBtn?.addEventListener('click', () => {
    if (!currentSpotlight) return;
    const obj = {
      id: currentSpotlight.id,
      title: currentSpotlight.title || currentSpotlight.name || '',
      poster_path: currentSpotlight.poster_path || '',
      release_date: currentSpotlight.release_date || '',
      vote_average: currentSpotlight.vote_average ?? null
    };
    toggleSave(obj);
    sBtn.classList.toggle('saved', isSaved(obj.id));
  });

  // แนะนำขณะพิมพ์
  wireSuggestions();

  // เมนู "ภาพยนตร์" → โหมด Top Rated หลายร้อยเรื่อง
  const navTop = document.getElementById('nav-toprated');
  navTop?.addEventListener('click', (e) => { e.preventDefault(); enterTopRatedMode(); });

  // โหลด popular อัตโนมัติ + sync watchlist UI
  showPopularSpotlight();
  fillPopularGrid();
  updateWatchBadge();
  renderWatchlistGrid();
}

document.addEventListener('DOMContentLoaded', main);
