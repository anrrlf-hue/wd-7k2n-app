import type { PremiumEditorialPlan, EditorialArcId } from "@/lib/premium-editorial-plan";
import type { IntegratedPassage } from "@/lib/integrated-palm-reading";
import type { DominantHand } from "@/lib/palm-bilateral";
import type { PalmFacts, OnnxLineDetail } from "@/lib/palm-facts";
import { buildSajuMoneyMeaning } from "@/lib/saju-money-meaning";

type Domain = "love_relationship" | "money" | "work";
type Story = { ground: string; tension: string; example: string; alternative: string };
type DomainStories = Record<Domain, Story>;

/** Each arc is chosen from calculated natal evidence, never from a person's
 * name, birthday, biography, or an unverified line. One scene develops its
 * tension once; it is not an appended copy of the natal and palm passages. */
const STORIES: Record<EditorialArcId, DomainStories> = {
  "agency-duty": {
    love_relationship: {
      ground: "사주에서는 가까운 약속을 지키는 마음과 그 이유를 스스로 납득하려는 기준을 함께 읽습니다.",
      tension: "같은 약속을 중요하게 여겨도 상대가 마음을 전하는 방법은 다를 수 있어, 행동만으로 서로의 기대가 전해졌다고 여기면 틈이 생길 수 있습니다.",
      example: "가령 만날 시간이 바뀌었다면 사정을 이해한다는 말과 함께 원래 기대했던 시간을 말하고, 둘 다 가능한 새 약속을 물어볼 수 있습니다.",
      alternative: "약속을 버리는 선택이 아니라, 그 약속이 서로에게 어떤 의미인지 확인하는 선택입니다.",
    },
    money: {
      ground: "사주에서는 맡은 일의 완성도와 그것을 어떤 조건으로 돌려받는지를 따로 살핍니다.",
      tension: "더 잘하려고 덧댄 작업이 처음부터 맡기로 한 범위로 받아들여지면, 들인 시간과 합의한 대가 사이가 어긋날 수 있습니다.",
      example: "가령 마무리 단계에서 새 결과물을 부탁받았다면 기존 범위와 추가 시간을 적고 그에 맞는 대가를 같은 자리에서 물어볼 수 있습니다.",
      alternative: "완성도를 낮추지 않으면서도 어디까지가 새 약속인지 드러내는 방식입니다.",
    },
    work: {
      ground: "사주에서는 목적에 납득할 때 책임과 자기 판단을 함께 쓰는 장면을 중심으로 읽습니다.",
      tension: "목적은 동의했지만 실행 방법을 전혀 고를 수 없다면 완성도를 높이려는 판단이 오히려 검토 지연으로 남을 수 있습니다.",
      example: "가령 새 역할을 맡을 때 완료할 결과와 직접 결정할 방법을 따로 묻고, 함께 승인받아야 할 지점을 정해볼 수 있습니다.",
      alternative: "책임을 피하는 선택이 아니라 그 책임에 맞는 재량을 확인하는 선택입니다.",
    },
  },
  "agency-duty-supported": {
    love_relationship: {
      ground: "사주에서는 상대의 이유를 이해하려는 태도와 자기 바람을 표현할 여지를 함께 읽습니다.",
      tension: "상대의 일정에 동의한 일이 다음 만남의 준비와 선택까지 모두 맡겠다는 뜻으로 굳어지면, 배려 속에서 내 바람이 사라질 수 있습니다.",
      example: "가령 시간을 맞춘 뒤에는 ‘이번에는 내가 가보고 싶은 곳도 같이 골라볼까?’라고 제안하고 상대가 원하는 방식도 들어볼 수 있습니다.",
      alternative: "상대의 사정을 이해하는 일과 내 선택을 관계에 올리는 일이 한 대화에 놓일 수 있습니다.",
    },
    money: {
      ground: "사주에서는 괜찮아 보이는 대가와 그 결과를 만들 사람·자료·시간을 함께 살핍니다.",
      tension: "조건에 동의한 뒤 준비 과정까지 혼자 맡게 되면 같은 대가라도 실제로 감당할 몫은 커질 수 있습니다.",
      example: "가령 제안이 확정되기 전에 필요한 자료를 누가 주고 조율은 누가 할지, 그 몫이 바뀌면 대가도 다시 맞출지 물어볼 수 있습니다.",
      alternative: "좋은 기회를 거절하거나 무작정 받는 대신 끝낼 수 있는 조건을 확인하는 선택입니다.",
    },
    work: {
      ground: "사주에서는 납득한 목적에 자기 방법을 보태되, 끝까지 진행할 자료와 협력이 있어야 그 판단이 쓰인다고 읽습니다.",
      tension: "자료가 늦는데도 빈틈을 메우려 직접 자료까지 만들면, 다음에도 준비 전체가 내 역할로 굳을 수 있습니다.",
      example: "가령 새 업무의 시안은 정리했지만 검토 자료가 오지 않았다면, 먼저 정리할 부분과 자료를 받은 뒤 함께 판단할 사람을 구분해 말해볼 수 있습니다.",
      alternative: "진행을 멈추는 선택과 책임을 혼자 넓히는 선택 사이에, 필요한 조건을 밝혀 함께 끝내는 선택을 남깁니다.",
    },
  },
  "creation-exchange": {
    love_relationship: {
      ground: "사주에서는 생각을 나누고 함께 해볼 일을 떠올리는 과정에 관계의 쓰임이 실리는 것으로 읽습니다.",
      tension: "대화가 즐거웠다는 반응과 다음 계획에도 동의했다는 뜻을 같은 것으로 두면 서로의 선택이 빠질 수 있습니다.",
      example: "가령 다음 만남을 제안할 때 하고 싶은 일 하나를 말한 뒤 상대가 원한 시간과 활동을 물어볼 수 있습니다.",
      alternative: "제안을 줄이는 일이 아니라 함께 고른 계획으로 바꾸는 선택입니다.",
    },
    money: {
      ground: "사주에서는 만들어낸 결과가 실제로 어디에 쓰일지와 그에 맞는 교환 조건을 같이 읽습니다.",
      tension: "첫 결과가 좋은 반응을 얻어도 이어질 작업의 양과 대가까지 합의된 것은 아닐 수 있습니다.",
      example: "가령 추가 작업을 부탁받으면 새 결과물이 쓰일 곳, 필요한 수정 시간, 대가를 처음 결과와 분리해 물어볼 수 있습니다.",
      alternative: "호응을 기회로 살리면서도 계속 제공할 수 있는 범위를 정하는 선택입니다.",
    },
    work: {
      ground: "사주에서는 떠올린 방법을 실제 사용할 사람의 필요와 연결할 때 표현의 의미가 구체화됩니다.",
      tension: "좋은 아이디어가 많아도 어느 부분이 실제로 쓰이는지 확인하지 않으면 반응마다 전체 방향을 바꾸게 될 수 있습니다.",
      example: "가령 작은 시안을 보여준 뒤 편한 점과 바꿔야 할 점을 하나씩 듣고, 유지할 결과와 수정할 부분을 나누어볼 수 있습니다.",
      alternative: "표현을 멈추는 대신 쓸 수 있는 결과로 좁혀가는 선택입니다.",
    },
  },
  "creation-exchange-supported": {
    love_relationship: {
      ground: "사주에서는 함께할 가능성을 펼치는 마음과 각자 쓸 수 있는 시간·도움을 함께 읽습니다.",
      tension: "즐거운 제안이 늘어날수록 모든 준비까지 한 사람이 맡으면 기대가 뒤늦은 부담으로 바뀔 수 있습니다.",
      example: "가령 다음에 해보고 싶은 일을 말하면서 이번 주 가능한 시간과 누가 무엇을 준비할지 함께 물어볼 수 있습니다.",
      alternative: "관심을 줄이는 일이 아니라 두 사람 모두 이어갈 수 있는 약속으로 고르는 선택입니다.",
    },
    money: {
      ground: "사주에서는 결과를 보여주는 힘과 그 일을 끝낼 사람·시간·대가가 맞는지를 함께 봅니다.",
      tension: "호응이 좋아 추가 요청이 와도 기존 범위 밖의 준비를 누가 맡는지가 비어 있으면 실제 남는 몫이 달라질 수 있습니다.",
      example: "가령 두 번째 결과물을 부탁받는다면 처음 합의한 범위와 새 작업에 필요한 사람·시간·대가를 다시 적어볼 수 있습니다.",
      alternative: "반응을 바로 계약으로 여기지 않고 끝낼 조건을 맞추는 선택입니다.",
    },
    work: {
      ground: "사주에서는 새 제안을 만드는 힘과 그것을 함께 끝낼 지원 조건을 같이 읽습니다.",
      tension: "시연에 대한 좋은 반응만으로 모든 후속 작업을 맡으면 아이디어를 보여준 몫과 실행할 몫이 뒤섞일 수 있습니다.",
      example: "가령 작은 시연 뒤 실제 쓸 사람에게 필요한 변경을 듣고, 다음 단계의 자료와 담당자를 정해볼 수 있습니다.",
      alternative: "가능성을 많이 나열하는 대신 지원이 맞는 한 가지를 완성하는 선택입니다.",
    },
  },
  "duty-supported": {
    love_relationship: {
      ground: "사주에서는 약속을 이어가는 책임과 서로에게 필요한 시간을 함께 읽습니다.",
      tension: "상대에게 맞춘 일정이 반복되면 어느 쪽이 편한 약속인지 확인할 기회가 줄어들 수 있습니다.",
      example: "가령 만날 시간을 정할 때 이번에는 내 일정도 먼저 펼쳐놓고 둘 다 지킬 수 있는 시간을 물어볼 수 있습니다.",
      alternative: "배려를 거두는 것이 아니라 오래 지킬 약속을 함께 만드는 선택입니다.",
    },
    money: {
      ground: "사주에서는 쌓인 신뢰로 맡는 역할과 그 역할의 조건을 별개로 읽습니다.",
      tension: "담당 범위가 늘어도 처음의 시간과 대가가 그대로라면 신뢰와 보상이 같은 속도로 움직이지 않을 수 있습니다.",
      example: "가령 새 업무가 더해지면 이전 약속과 새 결과물을 나눠 적고 필요한 시간·대가를 확인해볼 수 있습니다.",
      alternative: "맡은 일을 잘 이어가면서도 바뀐 범위를 드러내는 선택입니다.",
    },
    work: {
      ground: "사주에서는 기준을 지키고 신뢰를 쌓는 일에 필요한 사람과 자료의 지원을 함께 읽습니다.",
      tension: "믿고 맡긴다는 말 뒤에 결정권과 도움받을 사람이 비어 있으면 누락된 준비까지 혼자 메울 수 있습니다.",
      example: "가령 새 책임을 받을 때 완료 범위, 내가 결정할 부분, 검토를 도울 사람을 한꺼번에 확인해볼 수 있습니다.",
      alternative: "책임을 줄이는 대신 책임을 지킬 조건을 분명히 하는 선택입니다.",
    },
  },
  "duty-translation": {
    love_relationship: {
      ground: "사주에서는 가까운 자리의 약속과 기준을 읽되, 상대의 마음까지 안다고 보지는 않습니다.",
      tension: "서로 같은 말을 듣고도 무엇을 기대했는지는 다를 수 있어, 해결할 일을 바로 정하면 마음이 전해지는 과정이 빠질 수 있습니다.",
      example: "가령 중요한 부탁을 들었다면 이해한 내용을 되짚고 상대가 지금 원하는 답이나 도움의 방식을 물어볼 수 있습니다.",
      alternative: "약속의 기준과 마음을 전하는 방법을 함께 확인하는 선택입니다.",
    },
    money: {
      ground: "사주에서는 결과를 밖에 보여주는 통로와 그 결과의 쓰임·대가를 묻는 자리를 함께 읽습니다.",
      tension: "완성도가 높다는 평가와 누가 실제로 쓰며 어떤 조건으로 계속 교환할지는 다른 판단입니다. 한 번의 호응을 반복 가능한 보상으로 단정할 수 없습니다.",
      example: "가령 만든 결과의 값을 살필 때에는 사용할 사람과 쓰는 횟수, 유지에 드는 시간, 교환할 조건을 나란히 물어볼 수 있습니다.",
      alternative: "더 만들어야 한다는 결론보다 이미 만든 것이 남기는 가치와 그것을 지킬 비용을 구별하는 관점입니다.",
    },
    work: {
      ground: "사주에서는 반복한 요구를 이해하고 설명할 결과로 옮기는 순서를 살핍니다.",
      tension: "익힌 기준만 오래 정리하면 실제 실행에서 맞는지 알기 어렵고, 검토 없이 바로 완성하면 고칠 여지가 사라질 수 있습니다.",
      example: "가령 새 일을 맡는 상황이라면 이해한 기준을 시안에 적용해 보여주고 피드백을 받아볼 수 있습니다. 그 뒤에 같은 목적을 이루는 여러 방법 중 자신이 결정할 부분을 구분해볼 수 있습니다.",
      alternative: "일의 핵심은 모든 요구를 미리 합의하는 것보다 배운 기준을 실행 가능한 방법으로 번역하고 검토하는 과정입니다.",
    },
  },
  "duty-boundaries": {
    love_relationship: {
      ground: "사주에서는 약속을 지키는 일과 내게도 필요한 시간을 말하는 일을 함께 살핍니다.",
      tension: "상대 사정을 먼저 고려한 약속이 계속되면 내 바람이 이미 합의된 것처럼 지나갈 수 있습니다.",
      example: "가령 새로운 일정을 정할 때 이번에는 내게 필요한 시간도 한 가지 말하고 상대의 조건을 물어볼 수 있습니다.",
      alternative: "약속을 깨기보다 지킬 수 있는 형태로 다시 맞추는 선택입니다.",
    },
    money: {
      ground: "사주에서는 맡은 역할이 늘어나는 시점과 돌아올 조건을 같이 확인합니다.",
      tension: "처음 약속 밖의 일이 더해져도 같은 일의 연장으로 넘기면 시간과 대가의 기준이 흐려질 수 있습니다.",
      example: "가령 추가 결과물을 요청받으면 이전 범위를 먼저 짚고 새 작업의 시간·대가를 따로 물어볼 수 있습니다.",
      alternative: "역할을 거부하기보다 새 역할의 조건을 합의하는 선택입니다.",
    },
    work: {
      ground: "사주에서는 주어진 목적을 지키면서 맡을 범위의 경계를 살피는 긴장을 읽습니다.",
      tension: "새 일을 모두 기존 책임으로 받아들이면 무엇을 먼저 끝낼지와 누가 결정할지가 모호해질 수 있습니다.",
      example: "가령 급한 요청이 겹치면 이미 맡은 결과와 새 요청을 나란히 놓고 우선순위와 지원 담당자를 물어볼 수 있습니다.",
      alternative: "책임을 포기하는 것이 아니라 완료할 약속을 지키기 위한 선택입니다.",
    },
  },
  "agency-value": {
    love_relationship: {
      ground: "사주에서는 스스로 납득한 배려의 이유와 상대가 실제로 원하는 도움을 따로 읽습니다.",
      tension: "내게는 도움이 된 행동이어도 상대에게는 다른 방식이 필요할 수 있어, 이유를 설명하는 일만으로 마음이 닿았다고 단정할 수 없습니다.",
      example: "가령 먼저 필요한 일을 해주었다면 도움이 되었는지 묻고, 다음에는 무엇을 원했는지도 들어볼 수 있습니다.",
      alternative: "자기 기준을 버리는 대신 상대가 고를 자리를 남기는 선택입니다.",
    },
    money: {
      ground: "사주에서는 스스로 납득한 가치와 상대에게 실제로 남는 쓰임을 함께 읽습니다.",
      tension: "비용이 유리해 좋은 제안이라고 여겼더라도 상대는 들일 시간이나 맡을 역할을 더 중요하게 볼 수 있습니다.",
      example: "가령 조건표에 대한 반응이 미적지근하다면 같은 장점을 되풀이하기보다 상대가 부담스러워한 시간과 역할을 물어볼 수 있습니다.",
      alternative: "내 기준의 가치를 포기하는 일이 아니라 합의할 조건을 찾아보는 선택입니다.",
    },
    work: {
      ground: "사주에서는 납득한 선택의 이유를 실제 사용할 사람이 이해할 수 있는 결과와 연결합니다.",
      tension: "혼자 정리한 이유가 충분해도 함께 일할 사람에게 결과의 목적과 바꿀 수 있는 부분이 전해지지 않으면 같은 기준으로 움직이기 어렵습니다.",
      example: "가령 새 방법을 제안할 때 지킬 목적 하나와 상대가 바꾸고 싶은 조건 하나를 먼저 나누어볼 수 있습니다.",
      alternative: "판단의 중심은 남기되 실행 방법을 함께 정할 여지를 여는 선택입니다.",
    },
  },
  "understanding-duty": {
    love_relationship: {
      ground: "사주에서는 상대의 말을 이해하는 일과 서로 지킬 약속을 정하는 일을 함께 읽습니다.",
      tension: "충분히 들었다고 느껴도 상대가 기대한 뜻과 내가 이해한 뜻은 다를 수 있습니다.",
      example: "가령 중요한 부탁을 들었다면 이해한 내용을 짧게 되짚고 지금 함께 지킬 약속이 무엇인지 물어볼 수 있습니다.",
      alternative: "더 오래 추측하기보다 서로 같은 내용을 보고 있는지 확인하는 선택입니다.",
    },
    money: {
      ground: "사주에서는 배우고 익힌 내용을 어떤 쓰임으로 내놓을지와 받을 조건을 나눠 읽습니다.",
      tension: "준비가 충분해져도 제공할 범위가 말로 정해지지 않으면 결과와 대가를 서로 다르게 기대할 수 있습니다.",
      example: "가령 배운 일을 제안할 때 쓸 수 있는 결과 하나, 아직 확인할 부분, 필요한 시간을 같이 적어볼 수 있습니다.",
      alternative: "더 준비할 일과 지금 합의할 조건을 구분하는 선택입니다.",
    },
    work: {
      ground: "사주에서는 이해하고 준비하는 과정이 맡은 일을 끝내는 조건과 만날 때 의미가 있습니다.",
      tension: "모든 자료를 알 때까지 시작을 미루면 지금 확인할 수 있는 작은 결과도 늦어질 수 있습니다.",
      example: "가령 새 업무를 배운 뒤 적용해볼 한 부분을 먼저 정하고 모르는 조건은 동료에게 물어볼 수 있습니다.",
      alternative: "준비를 줄이는 것이 아니라 다음 질문을 만드는 실행을 더하는 선택입니다.",
    },
  },
  "agency-expression": {
    love_relationship: {
      ground: "사주에서는 먼저 마음을 표현하는 힘과 상대가 반응을 고를 시간을 같이 읽습니다.",
      tension: "내 제안이 분명할수록 상대에게는 아직 생각할 자리가 남아 있는지 확인할 필요가 있습니다.",
      example: "가령 만남을 제안한 뒤 기대하는 것 하나를 말하고 상대가 편한 방식도 물어볼 수 있습니다.",
      alternative: "표현을 약하게 하는 대신 두 사람이 고르는 대화로 바꾸는 선택입니다.",
    },
    money: {
      ground: "사주에서는 새 결과를 보여주는 속도와 그 결과의 교환 조건을 함께 봅니다.",
      tension: "빠르게 시연한 일의 반응이 좋더라도 후속 작업의 시간과 대가까지 정해진 것은 아닙니다.",
      example: "가령 새 요청을 받으면 보여준 결과와 앞으로 만들 범위를 나누어 적고 대가를 확인해볼 수 있습니다.",
      alternative: "움직이는 속도를 잃지 않으면서 약속의 범위를 맞추는 선택입니다.",
    },
    work: {
      ground: "사주에서는 먼저 시도해 보여주는 힘과 함께할 사람이 선택할 여지를 같이 읽습니다.",
      tension: "시연 뒤 곧바로 다음 방향을 정하면 실제 사용할 사람의 필요한 변경이 빠질 수 있습니다.",
      example: "가령 작은 결과를 보여준 뒤 상대가 바꾸고 싶은 점을 하나 듣고 다음 단계를 정해볼 수 있습니다.",
      alternative: "주도권을 잃는 것이 아니라 결과를 함께 쓸 수 있게 하는 선택입니다.",
    },
  },
  balanced: {
    love_relationship: {
      ground: "사주에서 여러 기준이 비슷하게 놓였다면 관계에서도 함께할 시간과 각자의 선택을 한쪽으로 정하지 않습니다.",
      tension: "서로 기대한 거리와 시간이 말로 드러나지 않으면 같은 배려를 다르게 받아들일 수 있습니다.",
      example: "가령 주말 약속을 정할 때 함께할 시간 하나와 각자 정하고 싶은 일 하나를 나누어볼 수 있습니다.",
      alternative: "가까움과 공간을 양자택일하지 않는 선택입니다.",
    },
    money: {
      ground: "사주에서 여러 기준이 나란히 놓인 경우 결과의 쓰임과 필요한 조건을 함께 살핍니다.",
      tension: "좋은 내용만 보거나 대가만 보면 실제로 이어갈 수 있는 범위를 놓칠 수 있습니다.",
      example: "가령 제안을 비교할 때 쓸모, 드는 시간, 돌아올 대가를 한 줄씩 적어볼 수 있습니다.",
      alternative: "한 기준을 버리지 않고 이번 선택에서 무엇이 더 중요한지 정하는 방법입니다.",
    },
    work: {
      ground: "사주에서 여러 기준이 비슷하다면 일의 방법을 성격으로 고정하기보다 이번 결과의 완료 기준을 먼저 봅니다.",
      tension: "가능한 방법이 여럿일수록 누구에게 무엇을 전달해야 끝난 것인지 정하지 않으면 검토가 늘어질 수 있습니다.",
      example: "가령 두 방법을 제안할 때 실제 사용할 사람과 완료 기준 하나를 먼저 맞춰볼 수 있습니다.",
      alternative: "한 방법을 영원히 고르는 일이 아니라 이번 일에 맞는 방법을 선택하는 일입니다.",
    },
  },
};

/** The opening frames the selected natal question once. Observed line shape
 * belongs in the relevant relationship or work scene below, not in a second
 * copy of the same introductory interpretation. */
const OVERALL: Record<EditorialArcId, string> = {
  "agency-duty": "사주에서는 책임의 이유를 이해하려는 태도, 그 이유가 자기 판단과 맞는지 살피는 태도를 함께 읽습니다. 새 정보가 선택 자체를 바꾸는 경우와 이미 가진 판단을 설명할 차례인 경우는 다릅니다. 이 차이를 분간하는 것이 전체 풀이의 중심이며, 구체적인 재량과 실행은 일의 장면에서 따로 살핍니다.",
  "agency-duty-supported": "사주에서는 납득한 목적과 그 목적을 감당할 사람·자료의 조건이 동시에 놓인 것으로 읽습니다. 옳은 방향을 이해했다는 사실과 혼자서 모든 준비를 끝낼 수 있다는 가정은 이어지지 않습니다. 어느 판단은 스스로 내리고 어느 부분은 도움을 받아야 하는지 살피는 것이 중심입니다.",
  "creation-exchange": "사주에서는 생각을 드러내는 힘과 실제 쓰임을 따지는 감각을 함께 읽습니다. 호응은 가능성을 열어주지만 그 결과가 계속 쓰일지는 다른 질문입니다. 무엇을 새로 만들고 무엇이 실제로 필요한지 구별하는 긴장이 이 풀이의 중심이며, 관계·재물·일은 그 답이 서로 다를 수 있습니다.",
  "creation-exchange-supported": "사주에서는 제안을 넓히는 관심과 끝까지 이어갈 사람·시간·자료의 조건을 함께 봅니다. 좋은 반응이 여러 곳에서 와도 그것들이 모두 같은 무게의 약속은 아닙니다. 가능성을 발견하는 단계와 지속할 하나를 선택하는 단계를 구분하는 것이 이 풀이의 중심입니다.",
  "duty-supported": "사주에서는 맡은 약속을 지키려는 태도와 그 약속을 뒷받침할 지원을 함께 읽습니다. 책임을 잘 이해하는 사람에게도 결정에 필요한 자료나 협력은 별개의 조건입니다. 신뢰가 어떤 지원 위에서 오래 이어지는지 살피되, 실제 역할이나 능력을 이 상징만으로 판정하지 않습니다.",
  "duty-translation": "",
  "duty-boundaries": "사주에서는 약속을 지키는 기준이 강할수록 새로운 요구를 같은 책임의 일부로 받아들이기 쉬운 긴장을 읽습니다. 기존 역할을 안정적으로 유지하는 일과 새 역할을 선택하는 일은 다른 판단입니다. 어느 약속을 지켜야 하는지 먼저 알아야 새 요청도 제대로 읽을 수 있습니다.",
  "agency-value": "사주에서는 스스로 납득한 가치와 다른 사람이 실제로 쓸 수 있는 가치를 나눠 읽습니다. 자기 기준이 분명한 것과 그 기준이 상대에게 전달된 것은 같은 일이 아닙니다. 이 차이를 어떻게 확인할지는 관계의 바람, 재물의 쓰임, 일의 방법마다 달라집니다.",
  "understanding-duty": "사주에서는 이해와 준비가 맡은 역할에 앞서 놓일 때의 장점과 긴장을 읽습니다. 더 배우면 선택이 달라질 정보가 남아 있는지, 아니면 이미 가진 이해를 적용할 차례인지 구분할 필요가 있습니다. 이 질문은 서두르거나 무조건 기다리라는 결론이 아닙니다.",
  "agency-expression": "사주에서는 먼저 자기 생각을 드러내는 태도와 그 결과를 함께 쓸 사람의 선택을 함께 읽습니다. 분명한 제안이 상대에게도 충분한 선택지를 남기는지는 확인되지 않은 문제입니다. 주도적인 시작과 함께 받아들일 수 있는 결과 사이의 간격을 이 풀이의 중심으로 둡니다.",
  balanced: "사주에서 여러 근거가 비슷하게 놓였다면 한 가지 성격이나 답으로 묶기 어렵습니다. 같은 사람에게도 친밀함, 돈의 조건, 일의 방식은 서로 다른 판단을 요구할 수 있습니다. 전체 풀이에서는 각 기준이 함께 있다는 사실만 확인하고, 어느 기준을 앞세울지는 분야별로 따로 살핍니다.",
};

const ARC_EVIDENCE_GROUPS: Record<EditorialArcId, Array<"비겁" | "식상" | "재성" | "관성" | "인성">> = {
  "agency-duty": ["관성", "인성", "비겁"],
  "agency-duty-supported": ["관성", "인성", "비겁"],
  "creation-exchange": ["식상", "재성", "비겁"],
  "creation-exchange-supported": ["식상", "재성", "인성"],
  "duty-supported": ["관성", "인성", "비겁"],
  "duty-translation": ["관성", "인성", "식상"],
  "duty-boundaries": ["관성", "비겁", "재성"],
  "agency-value": ["비겁", "재성", "식상"],
  "understanding-duty": ["인성", "관성", "식상"],
  "agency-expression": ["비겁", "식상", "재성"],
  balanced: ["비겁", "식상", "재성", "관성", "인성"],
};
const OVERALL_ROLE = {
  비겁: "자기 판단", 식상: "생각을 보여줄 통로", 재성: "쓰임과 교환 조건",
  관성: "약속의 기준", 인성: "이해와 도움",
} as const;

function overallEvidenceBridge(plan: PremiumEditorialPlan): string {
  const candidates = ARC_EVIDENCE_GROUPS[plan.id].flatMap(group => {
    const entry = plan.natalEvidence.placements.filter(item => item.group === group)
      .sort((a, b) => ({ month: 0, day: 1, hour: 2, year: 3 })[a.pillar] - ({ month: 0, day: 1, hour: 2, year: 3 })[b.pillar])[0];
    return entry ? [`${positionName[entry.pillar]}${entry.part === "stem" ? "간" : "지"} ${entry.symbol}/${entry.tenGod}: ${OVERALL_ROLE[group]}`] : [];
  }).slice(0, 3);
  return candidates.length >= 2 ? `이 질문에 쓰인 원국의 서로 다른 자리는 ${candidates.join(" · ")}입니다.` : "";
}

export function composePremiumOverallStory(plan: PremiumEditorialPlan): string {
  if (plan.id === "duty-translation") {
    return `사주에서는 맡은 약속의 기준이 두드러지고, 그 뜻을 이해하는 관점과 자신의 말이나 결과로 설명하는 통로가 함께 놓인 것으로 읽습니다. 같은 기준을 이해했더라도 관계에서는 마음을 나눌 답이, 돈에서는 실제로 남는 조건이, 일에서는 검토할 방법이 필요할 수 있습니다. 하나의 책임감으로 세 분야를 모두 해결하기보다 각 장면이 요구하는 다른 판단을 살피는 것이 전체 풀이의 중심입니다. ${overallEvidenceBridge(plan)}`;
  }
  return [OVERALL[plan.id], overallEvidenceBridge(plan)].filter(Boolean).join(" ");
}

const positionName = { year: "연", month: "월", day: "일", hour: "시" } as const;
function readable(line?: OnnxLineDetail): boolean {
  return Boolean(line?.detected && line.curve && line.depthStrength !== "약함");
}

/** An observed shape supplies a limited lens inside the same paragraph. If it
 * was not readable, the natal explanation stands on its own. */
function observedBridge(area: Domain, connection: IntegratedPassage | undefined, hands: { left: PalmFacts; right: PalmFacts; dominant: DominantHand } | null): string {
  if (!hands || !connection?.plan.passages.some(p => p.kind === "traditional")) return "";
  if (area === "money") {
    const keys = connection.plan.evidence.filter(e => e.kind === "observed" && e.id.includes(".secondary.")).map(e => e.id.split(".").at(-1));
    const names: Record<string, string> = { fate: "운명선", sun: "태양선", wealth: "재물선" };
    const labels = [...new Set(keys)].map(key => names[key ?? ""]).filter(Boolean);
    return labels.length ? `사진에서 확인된 ${labels.join("·")} 후보는 기여와 조건을 돌아볼 참고일 뿐, 실제 수입을 알려주지 않습니다.` : "";
  }
  const key = area === "work" ? "headLine" : "heartLine";
  const main = hands[hands.dominant].onnxLines?.[key], other = hands[hands.dominant === "left" ? "right" : "left"].onnxLines?.[key];
  if (!readable(main)) return "";
  const label = area === "work" ? "두뇌선" : "감정선";
  const lens = area === "work"
    ? main!.curve === "완만한 곡선" ? "여러 방법을 비교하는" : "판단 기준을 정리하는"
    : main!.curve === "완만한 곡선" ? "말로 마음을 전하는" : "행동에 마음을 담아 전하는";
  const mainName = hands.dominant === "left" ? "왼손" : "오른손";
  const otherName = hands.dominant === "left" ? "오른손" : "왼손";
  const curveDescription = (curve: OnnxLineDetail["curve"]) => curve === "완만한 곡선" ? "완만하게 휜" : "직선에 가까운";
  const otherNote = readable(other) && main!.curve !== other!.curve ? ` ${otherName}의 검출 구간은 ${curveDescription(other!.curve)} 모양으로 분류되어 비교 질문으로 남깁니다.` : "";
  return `${mainName} ${label}에서 검출된 ${curveDescription(main!.curve)} 구간은 ${lens} 관점을 보완합니다.${otherNote}`;
}

/** Money has three decisions that the overall and work sections do not own.
 * Exposed natal groups select the interpretive questions; they do not tell us
 * a person's income, account balance, or actual spending. */
export function composePremiumDomainStory(area: Domain, plan: PremiumEditorialPlan, connection: IntegratedPassage | undefined,
  hands: { left: PalmFacts; right: PalmFacts; dominant: DominantHand } | null): string {
  const story = STORIES[plan.id][area];
  let ground = story.ground;
  if (plan.id === "duty-translation") {
    if (area === "work") {
      ground = "일에서는 요청의 뜻을 이해한 뒤 실제 적용에서 맞는지 검토하는 과정을 읽습니다. 기준을 그대로 따르는 것과 그 기준에 맞는 방법을 찾아 설명하는 일은 구별할 수 있습니다.";
    } else if (area === "money") {
      ground = "돈에서는 만든 결과를 설명하는 과정과 그것이 실제로 쓰이며 남길 몫을 따로 살핍니다. 획득·관리·지출은 같은 기준으로 한꺼번에 답할 수 있는 문제가 아닙니다.";
    } else {
      ground = "가까운 관계에서는 서로 기대한 약속의 뜻이 같은지 살핍니다. 한 사람이 기준을 잘 이해해 행동했더라도 상대가 그 순간 원한 마음의 표현까지 대신 알 수는 없습니다.";
    }
  }
  const money = area === "money" ? buildSajuMoneyMeaning(plan) : null;
  const main = [ground, observedBridge(area, connection, hands), area === "money" ? `획득에서는 ${story.tension}` : story.tension,
    story.example, story.alternative].filter(Boolean).join(" ");
  return [main, money?.premiumManagement, money?.premiumSpending].filter(Boolean).join("\n\n");
}
