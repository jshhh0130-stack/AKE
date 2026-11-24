// AI로 원하는 케이크 만들기 — 카테고리 10개 (케이크잇 6개를 더 잘게)
// photo: 'need'(사진 필수) | 'opt'(있으면 참고) | 'none'(사진 없음)
// en: 사진이 있을 때 TOP DESIGN 영어 문장(아주 구체적으로) · enNoImg: 사진 없이 만들 때
// cake: 케이크 몸통 설명 (없으면 15cm 원형 2단 · 아이보리 버터크림 · 진주 테두리가 기본)
// styles: 만든 케이크로 가게를 찾을 때 쓰는 가게 스타일 · design: 주문서에 넘길 디자인
// img: 카드 예시 (관심 탭과 같은 AI 예시 사진 · public/gallery/s) · ex: 예시 사진(public/examples)
export const MAKE_CATS = [
  {
    id: 'letter', name: '문구', sub: '레터링 케이크로 마음 표현하기', badge: '레터링 문구', photo: 'none', img: 'ko-pink-heart-love',
    textPh: '예: 생일 축하해, 사랑해', textNeed: true, reqPh: '예: 핑크 크림, 하트 테두리, 글씨는 진한 빨강',
    en: 'a minimal Korean lettering cake — the top is smooth and clean and the lettering itself is the main design, framed by a delicate vintage piped buttercream border, with only a few tiny piped hearts or dots as accents.',
    styles: ['lettering'], design: 'simple',
  },
  {
    id: 'pet', name: '반려동물', sub: '내새끼를 위한 귀여운 케이크 만들기', badge: '사진 1장', photo: 'need', img: 'c-puppy-white',
    photoHint: '얼굴이 크게 나온 사진을 추천해요.', textPh: '예: 콩이야 생일 축하해', reqPh: '예: 얼굴만 크게, 크림 색은 연하게',
    en: "a cute, simplified line drawing of the pet from the attached photo, hand-piped in buttercream in the popular Korean drawing-cake style (그림 케이크): thick smooth dark-chocolate outlines, the face filled with flat buttercream in the pet's real fur colors, keeping its distinctive features (ear shape, fur color and patches, eye shape, nose); only the face, large and centered on the upper two-thirds of the top.",
    styles: ['character'], design: 'character',
  },
  {
    id: 'person', name: '인물 사진', sub: '얼굴 특징을 살려서 케이크 만들기', badge: '사진 1장', photo: 'need', img: null, ex: 'p6',
    photoHint: '얼굴이 정면으로 잘 보이는 사진을 추천해요.', textPh: '예: 엄마 아빠 사랑해요', reqPh: '예: 웃는 얼굴로, 배경에 작은 하트',
    en: 'a simple, cute caricature of the face of the person in the attached photo, drawn with thin dark-chocolate buttercream lines and flat pastel buttercream fills, friendly smile, keeping their hairstyle, hair color, glasses and clothing collar recognizable; Korean caricature-cake style (인물 캐리커처 케이크), centered on the upper two-thirds of the top.',
    styles: ['character'], design: 'character',
  },
  {
    id: 'emoji', name: '이모티콘·내 그림', sub: '자주 쓰는 이모티콘이나 내 그림으로', badge: '이미지 1장', photo: 'need', img: 'c-doodle-white',
    photoHint: '이모티콘 캡처나 직접 그린 그림을 올려 주세요.', textPh: '예: 생일 축하해~', reqPh: '예: 그림을 크게, 색은 단순하게',
    en: 'a faithful reproduction of the attached emoticon or drawing as flat hand-piped buttercream art — the same character, pose, expression and colors, slightly simplified, with thick dark-chocolate outlines; centered on the upper two-thirds of the top.',
    styles: ['character'], design: 'character',
  },
  {
    id: 'character', name: '캐릭터 느낌', sub: '좋아하는 캐릭터 느낌의 오리지널 그림', badge: '이미지 1장 (선택)', photo: 'opt', img: 'c-bear-sky',
    photoHint: '좋아하는 캐릭터 사진을 올리면 비슷한 느낌으로 그려요. 똑같이 베끼지는 않아요.', textPh: '예: 신조 사사게요', reqPh: '예: 동그란 하얀 강아지, 큰 눈',
    en: 'an ORIGINAL cute character inspired by the mood, colors and silhouette of the attached image (not an exact copy of any copyrighted or brand character), hand-piped in buttercream with thick dark outlines and flat colors, centered on the upper two-thirds of the top.',
    enNoImg: 'an original cute round character described in the customer request (not a copy of any copyrighted or brand character), hand-piped in buttercream with thick dark outlines and flat pastel colors, centered on the upper two-thirds of the top.',
    styles: ['character'], design: 'character',
  },
  {
    id: 'logo', name: '로고·엠블럼', sub: '학교·회사·동아리 로고를 케이크에', badge: '이미지 + 레터링', photo: 'need', img: 'ko-cocoa-thanks',
    photoHint: '우리 단체 로고만 올려 주세요. 다른 브랜드 로고는 만들 수 없어요.', textPh: '예: 진급 축하해요', reqPh: '예: 남색 크림, 로고는 가운데 크게',
    en: 'the emblem from the attached image reproduced precisely in smooth piped buttercream (keep its exact shapes, proportions and colors; very fine details may look like an edible print), centered on the top.',
    styles: ['character', 'photo'], design: 'character',
  },
  {
    id: 'photo', name: '포토 케이크', sub: '사진을 그대로 인쇄한 케이크', badge: '사진 1장', photo: 'need', img: 'o-photo-puppy',
    photoHint: '인쇄할 사진을 올려 주세요.', textPh: '예: 우리 1주년', reqPh: '예: 테두리는 하늘색',
    en: 'the attached photo printed on a round edible sugar sheet that covers the center of the top with accurate colors and no distortion, framed by a neat piped buttercream pearl border.',
    styles: ['photo'], design: 'photo',
  },
  {
    id: 'flower', name: '꽃 케이크', sub: '버터크림·앙금 꽃으로 꾸미기', badge: '사진 선택', photo: 'opt', img: 'f-rose-crescent',
    photoHint: '원하는 꽃 사진이 있으면 올려 주세요.', textPh: '예: 감사합니다', reqPh: '예: 분홍 장미와 데이지, 한쪽에 초승달 모양',
    en: 'lush buttercream flowers matching the flower types and colors in the attached photo, piped with realistic layered petals and sage-green leaves, arranged in a crescent along one side of the top while the rest stays smooth.',
    enNoImg: 'lush buttercream flowers — roses, small peonies and tiny daisies in soft pastel pink, peach and ivory with sage-green leaves — piped with realistic layered petals and arranged in a crescent along one side of the top while the rest stays smooth.',
    styles: ['flower'], design: 'flower',
  },
  {
    id: 'shape', name: '입체·특별 모양', sub: '하트·숫자·2단 등 모양 케이크', badge: '사진 선택', photo: 'opt', img: 'o-tiered',
    photoHint: '원하는 모양 사진이 있으면 올려 주세요.', textPh: '예: 첫 돌 축하해', reqPh: '예: 하트 모양, 2단, 숫자 1 모양',
    en: 'the cake itself is sculpted into the shape shown in the attached photo, with clean sharp edges and smooth buttercream.',
    enNoImg: 'the cake itself is sculpted into the shape described in the customer request (for example a heart, a number, two tiers or a four-leaf clover), with clean sharp edges and smooth buttercream.',
    cake: 'CAKE: a sculpted shaped cake about 9cm tall, covered in perfectly smooth soft-ivory whipped buttercream with a matte finish and a neat border of small piped buttercream pearls around the edges.',
    styles: ['3d', 'tiered'], design: 'simple',
  },
  {
    id: 'remake', name: '내 사진처럼', sub: '마음에 드는 케이크 사진을 실사 도안으로', badge: '사진 1장', photo: 'need', img: 'v-sky-ribbon',
    photoHint: '만들고 싶은 케이크 사진을 올려 주세요.', textPh: '예: 다희야 생일 축하해', reqPh: '예: 색만 연보라로, 체리 빼기',
    en: 'recreate the cake shown in the attached photo as a brand-new realistic photograph: the same shape, cream colors, piping style and decorations, with the customer request changes applied; remove any existing text from the original and use only the lettering specified below.',
    cake: '', styles: ['lettering'], design: 'simple',
  },
];
export const makeCatOf = (id) => MAKE_CATS.find((c) => c.id === id);
