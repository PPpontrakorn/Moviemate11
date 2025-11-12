// src/ui/renderDetailModal.js
import { getMovieDetail, posterUrl } from '../api/tmdb.js';

export async function openMovieModal(id) {
  // ดึงรายละเอียด
  const data = await getMovieDetail(id);

  // สร้างโครง modal
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.tabIndex = -1;

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <header>
      <h3>${data.title} (${(data.release_date||'').slice(0,4) || '-'})</h3>
      <button class="close" aria-label="ปิด">✕</button>
    </header>
    <div class="content">
      <img src="${posterUrl(data.poster_path, 'w342')}" alt="${data.title}">
      <div>
        <div class="meta">คะแนน ${data.vote_average?.toFixed?.(1) ?? '—'} • ความยาว ${data.runtime || '—'} นาที</div>
        <div class="overview">${data.overview || '— ไม่มีคำอธิบาย —'}</div>
      </div>
    </div>
    <footer>
      <div class="actions">
        <a class="btn" target="_blank" rel="noreferrer" href="https://www.themoviedb.org/movie/${data.id}">
          เปิดบน TMDB
        </a>
        ${data.homepage ? `<a class="btn" target="_blank" rel="noreferrer" href="${data.homepage}">เว็บไซต์ทางการ</a>` : ''}
      </div>
    </footer>
  `;
  backdrop.append(modal);
  document.body.append(backdrop);

  // ปิด modal
  const close = () => backdrop.remove();
  modal.querySelector('.close').addEventListener('click', close);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', function onEsc(ev){
    if (ev.key === 'Escape'){ close(); document.removeEventListener('keydown', onEsc); }
  });
}
