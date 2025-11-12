// src/api/tmdb.js
import { TMDB_API_KEY, TMDB_BASE_URL, TMDB_IMAGE_BASE} from './config.js';

const withKey = (params = {}) => new URLSearchParams({
  api_key: TMDB_API_KEY,
  language: 'th-TH',     // เปลี่ยนเป็น en-US ได้ถ้าต้องการ
  ...params
}).toString();

async function request(path, params) {
  const url = `${TMDB_BASE_URL}${path}?${withKey(params)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getPopularMovies(page = 1) {
  return request('/movie/popular', { page });
}

export async function searchMovies(query, page = 1) {
  if (!query?.trim()) return { results: [] };
  return request('/search/movie', { query, page, include_adult: false });
}

// สร้าง URL รูปโปสเตอร์ (ถ้าไม่มีรูปให้ใช้ placeholder)
export function posterUrl(path, size = 'w342') {
  return path
    ? `${TMDB_IMAGE_BASE}${size}${path}`
    : './assets/images/placeholder-poster.jpg';
}

// เพิ่มท้ายไฟล์
export async function getMovieDetail(id) {
  if (!id) throw new Error('movie id is required');
  return request(`/movie/${id}`, {});     // language ถูกใส่ใน withKey แล้ว
}
// ดึงหนังตามคะแนนสูงสุด โดยกันพวกที่คะแนนสูงจากคนโหวตน้อย ๆ ออก
export async function getTopRatedMovies(page = 1) {
  return request('/discover/movie', {
    sort_by: 'vote_average.desc',
    'vote_count.gte': 200,   // กันเสียงรบกวน
    page
  });
}
