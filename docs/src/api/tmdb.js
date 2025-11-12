// src/api/tmdb.js
import { TMDB_API_KEY, TMDB_BASE_URL, TMDB_IMAGE_BASE_URL } from './config.js';

const withKey = (params = {}) =>
  new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: 'th-TH',
    ...params,
  }).toString();

async function request(path, params) {
  const url = `${TMDB_BASE_URL}${path}?${withKey(params)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${await res.text()}`);
  return res.json();
}

export const getPopularMovies   = (page = 1) => request('/movie/popular', { page });
export const searchMovies       = (query, page = 1) => {
  if (!query?.trim()) return { results: [] };
  return request('/search/movie', { query, page, include_adult: false });
};
export const getMovieDetail     = (id) => request(`/movie/${id}`, {});
export const getTopRatedMovies  = (page = 1) =>
  request('/discover/movie', { sort_by: 'vote_average.desc', 'vote_count.gte': 200, page });

// ✅ URL รูปที่ถูกต้อง (ใส่ / หน้า size)
export function posterUrl(path, size = 'w342') {
  return path
    ? `${TMDB_IMAGE_BASE_URL}/${size}${path}`
    : './assets/images/placeholder-poster.jpg';
}
