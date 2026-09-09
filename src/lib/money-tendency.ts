// 일간(日干, 사주 여덟 글자 중 '나'를 뜻하는 글자)에 따른 돈 성향 콘텐츠.
// 재미로 보는 엔터테인먼트 콘텐츠이며, 확정적 진단이 아니다.

export interface MoneyTendency {
  stemHanja: string;
  stemName: string;
  element: "목" | "화" | "토" | "금" | "수";
  title: string;
  summary: string;
  strengths: string[];
  watchOuts: string[];
}

const TENDENCY_BY_STEM: Record<string, MoneyTendency> = {
  "甲": {
    stemHanja: "甲", stemName: "갑목", element: "목",
    title: "일단 시작하고 보는 개척형",
    summary: "돈이 될 것 같으면 일단 움직이고 보는 타입이에요. 추진력은 최고, 다만 시작한 만큼 끝까지 챙기는 습관이 자산을 지켜줍니다.",
    strengths: ["새로운 기회에 빠르게 반응", "장기 목표를 세우면 밀어붙이는 힘"],
    watchOuts: ["벌인 일이 많아 자금이 여기저기 흩어짐", "지출 기록을 잘 안 남기는 편"],
  },
  "乙": {
    stemHanja: "乙", stemName: "을목", element: "목",
    title: "유연하게 맞춰가는 실속형",
    summary: "상황에 맞춰 돈을 유연하게 쓰는 편이라 큰 손해는 잘 안 봐요. 다만 우유부단함이 결정을 계속 미루게 만들 수 있어요.",
    strengths: ["예산에 맞춰 조정하는 감각", "주변 정보를 잘 활용"],
    watchOuts: ["결정을 미루다 좋은 타이밍을 놓침", "남에게 맞춰주다 계획이 흔들림"],
  },
  "丙": {
    stemHanja: "丙", stemName: "병화", element: "화",
    title: "화끈하게 쓰고 화끈하게 버는 형",
    summary: "돈을 쓸 때도 벌 때도 화끈한 편이에요. 에너지가 넘치는 만큼 큰 지출도 순간적으로 결정하는 경향이 있어요.",
    strengths: ["기회를 잡는 순발력", "사람을 통해 돈이 들어오는 흐름"],
    watchOuts: ["기분에 따라 소비가 널뛰기", "충동구매 경보"],
  },
  "丁": {
    stemHanja: "丁", stemName: "정화", element: "화",
    title: "은근히 알뜰한 계획형",
    summary: "겉으론 화려해 보여도 속은 알뜰하게 계산하는 편이에요. 다만 감정적인 소비가 종종 계획을 흔듭니다.",
    strengths: ["세밀한 가계부 체질", "위기 상황에 침착하게 대응"],
    watchOuts: ["스트레스 받으면 소비로 푸는 패턴", "작은 지출이 쌓이는 걸 놓침"],
  },
  "戊": {
    stemHanja: "戊", stemName: "무토", element: "토",
    title: "든든하게 쌓아가는 안정형",
    summary: "당장의 수익보다 오래 갈 자산을 선호해요. 신중한 만큼 좋은 기회를 너무 오래 재다가 놓치기도 해요.",
    strengths: ["장기 저축·투자에 강함", "위험을 미리 대비하는 습관"],
    watchOuts: ["새로운 시도를 지나치게 미룸", "변화에 둔감해 기회비용 발생"],
  },
  "己": {
    stemHanja: "己", stemName: "기토", element: "토",
    title: "꼼꼼하게 관리하는 살림형",
    summary: "가계부와 친한 타입. 작은 돈의 흐름까지 꼼꼼히 챙기지만, 그만큼 큰 그림을 놓칠 때가 있어요.",
    strengths: ["세부 지출 관리 능력", "약속한 저축은 반드시 지킴"],
    watchOuts: ["작은 절약에 매몰돼 큰 기회를 못 봄", "완벽주의로 결정이 느려짐"],
  },
  "庚": {
    stemHanja: "庚", stemName: "경금", element: "금",
    title: "칼같이 끊고 맺는 결단형",
    summary: "쓸 땐 쓰고 아낄 땐 확실히 아끼는 편이에요. 결단력이 강점이지만 유연성이 부족해 손해를 볼 때도 있어요.",
    strengths: ["명확한 소비·저축 기준", "손절할 때 빠르게 결정"],
    watchOuts: ["원칙이 너무 강해 협상 기회를 놓침", "감정적 조언을 무시하는 경향"],
  },
  "辛": {
    stemHanja: "辛", stemName: "신금", element: "금",
    title: "품질에 투자하는 안목형",
    summary: "싼 것보다 좋은 것에 돈을 쓰는 편. 안목은 좋지만 그만큼 지출 단가가 높아지기 쉬워요.",
    strengths: ["가치 있는 곳에 집중 투자", "트렌드를 읽는 감각"],
    watchOuts: ["과시성 소비로 이어질 위험", "예산 초과를 합리화하는 습관"],
  },
  "壬": {
    stemHanja: "壬", stemName: "임수", element: "수",
    title: "흐름을 타는 기회포착형",
    summary: "돈의 흐름을 잘 읽고 기회가 오면 크게 베팅하는 편이에요. 다만 감당 못 할 리스크까지 떠안을 수 있어요.",
    strengths: ["시장 흐름을 읽는 감각", "새로운 수익원 발굴"],
    watchOuts: ["과도한 리스크 추구", "안전자산 비중을 소홀히 함"],
  },
  "癸": {
    stemHanja: "癸", stemName: "계수", element: "수",
    title: "조용히 불려가는 신중형",
    summary: "겉으로 드러내지 않지만 나름의 계획으로 차근차근 자산을 불려가는 타입이에요. 정보 부족이 발목을 잡을 수 있어요.",
    strengths: ["꾸준한 저축 습관", "리스크를 미리 감지하는 촉"],
    watchOuts: ["혼자 판단하다 정보 비대칭 발생", "지나친 신중함이 기회비용으로"],
  },
};

/** 사주 라이브러리가 반환한 일주(日柱) 한자에서 첫 글자(일간)를 뽑아 성향을 매핑한다. */
export function getMoneyTendency(dayPillarHanja: string): MoneyTendency {
  const stem = dayPillarHanja.charAt(0);
  const tendency = TENDENCY_BY_STEM[stem];
  if (!tendency) {
    throw new Error(`알 수 없는 일간 문자: ${stem}`);
  }
  return tendency;
}
