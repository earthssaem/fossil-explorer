/* ==========================================================================
   ██ 교사가 수정할 데이터 영역 · 지층 / 배지 / 미션 / 탐사 노트 / 개념 태그 ██
   ========================================================================== */
/* --- 지층 데이터 — 노두마다 서로 다른 지층 (남→북 순서 = 오래된 → 젊은)
   era          지질 시대 표시 (지질도 색·층서 기둥에 쓰임)
   env          "바다" 또는 "육지"
   bands        노두를 여러 띠로 나눌 때 (아래→위 순서). 없으면 한 띠.
                key: 아이템의 band 값과 맞춘다. name: 표시 이름
                repeat: 그 띠의 첫 화석이 여러 지점에서 반복해 나옴
                empty : 파도 아무것도 나오지 않는 지점 수
                dark  : 검은 경계층으로 그림
                gapNote: 아래 띠와 이 띠 사이에 넣는 안내 문구 (긴 시간 간격 등)
                lockMsg: 아래 띠를 다 파기 전에 눌렀을 때의 안내 — 게임 진행 규칙이다
   isBoundary   중생대 말~신생대 초 경계 노두 (절벽·노두 그림에 검은 띠)
   unconformityBelow  바로 아래 지층과의 사이가 부정합(기록이 빠진 시간)
   hiddenName / hiddenInfo  그 지층 화석의 퀴즈를 완료하면 해금 --- */
const LOCK_LOWER_FIRST = "변화를 시간 순서대로 확인하기 위해 아래층부터 조사해 보자. (게임 진행 규칙)";
const DEFAULT_LAYER_DATA = [
  { id: "A", label: "지층 A", era: "선캄브리아 시대", env: "바다", color1: "#e0c084", color2: "#c8a060",
    hiddenName: "선캄브리아 시대의 바다",
    hiddenInfo: "아래층에서는 스트로마톨라이트가, 그보다 훨씬 뒤에 쌓인 위층에서는 에디아카라 생물군이 발견됩니다. 선캄브리아 시대는 지구 역사의 약 88%를 차지할 만큼 길어, 한 노두 안에서도 아주 긴 시간이 흘렀습니다.",
    bands: [
      { key: "lower", name: "아래층", hint: "이 노두에서 가장 오래된 기록" },
      { key: "upper", name: "위층",  hint: "아주 긴 시간이 흐른 뒤의 기록",
        gapNote: "아래층과 위층 사이에는 약 30억 년의 시간이 흘렀다.",
        lockMsg: LOCK_LOWER_FIRST }
    ] },
  { id: "B", label: "지층 B", era: "고생대", env: "바다", color1: "#c89a6a", color2: "#ae7e4e",
    unconformityBelow: true,
    hiddenName: "고생대의 바다",
    hiddenInfo: "삼엽충과 산호가 함께 발견되는 지층입니다. 삼엽충은 시대를, 산호는 따뜻하고 얕은 바다라는 환경을 알려줍니다." },
  { id: "C", label: "지층 C", era: "중생대", env: "육지", color1: "#b0805a", color2: "#946746",
    unconformityBelow: true,
    hiddenName: "중생대의 육지",
    hiddenInfo: "공룡과 고사리가 함께 발견되는 지층입니다. 공룡은 시대를, 고사리는 습한 육지라는 환경을 알려줍니다. 바다에서 쌓인 지층 B 위에 육지 지층이 놓인 것은 그 사이에 땅이 융기했기 때문입니다." },
  { id: "D", label: "지층 D", era: "중생대 말~신생대 초", env: "바다", isBoundary: true,
    color1: "#a8845e", color2: "#7c583c",
    colorBoundary1: "#2b2118", colorBoundary2: "#171009",
    hiddenName: "중생대 말~신생대 초 경계",
    hiddenInfo: "아래층에는 암모나이트가 풍부하지만, 얇고 검은 경계층 위에서는 화석이 거의 나오지 않습니다. 경계층 위에서 다시 나온 화석 중 이전에도 있던 종류는 없습니다. 이렇게 생물의 종류가 크게 달라지는 곳이 지질 시대의 경계가 됩니다.",
    bands: [
      { key: "lower",    name: "아래층", repeat: 3, hint: "검은 띠 아래의 지층" },
      { key: "boundary", name: "경계층", dark: true, hint: "얇고 검은 띠", lockMsg: LOCK_LOWER_FIRST },
      { key: "upper",    name: "위층",   empty: 3, hint: "경계층 위의 지층", lockMsg: "변화를 시간 순서대로 확인하기 위해 경계층을 먼저 조사해 보자. (게임 진행 규칙)" }
    ] },
  { id: "E", label: "지층 E", era: "신생대", env: "바다", color1: "#7c5c40", color2: "#644830",
    hiddenName: "신생대의 바다",
    hiddenInfo: "경계층 위쪽에서 쌓인 지층으로, 화폐석이 발견됩니다. 경계층 아래의 바다 화석과는 종류가 완전히 다릅니다." },
  { id: "F", label: "지층 F", era: "신생대", env: "육지", color1: "#644832", color2: "#4e3624",
    hiddenName: "신생대의 육지",
    hiddenInfo: "아래층에서는 참나무 잎이, 위층에서는 매머드가 발견됩니다. 신생대는 처음에는 온난했지만 후기에는 빙하기와 간빙기가 반복되었습니다. 아래층의 참나무 잎과 위층의 매머드가 그 변화를 보여 줍니다.",
    bands: [
      { key: "lower", name: "아래층", hint: "먼저 쌓인 기록" },
      { key: "upper", name: "위층",  hint: "나중에 쌓인 기록", lockMsg: LOCK_LOWER_FIRST }
    ] }
];

/* --- 배지 데이터 ---
   type: discoverCount / completeRate / layerUnlock / completeAll
        / evidenceAll(경계층의 흔적 전부 발굴) / finalMission(층서 복원 완료) */
const DEFAULT_BADGE_DATA = [
  { id: "first_find",      name: "첫 발견자",       desc: "첫 화석을 발견했어요!",                     type: "discoverCount", value: 1 },
  { id: "rookie",          name: "초보 탐사대원",   desc: "단서 3개를 발견했어요!",                    type: "discoverCount", value: 3 },
  { id: "collector",       name: "화석 수집가",     desc: "전체 단서 50% 이상 수집!",                  type: "completeRate",  value: 0.5 },
  { id: "layer_reader",    name: "지층 해석자",     desc: "지층 정보를 1개 이상 해금했어요!",          type: "layerUnlock",   value: 1 },
  { id: "evidence_hunter", name: "경계 탐사자",     desc: "경계층에 남은 흔적을 모두 발굴했어요!",     type: "evidenceAll",   value: 1 },
  { id: "strat_restorer",  name: "층서 복원가",     desc: "흩어진 노두의 정보를 연결해 지층 기록을 완성했어요!", type: "finalMission", value: 1 },
  { id: "perfect",         name: "완벽한 탐사대원", desc: "모든 단서를 수집했어요!",                   type: "completeAll",   value: 1 }
];

/* --- 미션 데이터 --- */
const DEFAULT_MISSION_DATA = {
  main: "지질공원의 노두를 조사해 화석을 발굴하고, 화석을 단서로 각 지층의 시대와 과거 환경을 추리한 뒤 흩어진 지층 기록을 하나로 완성하라!",
  bonus: [
    "모든 노두를 조사한다.",
    "화석을 이용해 지층의 시대와 환경을 추론한다.",
    "모든 지층을 연결해 층서 기록을 완성한다."
  ],

  /* ===== 최종 미션 · 흩어진 지층 기록을 완성하라 =====
     1단계: 노두 카드를 오래된 것부터 쌓아 층서 기둥을 완성한다.
            카드를 놓을 때마다 그 층의 환경과 근거 화석을 확인한다.
     2단계: 이름표 없는 이웃 마을 노두를 우리 공원 지층과 대비한다.
            표준 화석이 층을 잇는 열쇠임을, 시상 화석은 시대를 좁히지 못함을 실제로 겪는다. */
  finalMission: {
    title: "흩어진 지층 기록을 완성하라",
    intro: "공원 곳곳에서 따로 조사한 노두의 정보를 연결해 이 지역 전체의 지층 기록을 완성한다.",

    /* --- 1단계 카드 (오래된 것 → 젊은 것). 화면에는 섞어서 보여 준다.
       env      정답 환경 (envOptions 중 하나)
       evidence 환경의 근거로 옳은 화석 id 목록 (시상 화석이 있으면 그것만)
       timeShare 실제 시간 비율 보기에서의 상대 두께 (합계 100) --- */
    envOptions: ["바다", "따뜻하고 얕은 바다", "습한 육지", "온난한 육지", "추운 육지"],
    cards: [
      { id: "A_lower", layer: "A", band: "lower", title: "스트로마톨라이트가 발견된 오래된 선캄브리아 시대 기록",
        env: "바다", evidence: ["stromatolite"], timeShare: 80 },
      { id: "A_upper", layer: "A", band: "upper", title: "에디아카라 생물군이 발견된 선캄브리아 시대 말 기록",
        env: "바다", evidence: ["ediacara"], timeShare: 8 },
      { id: "B", layer: "B", title: "삼엽충과 산호가 발견된 고생대 바다",
        env: "따뜻하고 얕은 바다", evidence: ["coral"], timeShare: 6.3 },
      { id: "C", layer: "C", title: "공룡과 고사리가 발견된 중생대 육지",
        env: "습한 육지", evidence: ["fern"], timeShare: 3 },
      { id: "D", layer: "D", title: "암모나이트가 풍부한 중생대 말 바다, 그 위의 얇고 검은 경계층",
        env: "바다", evidence: ["ammonite"], timeShare: 0.7 },
      { id: "E", layer: "E", title: "화폐석이 발견된 신생대 바다",
        env: "바다", evidence: ["nummulites"], timeShare: 1 },
      { id: "F_lower", layer: "F", band: "lower", title: "참나무 잎이 발견된 신생대 육지",
        env: "온난한 육지", evidence: ["oakleaf"], timeShare: 0.7 },
      { id: "F_upper", layer: "F", band: "upper", title: "매머드가 발견된 신생대 후기 육지",
        env: "추운 육지", evidence: ["mammoth"], timeShare: 0.3 }
    ],
    stage1: {
      title: "1단계 · 우리 공원의 층서 기둥 완성",
      howto: "가장 오래된 기록부터 차례로 골라 기둥에 쌓는다. 카드를 놓을 때마다 그 층의 환경과 근거를 확인한다.",
      askNext: "다음으로 오래된 기록은 어느 것일까?",
      wrongOrder: "그 기록보다 먼저 쌓인 층이 있다. 힌트: 다음 층에서는 「{fossil}」이(가) 나왔다.",
      askEnv: "이 층이 쌓일 당시의 환경은?",
      askEvidence: "그렇게 판단한 근거가 된 화석은?",
      wrongEnv: "다시 생각해 보자. 이 층에서 나온 화석이 어떤 곳에 살던 생물인지 떠올려 본다.",
      wrongEvidenceIndex: "「{fossil}」은(는) 시대를 알려주는 표준 화석이다. 환경을 알려주는 화석은 무엇일까?",
      wrongEvidenceOther: "「{fossil}」은(는) 이 층에서 나온 화석이 아니다.",
      placed: "「{title}」을(를) 기둥에 쌓았다.",
      done: "층서 기둥이 완성되었다. 공원 곳곳에서 따로 본 노두가 하나의 긴 기록으로 이어졌다.",
      ratioLabel: "실제 시간 비율로 보기",
      ratioNote: "선캄브리아 시대는 지구 역사의 약 88%를 차지한다. 우리가 걸어온 고생대·중생대·신생대는 모두 마지막 12%에 들어 있다."
    },

    /* --- 2단계 · 이웃 마을 노두 대비 (아래 → 위 6개 층) ---
       answer     우리 공원 지층 id, 또는 "none"(시대를 정할 수 없음), "boundary"(경계층)
       fossils    이 층에서 나온 것 (아이템 id 또는 {label}) — 근거 선택지가 된다
       key        근거로 옳은 선택 (아이템 id 또는 reason id). 여러 개면 모두 정답
       trap       {id: 피드백}  시상 화석을 근거로 고르면 오답 처리 후 이 문구
       explain    정답 해설 --- */
    stage2: {
      title: "2단계 · 이웃 마을 노두와 대비하기",
      request: "강 건너 이웃 마을에서 새 노두가 발견되었다. 지층 이름표가 없다. 우리 공원의 지층과 어떻게 이어지는지 알려 달라.",
      howto: "아래층부터 차례로, 이 층이 우리 공원의 어느 지층과 같은 시대인지 고르고 근거를 함께 고른다. 틀려도 다시 고를 수 있다.",
      askMatch: "이 층은 우리 공원의 어느 지층과 같은 시대일까?",
      askKey: "무엇을 근거로 그렇게 판정했나?",
      noneLabel: "시대를 정할 수 없음",
      boundaryLabel: "경계층 (중생대 말~신생대 초)",
      wrongMatch: "다시 생각해 보자. 이 층에서 나온 것 중 시대를 알려주는 것이 있는지 살펴본다.",
      reasons: {
        order: "아래층과 위층의 순서로 판단 (아래층이 먼저 쌓였다)",
        band:  "얇고 검은 띠가 우리 공원 경계층 협곡에서 본 것과 같다"
      },
      layers: [
        { n: 1, fossils: ["trilobite"], answer: "B", key: ["trilobite"],
          explain: "삼엽충은 고생대에만 살았던 표준 화석이다. 이 층은 우리 공원 지층 B와 같은 시대에 쌓였다." },
        { n: 2, fossils: ["coral"], answer: "none", key: [],
          trap: { coral: "산호는 여러 시대에 걸쳐 살았기 때문에 시대를 좁혀 주지 못한다. 산호가 알려주는 것은 따뜻하고 수심이 얕은 바다라는 환경이다." },
          explain: "이 층에는 시대를 알려주는 표준 화석이 없다. 그렇다면 시대를 전혀 알 수 없을까? 아래층은 고생대, 위층은 중생대다. 지층은 아래에서 위로 쌓이므로, 이 층은 고생대와 중생대 사이에 쌓였다. 정확한 시대는 정할 수 없지만, 범위는 좁힐 수 있다." },
        { n: 3, fossils: ["dinosaur", "fern"], answer: "C", key: ["dinosaur"],
          trap: { fern: "고사리는 생존 기간이 길어 시대를 좁혀 주지 못한다. 고사리가 알려주는 것은 습한 육지라는 환경이다. 이 층의 시대를 알려주는 화석은 무엇일까?" },
          explain: "공룡은 중생대에만 살았던 표준 화석이다. 고사리는 시대가 아니라 환경을 알려준다. 두 화석이 함께 나왔으므로 이 층은 중생대의 습한 육지에서 쌓였다." },
        { n: 4, fossils: [], band: true, answer: "boundary", key: ["order", "band"],
          explain: "아래층이 중생대, 위층이 신생대이므로 이 층은 그 사이, 중생대 말~신생대 초 경계층이다.",
          explainBand: "같은 층은 멀리 떨어진 곳에서도 이어져 있다. 이렇게 여러 지역에서 찾을 수 있는 특징적인 층은 지층을 이어 붙이는 좋은 열쇠가 된다." },
        { n: 5, fossils: ["nummulites"], answer: "E", key: ["nummulites"],
          explain: "화폐석은 신생대 바다에서 번성한 표준 화석이다. 이 층은 우리 공원 지층 E와 같은 시대에 쌓였다." },
        { n: 6, fossils: ["mammoth"], answer: "F", key: ["mammoth"],
          explain: "매머드는 신생대 후기에 살았던 표준 화석이다. 두껍고 긴 털은 이 시기에 추운 기후가 있었음을 알려준다." }
      ],
      closing: {
        question: "우리 공원에서는 경계층 바로 아래에 암모나이트가 나오는 바다 지층이 있었다. 그런데 이 노두에서는 경계층 바로 아래가 공룡이 나오는 육지 지층이다. 왜 이런 차이가 생겼을까?",
        choices: [
          "이 지역은 중생대 말까지 육지였다가 경계 무렵에 바다가 되었다. 같은 시대라도 지역에 따라 환경이 다르기 때문이다",
          "우리 공원의 암모나이트 판정이 잘못되었다",
          "이 지역에서는 암모나이트가 화석으로 남지 못했다",
          "두 지역의 지층이 쌓인 시대가 서로 다르다"
        ],
        answer: "이 지역은 중생대 말까지 육지였다가 경계 무렵에 바다가 되었다. 같은 시대라도 지역에 따라 환경이 다르기 때문이다",
        hint: "같은 시대에 한쪽은 바다, 다른 쪽은 육지일 수 있을까?",
        explanation: "같은 시대라도 지역에 따라 환경이 다르다. 그래서 지층은 지역마다 다르게 쌓인다. 서로 떨어진 지층을 이어 붙이려면 표준 화석으로 시대를 맞춰 보아야 한다. 그것이 지질학자가 세계 곳곳의 지층을 하나의 지질 시대표로 이어 붙이는 방법이다.",
        extra: "이 노두에는 지층 A(선캄브리아 시대)도 없다. 이 지역에 쌓이지 않았거나, 쌓였더라도 깎여 나갔거나, 이 노두에 드러나지 않았을 수 있다. 셋 다 가능하다."
      }
    },
    complete: {
      title: "탐사 완료!",
      body: "서로 떨어져 있던 노두의 화석과 지층 정보를 연결해 이 지역의 지질 기록을 완성했다.",
      note: "지층에 남은 화석은 그 지층이 만들어진 시대와 당시 환경을 추론하는 중요한 단서다.",
      columnHint: "기둥의 층을 누르면 시대·대표 화석·환경을 다시 볼 수 있다."
    }
  }
};

/* --- 탐사 노트 (도움말·도감에 카드형으로 표시)
   ※ 대(代) 수준으로만 서술한다. 구체적 연대는 중생대 말 대멸종 한 곳에만 쓴다. --- */
const DEFAULT_NOTE_DATA = [
  { title: "화석이란?", body: "지질 시대에 살았던 생물의 몸체나 흔적이 지층 속에 남은 것이다. 뼈나 껍데기처럼 단단한 부분이 남기 쉽다." },
  { title: "표준 화석", body: "지층의 시대를 알려주는 화석. 생존 기간이 짧고, 넓은 지역에 많이 분포할수록 좋다. (삼엽충·암모나이트·공룡·화폐석·매머드)" },
  { title: "시상 화석", body: "과거 환경을 알려주는 화석. 특정 환경에서 잘 살고 환경 변화에 민감할수록 좋다. (산호·고사리)" },
  { title: "지질 시대 대표 화석", body: "선캄브리아 시대: 스트로마톨라이트(지금도 만들어짐)·에디아카라 생물군 / 고생대: 삼엽충 / 중생대: 암모나이트·공룡 / 신생대: 화폐석·매머드·참나무 잎" },
  { title: "지층의 순서", body: "뒤집히지 않은 지층에서는 일반적으로 아래쪽 지층이 먼저 만들어졌다. 바다에서 쌓인 지층이 육지에서 관찰되는 것은 땅이 융기했기 때문이고, 육지가 가라앉으면 그 위에 바다 퇴적층이 쌓인다." },
  { title: "지층 대비", body: "서로 떨어진 지층이 같은 시대에 쌓였는지 알아보려면 표준 화석으로 시대를 맞춰 본다. 여러 지역에서 찾을 수 있는 특징적인 층도 지층을 잇는 열쇠가 된다." },
  { title: "대멸종", body: "지질학적으로 비교적 짧은 기간 동안 전 세계적으로 많은 생물 종이 사라진 사건이다. 약 6600만 년 전 중생대 말에 큰 대멸종이 일어나 비조류 공룡과 암모나이트 등이 사라졌고, 그 경계를 전후하여 화석의 종류가 크게 달라진다." }
];

/* --- 개념 태그 (모든 퀴즈 문항의 tag 필드에 쓰이는 값) --- */
const CONCEPT_TAGS = [
  { key: "ERA", label: "지질 시대 구분",     desc: "화석으로 지질 시대를 구분한다" },
  { key: "ENV", label: "화석과 과거 환경",   desc: "화석으로 과거 환경을 추론한다" },
  { key: "IDX", label: "표준화석·시상화석",  desc: "표준 화석과 시상 화석을 구분한다" },
  { key: "FOS", label: "화석의 생성",        desc: "화석이 어떻게 만들어지는지 안다" },
  { key: "EXT", label: "시대의 경계",        desc: "생물의 변화로 지질 시대의 경계를 안다" }
];
const CONCEPT_KEYS = CONCEPT_TAGS.map(t => t.key);
