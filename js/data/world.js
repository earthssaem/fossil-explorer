/* ==========================================================================
   ██ 교사가 수정할 데이터 영역 · 지질공원 맵 ██

   설정 (학생 화면에서는 구조지질학 설명을 하지 않는다)
   · 가상의 지질공원. 남쪽 입구에서 북쪽으로 갈수록 지대가 높아지고, 더 젊은 지층이 차례로 드러난다.
     (지층은 아래에서 위로 쌓이므로, 높은 곳으로 올라갈수록 위쪽·젊은 지층 위를 걷게 된다)
   · 단단한 층이 동서로 이어지는 절벽(계단식 지형)을 이루고, 구역 사이는 계단으로만 오르내린다.
   · 강이 남북으로 흐르며 골짜기를 팠다. 노두(암석이나 지층이 지표에 드러난 곳)는 이 공원에서는 강가 절벽에 있으며,
     노두마다 그 구역의 지층과 아래층 윗부분이 드러난다 → 6곳을 이어 붙여야 전체 층서가 된다.
   · 실제 지역 이름을 붙이지 않는다.

   맵 좌표: 가로 64칸 × 세로 64칸 (한 칸 16px). 위쪽이 북쪽(젊은 층).
   zones  : 남→북 순서. rows = [북쪽 끝 행, 남쪽 끝 행] (행 번호는 위가 0)
   cliffs : 구역 경계 절벽 (2행). stairCol = 계단 서쪽 열(2칸 폭). gate = 잠금 조건
   ========================================================================== */
const DEFAULT_WORLD_DATA = {
  cols: 64, rows: 64,
  river: { center: 30, amp: 7, freq: 0.16, halfWidth: 1 },
  zones: [
    { id: "A", layer: "A", name: "입구 물가 구역", sub: "층진 바위가 있는 얕은 물가",
      rows: [53, 63], grass: "#7f9e62", soil: "#b7a894",
      props: ["strom", "rock", "bush", "rock"], density: 0.09 },
    { id: "B", layer: "B", name: "바위 웅덩이 구역", sub: "석회암 바위와 웅덩이",
      rows: [42, 50], grass: "#8db068", soil: "#d4cdb6",
      props: ["karst", "karst", "rock", "bush"], density: 0.11 },
    { id: "C", layer: "C", name: "침엽수 숲 구역", sub: "침엽수 숲과 발자국 광장",
      rows: [30, 39], grass: "#7aa85a", soil: "#c4956a",
      props: ["conifer", "conifer", "fern", "fern", "rockBig"], density: 0.13 },
    { id: "D", layer: "D", name: "검은 띠 협곡", sub: "검은 띠가 이어지는 골짜기",
      rows: [21, 27], grass: "#6f8a5a", soil: "#77706b", bandInCliff: true,
      props: ["rock", "rockBig", "rock"], density: 0.09 },
    { id: "E", layer: "E", name: "호수 구역", sub: "호수와 갈대밭",
      rows: [11, 18], grass: "#a3bd6c", soil: "#d9c399",
      props: ["reed", "reed", "bush", "rock"], density: 0.09 },
    { id: "F", layer: "F", name: "언덕 초원 구역", sub: "참나무 언덕과 전망대",
      rows: [0, 8], grass: "#8cc063", soil: "#c9b48a",
      props: ["oak", "oak", "flowerY", "flowerP", "flowerB", "bush"], density: 0.12 }
  ],
  cliffs: [
    { below: "A", rows: [51, 52], stairCol: 13, gate: { id: "g1", needs: "A" } },
    { below: "B", rows: [40, 41], stairCol: 48, gate: { id: "g2", needs: "B" } },
    { below: "C", rows: [28, 29], stairCol: 17, gate: { id: "g3", needs: "C" } },
    { below: "D", rows: [19, 20], stairCol: 46, gate: { id: "g4", needs: "D", needsEvidence: true } },
    { below: "E", rows: [9, 10],  stairCol: 40, gate: null }
  ],
  bridges: [58, 54, 47, 36, 25, 16, 12, 6, 3],
  outcrops: [
    { layer: "A", row: 56, side: "east" },
    { layer: "B", row: 45, side: "east" },
    { layer: "C", row: 34, side: "west" },
    { layer: "D", row: 24, side: "east" },
    { layer: "E", row: 14, side: "west" },
    { layer: "F", row: 4,  side: "west" }
  ],
  lakes: [
    { cx: 5,  cy: 60, rx: 6, ry: 4 },
    { cx: 7,  cy: 46, rx: 3, ry: 2 },
    { cx: 10, cy: 14, rx: 7, ry: 3 }
  ],
  paths: [
    [[20, 63], [20, 58], [36, 58], [36, 56]],
    [[36, 56], [36, 54], [14, 54], [14, 53]],
    [[14, 50], [14, 47], [40, 47], [40, 45]],
    [[40, 45], [48, 45], [48, 42]],
    [[48, 39], [48, 34], [46, 34], [46, 36], [22, 36], [22, 34]],
    [[22, 34], [18, 34], [18, 30]],
    [[18, 27], [18, 25], [30, 25], [30, 24]],
    [[30, 24], [46, 24], [46, 21]],
    [[46, 18], [46, 16], [32, 16], [32, 14]],
    [[32, 14], [32, 12], [40, 12], [40, 11]],
    [[40, 8], [40, 6], [31, 6], [31, 4]],
    [[31, 4], [31, 3], [10, 3], [10, 4]]
  ],
  /* 고정 소품·팻말 (칸 좌표, 발 위치). text[0] = 제목, 나머지 = 본문 */
  fixed: [
    { key: "center",  col: 14, row: 62 },
    { key: "lookout", col: 10, row: 5 },
    { key: "sign", col: 23, row: 61, id: "s_start",
      text: ["지질공원 안내", "이 공원은 북쪽으로 갈수록 지대가 높아지며, 구역 사이는 계단으로 오르내립니다.", "강가의 노두 6곳을 조사하고, 북쪽 전망대에서 기록을 하나로 이어 보세요."] },
    { key: "sign", col: 44, row: 33, id: "s_track",
      text: ["발자국 광장", "옛 육지에 남은 발자국 화석입니다. 어떤 생물이 언제 남긴 것인지 노두의 화석으로 추리해 보세요.", "발자국은 체화석이 아니라 흔적 화석입니다."] },
    { key: "sign", col: 27, row: 26, id: "s_gorge",
      text: ["검은 띠 협곡", "골짜기 양쪽 절벽에 얇고 검은 띠가 이어집니다. 특징이 뚜렷한 층은 서로 떨어진 지층을 대비하는 단서가 될 수 있습니다.", "이 검은 띠의 위치와 위아래에서 나오는 화석을 다른 노두와 비교해 보세요."] },
    { key: "sign", col: 13, row: 12, id: "s_lake",
      text: ["호숫가 안내", "이 호수는 아래 지층이 쌓이고 한참 뒤에 생긴 것입니다.", "지층이 쌓일 때의 환경과 시대는 노두에서 나오는 화석으로 추리해 보세요."] }
  ],
  clusters: [
    { key: "rock",    col: 44, row: 55, w: 18, h: 6, fill: 0.35 },
    { key: "strom",   col: 12, row: 53, w: 6,  h: 4, fill: 0.5 },
    { key: "karst",   col: 50, row: 43, w: 13, h: 7, fill: 0.4 },
    { key: "karst",   col: 20, row: 43, w: 12, h: 3, fill: 0.45 },
    { key: "conifer", col: 24, row: 30, w: 18, h: 3, fill: 0.6 },
    { key: "conifer", col: 2,  row: 31, w: 12, h: 8, fill: 0.5 },
    { key: "conifer", col: 52, row: 36, w: 10, h: 3, fill: 0.55 },
    { key: "fern",    col: 24, row: 37, w: 8,  h: 2, fill: 0.6 },
    { key: "rockBig", col: 34, row: 21, w: 12, h: 2, fill: 0.5 },
    { key: "rock",    col: 2,  row: 21, w: 14, h: 6, fill: 0.35 },
    { key: "bush",    col: 50, row: 12, w: 12, h: 6, fill: 0.35 },
    { key: "reed",    col: 2,  row: 17, w: 18, h: 2, fill: 0.5 },
    { key: "oak",     col: 44, row: 0,  w: 18, h: 5, fill: 0.4 },
    { key: "oak",     col: 14, row: 6,  w: 12, h: 3, fill: 0.45 }
  ],
  plaza: { col: 44, row: 32, w: 6, h: 3 },
  npcs: [
    { id: "ranger", key: "ranger", col: 22, row: 60, name: "해설사",
      lines: [
        "어서 오세요, 탐사대원! 이 공원의 노두를 조사하며 지층에 남은 단서를 찾아보세요.",
        "암석이나 지층이 지표에 드러난 곳을 노두라고 합니다. 이 공원에서는 강가의 노두 6곳을 차례로 조사해 보세요.",
        "구역 사이 계단은 앞 구역의 노두를 모두 조사해야 열립니다. 변화를 차례로 살펴보기 위한 탐사 규칙입니다.",
        "노두 6곳을 모두 조사하면 북쪽 전망대에서 흩어진 정보를 하나로 잇는 최종 미션이 기다립니다."
      ],
      again: ["노두마다 확인한 정보를 잘 기록해 두세요. 북쪽 전망대에서 모두 연결해 보게 될 거예요!"] }
  ],
  start: { col: 20, row: 62 }
};
