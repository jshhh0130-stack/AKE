// 팀이 모은 가게 사진 (발표용): 수원가게사진/가게사진/번호_이름 → public/shops/번호/n.jpg(크게) · s{n}.jpg(작게)
// 목록·출처: src/data/shopPhotos.json (폴더마다 있는 사진목록.csv 그대로 — 사진 종류 · 출처 URL)
// 가게 번호(no)는 data/picks.js 의 번호와 같다. 사진마다 출처(카카오맵 · 네이버 블로그)를 함께 보여 준다.
import DATA from '../data/shopPhotos.json';

const BASE = import.meta.env.BASE_URL;
export const creditOf = (u = '') => (/pf\.kakao/.test(u) ? '카카오톡 채널' : /kakao/.test(u) ? '카카오맵' : /blog\.naver/.test(u) ? '네이버 블로그' : /naver/.test(u) ? '네이버 지도' : /instagram/.test(u) ? '인스타그램' : '웹');
const shape = (no, p) => ({
  ...p, no,
  url: `${BASE}shops/${no}/${p.n}.jpg`,
  thumb: `${BASE}shops/${no}/s${p.n}.jpg`,
  cake: /케이크/.test(p.k), // 케이크 대표사진 · 서브 케이크 · 추가 케이크
  main: /대표/.test(p.k),
  credit: creditOf(p.src),
});
const sortCake = (a, b) => (b.main - a.main) || a.n - b.n;

export function photosOf(s) {
  const no = s?.no;
  const d = no != null ? DATA[String(no)] : null;
  return d ? d.photos.map((p) => shape(no, p)) : [];
}
export const cakePhotos = (s) => photosOf(s).filter((p) => p.cake).sort(sortCake);
export const placePhotos = (s) => photosOf(s).filter((p) => !p.cake);
export const mainPhoto = (s) => cakePhotos(s)[0] || photosOf(s)[0] || null;
// 관심 탭: 가게별로 묶은 케이크 사진
export const SHOP_PHOTO_GROUPS = Object.entries(DATA).map(([no, d]) => ({ no: +no, name: d.name, photos: d.photos.map((p) => shape(+no, p)).filter((p) => p.cake).sort(sortCake) })).filter((g) => g.photos.length);
export const photoName = (p) => (p.main ? '대표 케이크' : p.k === '서브 케이크' ? '서브 케이크' : p.cake ? '케이크 사진' : p.k);
