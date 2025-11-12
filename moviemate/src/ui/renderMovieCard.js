// src/ui/renderMovieCard.js
import { posterUrl } from '../api/tmdb.js';

export function renderMovieCard(movie) {
  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.id = movie.id; // ใช้เปิด modal/บันทึก

  // ฝังข้อมูลไว้ใช้ตอนกดบันทึก
  card.dataset.title = movie.title || movie.name || '';
  card.dataset.poster = movie.poster_path || '';
  card.dataset.release = movie.release_date || '';
  card.dataset.vote = movie.vote_average != null ? String(movie.vote_average) : '';

  const img = document.createElement('img');
  img.alt = movie.title || movie.name || 'movie';
  img.src = posterUrl(movie.poster_path, 'w342');
  img.loading = 'lazy';
  img.onerror = () => { img.src = './assets/images/placeholder-poster.jpg'; };

  const info = document.createElement('div');
  info.className = 'info';

  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = movie.title || movie.name;

  const meta = document.createElement('div');
  meta.className = 'meta';
  const year = (movie.release_date || '').slice(0, 4) || '-';
  const score = movie.vote_average ? movie.vote_average.toFixed(1) : '—';
  meta.textContent = `คะแนน ${score} • ปี ${year}`;

  // ✅ ปุ่มบันทึกบนการ์ด
  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn icon-btn save-btn';
  saveBtn.textContent = 'บันทึก';

  info.append(title, meta, saveBtn);
  card.append(img, info);
  return card;
}
