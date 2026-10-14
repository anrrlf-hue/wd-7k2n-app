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
// The selected natal relation owns a different emotional and practical scene
// in each domain. Scenes are conditional examples, never a user's biography.
const STORIES: Record<EditorialArcId, DomainStories> = {
  "agency-duty": {
    love_relationship: {
      ground: "가까운 사람을 소중히 대하는 마음과 내 방식대로 잘해 주고 싶은 마음이 함께 읽힙니다.",
      tension: "가령 바쁜 하루를 보내고도 약속 장소에 갔는데 상대가 늦으면, 시간 자체보다 내가 그 만남을 위해 비워 둔 마음이 가볍게 다뤄진 듯 서운할 수 있습니다.",
      example: "왜 늦었는지를 충분히 들어도 서운함이 남는다면, 상대를 이해한 일과 기다리면서 느낀 마음을 같은 말로 지우지 않아도 됩니다.",
      alternative: "‘오늘 만남을 기대해서 기다리는 동안 아쉬웠다’고 말하는 선택은 잘못을 가르는 대화를 서로의 기대를 알아가는 대화로 바꿀 여지를 줍니다.",
    },
    money: {
      ground: "돈을 얻는 과정에서는 스스로 잘해 냈다고 느끼는 가치와 실제로 돈을 받는 통로가 따로 읽힙니다.",
      tension: "가령 부탁받은 일을 공들여 끝내고도 대가 이야기를 먼저 꺼내기 머뭇거리면, 보람은 생겼는데 정작 자신의 시간은 공짜로 남을 수 있습니다.",
      example: "상대가 만족했다는 말은 듣기 좋지만, 그 말만으로 지급 시점이나 추가 작업 비용이 정해지지는 않습니다.",
      alternative: "결과를 넘길 때 받을 금액과 시점을 짧게 적어 두는 선택은 잘해 낸 기쁨이 다음 생활에 쓸 자원으로 이어질 통로를 만듭니다. 실제 수입을 예측하는 뜻은 아닙니다.",
    },
    work: {
      ground: "일에서는 목적을 납득한 뒤 내 손으로 완성하고 싶은 마음과 맡은 일을 지키려는 마음이 맞닿습니다.",
      tension: "가령 시키는 대로 한 결과보다 조금 더 나은 방법이 떠올랐는데 설명할 기회가 없으면, 일을 끝냈어도 자신의 판단이 쓰이지 않았다는 허전함이 남을 수 있습니다.",
      example: "전체 방식을 바꾸려 하기 전에 불편했던 한 부분을 작은 예로 보여 주면, 남에게는 막연한 불만이던 것이 구체적인 개선 제안이 될 수 있습니다.",
      alternative: "자기 방법을 모두 관철하는 일보다 도움이 된 한 부분을 확인받는 경험이 다음 시도에 쓸 자신감을 남길 수 있습니다.",
    },
  },
  "agency-duty-supported": {
    love_relationship: {
      ground: "상대의 사정을 이해해 주는 마음 옆에 자신도 관계 안에서 선택하고 싶은 마음이 놓입니다.",
      tension: "가령 늘 상대가 편한 장소로 만나다가 내가 가고 싶던 곳을 떠올리면, 괜찮다고 했던 지난 말 때문에 새 바람을 말하기 어색할 수 있습니다.",
      example: "그 어색함을 상대에게 맞추기 싫어졌다는 뜻으로만 보지 않고, 함께하는 시간에 내 취향도 들어가기를 바라는 마음으로 살펴볼 수 있습니다.",
      alternative: "이번에는 마음에 둔 장소를 하나 제안해 보세요. 서로 다른 취향을 알게 되면 배려가 한쪽의 침묵으로 남기보다 둘의 새로운 경험이 될 여지가 있습니다.",
    },
    money: {
      ground: "돈을 얻을 가능성과 그 일을 해낼 도움을 함께 살피는 구성이 읽힙니다.",
      tension: "가령 대가가 괜찮아 보여 일을 받았는데 준비 도구를 사거나 이동하는 비용까지 혼자 내야 하면, 처음의 기대와 손에 남는 몫이 달라질 수 있습니다.",
      example: "제시된 금액에 앞서 준비 비용과 들어갈 시간을 한 번 적어 보면, 도움을 받는 조건이 단순한 편의가 아니라 실제 몫을 바꾼다는 것을 볼 수 있습니다.",
      alternative: "필요한 지원을 말하는 선택은 일을 못 하겠다는 선언보다 같은 일을 감당할 수 있게 만드는 과정으로 볼 수 있습니다. 금액이나 이익을 이 상징으로 정하지 않습니다.",
    },
    work: {
      ground: "일의 뜻을 이해하고 스스로 해 보려는 마음에 배우거나 도움받는 통로가 함께 읽힙니다.",
      tension: "가령 익숙하지 않은 업무를 맡았을 때 혼자 끝까지 알아내면 뿌듯하겠지만, 같은 곳에서 막히는 시간이 길어지면 질문 자체가 더 어렵게 느껴질 수 있습니다.",
      example: "시도해 본 것과 안 된 부분 하나를 동료에게 보여 주면, 처음부터 모두 알려 달라는 요청보다 자신의 생각을 이어 갈 답을 얻기 쉬운 장면을 만들 수 있습니다.",
      alternative: "도움을 받은 부분이 생겨도 결과 전체가 남의 것이 되는 것은 아닙니다. 배운 방법을 다음에 직접 써 보는 경험이 혼자 해결해야만 잘했다는 부담을 덜 수 있습니다.",
    },
  },
  "creation-exchange": {
    love_relationship: {
      ground: "함께 해 볼 것을 떠올리고 나누는 일이 친밀함의 통로가 되는 모습으로 읽힙니다.",
      tension: "가령 같이 만들 음식이나 가 볼 곳을 이야기하며 즐거웠는데 상대가 조용한 하루를 원하면, 내 제안이 거절된 것과 나와 보내는 시간이 싫다는 뜻이 겹쳐 느껴질 수 있습니다.",
      example: "무엇을 할지 고르기 전에 오늘은 어떤 속도로 쉬고 싶은지 들어 보면, 새로운 활동 대신 익숙한 시간을 함께 보내는 데도 가까움이 있음을 볼 수 있습니다.",
      alternative: "재미있는 제안을 잠시 내려놓는 선택이 관계의 활기를 잃는 일은 아닐 수 있습니다. 상대와 편안함을 나눈 기억도 다음 대화의 바탕이 됩니다.",
    },
    money: {
      ground: "만들어 보여 준 결과와 누군가 실제로 원하는 쓰임을 연결하는 장면이 읽힙니다.",
      tension: "가령 만든 물건이나 작업에 좋은 반응을 얻어도 사람들이 돈을 내고 원하는 부분은 내가 가장 공들인 부분과 다를 수 있습니다.",
      example: "칭찬받은 이유와 실제 구매한 이유를 나눠 들어 보면, 더 정교하게 만들 일보다 편하게 쓰도록 바꿀 일이 먼저 보일 수 있습니다.",
      alternative: "작게 제공해 본 뒤 쓰인 부분을 확인하는 선택은 호응의 크기만 보고 재료나 시간을 크게 늘리는 부담을 줄일 여지를 남깁니다. 판매나 수익이 생긴다는 예고는 아닙니다.",
    },
    work: {
      ground: "생각을 결과로 꺼내고 그 결과가 쓰이는 자리에서 다시 배우는 과정이 읽힙니다.",
      tension: "가령 정성을 들인 시안이 예상과 다른 반응을 얻으면, 수정 요청을 작업의 문제보다 자신의 감각에 대한 거절로 느낄 수 있습니다.",
      example: "어떤 장면에서 쓰기 불편했는지 들은 뒤 한 부분만 바꿔 보면, 자기 표현을 지우지 않아도 결과가 더 잘 쓰이는 경험을 만들 수 있습니다.",
      alternative: "반응은 자신 전체에 대한 평가로 확정되지 않습니다. 만든 것에서 지킬 마음과 사용할 사람을 위해 고칠 부분을 함께 남길 수 있습니다.",
    },
  },
  "creation-exchange-supported": {
    love_relationship: {
      ground: "함께할 일을 상상하는 즐거움과 서로를 편하게 돕는 마음이 함께 읽힙니다.",
      tension: "가령 특별한 날을 준비하며 상대가 좋아할 것을 많이 떠올렸는데 준비에 지치면, 기다리던 시간이 정작 의무처럼 느껴질 수 있습니다.",
      example: "기억에 남기고 싶은 한 장면만 남겨 상대와 준비해 보면, 완벽히 해 주는 만족과 함께 만들어 가는 즐거움이 다르다는 것을 느낄 여지가 있습니다.",
      alternative: "준비를 줄이는 선택이 애정의 크기를 줄이는 뜻은 아닙니다. 두 사람이 그 시간을 편하게 누리는 것이 선물의 의미가 될 수도 있습니다.",
    },
    money: {
      ground: "새 결과를 제공하는 힘과 그것을 이어 만들 자원이 함께 읽힙니다.",
      tension: "가령 첫 작업을 도와 준 사람이 있을 때 한 번의 성공만 보고 같은 양을 계속 받으면, 그 도움이 매번 가능한지는 뒤늦게 문제가 될 수 있습니다.",
      example: "다시 만들 때도 필요한 비용과 도움을 따로 적으면, 첫 반응의 기쁨 뒤에 반복해서 감당할 규모가 보일 수 있습니다.",
      alternative: "작은 규모부터 이어 가는 선택은 눈앞의 가능성을 다 잡는 대신 다음 결과를 만들 여유를 남깁니다. 이 구성으로 사업 성과를 예측하지 않습니다.",
    },
    work: {
      ground: "새로운 결과를 만드는 관심과 배운 것을 적용하는 과정이 함께 읽힙니다.",
      tension: "가령 좋은 예시를 많이 본 뒤 자기 결과를 만들려 하면, 배운 모습과 아직 서툰 결과의 차이가 커 시작 자체가 부끄럽게 느껴질 수 있습니다.",
      example: "참고한 방법 중 한 가지만 직접 적용해 보면, 좋은 결과를 그대로 따라야 한다는 부담보다 자신에게 맞는 다음 연습이 보일 수 있습니다.",
      alternative: "처음 결과를 완성품으로 평가하지 않고 배우는 중간 흔적으로 남기는 선택은 다음 작업에서 다시 쓸 발견을 만듭니다.",
    },
  },
  "duty-supported": {
    love_relationship: {
      ground: "익숙한 약속을 지켜 주는 마음과 상대에게 기대고 싶은 마음을 함께 읽습니다.",
      tension: "가령 상대를 챙겨 주는 일이 익숙해 내 힘든 이야기를 꺼내지 않으면, 관계는 평온해 보여도 나만 혼자 버티는 듯 느껴질 수 있습니다.",
      example: "큰 부탁을 하기 어려우면 오늘 힘들었던 한 장면만 말해 보세요. 늘 돕던 사람이 이번에는 들어 주기를 바라는 것도 친밀함의 일부가 될 수 있습니다.",
      alternative: "상대에게 기대는 경험은 자신이 해 온 배려를 무효로 만들지 않습니다. 서로 다른 날에 힘을 빌려주는 관계를 떠올려볼 수 있습니다.",
    },
    money: {
      ground: "익숙하게 해 온 일에서 대가를 얻는 과정과 그 일을 지탱하는 자원을 함께 읽습니다.",
      tension: "가령 오랫동안 같은 일을 해 왔는데 재료나 이동 비용이 달라지면, 안정적으로 이어 온 금액이 지금도 같은 몫을 남긴다고 볼 수는 없습니다.",
      example: "최근 한 번의 실제 비용을 다시 적어 보면, 익숙하다는 이유로 지나쳤던 작은 지출이 모여 어떤 차이를 만드는지 볼 수 있습니다.",
      alternative: "기존 조건을 다시 말하는 선택은 쌓아 온 신뢰를 버리는 일이 아니라 같은 일을 계속할 수 있는 바탕을 살피는 일로 볼 수 있습니다.",
    },
    work: {
      ground: "맡은 일을 꾸준히 이어 가면서 도움을 받아 부족한 부분을 채우는 모습으로 읽힙니다.",
      tension: "가령 잘 알던 업무의 방식이 바뀌면, 다시 물어보는 일이 그동안의 능력을 의심받는 듯 어색할 수 있습니다.",
      example: "바뀐 부분 하나만 함께 해 보면, 알고 있던 경험이 새 방법을 이해하는 데 어디서 도움이 되는지도 볼 수 있습니다.",
      alternative: "모른다고 말하는 순간이 이전의 신뢰를 잃는 순간이라고 단정하지 않아도 됩니다. 익숙한 경험 위에 새 방법을 덧붙일 여지가 있습니다.",
    },
  },
  "duty-translation": {
    love_relationship: {
      ground: "마음을 행동으로 책임 있게 보여 주고 싶으면서, 상대의 뜻도 이해하고 싶은 모습으로 읽힙니다.",
      tension: "가령 힘들었다는 이야기를 듣고 해결 방법을 정리해 줬는데 반응이 차가우면, 도와주려던 마음이 닿지 않은 듯 허탈할 수 있습니다.",
      example: "상대가 당장 원한 것이 방법이었는지, 그 시간을 함께 견뎌 준다는 말이었는지 들어 보면 이미 알고 있던 문제에도 다른 답이 필요할 수 있습니다.",
      alternative: "조언하기 전에 ‘많이 힘들었겠다’는 말을 건네는 선택은 해결할 능력을 포기하는 것이 아닙니다. 도움과 위로가 다른 순간에 닿을 수 있음을 살피는 전통적 참고 해석입니다.",
    },
    money: {
      ground: "익힌 것을 누군가에게 유용하게 내놓는 과정과 그것을 돈으로 돌려받는 과정을 따로 읽습니다.",
      tension: "가령 설명이나 도움을 부탁받아 쉽게 해 준 일이라도 상대에게는 시간을 아껴 준 가치가 있을 수 있습니다. 내게 익숙하다는 이유만으로 가치까지 작아지는 것은 아닙니다.",
      example: "어떤 불편이 줄었는지 들어 보면, 시간을 오래 들여야만 대가를 말할 수 있다는 생각과 실제 쓰임의 차이가 보일 수 있습니다.",
      alternative: "다음에는 제공할 내용과 받을 대가를 먼저 말해 보세요. 잘 아는 일을 계속 제공할 여유가 생길 수 있으며, 이 상징으로 소득의 크기를 추정하지는 않습니다.",
    },
    work: {
      ground: "요청의 뜻을 이해하고 배운 내용을 다른 사람이 알아볼 결과로 옮기는 과정이 읽힙니다.",
      tension: "가령 내용을 잘 이해했는데 말로 설명할 때 자꾸 길어지면, 자신도 아직 모르는 것처럼 답답하게 느껴질 수 있습니다.",
      example: "한 장면이나 예시로 먼저 보여 주면, 머릿속 이해 중 상대에게 전달된 부분과 아직 설명이 필요한 부분이 다르게 드러납니다.",
      alternative: "설명이 막힌 곳만 다시 다뤄 보는 선택은 이미 이해한 것까지 처음부터 공부하는 부담을 덜 수 있습니다. 결과를 만드는 경험이 이해를 더 분명하게 해 줄 여지도 있습니다.",
    },
  },
  "duty-boundaries": {
    love_relationship: {
      ground: "상대에게 믿음직하게 남고 싶은 마음이 가까운 관계에서 읽힙니다.",
      tension: "가령 피곤한 날에도 부탁을 들어 주다 보면, 거절하지 않았다는 사실 뒤에 알아주기를 바라는 마음이 쌓일 수 있습니다.",
      example: "상대는 괜찮다고 한 말만 들었을 수 있어 내 피곤함을 먼저 말하지 않으면 같은 부탁을 계속 편하게 건넬 수도 있습니다.",
      alternative: "오늘 가능한 작은 도움만 말하는 선택은 상대를 밀어내기보다 관계 안에 내 상태도 놓는 경험이 될 수 있습니다.",
    },
    money: {
      ground: "돈을 얻는 과정에서는 믿고 맡길 만한 결과를 내는 마음이 먼저 읽힙니다.",
      tension: "가령 서비스를 받은 사람이 간단한 부탁이라며 추가 일을 계속 청하면, 한 번의 호의가 다음에도 무료로 할 일처럼 남을 수 있습니다.",
      example: "이번에 도와준 것과 다음에 제공할 내용을 따로 말하면, 대가를 꺼내는 어색함 뒤에 감춰졌던 자신의 시간이 보일 수 있습니다.",
      alternative: "다음 요청부터 금액과 소요 시간을 먼저 안내하는 선택은 정성을 줄이는 일보다 그 정성을 계속 쓸 수 있게 하는 바탕이 됩니다.",
    },
    work: {
      ground: "맡은 일을 끝내고 싶다는 마음이 새 요청을 받아들이는 장면에서도 강하게 읽힙니다.",
      tension: "가령 끝내 가던 일에 새 부탁이 들어오면 새 일을 빨리 해 주고 싶어 기존 결과를 마무리할 시간이 사라질 수 있습니다.",
      example: "먼저 끝낼 일을 마친 뒤 새 일을 시작할 수 있는 시점을 말해 보면, 동시에 붙잡을 때 느낀 초조함과 실제 한 일을 끝낸 만족을 비교할 수 있습니다.",
      alternative: "바로 시작하지 않는 선택이 책임을 피한다는 뜻은 아닐 수 있습니다. 한 결과를 끝낸 경험이 다음 부탁도 더 분명히 받아들이게 합니다.",
    },
  },
  "agency-value": {
    love_relationship: {
      ground: "내가 좋다고 느끼는 것을 가까운 사람에게도 건네고 싶은 마음이 읽힙니다.",
      tension: "가령 자신에게 도움이 된 조언을 건넸는데 상대가 원치 않으면, 내 경험까지 부정당한 듯 아쉬울 수 있습니다.",
      example: "상대는 조언의 가치보다 지금 자기 이야기를 더 하고 싶었을 수 있습니다. 내 경험을 말하기 전에 듣고 싶은지 물어보면 두 마음이 다르게 놓입니다.",
      alternative: "좋은 것을 알아도 당장 건네지 않는 선택이 무관심인 것은 아닙니다. 상대가 필요할 때 떠올릴 수 있게 남겨 두는 배려도 가능합니다.",
    },
    money: {
      ground: "값어치 있다고 느낀 선택과 실제 생활에서 쓰인 결과를 나란히 읽습니다.",
      tension: "가령 할인가로 좋은 물건을 샀는데 거의 쓰지 않았다면, 싸게 샀다는 만족과 생활에 도움이 되었다는 만족은 다를 수 있습니다.",
      example: "무엇을 절약했는지보다 마지막으로 쓴 장면을 떠올려 보면, 내가 중요하게 여긴 가치가 실제 쓰임에도 남았는지 볼 수 있습니다.",
      alternative: "비슷한 선택을 하기 전에 한 번 빌리거나 작은 범위로 써 보는 선택은 마음에 드는 조건을 생활에 필요한 비용으로 좁힐 여지를 줍니다.",
    },
    work: {
      ground: "스스로 선택한 방법이 누군가에게 실제로 도움이 되는 장면에 의미를 두는 모습으로 읽힙니다.",
      tension: "가령 내가 편해진 방식으로 다른 사람의 일도 바꾸려 하면, 상대에게는 익숙한 흐름을 잃는 불편이 더 클 수 있습니다.",
      example: "먼저 상대가 불편했던 순간을 들어 보면, 좋은 방법을 설득하는 일과 그 사람에게 맞게 고치는 일이 달라질 수 있습니다.",
      alternative: "내 방법 전체 대신 필요한 한 부분부터 함께 써 보는 선택은 자기 판단을 지키면서도 실제 도움을 발견하는 경험이 될 수 있습니다.",
    },
  },
  "understanding-duty": {
    love_relationship: {
      ground: "상대의 말과 상황을 충분히 이해하고 싶다는 마음이 가까운 관계에서 읽힙니다.",
      tension: "가령 짧은 답장을 여러 번 다시 읽으면 상대의 뜻을 더 잘 알 것 같지만, 말에 없던 이유까지 생각하며 혼자 서운해질 수 있습니다.",
      example: "확실히 들은 말과 내가 보탠 추측을 나누고 가볍게 안부를 물으면, 해석만 길어진 시간과 실제 대화가 주는 안심을 비교할 수 있습니다.",
      alternative: "궁금한 것을 직접 묻는 선택은 세심함을 잃는 일보다 상대의 답이 들어올 자리를 남기는 일로 볼 수 있습니다.",
    },
    money: {
      ground: "돈을 얻는 과정에서 배우고 준비한 내용을 실제로 제공할 수 있는 형태로 옮기는 장면을 읽습니다.",
      tension: "가령 더 배운 뒤 시작해야 한다고 느끼면, 이미 할 수 있는 작은 도움도 내놓지 못한 채 준비 비용만 늘어날 수 있습니다.",
      example: "지금 설명할 수 있는 한 내용만 작은 범위로 제공해 보면, 더 필요한 공부와 실제로 쓰인 지식이 다른 부분임을 볼 수 있습니다.",
      alternative: "모든 것을 아는 상태를 기다리기보다 제공 가능한 내용과 아직 모르는 부분을 함께 밝히는 선택이 첫 교환의 경험을 만들 여지를 줍니다. 실제 수입을 약속하지 않습니다.",
    },
    work: {
      ground: "새 일을 이해한 뒤 신중하게 적용하고 싶다는 마음이 읽힙니다.",
      tension: "가령 자료를 충분히 읽었는데 직접 해 보라는 순간 불안해지면, 내용을 모르는 것과 처음 실행하는 낯섦이 겹쳐 느껴질 수 있습니다.",
      example: "되돌릴 수 있는 작은 부분부터 해 보면, 자료를 더 찾아야 할 질문인지 손으로 익힐 경험이 필요한지 다르게 드러납니다.",
      alternative: "작은 실행 뒤 생긴 질문을 다시 배우는 선택은 준비한 시간을 버리는 일이 아닙니다. 알고 있는 내용이 어느 순간 실제 도움이 되는지 볼 수 있습니다.",
    },
  },
  "agency-expression": {
    love_relationship: {
      ground: "마음에 든 것을 먼저 말하고 상대와 나누고 싶은 모습으로 읽힙니다.",
      tension: "가령 즐거운 계획을 빠르게 제안했는데 상대가 바로 답하지 않으면, 기대의 속도가 다른 것을 관심의 차이로 느낄 수 있습니다.",
      example: "지금 답을 듣고 싶은 마음을 잠시 두고 상대가 생각한 뒤 말할 시간을 남기면, 조용했던 반응 속에도 그 사람만의 기대가 있었는지 볼 수 있습니다.",
      alternative: "제안 뒤에 기다리는 시간도 두 사람이 함께 선택하는 과정이 될 수 있습니다. 늦은 답이 거절이라는 판단은 이 풀이로 하지 않습니다.",
    },
    money: {
      ground: "새로 해 본 결과를 밖으로 보여 주는 힘과 그것을 계속 제공할 비용을 함께 읽습니다.",
      tension: "가령 자신 있게 첫 결과를 보여 줬더니 추가 요청이 와도, 빠르게 보여 줄 수 있던 한 번과 매번 같은 속도로 만들 일은 다를 수 있습니다.",
      example: "첫 결과에 실제로 쓴 시간을 남겨 두면, 기분 좋은 반응 때문에 놓친 준비 시간이 다음 대가를 말할 근거가 될 수 있습니다.",
      alternative: "다음 작업을 받기 전에 시간과 제공 내용을 짧게 말하는 선택은 새로운 시도를 오래 이어 갈 여유를 남깁니다. 반응이 수입으로 이어진다는 확정은 아닙니다.",
    },
    work: {
      ground: "먼저 시도하며 생각을 구체적인 결과로 만드는 모습이 읽힙니다.",
      tension: "가령 떠오른 방법을 빠르게 만들었는데 다른 사람은 아직 뜻을 묻고 있으면, 멈춰 설명하는 시간이 답답하게 느껴질 수 있습니다.",
      example: "어느 불편을 바꾸려 했는지 한 장면만 함께 보면, 앞서 만든 결과가 다른 사람의 필요와 만나는 부분이 드러날 수 있습니다.",
      alternative: "잠깐 설명하는 선택은 추진을 잃는 일보다 혼자만 앞서 가던 결과를 같이 쓸 수 있게 만드는 경험이 될 여지가 있습니다.",
    },
  },
  balanced: {
    love_relationship: {
      ground: "가까움을 원하는 마음과 혼자 편안히 보내고 싶은 마음을 한쪽으로 정하지 않는 구성입니다.",
      tension: "가령 즐겁게 만난 뒤 혼자 쉬고 싶어지면, 상대가 싫어진 것인지 스스로도 헷갈릴 수 있습니다.",
      example: "만남에서 좋았던 순간과 그 뒤 조용히 쉬고 싶은 시간을 나눠 말하면, 친밀함과 혼자 있는 편안함이 함께 있을 자리가 생길 수 있습니다.",
      alternative: "다음 만남까지 마음을 억지로 같은 크기로 유지하기보다 각자 쉬는 시간을 존중하는 선택도 관계를 이어 가는 방식이 될 수 있습니다.",
    },
    money: {
      ground: "돈에 관한 여러 상징이 함께 있어 한 가지 획득 방식이나 소비 성향으로 고정하지 않습니다.",
      tension: "가령 값은 싸지만 오래 쓸 물건과 값은 비싸도 지금 편해지는 물건 사이에서 망설이면, 서로 다른 만족을 같은 가격표로 비교하고 있을 수 있습니다.",
      example: "이번에 줄이고 싶은 불편 하나를 먼저 떠올리면, 좋은 조건을 모두 갖춘 것을 찾던 고민이 실제 필요한 쓰임으로 좁아질 여지가 있습니다.",
      alternative: "작은 범위로 먼저 쓰는 선택은 지금의 편리함과 나중에도 쓸 가치 중 무엇이 자신에게 더 필요한지 알아볼 시간을 남깁니다.",
    },
    work: {
      ground: "일의 방식은 하나의 성격으로 고정하기보다 실제 장면마다 다르게 살펴볼 수 있는 구성입니다.",
      tension: "가령 일을 시작할 때는 새 방법이 즐거웠는데 마무리에서는 익숙한 방식이 편하면, 자신의 선택이 일관되지 않다고 느낄 수 있습니다.",
      example: "처음 발견할 때와 끝까지 만들어 낼 때 필요한 도움이 다를 수 있습니다. 단계별로 편했던 방식을 남겨 보면 같은 사람에게도 다른 방법이 쓰이는 이유가 보입니다.",
      alternative: "한 방식으로 모두 해결하기보다 시작에 도움이 된 것과 완성에 도움이 된 것을 따로 쓰는 선택을 떠올려볼 수 있습니다.",
    },
  },
};

const OVERALL: Record<EditorialArcId, string> = {
  "agency-duty": "납득한 일에 자신의 판단을 보태고 싶으면서 맡은 약속도 잘 지키고 싶은 모습으로 읽힙니다. 가령 해야 할 일을 잘 끝냈는데도 내 방법을 한 번 써 보지 못했다면, 성취와 아쉬움이 함께 남을 수 있습니다. 반대로 직접 고른 방법이 쓰였다면 결과의 크기보다 그 일에 내가 참여했다는 느낌이 더 오래 남을 수 있습니다. 무엇을 해냈는지와 그 과정에서 내 생각이 어디에 들어갔는지를 따로 돌아보면 만족의 이유를 더 구체적으로 살필 수 있습니다.",
  "agency-duty-supported": "스스로 납득해 움직이는 마음과 배워서 해내는 과정이 함께 읽힙니다. 가령 도움을 받아 일을 끝냈을 때 고마우면서도 혼자 해낸 것이 아니라는 아쉬움이 생길 수 있습니다. 그러나 도움을 받아 알게 된 것을 다음에는 직접 해 보는 경험은 자기 판단의 폭을 넓힐 여지가 있습니다. 혼자 했는지보다 그 경험 뒤에 무엇을 새로 할 수 있게 되었는지 돌아보는 참고 해석입니다.",
  "creation-exchange": "생각을 밖으로 꺼내는 즐거움과 그 결과가 누군가에게 쓰이는 만족이 함께 읽힙니다. 가령 만드는 동안 재미있던 것이 실제로 쓰이지 않을 때에는, 만드는 기쁨과 남에게 도움이 되는 기쁨이 다르다는 것을 느낄 수 있습니다. 무엇을 좋아하며 만들었는지와 상대가 어느 부분을 썼는지를 함께 돌아보면, 표현을 잃지 않고도 다음 결과를 다른 모습으로 내놓을 여지가 생깁니다.",
  "creation-exchange-supported": "새로운 것을 만들어 보고 싶다는 마음과 배운 내용을 잘 적용하고 싶은 마음이 함께 읽힙니다. 좋은 예시를 많이 알수록 처음 만든 결과가 부족해 보일 수 있지만, 그 차이는 실패를 뜻하기보다 다음에 익힐 부분을 보여 줄 수도 있습니다. 한 번에 완성하려는 부담 대신 지난 시도에서 달라진 한 부분을 알아보면, 배움이 자기 결과로 남는 기쁨을 살펴볼 수 있습니다.",
  "duty-supported": "믿고 맡긴 일을 잘 이어 가고 싶은 마음 옆에 도움을 받아 익히는 통로가 놓입니다. 가령 익숙한 일을 새 방식으로 해야 할 때 다시 질문하는 일이 어색하게 느껴질 수 있습니다. 이미 쌓은 경험과 지금 모르는 부분은 함께 있을 수 있어, 모르는 것을 드러냈다고 그동안의 신뢰가 사라진다고 단정하지 않아도 됩니다. 배운 뒤 더 편하게 할 수 있었던 순간을 돌아보는 전통적 해석입니다.",
  "duty-translation": "맡은 일을 이해하는 과정과 이해한 것을 밖으로 보여 주는 과정이 함께 읽힙니다. 가령 일을 끝내고도 설명이 부족하지 않았는지 계속 돌아보면, 실제로 남은 일이 있는 것과 잘했다는 확신을 더 얻고 싶은 마음이 겹쳐 있을 수 있습니다. 상대가 쓸 수 있게 전달한 결과와 내가 스스로 납득할 만큼 다듬은 결과는 반드시 같은 지점에서 끝나지 않습니다. 이미 쓰인 부분을 알아보고 아직 바꿀 부분만 남겨 두는 경험은 정성을 줄이지 않으면서도 한 일을 끝냈다는 편안함을 느낄 여지를 줍니다.",
  "duty-boundaries": "믿음직하게 남고 싶은 마음이 자기 시간이 필요한 순간에도 이어지는 모습으로 읽힙니다. 가령 부탁을 모두 들어 준 날에 뿌듯함보다 피곤함이 크게 남으면, 잘해 주려던 마음과 자신에게 필요했던 여유가 다른 방향에 놓였을 수 있습니다. 무엇을 못 했는지보다 이번에 어디까지 편하게 할 수 있었는지 돌아보면, 도움을 오래 이어 갈 방법을 더 작고 구체적으로 찾을 여지가 있습니다.",
  "agency-value": "자신이 좋다고 느낀 선택을 실제 생활에서도 쓸모 있게 남기고 싶은 모습으로 읽힙니다. 가령 내가 편해진 방법을 남에게 권했는데 반응이 다르면, 선택이 틀렸다고 보기 전에 두 사람이 줄이고 싶은 불편이 달랐는지 살펴볼 수 있습니다. 마음에 드는 이유를 지키면서도 쓰는 사람에 따라 형태를 바꿀 여지가 있다는 전통적 참고 해석입니다.",
  "understanding-duty": "충분히 알아야 마음 놓고 시작할 수 있다는 모습과 실제 해 보며 더 잘 이해하는 과정이 함께 읽힙니다. 가령 자료를 읽을 때는 분명했던 내용이 손으로 해 보는 순간 낯설게 느껴질 수 있습니다. 그 낯섦이 모두 지식의 부족은 아닐 수 있어, 작게 실행한 뒤 생긴 질문과 시작 전에 반복하던 걱정을 따로 돌아볼 수 있습니다.",
  "agency-expression": "먼저 움직여 본 결과를 통해 자기 생각이 구체적인 모습이 되는 흐름으로 읽힙니다. 가령 말로만 생각할 때는 자신 있던 방법도 직접 보여 주면 뜻밖의 질문을 만날 수 있습니다. 그 질문 때문에 처음 생각이 무너진다고 보기보다, 혼자서는 떠올리지 못한 쓰임을 발견할 여지도 있습니다. 시작한 용기와 반응을 듣고 고친 흔적이 함께 자신의 경험으로 남을 수 있습니다.",
  balanced: "여러 상징이 비슷하게 놓여 한 가지 성격으로 자신을 설명하기보다 실제 경험의 차이를 살펴볼 여지가 있습니다. 가령 처음에는 새로운 것이 즐거웠지만 오래 이어 갈 때는 익숙함이 편해질 수 있고, 가까운 사람과 시간을 보낸 뒤 혼자 쉬는 것도 좋을 수 있습니다. 서로 다른 마음이 생기는 장면을 기억해 두면, 자신이 일관되지 않다고 판단하기 전에 지금 필요한 것이 달라졌는지 볼 수 있습니다.",
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

export function premiumOverallEvidence(plan: PremiumEditorialPlan): string {
  const candidates = ARC_EVIDENCE_GROUPS[plan.id].flatMap(group => {
    const entry = plan.natalEvidence.placements.filter(item => item.group === group)
      .sort((a, b) => ({ month: 0, day: 1, hour: 2, year: 3 })[a.pillar] - ({ month: 0, day: 1, hour: 2, year: 3 })[b.pillar])[0];
    return entry ? [`${positionName[entry.pillar]}${entry.part === "stem" ? "간" : "지"} ${entry.symbol}/${entry.tenGod}: ${OVERALL_ROLE[group]}`] : [];
  }).slice(0, 3);
  return candidates.length >= 2 ? `이 질문에 쓰인 원국의 서로 다른 자리는 ${candidates.join(" · ")}입니다.` : "";
}

export function composePremiumOverallStory(plan: PremiumEditorialPlan): string {
  return OVERALL[plan.id];
}

const positionName = { year: "연", month: "월", day: "일", hour: "시" } as const;
function readable(line?: OnnxLineDetail): boolean {
  return Boolean(line?.detected && line.curve && line.attributeSupport?.curve !== "not_supported" && line.depthStrength !== "약함");
}

/** An observed shape supplies a limited lens inside the same paragraph. If it
 * was not readable, the natal explanation stands on its own. */
function observedBridge(area: Domain, connection: IntegratedPassage | undefined, hands: { left: PalmFacts; right: PalmFacts; dominant: DominantHand } | null): string {
  if (!hands || !connection?.plan.passages.some(p => p.kind === "traditional")) return "";
  if (area === "money") {
    const readings = (["left", "right"] as const).flatMap(hand => {
      const fate = hands[hand].secondaryLines?.fate;
      if (!fate?.candidateObservation || !connection.plan.evidence.some(e => e.id === `${hand}.secondary.fate`)) return [];
      const view = fate.candidateObservation.position === "thumb_side" ? "돈을 얻기 위해 바뀌는 하루와 지키고 싶은 생활의 간격"
        : fate.candidateObservation.position === "pinky_side" ? "함께한 사람에게 인정받은 기쁨과 실제 대가를 받은 만족의 차이"
          : "잘해내는 일의 보람과 앞으로도 같은 시간을 쓰고 싶은 마음의 차이";
      return [`${hand === "left" ? "왼손" : "오른손"}의 운명선 후보를 전통적 상징으로 읽으면 ${view}도 돌아볼 수 있습니다.`];
    });
    return readings.join(" ");
  }
  const key = area === "work" ? "headLine" : "heartLine";
  const main = hands[hands.dominant].onnxLines?.[key], other = hands[hands.dominant === "left" ? "right" : "left"].onnxLines?.[key];
  if (!readable(main)) return "";
  const mainName = hands.dominant === "left" ? "왼손" : "오른손";
  const lens = area === "work"
    ? main!.curve === "완만한 곡선"
      ? "두뇌선의 곡선 구간을 함께 읽으면, 익숙한 예에 새 내용을 연결하면서 이해가 붙는 순간도 떠올릴 수 있습니다. 같은 설명을 더 듣는 일보다 작은 예를 바꾸어 보는 경험이 막힌 부분을 다르게 보여 줄 여지가 있습니다."
      : "두뇌선의 직선에 가까운 구간을 함께 읽으면, 무엇이 달라졌는지 납득한 뒤 새 방법을 받아들이는 장면도 떠올릴 수 있습니다. 바꾸기 전의 불안과 바꾼 뒤 편해진 이유를 구체적으로 비교해볼 여지가 있습니다."
    : main!.curve === "완만한 곡선"
      ? "감정선의 곡선 구간을 함께 읽으면, 말로 나눈 순간 뒤에도 다시 마음을 전하고 싶어지는 모습이 떠오릅니다. 이미 끝난 이야기라도 그때 듣고 싶었던 반응을 말하면 뒤늦게 서로를 이해할 여지가 있습니다."
      : "감정선의 직선에 가까운 구간을 함께 읽으면, 작은 일을 잊지 않고 챙긴 행동에 마음을 담는 모습을 떠올릴 수 있습니다. 상대가 그 행동의 뜻을 알아보았는지 짧게 나누면 말없이 해 온 배려도 대화 안에 들어올 여지가 있습니다.";
  const otherNote = readable(other) && main!.curve !== other!.curve
    ? " 반대 손에서는 다른 모양이 확인돼, 이 표현을 모든 장면의 성격으로 고정하지 않고 참고로 둡니다." : "";
  return `${mainName} ${lens}${otherNote}`;
}

/** Money has three decisions that the overall and work sections do not own.
 * Exposed natal groups select the interpretive questions; they do not tell us
 * a person's income, account balance, or actual spending. */
export function composePremiumDomainStory(area: Domain, plan: PremiumEditorialPlan, connection: IntegratedPassage | undefined,
  hands: { left: PalmFacts; right: PalmFacts; dominant: DominantHand } | null): string {
  const story = STORIES[plan.id][area];
  const money = area === "money" ? buildSajuMoneyMeaning(plan) : null;
  const main = [story.ground, observedBridge(area, connection, hands), area === "money" ? `획득에서는 ${story.tension}` : story.tension,
    story.example, story.alternative].filter(Boolean).join(" ");
  return [main, money?.premiumManagement, money?.premiumSpending].filter(Boolean).join("\n\n");
}
