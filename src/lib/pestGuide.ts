export type PestGuideCategory = 'pest' | 'disease' | 'environmental';

export interface PestGuideEntry {
  id: string;
  name: string;
  category: PestGuideCategory;
  symptoms: string;
  causes: string;
  treatment: string;
  prevention: string;
}

export const PEST_GUIDE_CATEGORY_LABEL: Record<PestGuideCategory, string> = {
  pest: '해충',
  disease: '병해',
  environmental: '환경/관리',
};

/**
 * Static reference only — no AI diagnosis. A curated list of the most common
 * houseplant problems so users can look up symptoms themselves.
 */
export const PEST_GUIDE: PestGuideEntry[] = [
  {
    id: 'spider-mites',
    name: '응애',
    category: 'pest',
    symptoms: '잎 뒷면과 잎 사이에 아주 가는 거미줄 같은 것이 보이고, 잎에 작은 노란 반점이 촘촘히 생기며 점점 잎 전체가 누렇게 변해요.',
    causes: '건조하고 통풍이 안 되는 환경에서 특히 잘 번식해요. 크기가 매우 작아 육안으로 잘 안 보여요.',
    treatment: '샤워기로 잎 앞뒤를 강하게 씻어내고, 그래도 심하면 원예용 살비제(응애 전용 약)를 잎 뒷면 위주로 뿌려주세요. 3~5일 간격으로 2~3회 반복해야 알까지 제거돼요.',
    prevention: '주기적으로 잎에 분무해서 습도를 높이고, 새로 들인 식물은 2주 정도 다른 식물과 떨어뜨려 격리 관찰하세요.',
  },
  {
    id: 'aphids',
    name: '진딧물',
    category: 'pest',
    symptoms: '새순이나 꽃봉오리 주변에 연두색·검은색의 작은 벌레가 무리 지어 붙어 있고, 잎이 끈적거리거나 오그라들어요.',
    causes: '새로 나온 부드러운 새순을 좋아해서 생장기에 특히 잘 생겨요. 개미가 진딧물을 옮기고 다니기도 해요.',
    treatment: '물줄기로 씻어내거나 면봉에 알코올을 묻혀 벌레를 직접 제거하세요. 심하면 비눗물(주방세제 몇 방울+물)을 잎에 뿌리고 30분 후 씻어내거나 원예용 살충제를 사용하세요.',
    prevention: '새순이 나는 시기에 잎을 자주 관찰하고, 초기에 몇 마리만 보일 때 바로 제거하면 크게 번지지 않아요.',
  },
  {
    id: 'scale-insects',
    name: '깍지벌레',
    category: 'pest',
    symptoms: '줄기나 잎맥을 따라 갈색·흰색의 작은 딱지 같은 것이 붙어 있고, 잘 안 떨어져요. 주변 잎이 끈적거리고 그을음병(검은 곰팡이)이 같이 생기기도 해요.',
    causes: '통풍이 나쁘고 실내가 건조할 때 잘 생기며, 한번 자리 잡으면 표면이 딱딱해져서 약이 잘 안 들어요.',
    treatment: '면봉에 알코올을 묻혀 하나씩 직접 떼어내는 게 가장 확실해요. 개체 수가 많으면 원예용 살충제를 2주 간격으로 2~3회 뿌려주세요.',
    prevention: '잎과 줄기를 정기적으로 닦아주면 초기에 발견하기 쉬워요. 오래된 화분이나 흙을 재사용할 때 특히 주의하세요.',
  },
  {
    id: 'fungus-gnats',
    name: '뿌리파리(곰팡이날파리)',
    category: 'pest',
    symptoms: '화분 주변에 모기처럼 생긴 작은 검은 날파리가 날아다니고, 흙 표면에 작은 벌레가 기어다녀요.',
    causes: '흙이 항상 축축하게 젖어 있을 때 알을 낳고 번식해요. 과습이 가장 큰 원인이에요.',
    treatment: '흙 표면이 완전히 마를 때까지 물주기를 멈추세요. 노란 끈끈이 트랩으로 성충을 잡고, 필요하면 흙 표면에 모래나 마사토를 얇게 덮어 산란을 막으세요.',
    prevention: '겉흙이 마른 뒤에 물을 주는 습관을 들이고, 배수가 잘 되는 흙과 화분을 사용하세요.',
  },
  {
    id: 'powdery-mildew',
    name: '흰가루병',
    category: 'disease',
    symptoms: '잎 표면에 밀가루를 뿌린 것처럼 하얀 가루가 덮이고, 심해지면 잎이 노랗게 변하며 떨어져요.',
    causes: '통풍이 안 되고 습도가 높으면서 일교차가 큰 환경에서 곰팡이 포자가 퍼지며 생겨요.',
    treatment: '증상이 심한 잎은 잘라내 제거하고, 초기라면 베이킹소다를 물에 희석해 뿌리거나 원예용 살균제를 사용하세요.',
    prevention: '통풍을 원활하게 해주고 잎이 너무 빽빽하면 가지치기로 공간을 만들어주세요. 물은 잎이 아닌 흙에 주는 것이 좋아요.',
  },
  {
    id: 'root-rot',
    name: '뿌리썩음병',
    category: 'disease',
    symptoms: '잎이 갑자기 축 늘어지거나 노랗게 변하고, 화분에서 나는 흙냄새가 퀴퀴하며, 뿌리를 확인하면 갈색·검은색으로 무르고 냄새가 나요.',
    causes: '배수가 안 되는 흙이나 화분에 물을 너무 자주 줘서 뿌리가 계속 물에 잠겨 산소 부족과 곰팡이 번식이 일어나요.',
    treatment: '화분에서 뿌리를 꺼내 검게 무른 부분을 깨끗한 가위로 잘라내고, 배수가 잘 되는 새 흙으로 분갈이하세요. 분갈이 후 1주일 정도는 물을 주지 마세요.',
    prevention: '배수 구멍이 있는 화분을 사용하고, 겉흙이 마른 후에 물을 주세요. 화분 받침에 물이 고이지 않게 바로 비워주세요.',
  },
  {
    id: 'leaf-spot',
    name: '잎마름병 · 갈색반점병',
    category: 'disease',
    symptoms: '잎에 갈색이나 검은색의 동그란 반점이 생기고, 점점 커지면서 잎 전체가 마르거나 구멍이 나요.',
    causes: '곰팡이나 세균이 원인으로, 잎에 물이 오래 묻어 있거나 통풍이 안 될 때 잘 생겨요.',
    treatment: '증상이 있는 잎은 바로 제거해서 번지는 것을 막고, 필요하면 원예용 살균제를 뿌려주세요.',
    prevention: '물을 줄 때 잎에 직접 뿌리지 말고 흙에 주세요. 통풍이 잘 되는 곳에 두고 잎이 젖은 채로 두지 마세요.',
  },
  {
    id: 'leaf-tip-burn',
    name: '잎끝마름',
    category: 'environmental',
    symptoms: '잎 끝이나 가장자리가 갈색으로 바짝 마르는데, 벌레나 반점은 보이지 않아요.',
    causes: '공기가 너무 건조하거나, 물에 있는 염소·미네랄 성분, 비료를 과하게 줬을 때 흔히 나타나요.',
    treatment: '마른 부분은 가위로 잘라 정리해주고, 비료를 준 지 얼마 안 됐다면 당분간 중단하고 흙에 물을 충분히 흘려보내 염류를 씻어내세요.',
    prevention: '실내 습도를 높여주고, 가능하면 하루 정도 받아둔 물이나 정수된 물을 사용하세요. 비료는 정해진 희석 비율보다 연하게 주는 게 안전해요.',
  },
  {
    id: 'etiolation',
    name: '웃자람 (도장현상)',
    category: 'environmental',
    symptoms: '줄기 마디 사이가 비정상적으로 길게 늘어지고, 잎 색이 연해지며 잎 간격이 듬성듬성해져요. 식물이 한쪽 광원 방향으로 기울어요.',
    causes: '빛이 부족해서 식물이 빛을 찾아 무리하게 줄기를 늘리기 때문에 생겨요.',
    treatment: '더 밝은 곳으로 옮기거나 조도계로 실제 밝기를 측정해 필요하면 식물등을 사용하세요. 심하게 웃자란 줄기는 잘라 원래 모양을 잡아줄 수 있어요.',
    prevention: '식물별 빛 요구량에 맞는 위치에 두고, 주기적으로 화분을 돌려가며 골고루 빛을 받게 해주세요.',
  },
];
