// 커피 플레이버 휠 (Counter Culture Coffee Taster's Flavor Wheel 한국어판).
// 이름은 휠에 적힌 한글·영어 그대로, 색은 휠 이미지의 각 칸에서 뽑은 픽셀 색이다.
// 순서는 휠의 시계 방향. [한글, 영어, 색, 하위 목록]
const WHEEL = [
  ['과일', 'Fruit', '#f218a6', [
    ['감귤류', 'Citrus', '#f4f238', [
      ['레몬', 'Lemon', '#f0f036'], ['라임', 'Lime', '#b4de4e'], ['자몽', 'Grapefruit', '#f6ae72'],
      ['귤', 'Clementine', '#fcc024'], ['오렌지', 'Orange', '#f6ba24'], ['블러드 오렌지', 'Blood Orange', '#f47e2a'],
    ]],
    ['사과/배', 'Apple/Pear', '#bedc56', [
      ['청사과', 'Green Apple', '#b4d85a'], ['사과', 'Red Apple', '#f0242a'], ['배', 'Asian Pear', '#d2c642'],
    ]],
    ['멜론', 'Melon', '#70bc8a', [
      ['수박', 'Watermelon', '#f6b496'], ['허니듀', 'Honeydew', '#deea9c'], ['캔털루프', 'Cantaloupe', '#fcde78'],
    ]],
    ['포도', 'Grape', '#b04c64', [
      ['백포도', 'White Grape', '#f0f6d2'], ['청포도', 'Green Grape', '#d2e47e'], ['적포도', 'Red Grape', '#d83078'],
      ['콩코드 포도', 'Concord Grape', '#ba1e1e'],
    ]],
    ['열대 과일', 'Tropical Fruit', '#fabc24', [
      ['리치', 'Lychee', '#f06c2a'], ['스타 후르츠', 'Star Fruit', '#f6ea18'], ['타마린드', 'Tamarind', '#cca24e'],
      ['패션 후르츠', 'Passion Fruit', '#f6f030'], ['파인애플', 'Pineapple', '#fcea00'], ['망고', 'Mango', '#fcd236'],
      ['파파야', 'Papaya', '#f6a83c'], ['키위', 'Kiwi', '#c6e448'], ['바나나', 'Banana', '#f6f618'], ['코코넛', 'Coconut', '#fef8f4'],
    ]],
    ['핵과류', 'Stone Fruit', '#fcc6a0', [
      ['복숭아', 'Peach', '#f6c072'], ['천도복숭아', 'Nectarine', '#f69630'], ['살구', 'Apricot', '#fcd242'],
      ['자두', 'Plum', '#481260'], ['체리', 'Cherry', '#f6302a'], ['블랙 체리', 'Black Cherry', '#840c0c'],
    ]],
    ['베리', 'Berry', '#546acc', [
      ['크랜베리', 'Cranberry', '#ba1e1e'], ['산딸기', 'Raspberry', '#f02430'], ['딸기', 'Strawberry', '#f6483c'],
      ['블루베리', 'Blueberry', '#4e60cc'], ['블랙베리', 'Blackberry', '#423090'], ['커런트', 'Currant', '#241860'],
    ]],
    ['말린 과일', 'Dried Fruit', '#0cb6de', [
      ['골든 레이즌', 'Golden Raisin', '#ded83c'], ['건포도', 'Raisin', '#d29c36'], ['말린 무화과', 'Dried Fig', '#d86c3c'],
      ['말린 대추', 'Dried Date', '#902a0c'], ['말린 자두', 'Prune', '#30120c'],
    ]],
  ]],
  ['초콜릿', 'Chocolate', '#543826', [
    ['제과용 초콜릿', "Baker's Chocolate", '#602218'], ['다크 초콜릿', 'Dark Chocolate', '#882822'],
    ['비터스윗 초콜릿', 'Bittersweet Chocolate', '#864a44'], ['밀크 초콜릿', 'Milk Chocolate', '#a45c5a'],
    ['화이트 초콜릿', 'White Chocolate', '#fcf2e4'],
  ]],
  ['달콤하고 설탕 같은', 'Sweet & Sugary', '#f8f8f8', [
    ['바닐라', 'Vanilla', '#fcface'], ['마지팬', 'Marzipan', '#fefcec'], ['누가', 'Nougat', '#e0a450'], ['꿀', 'Honey', '#f2ce72'],
    ['버터', 'Butter', '#faf4b8'], ['크림', 'Cream', '#fcfaee'], ['마시멜로', 'Marshmallow', '#fcfaf6'],
    ['사탕수수', 'Cane Sugar', '#f8f8f8'], ['설탕 시럽', 'Simple Syrup', '#fefcf6'], ['황설탕', 'Brown Sugar', '#8c6222'],
    ['캐러멜', 'Caramel', '#e28432'], ['메이플 시럽', 'Maple Syrup', '#966024'], ['당밀', 'Molasses', '#503818'], ['콜라', 'Cola', '#725a4e'],
  ]],
  ['견과류', 'Nut', '#e6cca0', [
    ['호두', 'Walnut', '#c68430'], ['땅콩', 'Peanut', '#d2ae60'], ['캐슈', 'Cashew', '#fcf0e4'],
    ['피칸', 'Pecan', '#724818'], ['헤이즐넛', 'Hazelnut', '#9c6024'], ['아몬드', 'Almond', '#e4d8cc'],
  ]],
  ['곡물과 곡류', 'Grain & Cereal', '#f4ecce', [
    ['팝콘', 'Popcorn', '#fcf6c6'], ['페이스트리', 'Pastry', '#cc9c42'], ['구운 귀리', 'Toasted Oats', '#eaded2'],
    ['통밀 크래커', 'Graham Cracker', '#d8a84e'], ['호밀', 'Rye', '#c68430'], ['밀', 'Wheat', '#fcf0e4'],
    ['보리', 'Barley', '#d2c0a2'], ['맥아', 'Malt', '#a89c84'], ['갓 구운 빵', 'Fresh Bread', '#dec6a2'],
  ]],
  ['구운', 'Roast', '#a6a4a4', [
    ['토스트', 'Toast', '#d29c72'], ['탄 설탕', 'Burnt Sugar', '#c0844e'], ['스모키', 'Smoky', '#8a8484'],
    ['카본', 'Carbon', '#000000'], ['흑후추', 'Black Pepper', '#424242'], ['백후추', 'White Pepper', '#f6f6e4'],
  ]],
  ['향신료', 'Spice', '#f89292', [
    ['계피', 'Cinnamon', '#ba722a'], ['고수', 'Coriander', '#e4de5a'], ['생강', 'Ginger', '#f0eaa8'], ['넛맥', 'Nutmeg', '#c68430'],
    ['커민', 'Cumin', '#cc9c48'], ['감초/아니스', 'Licorice/Anise', '#6c4818'], ['정향', 'Clove', '#663c18'],
  ]],
  ['풍미있는', 'Savory', '#f64c2e', [
    ['가죽', 'Leathery', '#c66624'], ['고기 같은', 'Meat-like', '#ba1e24'], ['간장', 'Soy Sauce', '#663012'],
    ['말린 토마토', 'Sundried Tomato', '#cc5a2a'],
  ]],
  ['야채/흙/허브', 'Vegetal/Earthy/Herb', '#4aca5e', [
    ['흙', 'Soil', '#4e3618'], ['나무', 'Wood', '#dea24e'], ['삼나무', 'Cedar', '#d27236'], ['담배', 'Tobacco', '#843c12'],
    ['밀짚', 'Straw', '#e4de5a'], ['초록 잎', 'Leafy Greens', '#487848'], ['올리브', 'Olive', '#9cc072'],
    ['피망', 'Green Pepper', '#48c660'], ['호박', 'Squash', '#48ae4e'], ['버섯', 'Mushroom', '#f0f0de'], ['당근', 'Carrot', '#fcae48'],
    ['토마토', 'Tomato', '#f64224'], ['스위트 피', 'Sweet Pea', '#b4d854'], ['루바브', 'Rhubarb', '#fc668a'], ['풀', 'Grassy', '#a2c04e'],
    ['딜', 'Dill', '#b4d854'], ['세이지', 'Sage', '#788a36'], ['민트', 'Mint', '#90ba48'], ['녹차', 'Green Tea', '#c6d884'],
    ['홍차', 'Black Tea', '#3c2412'], ['홉', 'Hops', '#b4d84e'], ['베르가못', 'Bergamot', '#96c04e'],
  ]],
  ['꽃향', 'Floral', '#d4d4ea', [
    ['히비스커스', 'Hibiscus', '#f06c88'], ['로즈/로즈워터', 'Rose/Rosewater', '#f8dae8'], ['라벤더', 'Lavender', '#c2c6e4'],
    ['목련', 'Magnolia', '#faf8f2'], ['허니서클', 'Honeysuckle', '#fcf888'], ['재스민', 'Jasmine', '#fcfafa'],
    ['오렌지 꽃', 'Orange Blossom', '#f8ece0'], ['레몬그라스', 'Lemongrass', '#fefce0'],
  ]],
];

function build(list, path) {
  return list.map(([name, en, color, children]) => {
    const node = { name, en, color, path: [...path, name] };
    node.children = children ? build(children, node.path) : [];
    return node;
  });
}

export const FLAVOR_TREE = build(WHEEL, []);

// 띄어쓰기와 대소문자를 무시하고 찾는다.
const key = s => String(s).replace(/\s+/g, '').toLowerCase();

// 휠과 다르게 부르는 이름 → 휠 이름. 예전 앱 버전에서 저장한 이름도 여기서 이어준다.
const ALIASES = {
  라즈베리: '산딸기', 스트로베리: '딸기', 자스민: '재스민', 장미: '로즈/로즈워터', 로즈: '로즈/로즈워터', 레드애플: '사과',
  그린애플: '청사과', 시트러스: '감귤류', 베르가모트: '베르가못', 카라멜: '캐러멜', 오렌지블러섬: '오렌지 꽃', 흑설탕: '황설탕',
  흑당: '황설탕', 시나몬: '계피', 다크초코: '다크 초콜릿', 밀크초코: '밀크 초콜릿', 블랙티: '홍차', 그린티: '녹차', 플럼: '자두',
  단맛: '달콤하고 설탕 같은', 곡물: '곡물과 곡류', 풍미: '풍미있는', '야채·흙·허브': '야채/흙/허브',
};

const BY_KEY = {};
(function index(nodes) {
  for (const n of nodes) {
    BY_KEY[key(n.name)] = n;
    BY_KEY[key(n.en)] = BY_KEY[key(n.en)] || n;
    index(n.children);
  }
})(FLAVOR_TREE);

export const flavorOf = name => BY_KEY[key(ALIASES[key(name)] || name)] || null;

// 저장된 이름을 휠의 이름으로 바꾼다. 휠에 없는 말은 그대로 둔다.
export const canonicalFlavor = name => flavorOf(name)?.name || name;

// 색 위에 올릴 글자색 (밝은 색이면 어두운 글자)
export function inkOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#2a2420' : '#ffffff';
}

// 컵노트가 내가 고른 맛과 같거나, 둘 중 하나가 다른 하나의 상위 분류이면 맞힌 것으로 본다.
export function noteMatched(note, picked) {
  const nf = flavorOf(note);
  return picked.some(p => {
    const pf = flavorOf(p);
    if (!nf || !pf) return key(p) === key(note);
    return pf.path.includes(nf.name) || nf.path.includes(pf.name);
  });
}
