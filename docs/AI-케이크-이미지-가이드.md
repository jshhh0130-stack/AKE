# 에이크 AI 케이크 이미지 가이드

> 우리 와우 포인트: **"원하는 케이크를 AI 실사 사진으로 뽑고 → 그림판으로 고치고 → 계산서(예상 금액)까지 보고 → 그 케이크를 만들 수 있는 가게를 추천"**
> 케이크잇(cakeit.kr)은 사진·문구로 도안을 만들고 근처 가게에 견적을 받는 데서 끝나요. 우리는 **카테고리를 더 잘게 나누고(10개), 결과를 바로 고치고, 가격과 가게 추천까지 한 화면 흐름으로** 잇는 게 차별점이에요.
>
> 조사 기준일: 2026-11-23 · 가격·정책은 자주 바뀌니 표시된 공식 페이지에서 한 번 더 확인하세요.

---

## 0. 한눈에 결론

| 질문 | 답 |
|---|---|
| 구글 클라우드 무료 체험 **40만 원(₩402,977) 크레딧**으로 나노바나나를 쓸 수 있나요? | **안 돼요.** 공식 문서: 2026-11-16 이후 체험 가입·업그레이드한 계정은 크레딧을 Gemini 플랫폼(옛 Vertex AI, Agent Platform) 비용에 못 쓰고, AI Studio의 Gemini API 비용에도 못 써요. 우리 계정은 11월 19~20일 가입이라 해당돼요. |
| 그럼 무료로는 방법이 없나요? | **① Vertex AI express mode 무료 90일**(카드 없이 API 키 발급, `@gmail.com` 계정, 이미지 모델 포함)을 먼저 시도해 보세요. 다만 "기존 Google Cloud 사용자는 무료 90일이 없어질 수 있다"고 적혀 있어서, **새 gmail 계정**으로 가입하는 게 확실해요. |
| 가장 확실한 방법은? | **② Google AI Studio 선결제(Prepay) $5부터.** 나노바나나 2.1 기준 1장 약 45원 → $5(약 6,700원)로 약 150장, $20로 약 600장. |
| 손으로 테스트(발표 시안, 프롬프트 실험)만 할 거면? | **③ Gemini 앱 구독(Google AI Pro, 미국 $19.99/월)** 이나 ChatGPT Plus($20/월). 앱에 연결은 안 되지만 프롬프트 다듬기에 좋아요. |
| 우리 앱에 바로 붙일 수 있나요? | 네. 앱에 이미 제미나이 연결 코드가 있어요(`src/lib/imagegen.js`, 설정 › 이미지 AI에 키 입력). 다만 **결제 키를 공개 사이트(GitHub Pages)에 넣으면 안 돼요** → 발표·데모는 "각자 기기 설정에 키 입력", 실제 서비스는 작은 서버(키 숨기기)가 필요해요. |

---

## 1. 40만 원 크레딧이 안 되는 이유 (공식 문구)

- Google Cloud 무료 체험 안내 (docs.cloud.google.com/free/docs/free-cloud-features)
  - "The $300 credit can't pay for Gemini platform (formerly known as Gemini Enterprise Agent Platform, Vertex AI) services if you sign up for a free trial or upgrade to a paid account on or after **November 16, 2026**."
  - "The $300 credit can't pay for Gemini API in AI Studio costs."
- Gemini API 결제 안내 (aistudio.google.com/docs/billing)
  - "Can I use my Google Cloud Welcome credit with the Gemini API? **No**"

👉 40만 원 크레딧은 VM·저장소 같은 **다른** 구글 클라우드 서비스에만 쓸 수 있어요(나중에 키를 숨길 작은 서버를 Cloud Run으로 만들 때는 쓸 수 있음). **'업그레이드' 버튼은 누르지 마세요** — 누르면 카드 결제가 시작돼요.

---

## 2. 방법 ① Vertex AI express mode (무료 90일) — 버튼 순서

> 미리보기(Preview) 기능이라 화면 이름이 조금 다를 수 있어요. 새 gmail 계정으로 하면 가장 확실해요.

1. 크롬에서 **팀 공용 새 gmail 계정**으로 로그인 (기존 체험 계정과 다른 계정 추천)
2. 주소창에 `https://console.cloud.google.com/expressmode` 입력
3. 약관 화면에서 국가 **대한민국** 선택 → 동의 체크 → **[동의 및 계속]**(Agree and continue)
4. 가입이 끝나면 **API 키가 자동으로 만들어져요.** 화면에 보이는 키 옆 **복사 아이콘** 클릭
   - 다시 보려면: `https://console.cloud.google.com/agent-platform/studio/settings/api-keys` (Agent Studio › **API Keys**)
5. **먼저 화면에서 시험해 보기**
   1. 왼쪽 메뉴 **Agent Studio** → **Create prompt** (주소: `console.cloud.google.com/agent-platform/studio/multimodal`)
   2. 오른쪽 위 **Switch model** → `gemini-3.1-flash-image`(나노바나나 2) 선택
   3. **Outputs** 칸 드롭다운에서 **Image and text** 선택
   4. 아래 **Write a prompt** 칸에 4장의 프롬프트 붙여 넣기 → **Prompt** 버튼
   5. 마음에 들면 **Get code** 로 코드 복사 가능
6. 쓸 수 있는 이미지 모델(express mode 표): `gemini-3.1-flash-image`(나노바나나 2), `gemini-3-pro-image`(나노바나나 Pro), `gemini-2.5-flash-image`(나노바나나, 분당 10회). ※ `gemini-nano-banana-2.1`은 express mode 목록에 없어요.
7. 앱에서 부를 주소 (키는 헤더로)
   ```
   POST https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-3.1-flash-image:generateContent
   헤더  x-goog-api-key: (복사한 키)
   본문  { "contents":[{"role":"user","parts":[{"text":"프롬프트"}]}],
           "generationConfig":{"responseModalities":["TEXT","IMAGE"],"imageConfig":{"aspectRatio":"4:5"}} }
   ```
   (현재 앱 코드는 AI Studio 주소를 써요 → express mode 키를 쓰려면 이 주소로 부르는 경로를 하나 추가하면 돼요.)

⚠️ 무료 90일이 지나거나 "결제 사용 설정(Activate now)"을 누르면 유료로 바뀌어요. 하루 한도(RPD)는 공식 페이지에 숫자가 없어서 직접 써 보며 확인해야 해요.

---

## 3. 방법 ② Google AI Studio 선결제 (가장 확실) — 버튼 순서

1. `https://aistudio.google.com` 접속 → 구글 계정 로그인
2. 왼쪽 아래 **Get API key** (또는 `aistudio.google.com/api-keys`) → **Create API key** → 프로젝트 선택(없으면 새로 만들기) → 키 **복사**
3. 같은 화면(또는 `aistudio.google.com/projects`)의 프로젝트 줄에서 **Billing Tier** 칸의 **[Set up billing]** 클릭
4. 결제 계정
   - 처음이면: 국가 **대한민국** → 약관 동의 → 연락처·카드 입력
   - 이미 있으면 목록에서 고르기 (※ "무료 체험" 상태 결제 계정은 바로 안 될 수 있어요 → 화면 안내에 따라 AI Studio에서 결제 활성화)
5. **선결제 금액** 입력 — 최소 **$5**, 처음엔 $5~$20 추천 → 결제
   - 잔액이 0이 되면 자동으로 멈춰요(더 안 나가요). 충전은 Billing 화면의 **[Buy credits]**
6. 사용량 확인: `aistudio.google.com/usage` · 한도 확인: `aistudio.google.com/rate-limit`
7. **화면에서 시험**: AI Studio 왼쪽 **Create / Playground** → 모델 목록에서 **Nano Banana** 계열(예: `gemini-nano-banana-2.1`, `gemini-3.1-flash-image`, `gemini-3-pro-image`) 선택 → 프롬프트 입력 → **Run**
8. **우리 앱에 넣기(데모용)**: 앱 **마이 › 지도·AI 연결(설정) › 이미지 AI** 칸에 키 붙여 넣기 → 저장. 주문서 1단계 "원하는 사진으로 → AI 실사", 지도 "AI 찾기 › AI 실사 사진 만들기"에서 바로 써요. 키는 그 기기에만 저장돼요.

### 가격 (AI Studio 가격표, 1장 기준 · 환율은 우리 콘솔 기준 $1≈₩1,343)
| 모델 | 별명 | 1K | 2K | 4K | 추천 용도 |
|---|---|---|---|---|---|
| `gemini-nano-banana-2.1` | 나노바나나 2.1 | $0.034 (약 45원) | $0.050 | $0.113 | **기본값** (싸고 빠름) |
| `gemini-3.1-flash-image` | 나노바나나 2 | $0.067 (약 90원) | $0.101 | $0.151 | express mode 무료 시험 |
| `gemini-3-pro-image` | 나노바나나 Pro | $0.134 (약 180원) | $0.134 | $0.24 | 글자·디테일이 중요한 "최종 시안" |
| `gemini-2.5-flash-image` | 나노바나나 (구) | $0.039 | – | – | 2027-03-15 종료 예정 |

> 표는 가격 페이지를 요약한 값이라 결제 전 `ai.google.dev/gemini-api/docs/pricing`에서 꼭 다시 확인하세요. 무료 티어(무료 할당량)에는 이미지 모델이 **없어요**.

**예산 감**: 손님 1명이 시안 3장(2.1) + 최종 1장(Pro) ≈ 45×3 + 180 = **약 315원**. 발표 시연 100명분 ≈ 3만 원.

---

## 4. 방법 ③ 구독형 사이트 (손으로 시안 뽑기 · 프롬프트 실험)

| 사이트 | 가격(대략) | 잘하는 것 | 약한 것 | 앱 연결 |
|---|---|---|---|---|
| **Gemini 앱** (Google AI Pro) | 미국 $19.99/월 | 나노바나나 Pro, 실사·사진 고치기, 사진 여러 장 합치기 | 한도 넘으면 일반 모델로 내려감 | ✗ (API는 별도 결제) |
| **ChatGPT Plus** (GPT Image) | $20/월 (Go $8) | 글자(영문) 정확, 말로 고치기 | 실사 질감은 나노바나나보다 덜함 | OpenAI API 종량제 따로 |
| **Midjourney** | $10~/월 | 분위기·감성 최고 | 글자 약함, 공식 API 없음 | ✗ |
| **Ideogram** | 무료~ / Plus $20 | 글자 들어간 이미지 | 실사 케이크 질감 보통 | API 있음 |
| **FLUX** (fal.ai · Replicate) | 1장 약 4~100원 종량제 | 싸고 실사 좋음 | 사진 고치기(편집) 약함 | API ✓ (앱에 무료 FLUX 경로 이미 있음) |
| Leonardo · Krea | 무료~ / 월 $10대 | 여러 모델 한곳에서 | 품질 편차 | 일부 API |

**추천 조합**
- 앱에 붙일 주력: **나노바나나 2.1(기본) + 나노바나나 Pro(최종 시안)** — AI Studio 선결제
- 무료 백업: express mode `gemini-3.1-flash-image` → 앱의 무료 FLUX → 무료 대기열(이미 구현)
- 팀 프롬프트 실험·발표 자료: Gemini 앱 Pro 구독 1개를 팀이 같이

**한글 글자 팁**: 어떤 모델도 한글 레터링은 가끔 틀려요. → AI에게는 **"윗면 가운데를 비워 둔 케이크"** 를 그리게 하고, 문구는 **앱이 실제 글꼴로 얹기**(관심 탭 예시 사진이 이미 이 방식). Pro는 짧은 한글(5자 이하)은 꽤 잘 써서, "AI가 쓴 글자" / "앱 글꼴로 얹기" 둘 다 보여 주고 고르게 하면 좋아요.

---

## 5. 카테고리 10개 (케이크잇 6개 → 우리 10개)

케이크잇: 반려동물 · 이모티콘 · 캐릭터 · 문구 · 로고 · 케이크 도안(+인물 사진).
우리는 **"무엇을 넣나(입력)"** 와 **"어떻게 만드나(기법)"** 를 나눠서 10개로 정리해요. 각 카테고리가 바로 **계산서 항목**과 **가게 추천 스타일**에 연결돼요.

| # | 카테고리 | 손님이 넣는 것 | 케이크 위 표현 | 계산서 연결 (기본 메뉴 기준) | 추천 가게 스타일 |
|---|---|---|---|---|---|
| 1 | **문구(레터링)** | 문구만 | 크림 글씨 + 테두리 | 심플 0원 / 빈티지 +5,000 | lettering |
| 2 | **내 사진처럼(리메이크)** | 마음에 드는 케이크 사진 1장 | 그 케이크를 실사로 재현 | 사진에서 읽은 디자인 | 사진 분석 결과 |
| 3 | **반려동물** | 강아지·고양이 사진 1장 | 얼굴을 크림 드로잉 | 그림·캐릭터 +10,000 | character |
| 4 | **인물 캐리커처** | 얼굴 사진 1장 | 단순한 크림 드로잉 | 그림·캐릭터 +10,000 | character |
| 5 | **이모티콘·내 그림** | 이모티콘 캡처나 손그림 1장 | 그림 그대로 크림으로 | 그림·캐릭터 +10,000 | character |
| 6 | **캐릭터 느낌** | 좋아하는 캐릭터(이름·사진) | **비슷한 느낌의 오리지널** 그림 | 그림·캐릭터 +10,000 (사장님 확인) | character |
| 7 | **로고·엠블럼** | 학교·회사·동아리 로고 | 로고를 크림/인쇄로 | 포토 +6,000 또는 그림 +10,000 | photo / character |
| 8 | **포토 케이크** | 사진 1장 | 식용 인쇄 | 포토 +6,000 | photo |
| 9 | **꽃 케이크** | 꽃 종류·색 고르기 | 버터크림·앙금 꽃 | 플라워 +8,000 | flower / rice |
| 10 | **입체·특별 모양** | 모양 고르기(하트·숫자·2단·가방…) | 모양 자체가 디자인 | 하트·사각 +2,000 / 2단·입체는 상담 | tiered / 3d |

**모든 카테고리 공통 옵션**: 크기(도시락·미니·1호·2호) · 크림 색 · 시트 맛 · 토핑(체리·딸기·진주·리본) · 문구 · 초 — 이미 주문서 2단계에 있는 항목이라 그대로 연결돼요.
**떡케이크·도시락**은 카테고리가 아니라 "바탕(케이크 종류) 옵션"으로 둬요 → 어느 카테고리든 고를 수 있게.

---

## 6. 프롬프트 설계 (Claude가 만들고, 나노바나나가 그림)

### 6-1. 역할 나누기
1. 손님이 카테고리 + 사진/문구 + 옵션(크기·색·토핑)을 고름
2. **Claude**가 그걸 아래 JSON으로 정리 → 영어 프롬프트로 바꿈 (한국어보다 영어가 결과가 안정적)
3. **나노바나나**가 이미지 생성 (사진이 있으면 사진도 같이 넣음 = 편집 모드)
4. 손님이 **그림판**으로 고침(펜·크림·지우개·글자) 또는 "꽃만 빼 줘" 같이 말로 고치기 → Claude가 편집 지시문을 만들어 다시 생성
5. JSON의 옵션 → **계산서**(앱의 `estimate()`), 카테고리·스타일·예산 → **가게 추천**(앱의 `rankStores()`)

```json
{
  "category": "pet",
  "shape": "round", "size": "h1", "cream": "white",
  "main": "puppy face drawing", "toppings": ["pearl"], "text": "",
  "keep_from_photo": ["ear shape", "fur color", "eye patch"],
  "angle": "top-down", "lettering_mode": "blank-for-app"
}
```

### 6-2. 공통 틀 (형우님 프롬프트를 다듬은 버전)
```
[PHOTO]  Ultra-realistic product photograph of a handmade Korean custom cake from a small boutique bakery.
[CAKE]   {shape} {size_desc} cake, smooth {cream} buttercream, {border} piped border.
[MAIN]   {category module}
[DECOR]  {at most 2 small decorations}, decorations do not overlap the main design.
[TEXT]   {lettering rule}
[CAMERA] {angle}, whole cake visible and centered, generous empty space around it, soft diffused daylight,
         warm ivory background, 85mm lens look, sharp focus, natural shadows, real buttercream texture
         with subtle handmade imperfections. Square 1:1 (or 4:5 for the app).
[NO]     No people, no hands, no utensils, no extra cakes, no packaging, no logos or watermarks (unless requested),
         no floating decorations, no illustration or cartoon style for the cake itself, no CGI look, no blur.
```
**형우님 원본에서 바꾼 점**
- 장식을 **주장식 1 + 보조 2개까지**로 제한 (꽃 5 + 체리 3 + 리본 2 + 곰 + 진주를 다 넣으면 섞이거나 빠져요)
- 글자가 중요하면 **위에서 내려다본 각도(top-down) 또는 45°** — 30° 3/4 각도는 윗면 글자가 찌그러져요
- 한국 커스텀 케이크 느낌 단어 추가: `Korean lettering cake, minimal, vintage Lambeth piping, dosirak mini cake`
- 한글 문구는 기본 **비워 두고 앱이 얹기**: `[TEXT] the top center is left completely blank and smooth for lettering, no text`
  (영문·숫자 짧은 문구는 `the words "Happy Birthday" piped clearly in dark pink buttercream`처럼 넣어도 됨)

### 6-3. 카테고리별 [MAIN] 모듈 + 바꿀 수 있는 것
| # | [MAIN] 모듈 (영어) | 손님이 바꿀 수 있는 것 |
|---|---|---|
| 1 문구 | `Minimal lettering cake; the design is only the piped border and lettering space.` + 테두리 종류 | 테두리(셸·진주·빈티지 프릴), 글씨 위치(가운데/아래), 크림 색 |
| 2 리메이크 | (사진 첨부) `Recreate the cake in the attached photo as a real photograph. Keep its shape, colors and piped decorations. Remove all text from the top and keep it smooth.` | "색만 바꿔", "하트 모양으로", "체리 빼기" |
| 3 반려동물 | (사진 첨부) `On top: a cute simple hand-piped buttercream line drawing of the pet in the attached photo, keeping its {fur color, ear shape, markings}. 2–3 colors only, thick outlines.` | 얼굴만/전신, 선 굵기, 색 수(2~4), 크림 색 |
| 4 인물 | (사진 첨부) `On top: a simple cute caricature of the person's face drawn in buttercream lines, friendly expression, keep hairstyle and glasses.` | 단순 드로잉/캐리커처, 머리 모양 강조, 배경 하트 |
| 5 이모티콘·내 그림 | (그림 첨부) `Reproduce the attached drawing on the cake top as hand-piped buttercream art, same pose and colors, slightly simplified.` | 크기(윗면 전체/한쪽), 색 단순화 정도 |
| 6 캐릭터 느낌 | `An original cute character inspired by {mood: e.g. "a round white puppy with big eyes"} hand-piped on top.` ※ 실제 캐릭터를 그대로 그리게 하지 않음 | 동물 종류, 표정, 포즈 |
| 7 로고 | (로고 첨부) `Place the attached emblem on the cake top as {piped buttercream / edible print}, centered, faithful shapes and colors.` | 크림/인쇄, 크기, 아래 문구 |
| 8 포토 | (사진 첨부) `The top is covered with an edible printed photo of the attached image, with a piped border framing it.` | 사진 자르기, 테두리 색 |
| 9 꽃 | `{flower types} made of {buttercream / bean-paste (앙금)} arranged in a {crescent on one side / full wreath / small bouquet}.` | 꽃 종류·색·배치, 잎 색 |
| 10 입체·모양 | `A {heart / number "3" / two-tier / handbag}-shaped sculpted cake, clean edges, realistic sponge layers if cut.` | 모양, 단 수, 크기 |

### 6-4. 고치기(편집) 지시문 예시
- `Edit the image: remove the cherries only. Keep everything else exactly the same.`
- `Change the cream color to pastel lavender. Do not change the drawing or the border.`
- `Make the puppy drawing 20% bigger and move it to the upper half, leave the lower third blank for lettering.`
→ 나노바나나는 "원본을 넣고 이 부분만 바꿔" 편집을 잘해요. 손님이 말로 쓰면 Claude가 이런 문장으로 바꿔 줘요.

---

## 7. 앱 흐름 (만들 순서)

```
카테고리 10개 중 선택  →  사진·문구·옵션 넣기  →  [AI 실사 만들기] 3장 후보
   →  1장 고르기  →  그림판으로 고치기 / 말로 고치기  →  계산서(예상 금액 줄줄이)
   →  "이 케이크를 만들 수 있는 가게" 추천 (스타일·예산·거리)  →  가게 고르면 주문서 2/2로 바로
```

| 단계 | 지금 앱에 있는 것 | 새로 만들 것 |
|---|---|---|
| 카테고리 고르기 | 지도 "AI 찾기" · 주문서 1단계 "원하는 사진으로" | 카테고리 10개 카드 화면(케이크잇 카드처럼 예시 사진 + "시작하기") |
| 프롬프트 | `imagegen.js`의 `buildPrompt()` (모드 3개, 단어표) | Claude로 JSON → 카테고리 모듈 프롬프트 (6장) |
| 이미지 생성 | 제미나이 → 무료 FLUX → 무료 대기열 | 모델 선택(2.1 기본 / Pro 최종), 후보 3장, express mode 주소 |
| 고치기 | 그림판(펜·크림·지우개·글자) | "말로 고치기"(편집 지시문) |
| 계산서 | `estimate()` (주문서 예상 금액) | AI 결과 화면에 계산서 카드(기본 + 디자인 + 토핑 + 문구) |
| 가게 추천 | `rankStores()` (스타일·예산·사진 색 비교) | AI 결과 → 추천 가게 3곳 + "이 디자인으로 주문" |

---

## 8. 꼭 지킬 것

- **키 보안**: AI Studio·express mode 키는 결제와 연결된 키예요. 코드·GitHub·공개 사이트에 넣지 말 것. (카카오 지도 JS 키와 달리 도메인 제한이 없어요.) 실제 서비스는 Cloud Run·Cloudflare Worker 같은 작은 서버에 키를 두고, 1인당 하루 몇 장으로 제한.
- **저작권·상표**: 애니·브랜드 캐릭터를 "그대로" 그리게 하지 않기(6번은 "비슷한 느낌의 오리지널"). 로고는 **본인 단체 것만**. 경찰·학교 엠블럼 같은 공공 상징은 사장님이 확인.
- **초상권·개인정보**: 인물 사진은 본인·동의한 사람만. 사진은 이미지 생성에만 쓰고 저장하지 않는다고 화면에 안내.
- **"예시" 표시**: AI 이미지는 실제 가게 작품이 아니므로 항상 "AI 예시"라고 표시(앱은 이미 그렇게 함). 실물은 가게마다 달라요.
- **한도 넘침**: express mode 무료는 분당·일일 한도가 있어요 → 실패하면 무료 FLUX로 자동 넘어가게(이미 구현된 순서 유지).

---

## 9. 다음에 할 일 (제안)
1. 새 gmail로 **express mode 가입 → Agent Studio에서 6-2 공통 틀 + 카테고리 3개(문구·반려동물·꽃) 시험** → 잘 나온 프롬프트를 팀 시트에 저장
2. express mode가 안 되면 **AI Studio에 $5 선결제** → 같은 시험
3. 결과 좋으면 앱에 **카테고리 10개 화면 + 모델 선택 + express mode 주소** 붙이기
4. 그다음 **계산서 카드 + 추천 가게 3곳** 연결

---

## 출처
- Google Cloud 무료 체험·크레딧 제외: https://docs.cloud.google.com/free/docs/free-cloud-features
- Gemini API 결제(Prepay, 체험 크레딧 불가): https://aistudio.google.com/docs/billing
- Gemini API 가격: https://ai.google.dev/gemini-api/docs/pricing
- 이미지 생성(Agent Studio 사용법): https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/image-generation
- 나노바나나 2 모델: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-1-flash-image
- 나노바나나 Pro 모델: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-pro-image
- Vertex AI express mode: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/express-mode/overview
- API 키 안내: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/api-keys
- Gemini 앱 구독 한도: https://support.google.com/gemini/answer/16275805
- 이미지 AI 비교(제3자 정리, 참고용): https://dupple.com/learn/best-ai-image-generators · https://www.theinsight.tech/articles/best-ai-image-generators-in-2026-i-tested-nano-banana-pro-vs-midjourney-vs-flux-heres-what-actually-wins · https://rangy.ai/blog/ai-image-generators-2026-complete-guide/ · https://aibusinessweekly.net/p/ideogram-pricing
- 케이크잇: https://cakeit.kr · 제작기 https://www.gpters.org/media/post/service-creates-lettering-cake-7TdoN8kPls9xxIx
