// 일간(日干, 사주 여덟 글자 중 '나'를 뜻하는 글자)에 따른 재물운 콘텐츠.
// 재미로 보는 엔터테인먼트 콘텐츠이며, 확정적 진단이나 수익을 보장하지 않는다.

export interface PowerStat {
  /** 짧은 요약 라벨. e.g. "빠른 실행력" */
  label: string;
  /** 한 줄 설명 */
  description: string;
}

export interface MoneyTendency {
  stemHanja: string;
  stemName: string;
  element: "목" | "화" | "토" | "금" | "수";

  // --- 완전 공개 영역 ---
  /** 재물 유형 이름. e.g. "개척형 재물운" */
  wealthType: string;
  /** 재물 유형 한 줄 요약 */
  summary: string;
  /** 돈을 버는 힘 */
  earningPower: PowerStat;
  /** 돈을 지키는 힘 */
  keepingPower: PowerStat;
  /** 기회를 잡는 힘 */
  opportunityPower: PowerStat;
  /** 강점 1개 */
  topStrength: string;

  // --- 일부 공개(블러 티저) 영역 ---
  /** 돈이 새기 쉬운 패턴 */
  leakPattern: string;
  /** 직업/사업 방향 힌트 */
  careerHint: string;
  /** 앞으로의 흐름 힌트 */
  flowHint: string;
  /** 나에게 맞는 행동 방향 힌트 */
  actionHint: string;
}

const TENDENCY_BY_STEM: Record<string, MoneyTendency> = {
  "甲": {
    stemHanja: "甲", stemName: "갑목", element: "목",
    wealthType: "개척형 재물운",
    summary: "돈이 될 것 같으면 일단 움직이고 보는 타입이에요. 추진력은 최고지만, 벌인 일을 끝까지 챙기는 습관이 자산을 지켜줘요.",
    earningPower: { label: "빠른 실행력", description: "기회다 싶으면 망설임 없이 뛰어들어서 돈 버는 속도 자체가 빨라요." },
    keepingPower: { label: "아직은 헐거운 편", description: "버는 힘에 비해 지키는 힘이 약한 편이라 관리 시스템이 필요해요." },
    opportunityPower: { label: "기회 포착 1순위", description: "새로운 흐름을 남들보다 먼저 알아채고 바로 뛰어드는 감각이 있어요." },
    topStrength: "장기 목표를 세우면 끝까지 밀어붙이는 추진력",
    leakPattern: "벌여놓은 일이 많아질수록 돈이 여기저기 흩어지는 패턴이 반복돼요.",
    careerHint: "정해진 틀보다 스스로 판을 짜는 자리에서 진짜 힘을 발휘하는 편이에요.",
    flowHint: "지금 벌여둔 일 중 하나가 예상보다 빠르게 결실을 맺을 조짐이 보여요.",
    actionHint: "새로 벌이기보다 이미 시작한 일부터 정리하면 흐름이 달라져요.",
  },
  "乙": {
    stemHanja: "乙", stemName: "을목", element: "목",
    wealthType: "실속형 재물운",
    summary: "상황에 맞춰 돈을 유연하게 쓰는 편이라 큰 손해는 잘 안 봐요. 다만 결정을 미루는 습관이 좋은 타이밍을 놓치게 만들 수 있어요.",
    earningPower: { label: "틈새 감각", description: "작은 기회도 놓치지 않고 실속 있게 챙기는 감각이 있어요." },
    keepingPower: { label: "안정적인 편", description: "무리한 지출을 피하고 예산 안에서 조정하는 힘이 좋아요." },
    opportunityPower: { label: "신중한 선택", description: "주변 정보를 잘 활용하지만 결정까지는 시간이 걸리는 편이에요." },
    topStrength: "예산에 맞춰 유연하게 조정하는 감각",
    leakPattern: "남에게 맞춰주다 정작 내 계획이 흔들리는 순간이 반복돼요.",
    careerHint: "혼자보다 함께 조율하며 만드는 자리에서 성과가 더 잘 나는 편이에요.",
    flowHint: "미뤄뒀던 결정 하나를 지금 내리면 흐름이 빠르게 풀릴 시기예요.",
    actionHint: "고민하던 선택 하나를 이번 주 안에 마감 지어보는 게 어때요.",
  },
  "丙": {
    stemHanja: "丙", stemName: "병화", element: "화",
    wealthType: "폭발형 재물운",
    summary: "돈을 쓸 때도 벌 때도 화끈한 편이에요. 에너지가 넘치는 만큼 큰 지출도 순간적으로 결정하는 경향이 있어요.",
    earningPower: { label: "순발력 최강", description: "기회가 왔을 때 즉시 잡아채는 순발력이 돈 버는 힘으로 이어져요." },
    keepingPower: { label: "감정에 흔들림", description: "기분에 따라 지출이 크게 널뛰는 편이라 지키는 힘은 상대적으로 약해요." },
    opportunityPower: { label: "사람이 곧 기회", description: "사람을 통해 돈이 들어오는 흐름을 잘 만들어요." },
    topStrength: "기회를 잡는 순발력과 사람을 끌어당기는 에너지",
    leakPattern: "충동적으로 결정한 큰 지출이 자산 흐름을 흔드는 패턴이 있어요.",
    careerHint: "사람을 직접 상대하고 반응이 바로 오는 일에서 빛을 발하는 편이에요.",
    flowHint: "가까운 시일 내 예상 못 한 곳에서 돈이 들어올 신호가 보여요.",
    actionHint: "큰 지출 앞에서는 하루만 미루고 결정하는 습관을 들여보세요.",
  },
  "丁": {
    stemHanja: "丁", stemName: "정화", element: "화",
    wealthType: "은근형 재물운",
    summary: "겉으론 화려해 보여도 속은 알뜰하게 계산하는 편이에요. 다만 감정적인 소비가 종종 계획을 흔들어요.",
    earningPower: { label: "세밀한 감각", description: "작은 흐름까지 놓치지 않는 꼼꼼함이 돈 버는 기반이 돼요." },
    keepingPower: { label: "가계부 체질", description: "세밀하게 계산하고 관리하는 힘이 자산을 지켜줘요." },
    opportunityPower: { label: "위기에 강함", description: "위기 상황에서 오히려 침착하게 기회를 찾아내는 편이에요." },
    topStrength: "위기 상황에서도 침착하게 대응하는 힘",
    leakPattern: "스트레스를 소비로 푸는 패턴이 작은 지출을 계속 쌓이게 해요.",
    careerHint: "겉으로 드러나지 않아도 꾸준히 성과를 쌓는 자리가 잘 맞아요.",
    flowHint: "그동안 쌓아온 노력이 조용히 결실을 맺기 시작하는 흐름이에요.",
    actionHint: "스트레스성 소비가 있었다면 이번 달만 지출 기록을 남겨보세요.",
  },
  "戊": {
    stemHanja: "戊", stemName: "무토", element: "토",
    wealthType: "축적형 재물운",
    summary: "당장의 수익보다 오래 갈 자산을 선호해요. 신중한 만큼 좋은 기회를 너무 오래 재다가 놓치기도 해요.",
    earningPower: { label: "느리지만 확실", description: "단기 수익보다 오래 유지되는 수익 구조를 만드는 데 강해요." },
    keepingPower: { label: "최고 수준", description: "장기 저축과 자산 방어에서 가장 강한 힘을 가진 유형이에요." },
    opportunityPower: { label: "신중한 판단", description: "위험을 미리 대비하는 습관 덕에 큰 손해는 잘 피해요." },
    topStrength: "장기 저축·투자에서 흔들리지 않는 뚝심",
    leakPattern: "새로운 시도를 지나치게 미루다 보면 기회비용이 쌓여요.",
    careerHint: "긴 호흡으로 신뢰를 쌓아가는 자리에서 재물이 안정적으로 늘어요.",
    flowHint: "오래 준비해온 것이 이제 슬슬 자리를 잡기 시작하는 시기예요.",
    actionHint: "고민만 하던 결정 하나에 이번엔 기한을 정해보는 걸 추천해요.",
  },
  "己": {
    stemHanja: "己", stemName: "기토", element: "토",
    wealthType: "정밀관리형 재물운",
    summary: "가계부와 친한 타입. 작은 돈의 흐름까지 꼼꼼히 챙기지만, 그만큼 큰 그림을 놓칠 때가 있어요.",
    earningPower: { label: "꾸준한 축적", description: "화려하진 않아도 놓치는 돈 없이 차곡차곡 모으는 힘이 있어요." },
    keepingPower: { label: "디테일의 힘", description: "세부 지출 관리 능력이 뛰어나 새는 돈이 거의 없는 편이에요." },
    opportunityPower: { label: "약속은 반드시", description: "한번 정한 저축 계획은 끝까지 지키는 실행력이 강점이에요." },
    topStrength: "약속한 저축은 반드시 지키는 실행력",
    leakPattern: "작은 절약에 매몰되다 더 큰 기회를 놓치는 패턴이 있어요.",
    careerHint: "숫자와 디테일을 다루는 자리에서 재물운이 특히 잘 풀리는 편이에요.",
    flowHint: "완벽주의 때문에 미뤄온 결정 하나가 곧 방향을 정할 시기예요.",
    actionHint: "이번엔 100% 확신이 없어도 일단 작게 시도해보는 걸 권해요.",
  },
  "庚": {
    stemHanja: "庚", stemName: "경금", element: "금",
    wealthType: "결단형 재물운",
    summary: "쓸 땐 쓰고 아낄 땐 확실히 아끼는 편이에요. 결단력이 강점이지만 유연성이 부족해 손해를 볼 때도 있어요.",
    earningPower: { label: "명확한 기준", description: "기준이 확실해서 벌어야 할 때와 아껴야 할 때를 정확히 구분해요." },
    keepingPower: { label: "손절 빠름", description: "아니다 싶으면 미련 없이 정리하는 결단력이 자산을 지켜줘요." },
    opportunityPower: { label: "원칙 기반 판단", description: "원칙에 맞는 기회만 골라내는 힘이 있지만 유연성은 약한 편이에요." },
    topStrength: "손절할 때 빠르게 결정하는 명확한 기준",
    leakPattern: "원칙이 너무 강해 협상할 수 있었던 기회를 놓치는 패턴이 있어요.",
    careerHint: "기준과 원칙이 분명한 조직이나 전문직에서 힘을 잘 발휘해요.",
    flowHint: "미뤄뒀던 정리 하나를 마무리하면 새로운 흐름이 열릴 시기예요.",
    actionHint: "감정적인 조언도 한 번쯤은 끝까지 들어보는 게 도움이 될 거예요.",
  },
  "辛": {
    stemHanja: "辛", stemName: "신금", element: "금",
    wealthType: "안목형 재물운",
    summary: "싼 것보다 좋은 것에 돈을 쓰는 편. 안목은 좋지만 그만큼 지출 단가가 높아지기 쉬워요.",
    earningPower: { label: "가치 판별력", description: "가치 있는 것을 알아보는 안목이 곧 돈 버는 감각으로 이어져요." },
    keepingPower: { label: "기준이 관건", description: "기준을 세워두면 잘 지키지만, 기준이 흔들리면 지출도 흔들려요." },
    opportunityPower: { label: "트렌드 감각", description: "트렌드를 읽는 감각이 좋아 좋은 타이밍을 잘 잡는 편이에요." },
    topStrength: "가치 있는 곳에 집중적으로 투자하는 안목",
    leakPattern: "과시성 소비를 합리화하다 예산을 넘기는 패턴이 반복돼요.",
    careerHint: "안목과 취향이 무기가 되는 분야에서 재물운이 크게 열려요.",
    flowHint: "눈여겨보던 곳에 지금 움직이면 좋은 결과로 이어질 흐름이에요.",
    actionHint: "이번 지출 전엔 하루만 장바구니에 담아두고 다시 판단해보세요.",
  },
  "壬": {
    stemHanja: "壬", stemName: "임수", element: "수",
    wealthType: "기회포착형 재물운",
    summary: "돈의 흐름을 잘 읽고 기회가 오면 크게 베팅하는 편이에요. 다만 감당 못 할 리스크까지 떠안을 수 있어요.",
    earningPower: { label: "큰 베팅", description: "기회다 싶으면 크게 움직여서 한 번에 큰 수익을 만드는 힘이 있어요." },
    keepingPower: { label: "리스크에 취약", description: "안전자산 비중이 낮아지기 쉬워 지키는 힘은 보완이 필요해요." },
    opportunityPower: { label: "흐름을 읽는 감각", description: "시장의 큰 흐름을 남들보다 먼저 읽어내는 감각이 탁월해요." },
    topStrength: "시장 흐름을 읽고 새로운 수익원을 발굴하는 감각",
    leakPattern: "감당 범위를 넘는 리스크를 떠안다가 크게 흔들리는 패턴이 있어요.",
    careerHint: "변화가 잦고 판을 읽는 힘이 필요한 분야에서 두각을 나타내요.",
    flowHint: "읽고 있던 흐름 하나가 곧 눈에 보이는 결과로 나타날 시기예요.",
    actionHint: "베팅하기 전, 최악의 경우를 먼저 계산해보는 습관을 들여보세요.",
  },
  "癸": {
    stemHanja: "癸", stemName: "계수", element: "수",
    wealthType: "신중축적형 재물운",
    summary: "겉으로 드러내지 않지만 나름의 계획으로 차근차근 자산을 불려가는 타입이에요. 정보 부족이 발목을 잡을 수 있어요.",
    earningPower: { label: "조용한 성장", description: "눈에 띄지 않아도 꾸준히 쌓아가는 방식으로 자산을 늘려요." },
    keepingPower: { label: "안정적 관리", description: "꾸준한 저축 습관이 몸에 배어 있어 잘 새지 않는 편이에요." },
    opportunityPower: { label: "리스크 감지", description: "위험을 미리 감지하는 촉이 좋아 큰 실패를 잘 피해요." },
    topStrength: "꾸준한 저축 습관과 위험을 미리 감지하는 촉",
    leakPattern: "혼자 판단하다 정보가 부족해 손해를 보는 패턴이 있어요.",
    careerHint: "혼자만의 전문성을 쌓아가는 자리에서 재물이 조용히 늘어나요.",
    flowHint: "그동안 아무도 모르게 쌓아온 것이 곧 드러나기 시작할 시기예요.",
    actionHint: "혼자 고민하기보다 믿을 만한 정보원 하나를 만들어보는 게 좋아요.",
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

export interface LockedReportCard {
  title: string;
  cta: string;
}

/** 잠금 리포트 카드 5종. 일간 이름을 넣어 제목/CTA를 구체적으로 구성한다. */
export function getLockedReportCards(tendency: MoneyTendency): LockedReportCard[] {
  const { stemName } = tendency;
  return [
    {
      title: `${stemName} 재성 지도 — 돈이 모이는 자리`,
      cta: "내 돈이 풀리는 방식 전체 보기",
    },
    {
      title: "10년 단위로 보는 나의 재물 대운",
      cta: "10년 재물 대운 열어보기",
    },
    {
      title: "앞으로 3년, 재물이 흐르는 방향",
      cta: "앞으로 3년 재물 흐름 열기",
    },
    {
      title: `${stemName}이(가) 피해야 할 돈의 함정`,
      cta: "내가 조심해야 할 돈 선택 보기",
    },
    {
      title: `${stemName} 맞춤 돈관리 행동 가이드`,
      cta: "나에게 맞는 행동 가이드 보기",
    },
  ];
}
