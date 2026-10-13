import type { PremiumEditorialPlan, EditorialArcId } from "@/lib/premium-editorial-plan";
import type { IntegratedPassage } from "@/lib/integrated-palm-reading";
import type { DominantHand } from "@/lib/palm-bilateral";
import type { PalmFacts, OnnxLineDetail } from "@/lib/palm-facts";

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
      tension: "작은 결과를 보여준 뒤 수정 요청이 더해져도 어디까지가 처음 합의한 결과인지는 따로 확인할 수 있습니다.",
      example: "가령 새 수정을 부탁받는다면 사용할 목적과 고칠 범위, 추가 시간과 대가를 함께 물어볼 수 있습니다.",
      alternative: "해낸 일을 낮추지 않으면서 새 요청을 별도 합의로 만드는 선택입니다.",
    },
    work: {
      ground: "사주에서는 반복한 요구를 이해하고 설명할 결과로 옮기는 순서를 살핍니다.",
      tension: "완료 기준을 묻기 전에 모든 요구를 받아 적으면 작은 시안과 끝낼 결과의 경계가 흐려질 수 있습니다.",
      example: "가령 요청을 받으면 완료 기준 하나를 확인하고 작은 결과를 보여준 뒤, 함께 고칠 부분과 필요한 자료를 정해볼 수 있습니다.",
      alternative: "요구를 덜 듣는 대신 이해한 기준을 상대가 확인할 수 있는 결과로 번역하는 선택입니다.",
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
  "agency-duty": "사주에서는 책임을 맡을 이유를 이해하려는 태도와 자기 판단을 함께 읽습니다. 근거가 부족한 제안 앞에서는 준비가 길어질 수 있지만, 아직 몰라서 필요한 질문과 실제로 고를 수 있는 방법은 다른 문제입니다. 가령 처음 받은 요청을 한 문장으로 정리하고 판단에 꼭 필요한 조건 하나를 물어볼 수 있습니다. 책임을 늘리기 전에 이유를 확인하는 선택입니다.",
  "agency-duty-supported": "사주에서는 무엇을 납득해 맡을지와 그 일을 누구의 자료와 협력으로 끝낼지를 한 질문으로 봅니다. 목적에 동의한 뒤 준비가 비어 있으면 자기 판단이 빈틈을 메우는 일까지 넓어질 수 있습니다. 가령 제안에는 동의하지만 자료 담당자가 정해지지 않았다면 지금 결정할 범위와 지원을 받아 정할 범위를 나눠볼 수 있습니다. 좋은 방향을 고르는 것과 모든 실행을 혼자 맡는 것은 다른 선택입니다.",
  "creation-exchange": "사주에서는 생각을 밖에 보이는 일과 그것이 실제로 어디에 쓰이는지를 함께 읽습니다. 반응이 좋을수록 새 가능성을 계속 보태기 쉽지만, 후속 작업의 조건까지 정해진 것은 아닐 수 있습니다. 가령 작은 결과를 보여준 뒤 누가 사용할지와 다음 단계에 필요한 범위를 묻는 장면을 떠올릴 수 있습니다. 제안을 줄이는 것이 아니라 쓸 수 있는 한 가지를 고르는 선택입니다.",
  "creation-exchange-supported": "사주에서는 반응을 얻는 가능성과 그것을 끝까지 이어갈 사람·시간·자료의 조건을 함께 읽습니다. 여러 제안이 모두 좋아 보여도 시작의 호응만으로 끝낼 수 있는 범위가 정해지지는 않습니다. 가령 두 제안 가운데 어느 쪽을 진행할지 고를 때 필요한 지원과 담당자를 나란히 적어볼 수 있습니다. 가능성의 수보다 완성할 조건을 고르는 선택입니다.",
  "duty-supported": "사주에서는 약속을 꾸준히 이어가는 일과 그 약속을 지킬 지원을 함께 봅니다. 믿고 맡긴다는 말 뒤에 자료와 판단을 나눌 사람이 비어 있으면 책임 범위가 조용히 넓어질 수 있습니다. 가령 새 역할을 받기 전 이미 맡은 일과 새 결과, 도움받을 지점을 함께 확인해볼 수 있습니다. 책임을 피하기보다 오래 지킬 수 있게 만드는 선택입니다.",
  "duty-translation": "",
  "duty-boundaries": "사주에서는 맡은 약속을 지키는 일과 추가로 받아들일 범위의 경계를 함께 읽습니다. 요청이 더해질 때마다 기존 책임의 연장으로 넘기면 무엇을 먼저 끝낼지 흐려질 수 있습니다. 가령 급한 새 일이 생겼을 때 이미 합의한 결과와 새 요청을 따로 적어 우선순위를 확인해볼 수 있습니다. 같은 책임감을 더 넓게 쓰는 대신 지킬 약속을 분명히 하는 선택입니다.",
  "agency-value": "사주에서는 스스로 납득한 선택의 이유와 실제 결과의 쓰임을 함께 읽습니다. 목적이 분명해도 함께할 사람에게 그 가치가 전해졌다는 뜻은 아닙니다. 가령 어느 제안을 고르기 전 내게 중요한 이유와 상대가 필요로 하는 결과를 나란히 놓아볼 수 있습니다. 판단을 바꾸라는 말이 아니라 선택의 근거가 공유될 조건을 확인하는 관점입니다.",
  "understanding-duty": "사주에서는 충분히 이해한 내용을 언제 맡을 일로 옮길지 살핍니다. 더 알아볼 조건을 찾는 동안 이미 작은 범위에서 확인할 수 있는 결과가 뒤로 밀릴 수 있습니다. 가령 새 일을 시작할 때 지금 적용해볼 부분과 확인받아야 할 질문을 나눠볼 수 있습니다. 준비를 포기하지 않고 다음 이해를 만드는 실행을 더하는 선택입니다.",
  "agency-expression": "사주에서는 먼저 움직여 생각을 보여주는 힘과 함께할 사람이 선택할 시간을 같이 읽습니다. 제안이 분명해도 상대가 무엇을 바꿀 수 있는지 듣지 못하면 빠른 시작이 오래 갈 합의가 되기 어렵습니다. 가령 작은 시안을 보여준 뒤 상대가 꼭 지키고 싶은 조건을 하나 물어볼 수 있습니다. 속도를 늦추기보다 함께 쓸 결과로 이어가는 선택입니다.",
  balanced: "사주에서 여러 기준이 비슷하게 놓인다면 이번 선택의 중심을 하나로 미리 단정하지 않습니다. 가능한 방법을 모두 열어두면 무엇을 완료로 볼지 정하기 어려워질 수 있습니다. 가령 두 선택지를 놓고 각자의 쓰임과 필요한 조건을 비교해 이번에 먼저 지킬 기준을 골라볼 수 있습니다. 성격을 한 방향으로 묶기보다 상황에 맞는 기준을 고르는 선택입니다.",
};

export function composePremiumOverallStory(plan: PremiumEditorialPlan): string {
  if (plan.id === "duty-translation") {
    const duty = placementPhrase(plan, "관성")!, understanding = placementPhrase(plan, "인성")!;
    const expression = placementPhrase(plan, "식상")!;
    return `사주에서는 ${duty}으로 거듭 놓인 기준을 ${understanding}으로 이해하고 ${expression}으로 설명할 결과로 옮기는 상징적 흐름을 읽습니다. 요구를 모두 떠맡는 이야기보다 무엇을 완료로 볼지 파악하고, 이해한 것을 상대가 확인할 결과로 설명하는 질문이 중심입니다. 가령 복잡한 요청을 받았다면 완료 기준 하나를 묻고 작은 결과를 보여준 뒤 수정할 범위를 함께 정해볼 수 있습니다. 실제 능력이나 경력을 확인했다는 뜻은 아닙니다.`;
  }
  return OVERALL[plan.id];
}

const positionName = { year: "연", month: "월", day: "일", hour: "시" } as const;
function placementPhrase(plan: PremiumEditorialPlan, group: "관성" | "인성" | "식상" | "비겁" | "재성"): string | null {
  const positions = plan.natalEvidence.placements.filter(item => item.group === group);
  if (!positions.length) return null;
  const places = positions.map(item => `${positionName[item.pillar]}${item.part === "stem" ? "간" : "지"} ${item.symbol}`).join("·");
  const gods = [...new Set(positions.map(item => item.tenGod))].join("·");
  return `${places}의 ${gods}`;
}

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
    : main!.curve === "완만한 곡선" ? "말로 마음을 전할 방법을 생각하는" : "행동에 담긴 마음을 전할 방법을 생각하는";
  const mainName = hands.dominant === "left" ? "왼손" : "오른손";
  const otherName = hands.dominant === "left" ? "오른손" : "왼손";
  const otherNote = readable(other) && main!.curve !== other!.curve ? ` ${otherName}은 ${other!.curve}으로 읽혔지만 두 사진을 시간에 따른 변화로 보지는 않습니다.` : "";
  return `주로 쓰는 ${mainName} ${label}은 ${main!.curve}으로 판독됐으며, 이를 ${lens} 관점으로만 더합니다.${otherNote}`;
}

export function composePremiumDomainStory(area: Domain, plan: PremiumEditorialPlan, connection: IntegratedPassage | undefined,
  hands: { left: PalmFacts; right: PalmFacts; dominant: DominantHand } | null): string {
  const story = STORIES[plan.id][area];
  let ground = story.ground;
  if (plan.id === "duty-translation") {
    const duty = placementPhrase(plan, "관성")!, understanding = placementPhrase(plan, "인성")!;
    const expression = placementPhrase(plan, "식상")!;
    if (area === "work") {
      const agency = placementPhrase(plan, "비겁");
      ground = `사주에서는 ${duty}으로 반복된 요구를 ${understanding}으로 풀고 ${expression}으로 상대가 확인할 결과로 옮기는 흐름을 읽습니다.${agency ? ` ${agency}는 그 과정에서 스스로 고를 방법을 살피는 자리입니다.` : ""}`;
    } else if (area === "money") {
      const value = placementPhrase(plan, "재성");
      ground = value
        ? `사주에서는 ${expression}에서 결과를 밖에 보여주는 통로와 ${value}에서 쓰임·조건을 묻는 자리를 함께 읽습니다.`
        : `사주에서는 ${expression}에서 결과를 밖에 보여주는 통로를 읽되, 실제 교환 조건은 별도로 확인해야 합니다.`;
    } else {
      const close = plan.natalEvidence.placements.find(item => item.pillar === "day" && item.part === "branch");
      if (close) ground = `사주에서는 일지 ${close.symbol}의 ${close.tenGod}을 가까운 관계의 기준과 약속을 묻는 상징으로 읽되, 상대의 마음까지 안다고 보지는 않습니다.`;
    }
  }
  return [ground, observedBridge(area, connection, hands), story.tension, story.example, story.alternative].filter(Boolean).join(" ");
}
