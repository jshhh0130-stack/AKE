# 관심 탭 케이크 예시 사진

관심 탭의 케이크 사진 48장은 **실제 가게 작품이 아니라 AI로 만든 예시 사진**이에요. 앱 화면에는 항상 ‘예시’로 표시해요.

## 어떻게 만들었나요
- 모델: **FLUX.1 [schnell]** (Black Forest Labs, **Apache-2.0** 라이선스 — 만든 사진은 상업적 이용을 포함해 자유롭게 쓸 수 있어요)
- 생성 경로
  1. 허깅페이스 공개 데모(`black-forest-labs/FLUX.1-schnell`) — `node tools/gallery/fetch.mjs` (로그인 없이 쓸 수 있는 횟수가 아주 적어요)
  2. AI Horde 공개 생성망(같은 FLUX.1 schnell) — `node tools/gallery/horde.mjs` (무료·익명, 줄을 서서 한 장에 10~20분)
- 사진마다 쓴 문장(프롬프트)·seed·크기와 이름·검색어·주문서용 옵션(모양·크림색·디자인)은 `items.mjs`에 있어요.

## 한글 문구
AI는 한글 글자를 잘 못 그려서, 위에서 내려다본 빈 윗면 사진을 만든 뒤 **앱의 레터링 글꼴(Jua · 나눔손글씨 펜 · 개구 · 하이멜로디)로 문구를 얹었어요.** 크림으로 짠 것처럼 위는 밝게, 아래는 살짝 어둡게, 그림자를 넣어요. (`build.mjs`)

## 다시 만들기
```bash
node tools/gallery/horde.mjs                       # 아직 없는 사진만 받기 → tools/gallery/raw/
node tools/gallery/horde.mjs <id> --variants=3     # 한 사진을 seed 바꿔 3장 (글자 들어간 사진 고르기용)
node tools/gallery/build.mjs                       # 크기 줄이기(720·360px) + 한글 문구 → public/gallery, src/data/gallery.json
```
`raw/` 폴더(원본)는 저장소에 올리지 않아요.

## 지키는 것
- 다른 사람의 인스타그램·핀터레스트·지도 사진은 앱에 옮기지 않아요. 관심 탭 아래의 핀터레스트·인스타 버튼은 **바깥 사이트를 여는 링크**예요.
- 입점 가게 사장님이 올린 작품 사진만 ‘가게 작품’으로 함께 보여 줘요.
