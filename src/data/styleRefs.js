// AI로 케이크 만들 때 같이 보내는 '실물 레터링 케이크' 스타일 참고 사진 (public/style-refs)
// 나노바나나가 이 사진들의 '진짜 크림으로 짠 글씨·그림 느낌'을 따라 하게 한다. 글자·그림·배치는 베끼지 않게 프롬프트로 막음.
// 사진을 더 넣으려면: public/style-refs 에 jpg/jpeg 를 넣고 아래 목록에 파일 이름을 추가 (한 번에 2~3장이 적당 · 많으면 느려져요).
// 가게 로고·워터마크가 찍힌 사진은 빼 주세요 (AI가 따라 그릴 수 있어요).
// cats: 이 사진을 쓸 카테고리 ('*' = 전부)
export const STYLE_REFS = [
  { file: 'ref-drawing-text.jpeg', note: '그림 + 옆에 한글 레터링', cats: ['*'] },
  { file: 'ref-bubble-text.jpeg', note: '말풍선 안 한글 레터링', cats: ['*'] },
];
export const refsFor = (catId, max = 3) => STYLE_REFS.filter((r) => r.cats.includes('*') || r.cats.includes(catId)).slice(0, max);
