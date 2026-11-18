// 관심 탭 '케이크 둘러보기' 사진 목록
// 사진은 공개 AI 모델 FLUX.1 [schnell](Apache-2.0, 결과물 자유 이용)로 만든 '예시 사진'이다. 실제 가게 작품이 아니다.
// t: 제목 · tags: 검색어 · st: 가게 찾기 스타일(catalog STYLES) · d: 주문서 디자인(DESIGNS) · sh: 모양 · cr: 크림색(CREAMS) · tp: 토핑 · sz: 크기
// ov: 한글 문구를 사진 위에 얹을 때(위에서 본 사진만) { lines, font, color, cy, size }
const PHOTO = 'realistic food photography, soft natural window light, korean dessert cafe style, high detail, shallow depth of field';
const NOTEXT = 'no text, no letters, no writing';
const TOP = (what) => `overhead top-down photo of ${what}, completely empty smooth blank top surface in the center, on a white plate on a beige linen tablecloth, soft natural daylight, minimal, realistic food photography, ${NOTEXT}`;

export const ITEMS = [
  // ── 한글 레터링 (위에서 본 사진 + 앱 글꼴로 문구 얹기) ──
  { id: 'ko-white-birthday', t: '핑크 테두리 생일 레터링', tags: ['레터링', '생일', '화이트', '심플', '핑크', '진주'], st: ['lettering'], d: 'simple', sh: 'round', cr: 'white', tp: ['pearl'], sz: 'h1', w: 768, h: 768, seed: 11,
    p: TOP('a small round korean lettering cake, smooth plain white buttercream, delicate baby pink piped shell border with small white sugar pearls around the edge'),
    ov: { lines: ['생일 축하해'], font: 'Jua', color: '#D2557A', cy: 0.5, size: 0.105 } },
  { id: 'ko-pink-heart-love', t: '사랑해 하트 레터링', tags: ['레터링', '하트', '핑크', '연인', '기념일', '사랑'], st: ['lettering'], d: 'simple', sh: 'heart', cr: 'pink', tp: [], sz: 'h1', w: 768, h: 768, seed: 21,
    p: TOP('a heart-shaped korean lettering cake, smooth baby pink buttercream, white piped shell border around the heart edge'),
    ov: { lines: ['사랑해'], font: 'Nanum Pen Script', color: '#9B2335', cy: 0.47, size: 0.2 } },
  { id: 'ko-butter-pass', t: '합격 축하 데이지 레터링', tags: ['레터링', '합격', '축하', '노랑', '데이지', '수험생'], st: ['lettering', 'flower'], d: 'simple', sh: 'round', cr: 'butter', tp: [], sz: 'h1', w: 768, h: 768, seed: 31,
    p: TOP('a small round korean lettering cake, smooth pastel butter yellow buttercream, white piped dot border and three tiny white buttercream daisies on one side of the edge'),
    ov: { lines: ['합격', '축하해!'], font: 'Jua', color: '#6B4A2B', cy: 0.5, size: 0.12 } },
  { id: 'ko-mint-cheer', t: '오늘도 고생했어 민트 레터링', tags: ['레터링', '응원', '민트', '퇴사', '고생', '위로'], st: ['lettering'], d: 'simple', sh: 'round', cr: 'mint', tp: [], sz: 'h1', w: 768, h: 768, seed: 41,
    p: TOP('a small round korean lettering cake, smooth pastel mint green buttercream, white piped shell border around the edge'),
    ov: { lines: ['오늘도', '고생했어'], font: 'Gaegu', color: '#4A3B33', cy: 0.5, size: 0.12 } },
  { id: 'ko-lavender-parents', t: '엄마 아빠 사랑해요 레터링', tags: ['레터링', '어버이날', '부모님', '보라', '감사', '라벤더'], st: ['lettering'], d: 'simple', sh: 'round', cr: 'lavender', tp: ['pearl'], sz: 'h1', w: 768, h: 768, seed: 51,
    p: TOP('a small round korean lettering cake, smooth pastel lavender buttercream, white piped pearl border around the edge'),
    ov: { lines: ['엄마 아빠', '사랑해요'], font: 'Jua', color: '#5A3E8C', cy: 0.5, size: 0.1 } },
  { id: 'ko-cherry-anniv', t: '1주년 체리 레터링', tags: ['레터링', '기념일', '1주년', '체리', '커플', '화이트'], st: ['lettering'], d: 'simple', sh: 'round', cr: 'white', tp: ['cherry'], sz: 'h1', w: 768, h: 768, seed: 61,
    p: TOP('a small round korean lettering cake, smooth plain white buttercream, white piped border with five small red cherries placed only along the outer edge'),
    ov: { lines: ['1주년', '축하해'], font: 'Hi Melody', color: '#B3263B', cy: 0.5, size: 0.14 } },
  { id: 'ko-cocoa-thanks', t: '감사합니다 초코 레터링', tags: ['레터링', '감사', '초코', '스승의날', '선생님', '코코아'], st: ['lettering'], d: 'simple', sh: 'round', cr: 'cocoa', tp: [], sz: 'h1', w: 768, h: 768, seed: 71,
    p: TOP('a small round korean lettering cake, smooth light cocoa brown chocolate buttercream, white piped shell border around the edge'),
    ov: { lines: ['감사합니다'], font: 'Jua', color: '#FFF8EE', cy: 0.5, size: 0.11 } },
  { id: 'ko-sky-firstbday', t: '첫 돌 하늘색 레터링', tags: ['레터링', '돌', '첫돌', '아기', '하늘색', '축하'], st: ['lettering'], d: 'simple', sh: 'round', cr: 'sky', tp: [], sz: 'mini', w: 768, h: 768, seed: 81,
    p: TOP('a small round korean lettering cake, smooth pastel sky blue buttercream, white piped shell border around the edge'),
    ov: { lines: ['첫 돌', '축하해'], font: 'Jua', color: '#2F4B7C', cy: 0.5, size: 0.12 } },

  // ── 영문 레터링 ──
  { id: 'en-mint-hbd', t: 'happy birthday 민트 레터링', tags: ['레터링', '생일', '민트', '영문'], st: ['lettering'], d: 'simple', sh: 'round', cr: 'mint', tp: [], sz: 'h1', w: 768, h: 896, seed: 12,
    p: `realistic photo of a small round mint green buttercream cake with the words "happy birthday" piped in elegant brown cursive lettering on top, white piped shell border, 45 degree angle, soft natural light, cream background, korean cafe style` },
  { id: 'en-pink-loveyou', t: 'love you 하트 케이크', tags: ['레터링', '하트', '연인', '영문', '체리', '러블리'], st: ['lettering'], d: 'vintage', sh: 'heart', cr: 'pink', tp: ['cherry'], sz: 'h1', w: 768, h: 960, seed: 1122,
    p: `realistic photo of a heart-shaped baby pink buttercream cake with the words "love you" piped in red cursive lettering on top, white piped frills border, two red cherries, 45 degree angle, ${PHOTO}` },
  { id: 'en-white-thankyou', t: 'thank you 플라워 레터링', tags: ['레터링', '감사', '영문', '화이트', '꽃'], st: ['lettering', 'flower'], d: 'flower', sh: 'round', cr: 'white', tp: [], sz: 'h1', w: 768, h: 896, seed: 2132,
    p: `realistic photo of a round white buttercream cake with the words "thank you" piped in golden brown cursive lettering on top and a few small peach buttercream flowers on one side, 45 degree angle, ${PHOTO}` },
  { id: 'en-butter-congrats', t: 'congrats 사각 레터링', tags: ['레터링', '축하', '졸업', '노랑', '사각', '영문'], st: ['lettering'], d: 'simple', sh: 'square', cr: 'butter', tp: [], sz: 'h1', w: 768, h: 768, seed: 42,
    p: `realistic photo of a small square pastel butter yellow buttercream cake with the word "congrats" piped in white cursive lettering on top, white piped shell border, 45 degree angle, ${PHOTO}` },
  { id: 'en-sky-retro-hbd', t: 'Happy Birthday 하늘색 빈티지', tags: ['빈티지', '생일', '하늘색', '영문', '레터링', '프릴'], st: ['lettering'], d: 'vintage', sh: 'round', cr: 'sky', tp: [], sz: 'h1', w: 768, h: 960, seed: 152,
    p: `realistic photo of a pastel sky blue vintage lambeth cake with the words "Happy Birthday" piped in white cursive lettering on top, white piped frills and garlands on the sides, 45 degree angle, ${PHOTO}` },

  // ── 빈티지 ──
  { id: 'v-pink-heart-cherry', t: '체리 올린 핑크 하트 빈티지', tags: ['빈티지', '하트', '핑크', '체리', '생일', '프릴'], st: ['lettering'], d: 'vintage', sh: 'heart', cr: 'pink', tp: ['cherry', 'pearl'], sz: 'h1', w: 768, h: 960, seed: 7,
    p: `realistic product photo of a heart-shaped korean vintage lambeth cake, baby pink buttercream, white piped frills and garlands, small sugar pearls, two red cherries on top, 45 degree angle, soft natural window light, beige linen background, shallow depth of field, ${NOTEXT}` },
  { id: 'v-white-pearl', t: '진주 장식 화이트 빈티지', tags: ['빈티지', '화이트', '진주', '웨딩', '프릴', '우아한'], st: ['lettering'], d: 'vintage', sh: 'round', cr: 'white', tp: ['pearl'], sz: 'h2', w: 768, h: 896, seed: 17,
    p: `realistic photo of a round white vintage lambeth cake with baby pink piped scallops, white frills and many small sugar pearls, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
  { id: 'v-lavender-bow', t: '리본 라벤더 하트 빈티지', tags: ['빈티지', '리본', '보라', '라벤더', '하트'], st: ['lettering'], d: 'vintage', sh: 'heart', cr: 'lavender', tp: ['ribbon'], sz: 'h1', w: 768, h: 960, seed: 27,
    p: `realistic photo of a heart-shaped pastel lavender vintage cake with white piped frills and small white satin ribbon bows, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
  { id: 'v-mint-frill', t: '체리 민트 빈티지', tags: ['빈티지', '민트', '체리', '프릴'], st: ['lettering'], d: 'vintage', sh: 'round', cr: 'mint', tp: ['cherry'], sz: 'h1', w: 768, h: 896, seed: 37,
    p: `realistic photo of a round pastel mint vintage lambeth cake with white piped frills, garlands and red cherries on top, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
  { id: 'v-butter-heart', t: '버터옐로 하트 빈티지', tags: ['빈티지', '노랑', '하트', '프릴'], st: ['lettering'], d: 'vintage', sh: 'heart', cr: 'butter', tp: [], sz: 'h1', w: 768, h: 768, seed: 47,
    p: `realistic photo of a heart-shaped pastel butter yellow vintage cake with white ruffles and piped shells, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
  { id: 'v-hotpink-retro', t: '레트로 진핑크 체리 케이크', tags: ['레트로', '진핑크', '체리', '빈티지', '생일'], st: ['lettering'], d: 'vintage', sh: 'round', cr: 'hotpink', tp: ['cherry'], sz: 'h1', w: 768, h: 960, seed: 57,
    p: `realistic photo of a round hot pink retro cake with white piped garlands and bright red cherries around the top, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
  { id: 'v-sky-ribbon', t: '리본 하늘색 빈티지', tags: ['빈티지', '하늘색', '리본', '프릴'], st: ['lettering'], d: 'vintage', sh: 'round', cr: 'sky', tp: ['ribbon'], sz: 'h1', w: 768, h: 896, seed: 67,
    p: `realistic photo of a round pastel sky blue vintage cake with white piped garlands and small pink ribbon bows, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
  { id: 'v-red-heart', t: '발렌타인 레드 하트', tags: ['하트', '빨강', '발렌타인', '연인', '빈티지'], st: ['lettering'], d: 'vintage', sh: 'heart', cr: 'hotpink', tp: [], sz: 'h1', w: 768, h: 768, seed: 77,
    p: `realistic photo of a heart-shaped glossy red vintage cake with white piped frills, 45 degree angle, ${PHOTO}, ${NOTEXT}` },

  // ── 그림 · 캐릭터 ──
  { id: 'c-bear-sky', t: '곰돌이 얼굴 그림 케이크', tags: ['곰돌이', '캐릭터', '그림', '하늘색', '귀여운', '생일'], st: ['character'], d: 'character', sh: 'round', cr: 'sky', tp: [], sz: 'h1', w: 768, h: 768, seed: 13,
    p: `overhead photo of a small round pastel sky blue buttercream cake with a cute simple teddy bear face hand-piped in brown buttercream on top, white piped border, ${PHOTO}, ${NOTEXT}` },
  { id: 'c-bunny-white', t: '토끼 얼굴 그림 케이크', tags: ['토끼', '캐릭터', '그림', '화이트', '귀여운'], st: ['character'], d: 'character', sh: 'round', cr: 'white', tp: [], sz: 'h1', w: 768, h: 896, seed: 23,
    p: `realistic photo of a small round white buttercream cake with a cute white bunny face with pink cheeks and long ears hand-piped on top, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
  { id: 'c-chick-yellow', t: '병아리 삼총사 케이크', tags: ['병아리', '노랑', '귀여운', '캐릭터', '그림'], st: ['character'], d: 'character', sh: 'round', cr: 'white', tp: [], sz: 'h1', w: 768, h: 768, seed: 33,
    p: `overhead photo of a small round white buttercream cake decorated with three cute yellow buttercream chicks with tiny orange beaks and pastel dot border, ${PHOTO}, ${NOTEXT}` },
  { id: 'c-cat-pink', t: '고양이 얼굴 핑크 케이크', tags: ['고양이', '핑크', '캐릭터', '그림', '반려묘'], st: ['character'], d: 'character', sh: 'round', cr: 'pink', tp: [], sz: 'h1', w: 768, h: 768, seed: 43,
    p: `overhead photo of a small round baby pink buttercream cake with a cute simple cat face hand-piped in white and brown buttercream on top, ${PHOTO}, ${NOTEXT}` },
  { id: 'c-puppy-white', t: '강아지 얼굴 케이크', tags: ['강아지', '반려견', '캐릭터', '그림', '화이트'], st: ['character'], d: 'character', sh: 'round', cr: 'white', tp: [], sz: 'h1', w: 768, h: 896, seed: 53,
    p: `realistic photo of a small round white buttercream cake with a cute puppy face with floppy brown ears hand-piped on top, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
  { id: 'c-doodle-white', t: '구름 해님 낙서 케이크', tags: ['그림', '낙서', '구름', '꽃', '귀여운', '캐릭터'], st: ['character'], d: 'character', sh: 'round', cr: 'white', tp: [], sz: 'h1', w: 768, h: 768, seed: 63,
    p: `overhead photo of a round white buttercream cake with colorful hand-piped childlike doodles of blue clouds, a red sun and red tulips around the edge, playful korean drawing cake, ${PHOTO}, ${NOTEXT}` },
  { id: 'c-bear-3d', t: '입체 곰돌이 케이크', tags: ['입체', '곰돌이', '피규어', '캐릭터', '생일'], st: ['3d', 'character'], d: 'character', sh: 'round', cr: 'white', tp: [], sz: 'h2', w: 768, h: 960, seed: 73,
    p: `realistic photo of a round white buttercream cake with a cute small 3d teddy bear figure made of cream sitting on top, pastel sprinkles, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
  { id: 'c-frog-mint', t: '개구리 얼굴 민트 케이크', tags: ['개구리', '민트', '캐릭터', '그림', '귀여운'], st: ['character'], d: 'character', sh: 'round', cr: 'mint', tp: [], sz: 'mini', w: 768, h: 768, seed: 83,
    p: `overhead photo of a small round pastel mint buttercream cake with a cute simple frog face hand-piped on top, ${PHOTO}, ${NOTEXT}` },

  // ── 플라워 ──
  { id: 'f-rose-crescent', t: '장미 크레센트 플라워', tags: ['플라워', '장미', '화이트', '꽃', '우아한'], st: ['flower'], d: 'flower', sh: 'round', cr: 'white', tp: [], sz: 'h2', w: 768, h: 896, seed: 14,
    p: `realistic photo of a round white buttercream cake decorated with a crescent wreath of piped pastel pink and peach buttercream roses and green leaves, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
  { id: 'f-beanpaste-bouquet', t: '앙금 꽃다발 케이크', tags: ['앙금', '플라워', '꽃', '부케', '어버이날'], st: ['flower'], d: 'flower', sh: 'round', cr: 'white', tp: [], sz: 'h2', w: 768, h: 960, seed: 24,
    p: `realistic photo of a korean bean paste flower cake fully covered with a bouquet of pastel piped bean paste flowers, roses and peonies in pink, peach and cream, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
  { id: 'f-daisy-mini', t: '데이지 미니 케이크', tags: ['데이지', '미니', '꽃', '플라워', '화이트'], st: ['flower'], d: 'flower', sh: 'round', cr: 'white', tp: [], sz: 'mini', w: 768, h: 768, seed: 34,
    p: `realistic photo of a small mini round white buttercream cake decorated with tiny piped white daisies with yellow centers, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
  { id: 'f-hydrangea', t: '보라 수국 케이크', tags: ['수국', '보라', '꽃', '플라워', '라벤더'], st: ['flower'], d: 'flower', sh: 'round', cr: 'lavender', tp: [], sz: 'h1', w: 768, h: 960, seed: 44,
    p: `realistic photo of a round pastel lavender buttercream cake decorated with piped purple and blue hydrangea flowers on top, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
  { id: 'f-pressed-fresh', t: '생화 내추럴 케이크', tags: ['생화', '내추럴', '꽃', '플라워', '화이트'], st: ['flower'], d: 'flower', sh: 'round', cr: 'white', tp: ['freshflower'], sz: 'h1', w: 768, h: 960, seed: 54,
    p: `realistic photo of a round white buttercream cake decorated with edible pressed fresh flowers, violas and pansies, natural style, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
  { id: 'f-carnation', t: '카네이션 케이크', tags: ['카네이션', '어버이날', '부모님', '꽃', '빨강'], st: ['flower'], d: 'flower', sh: 'round', cr: 'white', tp: [], sz: 'h1', w: 768, h: 768, seed: 64,
    p: `realistic photo of a round cream colored buttercream cake decorated with piped red and pink carnation flowers and green leaves, 45 degree angle, ${PHOTO}, ${NOTEXT}` },

  // ── 하트 · 러블리 ──
  { id: 'h-heartdots-pink', t: '하트 도트 핑크 케이크', tags: ['하트', '러블리', '핑크', '도트', '연인'], st: ['lettering'], d: 'heartdots', sh: 'heart', cr: 'pink', tp: [], sz: 'h1', w: 768, h: 896, seed: 15,
    p: `realistic photo of a heart-shaped baby pink buttercream cake with many small red piped hearts on the sides and white piped border, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
  { id: 'h-tiny-hearts', t: '작은 하트 심플 케이크', tags: ['하트', '심플', '화이트', '미니멀'], st: ['lettering'], d: 'heartdots', sh: 'round', cr: 'white', tp: [], sz: 'h1', w: 768, h: 768, seed: 25,
    p: `overhead photo of a round white buttercream cake with tiny red piped hearts scattered on top, minimal style, ${PHOTO}, ${NOTEXT}` },

  // ── 드립 · 초코 ──
  { id: 'd-choco-strawberry', t: '딸기 초코 드립', tags: ['초코', '드립', '딸기', '생일'], st: ['lettering'], d: 'drip', sh: 'round', cr: 'cocoa', tp: ['strawberry'], sz: 'h2', w: 768, h: 960, seed: 16,
    p: `realistic photo of a round chocolate drip cake with glossy chocolate ganache dripping down the sides and fresh strawberries on top, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
  { id: 'd-pink-drip', t: '마카롱 핑크 드립', tags: ['드립', '마카롱', '핑크', '파티'], st: ['lettering'], d: 'drip', sh: 'round', cr: 'white', tp: ['macaron', 'sprinkle'], sz: 'h1', w: 768, h: 896, seed: 26,
    p: `realistic photo of a round white buttercream cake with pink drip, pastel macarons and sprinkles on top, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
  { id: 'd-oreo', t: '오레오 크림 케이크', tags: ['오레오', '초코', '쿠키', '크림'], st: ['lettering'], d: 'drip', sh: 'round', cr: 'white', tp: [], sz: 'h1', w: 768, h: 768, seed: 36,
    p: `realistic photo of a round cookies and cream cake with white buttercream, crushed oreo cookies and whole oreo cookies on top, 45 degree angle, ${PHOTO}, ${NOTEXT}` },

  // ── 떡케이크 ──
  { id: 'r-white-beanpaste', t: '앙금 꽃 백설기 떡케이크', tags: ['떡케이크', '앙금', '전통', '꽃', '어르신'], st: ['rice', 'flower'], d: 'flower', sh: 'round', cr: 'white', tp: [], sz: 'h2', w: 768, h: 896, seed: 18,
    p: `realistic photo of a korean rice cake made of white steamed rice seolgi decorated with pastel piped bean paste flowers on top, traditional korean tteok cake, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
  { id: 'r-pink-rice', t: '분홍 떡케이크', tags: ['떡케이크', '핑크', '어버이날', '앙금', '전통'], st: ['rice', 'flower'], d: 'flower', sh: 'round', cr: 'pink', tp: [], sz: 'h1', w: 768, h: 768, seed: 28,
    p: `realistic photo of a pink korean rice cake tteok with white and green bean paste flowers on top, 45 degree angle, ${PHOTO}, ${NOTEXT}` },

  // ── 그 밖에 ──
  { id: 'o-strawberry', t: '생딸기 생크림 케이크', tags: ['딸기', '생크림', '화이트', '심플'], st: ['lettering'], d: 'simple', sh: 'round', cr: 'white', tp: ['strawberry'], sz: 'h1', w: 768, h: 896, seed: 19,
    p: `realistic photo of a round fresh cream strawberry cake with many fresh halved strawberries on top and white whipped cream, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
  { id: 'o-number-one', t: '숫자 1 첫돌 케이크', tags: ['숫자', '돌', '첫돌', '마카롱', '아기'], st: ['custom'], d: 'simple', sh: 'square', cr: 'white', tp: ['macaron', 'freshflower'], sz: 'h3', w: 768, h: 960, seed: 29,
    p: `realistic photo of a number one shaped cream tart cake decorated with pastel macarons, meringues and small flowers, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
  { id: 'o-tiered', t: '2단 화이트 플라워', tags: ['2단', '웨딩', '행사', '플라워', '화이트'], st: ['tiered', 'flower'], d: 'flower', sh: 'round', cr: 'white', tp: ['freshflower'], sz: 'h3', w: 768, h: 1024, seed: 39,
    p: `realistic photo of an elegant two tier white buttercream cake decorated with fresh white and blush roses, ${PHOTO}, ${NOTEXT}` },
  { id: 'o-candles', t: '파티 초 생일 케이크', tags: ['생일', '초', '파티', '스프링클', '핑크'], st: ['lettering'], d: 'simple', sh: 'round', cr: 'pink', tp: ['sprinkle'], sz: 'h1', w: 768, h: 960, seed: 49,
    p: `realistic photo of a round pastel pink birthday cake with colorful sprinkles and thin lit birthday candles, warm cozy light, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
  { id: 'o-mini-duo', t: '둘이 먹는 미니 케이크', tags: ['미니', '커플', '핑크', '민트', '1인'], st: ['lettering'], d: 'simple', sh: 'round', cr: 'pink', tp: [], sz: 'mini', w: 768, h: 768, seed: 1059,
    p: `realistic photo of two small round mini layer cakes side by side on a wooden table, each about 10cm wide, one covered in smooth baby pink buttercream and one in smooth pastel mint buttercream, both with white piped shell borders on top edge, korean mini cake for two, ${PHOTO}, ${NOTEXT}` },
  { id: 'o-photo-puppy', t: '반려견 포토 케이크', tags: ['포토', '사진', '반려견', '강아지'], st: ['photo'], d: 'photo', sh: 'round', cr: 'white', tp: [], sz: 'h1', w: 768, h: 768, seed: 69,
    p: `realistic photo of a round white buttercream cake with an edible printed photo of a cute fluffy white puppy on top, white piped border, 45 degree angle, ${PHOTO}, ${NOTEXT}` },
];
