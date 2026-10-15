import { TEN_GOD_GROUP, type PillarFact, type SajuFacts, type TenGodGroup } from "@/lib/saju-facts";
import { buildPersonalReading } from "@/lib/personal-reading";

/** One interpretive tension is selected before palm passages or month scenes
 * are written. These are authored readings of calculated symbols, not claims
 * about a person's actual history, ability, partner, income or future. */
export type EditorialArcId =
  | "agency-duty" | "agency-duty-supported" | "creation-exchange"
  | "creation-exchange-supported" | "duty-supported" | "duty-translation" | "duty-boundaries"
  | "agency-value" | "understanding-duty" | "agency-expression" | "balanced";

export interface NatalPlacementEvidence {
  pillar: PillarFact["pillar"];
  part: "stem" | "branch";
  symbol: string;
  tenGod: string;
  group: TenGodGroup;
}

export interface NatalEditorialEvidence {
  counts: Record<TenGodGroup, number>;
  /** A strict single lead; a three-way presence rule does not erase it. */
  dominant: TenGodGroup | null;
  supporting: TenGodGroup[];
  placements: NatalPlacementEvidence[];
}

export interface PremiumEditorialPlan {
  id: EditorialArcId;
  natalEvidence: NatalEditorialEvidence;
  /** The line observation may reinforce or qualify this one natal question. */
  question: string;
  overallConnection: string;
  loveConnection: string;
  loveScene: string;
  moneyConnection: string;
  moneyScene: string;
  workConnection: string;
  workScene: string;
  /** Calculated current daeun groups keep the same natal arc contextualized to
   * the person's present symbolic background. */
  daeunGroups?: TenGodGroup[];
  /** Chosen along with the domain scenes; month's real theme selects a lens. */
  month: { preparation: string; expression: string; exchange: string; duty: string; agency: string };
}

const PLANS: Record<EditorialArcId, Omit<PremiumEditorialPlan, "id" | "natalEvidence">> = {
  "agency-duty": {
    question: "납득한 책임을 지키면서 방법을 바꿀 여지는 어디에 둘까",
    overallConnection: "사주에서는 이유를 납득한 책임을 자기 방식으로 이어가려는 긴장이 중심입니다. 두뇌선의 곡선을 다른 방법을 떠올리는 관점으로 읽더라도, 목표까지 계속 바꾸어야 한다는 뜻은 아닙니다. 지키려는 목적과 바꿔볼 방법을 구분해보세요.",
    loveConnection: "약속을 지키려는 마음은 배려가 될 수 있습니다. 감정선의 모양은 그 배려가 상대에게 어떤 말과 행동으로 닿는지 살펴보는 또 하나의 관점입니다. 같은 약속을 원하더라도 서로 편한 표현은 다를 수 있습니다.",
    loveScene: "약속이 달라졌다면 ‘바뀐 일정은 이해해. 다만 나는 함께할 시간을 기대했어’처럼 지키고 싶었던 이유를 먼저 말해보세요. 그다음 서로 가능한 시간을 다시 고르면, 약속의 의미와 방법을 함께 조정할 수 있습니다.",
    moneyConnection: "잘 맡아 해낸 몫과 처음 합의한 대가가 같은 범위인지 살피는 긴장입니다. 보조선 후보는 성과를 보여주거나 조건을 이야기하는 장면을 떠올릴 단서로만 씁니다.",
    moneyScene: "일을 더 잘하려고 한 작업을 추가로 부탁받는다면, 처음 약속한 범위와 새 요청을 나누고 필요한 시간·대가를 함께 물어보세요. 완성도를 높이고 싶은 마음과 추가 일을 맡기로 한 합의는 다를 수 있습니다.",
    workConnection: "목적을 이해한 책임을 자기 일로 만들려면 실행 방법을 고를 여지도 필요합니다. 두뇌선에서 읽힌 방식은 맡을 범위와 바꿀 수 있는 방법을 대화하는 참고가 됩니다.",
    workScene: "새 역할 앞에서 ‘완료할 결과는 무엇인가요?’와 ‘그 결과를 내는 방법은 어디까지 제가 정하나요?’를 함께 물어보세요. 목적을 지키는 일과 절차를 고르는 일을 분리하는 장면입니다.",
    month: {
      preparation: "새 제안 앞에서 더 확인해야 할 정보가 있다면, 책임을 맡는 데 필요한 조건인지 짚어보세요. 이미 목적이 충분히 분명하다면 방법을 정할 작은 부분부터 시작할 수 있습니다.",
      expression: "새 방법을 제안할 때 기존 약속의 목적은 유지한 채 달라질 진행 방식 한 가지를 보여주세요. 상대가 동의한 부분과 다시 맞출 부분을 들을 수 있습니다.",
      exchange: "맡은 일에 새로운 결과물이 더해졌다면, 처음 정한 책임의 범위와 추가로 드는 시간·대가를 한 자리에서 확인해보세요.",
      duty: "책임이 늘어나는 제안이라면 결정할 권한도 함께 달라지는지 물어보세요. 해낼 이유에 납득한 것과 방법까지 모두 맡기로 한 것은 다를 수 있습니다.",
      agency: "함께 정한 목표를 두고 내 방법을 제안할 수 있습니다. 상대가 바꾸기 어려운 조건 하나도 들은 뒤 실행 방식을 고르는 장면입니다.",
    },
  },
  "agency-duty-supported": {
    question: "납득한 선택을 누구와 어떤 조건으로 끝까지 이어갈까",
    overallConnection: "좋은 방향이라고 납득한 일과 그 일을 혼자 끝까지 감당할 수 있는 조건은 다른 문제입니다. 손금의 형태를 새로운 방법에 대한 관점으로 읽을 때에도, 방법만 늘리기보다 필요한 사람·자료·역할을 같이 보세요.",
    loveConnection: "상대의 사정을 이해하고 약속을 맞추려는 마음에, 자기 바람을 말할 자리도 필요합니다. 감정선의 모양은 마음을 전하는 방식의 참고일 뿐, 상대의 마음을 먼저 알아야 한다는 요구로 읽지 않습니다.",
    loveScene: "다음 만남을 정할 때 ‘그 시간은 괜찮아. 이번에는 내가 가보고 싶은 곳도 같이 골라볼까?’라고 제안해보세요. 상대의 사정을 받아들이면서도 내 바람을 선택지에 올리는 장면입니다.",
    moneyConnection: "돌아올 대가뿐 아니라 준비에 드는 시간과 다른 사람의 몫을 살펴야 하는 중심과 연결합니다. 보조선 후보는 이 조건을 실제로 확인했다는 증거가 아닙니다.",
    moneyScene: "괜찮은 조건의 제안을 받았다면 준비 자료와 조율할 사람이 정해져 있는지 먼저 확인해보세요. 같은 대가라도 새로 맡는 준비까지 혼자 하게 되는지에 따라 감당할 몫이 달라집니다.",
    workConnection: "목적에 납득해 일을 시작하더라도 필요한 자료와 협력을 모두 자기 책임으로 돌릴 필요는 없습니다. 두뇌선의 모양은 해볼 방법을 고르는 참고로 두고, 역할을 나눌 조건을 먼저 맞춰보세요.",
    workScene: "새 업무를 맡을 때 내가 결정할 부분, 받아야 할 자료, 함께 확인할 사람을 한 번에 적어보세요. 좋은 방법을 찾는 일과 그 방법을 혼자 실행할 약속을 구분하는 장면입니다.",
    month: {
      preparation: "해보고 싶은 제안이 있다면 시작 전에 필요한 자료와 함께할 사람을 정해보세요. 준비가 더 필요한 이유를 자신의 부족함으로 바로 해석하지 않아도 됩니다.",
      expression: "아이디어를 작은 결과로 보여줄 때, 그다음 단계를 누가 맡을지도 함께 이야기해보세요. 가능성을 보여준 것과 전 과정을 책임지기로 한 것은 다릅니다.",
      exchange: "좋은 반응 뒤 추가 요청이 오면 원래 합의한 범위, 새로 필요한 시간, 함께할 사람을 확인해보세요. 반응과 실행 조건을 같은 것으로 여기지 않는 장면입니다.",
      duty: "맡아달라는 부탁에 동의하기 전에 내가 판단할 부분과 도움을 받아야 할 부분을 나누어볼 수 있습니다.",
      agency: "새 방법을 고를 여지가 생겼다면 그것을 실행할 사람과 자료도 함께 정해보세요. 선택권과 부담을 한쪽에만 놓지 않는 장면입니다.",
    },
  },
  "creation-exchange": {
    question: "펼친 생각을 누구의 쓰임과 어떤 조건에 연결할까",
    overallConnection: "사주의 표현·쓰임이라는 중심에 손금에서 읽힌 방법의 폭을 겹쳐봅니다. 대안을 떠올리는 일은 장점으로 읽을 수 있어도, 모두를 실제 약속으로 옮기는 일과는 구분할 수 있습니다.",
    loveConnection: "함께해보고 싶은 일이 떠오르는 관계에서도 다음 만남은 서로 고르는 일입니다. 감정선의 형태를 표현의 참고로 읽고, 상대의 동의를 미리 채워 넣지 않습니다.",
    loveScene: "즐거웠던 만남 뒤 다음 계획을 이야기한다면 ‘나는 이걸 해보고 싶어. 너는 어떨까?’라고 서로의 선택을 남겨보세요. 좋은 반응과 같은 계획을 원한다는 뜻을 구분하는 장면입니다.",
    moneyConnection: "반응이 좋은 결과물과 계속 제공할 수 있는 조건은 서로 다를 수 있습니다. 보조선 후보를 그 결과를 보여주고 대가를 말하는 계기로만 읽습니다.",
    moneyScene: "내 결과물을 좋아한 사람이 다음 작업을 부탁한다면, 원하는 결과와 사용할 시간·대가를 같이 정해보세요. 호응을 들은 순간과 계속 만들기로 합의한 순간을 나누는 장면입니다.",
    workConnection: "새 방법을 보여주는 힘이 실무에서 쓰이려면, 사용하는 사람이 무엇을 바꿀 수 있고 무엇은 지켜야 하는지 함께 정해야 합니다. 두뇌선은 방법을 떠올리는 참고입니다.",
    workScene: "작은 예시 하나를 보여준 뒤 실제 쓸 사람에게 편한 점과 바꿀 점을 물어보세요. 반응을 듣고 모든 방향을 다시 정하기보다 합의할 부분만 골라봅니다.",
    month: {
      preparation: "아이디어를 더 늘리기보다 이미 보여준 결과에 필요한 정보 하나를 확인해보세요. 그 반응이 실제 쓰임으로 이어질 조건을 고르는 시간입니다.",
      expression: "새 생각을 설명할 때 실제로 써볼 사람에게 작은 예시를 보여주고, 그 사람이 바꾸고 싶은 부분을 들어보세요.",
      exchange: "좋은 반응으로 추가 작업을 부탁받는다면 결과물의 쓰임, 새 범위, 필요한 시간과 대가를 함께 정해보세요.",
      duty: "맡을 결과가 늘어난다면 새로운 시도를 할 여지와 지켜야 할 약속을 함께 확인해보세요.",
      agency: "직접 고른 방법을 제안하되 함께할 사람이 무엇을 필요로 하는지 묻고 작업 범위를 맞춰보세요.",
    },
  },
  "creation-exchange-supported": {
    question: "반응이 좋은 가능성 가운데 내 몫과 지원이 맞는 일을 고를까",
    overallConnection: "사주에서 여러 가능성을 펼치는 모습과 도움·조건을 함께 봅니다. 손금에서 다른 방법을 떠올리는 관점이 더해져도 모든 제안을 이어가라는 뜻은 아닙니다. 어떤 일을 누구와 끝낼 수 있는지 고르는 데 써보세요.",
    loveConnection: "함께하고 싶은 일을 늘리는 만큼 내가 감당할 시간과 상대의 선택도 함께 볼 수 있습니다. 감정선의 형태는 마음을 전하는 방식의 단서이지, 약속을 더 떠맡으라는 신호가 아닙니다.",
    loveScene: "다음에 함께할 일이 떠올랐다면 ‘나는 이게 기대돼. 다만 이번 주에는 여기까지 할 수 있어. 너는 어떨까?’라고 관심과 가능한 시간을 같이 말해보세요.",
    moneyConnection: "만든 것이 좋은 반응을 얻더라도 추가 일을 맡을 사람·시간·대가가 맞는지 확인하는 긴장입니다. 보조선 후보는 협업 조건을 떠올릴 단서로만 둡니다.",
    moneyScene: "내 결과물에 좋은 반응이 와서 추가 작업을 부탁받았다면, 원래 합의한 범위와 새로 필요한 사람·시간을 먼저 확인해보세요. 호응과 끝까지 맡을 수 있는 조건은 별개의 대화입니다.",
    workConnection: "새 아이디어를 내는 힘과 끝까지 맡을 수 있는 일의 범위가 만나는 곳을 살핍니다. 두뇌선의 대안은 선택지를 보여줄 뿐, 모두 해내야 한다는 요구가 아닙니다.",
    workScene: "새 제안 두 가지 중 하나를 고를 때 작은 시연 뒤, 누가 남은 작업을 맡고 어떤 자료가 필요한지 물어보세요. 시작의 반응보다 끝낼 조건을 고르는 장면입니다.",
    month: {
      preparation: "해볼 일이 여럿이라면 먼저 필요한 정보와 지원을 하나씩 적어보세요. 준비를 가능성의 수가 아닌 끝낼 수 있는 조건으로 살피는 장면입니다.",
      expression: "새 생각을 작은 결과로 보여준 뒤 그다음 작업에 필요한 도움을 같이 물어보세요. 보여준 일과 모두 맡을 일의 경계를 남깁니다.",
      exchange: "좋은 반응으로 추가 작업을 부탁받았을 때 처음 합의한 범위, 새로 필요한 사람·시간·대가를 함께 확인해보세요. 호응과 실행 조건은 다른 문제입니다.",
      duty: "역할이 더해진다면 지금 맡은 일 중 무엇을 끝내고 무엇을 넘길지 정해보세요. 신뢰와 무한한 담당 범위는 같은 뜻이 아닙니다.",
      agency: "내가 고르고 싶은 제안과 지금 지원을 받아 끝낼 수 있는 제안을 나란히 놓아보세요. 두 조건이 만나는 일을 먼저 해보는 장면입니다.",
    },
  },
  "duty-supported": {
    question: "신뢰를 쌓는 책임과 내가 감당할 몫의 경계를 어떻게 맞출까",
    overallConnection: "역할을 지키려는 사주의 중심에 손금의 방법과 표현을 함께 놓습니다. 다른 방법이 떠오르더라도 책임을 더 맡아야 한다는 뜻이 아니라, 지금 맡은 일을 이어갈 조건을 조정할 여지로 읽습니다.",
    loveConnection: "상대를 챙기는 습관과 내게도 필요한 시간을 말하는 일은 함께 놓을 수 있습니다. 감정선의 모양을 그 바람을 전할 방식의 참고로 읽습니다.",
    loveScene: "만날 시간을 늘 상대에게 맞췄다면 ‘이번에는 내 일정도 먼저 같이 볼까?’라고 말해보세요. 배려를 거두는 일이 아니라 서로 지킬 수 있는 약속을 만드는 장면입니다.",
    moneyConnection: "신뢰를 얻어 맡는 범위가 커질 때 조건도 같이 바뀌는지 살펴봅니다. 보조선 후보를 실제 보상이 늘었다는 증거로 읽지 않습니다.",
    moneyScene: "담당 업무가 더해진다면 처음 약속과 새 업무를 목록으로 나눠보세요. 필요한 시간과 대가를 같은 대화에서 확인하는 장면입니다.",
    workConnection: "믿고 맡기는 일이 늘어날수록 누가 무엇을 결정하고 누가 지원할지 정해야 합니다. 두뇌선의 형태는 일을 풀어갈 방법의 참고일 뿐입니다.",
    workScene: "새 책임을 받아들일 때 완료할 범위, 결정권, 도움받을 사람을 함께 정해보세요. 맡는 마음과 혼자 메울 빈틈을 구분하는 장면입니다.",
    month: {
      preparation: "새 책임 앞에서 필요한 자료와 도움받을 사람을 먼저 확인해보세요. 준비를 혼자 짊어지는 일과 맡을 일을 이해하는 일은 다릅니다.",
      expression: "조용히 해온 일이 있다면 결과와 아직 필요한 지원을 함께 설명해보세요. 더 잘 보여주는 일이 더 많이 맡겠다는 뜻은 아닙니다.",
      exchange: "새 역할에 따른 결과물을 요청받으면 기존 범위와 추가 시간·대가를 함께 확인해보세요.",
      duty: "더 맡아달라는 말 앞에서 이미 맡은 일과 새 역할을 구분하고, 나눠 맡을 수 있는 범위를 물어보세요.",
      agency: "자기 방식으로 진행할 부분과 동료의 결정이 필요한 부분을 나누어보세요. 책임을 지키면서도 혼자 다 정하지 않는 장면입니다.",
    },
  },
  "duty-translation": {
    question: "요구를 이해해 어떤 결과로 설명하고 조건을 맞출까",
    overallConnection: "반복해 놓인 기준을 이해와 표현의 통로에 연결해 읽습니다. 두뇌선 모양은 방법의 참고일 뿐, 요구를 잘 처리한다는 증거가 아닙니다.",
    loveConnection: "가까운 자리의 약속과 기준을 읽더라도 상대의 마음이나 실제 관계를 미리 알 수는 없습니다. 감정선은 마음을 전할 방법의 참고로만 둡니다.",
    loveScene: "중요한 약속을 이야기할 때 서로 이해한 내용을 되짚고, 필요한 표현과 선택을 함께 물어보세요.",
    moneyConnection: "결과를 설명하는 일과 그 결과의 쓰임·수정 범위·대가를 합의하는 일을 함께 읽습니다. 보조선 후보는 실제 수입의 근거가 아닙니다.",
    moneyScene: "작은 결과를 보여준 뒤 추가 수정을 부탁받으면 사용 목적, 새 수정 범위, 필요한 시간과 대가를 나누어 확인해보세요.",
    workConnection: "여러 기준을 이해한 뒤 완료 조건을 물어 결과로 보여주고, 함께 고칠 범위를 정하는 장면으로 읽습니다. 선 모양으로 직업이나 능력을 판정하지 않습니다.",
    workScene: "요청의 완료 기준을 한 가지 묻고 작은 결과를 보여준 뒤, 상대가 고칠 부분과 필요한 자료를 함께 정해보세요.",
    month: {
      preparation: "완료 기준을 이해하는 데 아직 필요한 질문",
      expression: "이해한 내용을 보여줄 작은 결과",
      exchange: "새 수정의 쓰임·범위·대가",
      duty: "처음 합의한 완료 조건과 새 요구",
      agency: "스스로 정할 방법과 함께 확인할 기준",
    },
  },
  "duty-boundaries": {
    question: "약속을 지키면서 추가로 맡을 범위는 어디까지일까",
    overallConnection: "역할과 약속을 중시하는 중심에 손금의 다른 방법을 놓아봅니다. 방법의 여지는 기존 약속을 더 잘 지키기 위한 선택이지, 모든 빈틈을 새 책임으로 받아들여야 한다는 뜻은 아닙니다.",
    loveConnection: "상대의 기대를 알아차리는 것과 내 바람을 말하는 일이 한 대화에 놓일 수 있습니다. 감정선은 표현 방식의 참고입니다.",
    loveScene: "약속을 잡으며 상대 사정을 먼저 고려했다면 ‘나도 이 시간은 필요해’라고 내 몫을 말해보세요. 오래 지킬 수 있는 약속을 함께 만드는 장면입니다.",
    moneyConnection: "늘어난 역할만큼 시간과 조건도 달라지는지 살핍니다. 사진 속 후보선이 실제 보상을 알려준다고 해석하지 않습니다.",
    moneyScene: "처음 맡기로 한 일 외에 새 요청이 생기면 그 범위와 필요한 대가를 따로 이야기해보세요.",
    workConnection: "목적을 잘 지키려면 바꿀 수 있는 방법과 함께 결정할 조건을 알아야 합니다. 두뇌선의 형태는 방법을 고르는 참고로만 둡니다.",
    workScene: "새 일을 맡기 전 내가 결정할 수 있는 부분과 누가 도울 수 있는 부분을 물어보세요.",
    month: { preparation: "맡을 일을 더 이해하는 데 필요한 자료가 무엇인지 물어보세요.", expression: "해온 일의 결과와 이어갈 조건을 함께 설명해보세요.", exchange: "새 결과물을 요청받으면 원래 범위와 추가 조건을 다시 맞춰보세요.", duty: "새 책임 앞에서 이미 맡은 일과 나눌 몫을 확인해보세요.", agency: "자기 방법을 제안할 때 함께 정할 부분도 남겨보세요." },
  },
  "agency-value": {
    question: "납득한 선택의 목적을 지키면서 방법을 바꿀 수 있을까",
    overallConnection: "사주에서 선택의 이유를 오래 지키려는 모습과 손금에서 다른 방법을 떠올리는 관점을 함께 볼 수 있습니다. 대화 속 새로운 방법이 떠올라도 목표를 바꾸는 일과 방법을 바꾸는 일은 다릅니다.",
    loveConnection: "자기 방식으로 건넨 배려가 상대에게도 도움이 되었는지 묻는 여지를 남깁니다. 감정선의 모양은 배려를 전한 방식에 관한 참고이며 상대가 실제로 느낀 마음은 알려주지 않습니다.",
    loveScene: "상대를 위해 필요한 일을 해주었다면 ‘나는 이게 도움이 될 것 같았어. 너는 무엇을 원했어?’라고 물어보세요. 판단의 이유를 설명하면서 상대가 고를 자리를 남기는 장면입니다.",
    moneyConnection: "스스로 납득한 가치가 상대에게도 이해되는지 살피는 긴장입니다. 보조선 후보는 기여와 대가를 이야기할 장면의 참고입니다.",
    moneyScene: "좋은 조건이라고 판단한 제안이라면 왜 가치가 있는지 상대에게 한 가지 예로 보여주고, 상대가 맡아야 할 몫도 물어보세요.",
    workConnection: "원국에서는 스스로 납득한 선택의 이유와 실제 쓰임을 함께 봅니다. 일에서는 그 이유를 함께할 사람이 이해할 수 있게 전하고, 필요한 결과를 물어보는 장면으로 연결합니다.",
    workScene: "새 방법을 설명할 때 지키고 싶은 목적 하나와 바꿔도 되는 방법 하나를 구분해 전해보세요. 상대가 중요하게 보는 조건을 들으면 자신의 기준도 더 분명해질 수 있습니다.",
    month: {
      preparation: "선택을 더 알아볼 때 이미 납득한 목적과 아직 확인할 방법을 나누어 적어보세요. 목적을 모두 다시 고르는 부담을 줄일 수 있습니다.",
      expression: "새 방법을 제안할 때 왜 이 일을 하려는지는 먼저 설명하고, 실행 방법에 대한 상대의 질문을 들어보세요.",
      exchange: "납득한 가치가 상대에게도 전달되는지 작은 예로 보여주고, 서로 어떤 조건을 맡는지 맞춰보세요.",
      duty: "맡은 역할의 목적을 지키면서 실행 방법을 바꿀 여지가 있는지 함께 확인해보세요.",
      agency: "내가 고른 이유와 함께할 사람이 바꾸고 싶은 조건을 나란히 말해보세요.",
    },
  },
  "understanding-duty": {
    question: "충분히 이해한 내용을 언제 맡을 일로 옮길까",
    overallConnection: "이해하고 준비하는 중심에 손금에서 본 방법의 여지를 놓습니다. 더 알아볼 조건과 이미 해볼 수 있는 부분을 구분하면 맡을 일의 범위가 선명해집니다.",
    loveConnection: "서로 이해받는 감각과 지킬 약속을 함께 생각할 수 있습니다. 감정선은 마음을 전하는 방법의 참고입니다.",
    loveScene: "상대의 이야기를 충분히 들은 뒤 ‘나는 이렇게 이해했어. 네가 기대한 건 맞아?’라고 확인하고 서로 지킬 약속을 정해보세요.",
    moneyConnection: "배운 것을 어떤 일에 쓰고 어떤 조건을 받을지 분리해 살핍니다. 후보선은 실제 보상을 측정하지 않습니다.",
    moneyScene: "준비한 일을 제안한다면 쓸모와 맡을 범위, 대가를 함께 설명해보세요.",
    workConnection: "이해를 쌓는 일과 일을 끝내는 조건을 같이 봅니다. 두뇌선의 모양은 방법의 참고입니다.",
    workScene: "새 일을 배울 때 지금 적용해볼 부분과 도움받아 확인할 부분을 나누어보세요.",
    month: { preparation: "자료를 더 찾기 전에 결정에 필요한 질문 하나를 골라보세요.", expression: "배운 내용을 작은 결과로 보여주고 부족한 설명을 확인해보세요.", exchange: "이해한 일을 어떻게 쓸지와 맡을 조건을 같이 정해보세요.", duty: "맡은 역할에서 아직 모르는 조건과 지금 진행할 일을 구분해보세요.", agency: "조언을 들은 뒤 스스로 고를 기준 하나를 남겨보세요." },
  },
  "agency-expression": {
    question: "먼저 움직이는 속도와 함께할 사람의 선택을 어떻게 맞출까",
    overallConnection: "스스로 움직여 표현하는 중심에 손금에서 본 다른 방법을 놓습니다. 더 빨리 제안하는 일과 함께 고를 시간을 남기는 일을 같이 볼 수 있습니다.",
    loveConnection: "내가 먼저 표현하더라도 상대의 반응을 고를 시간은 별도로 남길 수 있습니다. 감정선은 표현 방식의 참고입니다.",
    loveScene: "다음 만남을 제안한 뒤 ‘내가 기대하는 건 이거야. 너는 어떤 게 편해?’라고 함께 물어보세요.",
    moneyConnection: "새 결과를 보여주는 일과 받을 조건을 합의하는 일을 함께 봅니다. 후보선이 실제 수입을 알려주는 것은 아닙니다.",
    moneyScene: "새 일을 제안할 때 결과와 시간, 대가를 한 번에 설명해보세요.",
    workConnection: "직접 시도하는 힘에 동료가 이해하고 선택할 시간을 더합니다. 두뇌선은 방법의 참고입니다.",
    workScene: "작은 시연 뒤 함께할 사람이 필요한 변경 한 가지를 듣고 다음 방법을 고르세요.",
    month: { preparation: "먼저 움직이기 전에 함께할 사람이 알아야 할 조건 하나를 확인해보세요.", expression: "새 방법을 보여준 뒤 상대가 고를 시간을 남겨보세요.", exchange: "반응 뒤 추가 작업의 범위와 대가를 같이 정해보세요.", duty: "맡을 역할과 스스로 고를 부분을 함께 정해보세요.", agency: "자신의 제안을 말한 뒤 다른 선택도 들어보세요." },
  },
  balanced: {
    question: "서로 다른 기준 가운데 이번 선택의 중심은 무엇일까",
    overallConnection: "사주에서 나란히 놓인 기준에 손금에서 읽힌 방법의 모양을 더합니다. 어느 한쪽이 실제 성격을 결정한다기보다, 이번 선택에 필요한 기준을 고르는 참고로 봅니다.",
    loveConnection: "함께할 시간과 각자의 선택을 모두 말할 수 있습니다. 감정선은 표현 방식의 참고입니다.",
    loveScene: "함께하고 싶은 시간 하나와 혼자 정하고 싶은 일 하나를 나누어 말해보세요.",
    moneyConnection: "쓰임과 조건을 함께 살핍니다. 후보선은 보상의 증거가 아닙니다.",
    moneyScene: "새 제안의 쓸모와 필요한 시간·대가를 나란히 적어보세요.",
    workConnection: "여러 방법 가운데 이번 일의 완료 기준을 먼저 맞춰봅니다. 두뇌선은 방법의 참고입니다.",
    workScene: "가능한 방법 두 가지와 완료 기준 하나를 함께 정해보세요.",
    month: { preparation: "이번 선택에 더 필요한 정보 하나를 확인해보세요.", expression: "전하고 싶은 결과와 상대가 볼 기준을 같이 정해보세요.", exchange: "제안의 쓰임과 맡을 조건을 함께 살펴보세요.", duty: "지킬 약속과 바꿀 수 있는 방법을 나누어보세요.", agency: "내가 고를 부분과 함께 정할 부분을 나누어보세요." },
  },
};

function buildNatalEditorialEvidence(facts: SajuFacts): NatalEditorialEvidence {
  const counts: Record<TenGodGroup, number> = {
    비겁: facts.peerStarCount, 식상: facts.outputStarCount, 재성: facts.wealthStarCount,
    관성: facts.officerStarCount, 인성: facts.resourceStarCount,
  };
  const largest = Math.max(...Object.values(counts));
  const leaders = (Object.keys(counts) as TenGodGroup[]).filter(group => counts[group] === largest);
  const dominant = leaders.length === 1 ? leaders[0] : null;
  const supporting = (["인성", "식상", "비겁", "재성", "관성"] as TenGodGroup[])
    .filter(group => group !== dominant && counts[group] > 0);
  const placements = facts.pillars.filter(pillar => facts.hasTimeInput || pillar.pillar !== "hour").flatMap(pillar =>
    (["stem", "branch"] as const).flatMap(part => {
      const tenGod = part === "stem" ? pillar.stemTenGod : pillar.branchTenGod;
      const group = TEN_GOD_GROUP[tenGod];
      return group ? [{ pillar: pillar.pillar, part, symbol: part === "stem" ? pillar.stemHanja : pillar.branchHanja, tenGod, group }] : [];
    }));
  return { counts, dominant, supporting, placements };
}

export function buildPremiumEditorialPlan(facts: SajuFacts, profileRule = buildPersonalReading(facts).rule): PremiumEditorialPlan {
  const weak = facts.dayStrengthReliable && facts.dayStrength === "weak";
  const id: EditorialArcId = profileRule === "agency-duty-understanding" ? weak ? "agency-duty-supported" : "agency-duty"
    : profileRule === "creation-exchange-support" ? "creation-exchange-supported"
      : profileRule === "creation-exchange" ? "creation-exchange"
        : profileRule === "duty-with-support" ? "duty-supported"
          : profileRule === "duty-translation" ? "duty-translation"
          : profileRule === "duty-and-boundaries" ? "duty-boundaries"
            : profileRule === "agency-value-understanding" ? "agency-value"
              : profileRule === "understanding-duty" ? "understanding-duty"
                : profileRule === "agency-expression" ? "agency-expression" : "balanced";
  const daeunGroups = facts.currentDaeun
    ? [...new Set([TEN_GOD_GROUP[facts.currentDaeun.stemTenGod], TEN_GOD_GROUP[facts.currentDaeun.branchTenGod]].filter(Boolean))] as TenGodGroup[]
    : [];
  return { id, natalEvidence: buildNatalEditorialEvidence(facts), daeunGroups, ...PLANS[id] };
}

/** The calendar supplies the actual month groups. The already selected
 * personal tension supplies the scene, so identical months need not receive
 * identical advice for two different natal charts. */
export function selectEditorialMonthScene(plan: PremiumEditorialPlan, groups: TenGodGroup[]): string | null {
  if (!groups.length) return null;
  if (groups.includes("식상") && groups.includes("재성")) return plan.month.exchange;
  if (groups.includes("인성")) return plan.month.preparation;
  if (groups.includes("관성")) return plan.month.duty;
  if (groups.includes("식상")) return plan.month.expression;
  if (groups.includes("재성")) return plan.month.exchange;
  return plan.month.agency;
}
