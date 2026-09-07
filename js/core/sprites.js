/* ---------- 픽셀아트 스프라이트 (화석 도트 · 캐릭터 · 헬퍼) ---------- */
/* ---------- 픽셀아트 스프라이트 헬퍼 ----------
   rows: 문자열 배열(픽셀 맵), palette: {문자: 색상}, '.'은 투명
   가로로 이어진 같은 색 픽셀은 하나의 rect로 합쳐 그린다 */
function pixelSVG(rows, palette, cls){
  const h = rows.length, w = rows[0].length;
  let out = '<svg class="' + (cls || "item-fallback-svg") + '" viewBox="0 0 ' + w + ' ' + h +
    '" shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
  for(let y = 0; y < h; y++){
    let x = 0;
    while(x < w){
      const ch = rows[y][x];
      const color = palette[ch];
      if(!color){ x++; continue; }
      let run = 1;
      while(x + run < w && rows[y][x + run] === ch) run++;
      out += '<rect x="' + x + '" y="' + y + '" width="' + run + '" height="1" fill="' + color + '"/>';
      x += run;
    }
  }
  return out + '</svg>';
}

/* ---------- 아이템 fallback 그림 (SVG) ---------- */
const FALLBACK_COLORS = ["#2ea79c","#ff8c42","#8a6fbf","#e05a7a","#4a90d9","#7fae3f"];
/* 화석별 대표 색 (없으면 순번 색) — 픽셀 fallback을 화석답게 */
const FOSSIL_COLORS = {
  coral: "#ff7a6e", stromatolite: "#7fae3f", trilobite: "#8a6fbf",
  fern: "#4e9f52", dino: "#5aa06a",
  ammonite: "#4a90d9", coin: "#d9a842", ediacara: "#e07aa0", mammoth: "#a9764e",
  dinosaur: "#5aa06a", nummulites: "#d9a842", leaf: "#6aa84f", oakleaf: "#6aa84f",
  /* 경계층 증거 아이템 (화석이 아니므로 암석·광물 계열 색) */
  iridium: "#4a4a52", shocked_quartz: "#9aa7b8", ash_layer: "#8c8c8c", sulfur_rock: "#d8c033"
};
function itemColor(item){
  if(item){
    if(item.color) return item.color;
    if(item.shape && FOSSIL_COLORS[item.shape]) return FOSSIL_COLORS[item.shape];
    if(item.id && FOSSIL_COLORS[item.id]) return FOSSIL_COLORS[item.id];
  }
  const idx = Math.max(0, itemData.findIndex(i => i.id === (item && item.id)));
  return FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}
/* 아이템 도트 스프라이트 맵 (12x12) — A:본색, B:외곽선/진한색, L:밝은색,
   W:흰 반짝, D:진한 무늬, R:포인트
   화석별 전용 맵(coral/trilobite/fern/dino/ammonite/coin/mammoth/
   stromatolite/ediacara)과 기본 도형(spiral/segmented/…)을 함께 둔다. */
const ITEM_PIXEL_MAPS = {
  coral: [
    "....A..A....",
    "...AA.AA....",
    "A..A.AA..A..",
    "AA.A.A.AAA..",
    ".AAA.A.A.A..",
    "..A.AAA.A...",
    "...AAAAAA...",
    "....AAAA....",
    "....AAAA....",
    "...AAAAAA...",
    "..AAAAAAAA..",
    ".BBBBBBBBBB."
  ],
  trilobite: [
    "...BBBBBB...",
    "..BAAAAAAB..",
    ".BADAAAADAB.",
    ".BAAAAAAAAB.",
    ".BABAAAABAB.",
    ".BAABAABAAB.",
    ".BAABAABAAB.",
    ".BAABAABAAB.",
    ".BAABAABAAB.",
    "..BABAABAB..",
    "...BAAAAB...",
    "....BBBB...."
  ],
  fern: [
    ".....AB.....",
    "....AAB.....",
    "...AABB.....",
    "..AAB.B.....",
    ".AAB..B.....",
    "AABAB.B.....",
    ".AABAB.B....",
    "..AABAB.B...",
    "...AABAB.B..",
    "....AABAB...",
    ".....AAB....",
    "......B....."
  ],
  dino: [
    ".........AA.",
    "........AAA.",
    "A.....AAAAA.",
    "AA...AAAAAA.",
    "AAAAAAAAAA..",
    ".AAAAAAAAA..",
    "..AAAAAAA...",
    "..AAAAAA....",
    "..AA.AA.....",
    "..AA.AA.....",
    ".BA..BA.....",
    ".BB..BB....."
  ],
  /* --- 경계층 증거 아이템 (화석 아님) --- */
  iridium: [           /* 아주 얇고 검은 띠 모양의 점토 */
    "............",
    "............",
    ".LLLLLLLLLL.",
    ".LLLLLLLLLL.",
    "BBBBBBBBBBBB",
    "BAAAAAAAAAAB",
    "BBBBBBBBBBBB",
    ".DDDDDDDDDD.",
    ".DDDDDDDDDD.",
    "............",
    "............",
    "............"
  ],
  shocked_quartz: [    /* 알갱이 안에 여러 방향의 금이 간 석영 */
    "....BBBB....",
    "..BBLLLLBB..",
    ".BLLAAAALLB.",
    ".BLADAAADAB.",
    "BLAADAADAALB",
    "BLAAADDAAALB",
    "BLAADAADAALB",
    ".BLADAAADAB.",
    ".BLLAAAALLB.",
    "..BBLLLLBB..",
    "....BBBB....",
    "............"
  ],
  ash_layer: [         /* 회색 화산재가 두껍게 굳은 층 */
    "............",
    "BBBBBBBBBBBB",
    "BLLLLLLLLLLB",
    "BAAAAAAAAAAB",
    "BADAAAADAAAB",
    "BAAAAAAAAAAB",
    "BAAADAAAADAB",
    "BAAAAAAAAAAB",
    "BADAAADAAAAB",
    "BLLLLLLLLLLB",
    "BBBBBBBBBBBB",
    "............"
  ],
  sulfur_rock: [       /* 노랗게 변색된 암석 */
    "............",
    "....BBBB....",
    "..BBAAAABB..",
    ".BAALLLLAAB.",
    ".BALLWWLLAB.",
    "BAALLWWLLAAB",
    "BAAALLLLAAAB",
    "BAADAAAADAAB",
    ".BAAADAAAAB.",
    "..BBAAAABB..",
    "....BBBB....",
    "............"
  ],
  ammonite: [
    "...BBBBBB...",
    ".BBLLLLLLBB.",
    ".BLLBBBBLLB.",
    "BLLBLLLLBLLB",
    "BLBLLWWLLBLB",
    "BLBLLLLLLBLB",
    "BLLBLLLLBLLB",
    ".BLLBBBBLLB.",
    ".BBLLLLLLBB.",
    "...BBBBBB...",
    "............",
    "............"
  ],
  coin: [
    "...BBBBBB...",
    ".BBLLLLLLBB.",
    "BLALALALALLB",
    "BLLALALALALB",
    "BALALALALALB",
    "BLALALALALLB",
    "BLLALALALALB",
    "BALALALALALB",
    ".BBLLLLLLBB.",
    "...BBBBBB...",
    "............",
    "............"
  ],
  mammoth: [
    "...AAAAAA...",
    "..AAAAAAAA..",
    ".AAAAAAAAAA.",
    ".AAADAADAAA.",
    ".AAAAAAAAAA.",
    "AAAAAAAAAAAA",
    "AAAAAAAAAAAA",
    "WAAAAAAAAAAW",
    ".WAA.AA.AAW.",
    "..AA.AA.AA..",
    ".WA..AA..AW.",
    ".W.......W.."
  ],
  stromatolite: [
    "............",
    "...BBBBBB...",
    "..BLLLLLLB..",
    ".BBBBBBBBBB.",
    ".BLLLLLLLLB.",
    ".BBBBBBBBBB.",
    ".BLLLLLLLLB.",
    ".BBBBBBBBBB.",
    ".BLLLLLLLLB.",
    ".BBBBBBBBBB.",
    "BBBBBBBBBBBB",
    "............"
  ],
  ediacara: [
    "............",
    "...BBBBB....",
    "..BAAAAAB...",
    ".BAALAALAB..",
    "BAAALAALAAB.",
    "BAALAAALAAB.",
    "BAAALAALAAB.",
    ".BAALAALAB..",
    "..BAAAAAB...",
    "...BBBBB....",
    "............",
    "............"
  ],
  spiral: [
    "...BBBBBB...",
    "..BAAAAAAB..",
    ".BAABBBBAAB.",
    ".BABAAAABAB.",
    "BABALLLLABAB",
    "BABALWWLABAB",
    "BABALLLLABAB",
    ".BABAAAABAB.",
    ".BAABBBBAAB.",
    "..BAAAAAAB..",
    "..BADAADAB..",
    "...BBBBBB..."
  ],
  segmented: [
    "..D......D..",
    "...B....B...",
    "..BBBBBBBB..",
    ".BAABAABAAB.",
    "BADABAABAAAB",
    "BAAABAABAAAB",
    "BARABAABAAAB",
    ".BAABAABAAB.",
    "..BBBBBBBB..",
    "..BB.BB.BB..",
    "............",
    "............"
  ],
  bone: [
    "............",
    ".BB......BB.",
    "BAAB....BAAB",
    "BAAAAAAAAAAB",
    "BAADALLADAAB",
    "BAAAAAAAAAAB",
    "BAAB....BAAB",
    ".BB......BB.",
    "............",
    "............",
    "............",
    "............"
  ],
  disk: [
    "...BBBBBB...",
    "..BAAAAAAB..",
    ".BAWAAAAWAB.",
    ".BAAAAAAAAB.",
    "BADAAAAAADAB",
    "BRAAAAAAAARB",
    "BAAADDDDAAAB",
    ".BAAAAAAAAB.",
    ".BAWAAAAWAB.",
    "..BAAAAAAB..",
    "...BBBBBB...",
    "............"
  ],
  branch: [
    ".BB.....BB..",
    "BAAB...BAAB.",
    ".BAAB.BAAB..",
    "..BAABAAB...",
    "...BAAAB....",
    "....BAB.....",
    "....BAB.....",
    "....BAB.....",
    "...BADAB....",
    "...BAAAB....",
    "...BBBBB....",
    "............"
  ],
  leaf: [
    ".....BB.....",
    "....BAAB....",
    "...BALAAB...",
    "..BAALAAAB..",
    ".BAAALAAAAB.",
    ".BADALADAAB.",
    ".BAAALAAAAB.",
    ".BARALARAAB.",
    "..BAALAAAB..",
    "...BALAAB...",
    "....BAB.....",
    ".....B......"
  ],
  unknown: [
    "...BBBBBB...",
    "..BAAAAAAB..",
    ".BAAAAAAAAB.",
    ".BAAAAAAAAB.",
    "BADDAAAADDAB",
    "BAAAAAAAAAAB",
    "BAARADDARAAB",
    "BAAAAAAAAAAB",
    ".BAAAAAAAAB.",
    ".BAAAAAAAAB.",
    "..BBBBBBBB..",
    "............"
  ]
};
function fallbackShapeSVG(shape, color, silhouette){
  /* 도트 게임 느낌: 픽셀 맵 기반 스프라이트 (실루엣은 회색 + ?) */
  const map = ITEM_PIXEL_MAPS[shape] || ITEM_PIXEL_MAPS.unknown;
  const palette = silhouette
    ? { A:"#9aa0ab", B:"#71777f", L:"#aab0ba", W:"#aab0ba", D:"#71777f", R:"#9aa0ab" }
    : {
        A: color,
        B: mixColor(color, "#2f2430"),
        L: mixColor(color, "#ffffff"),
        W: "#ffffff",
        D: "#3a3350",
        R: "#ffb3a0"
      };
  const q = silhouette
    ? '<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:clamp(18px,42%,34px); color:#565c66; text-shadow:1px 1px 0 #fff;">?</div>'
    : "";
  return pixelSVG(map, palette) + q;
}
/* ---------- 화석 도트 스프라이트 ----------
   PLAYER_PAL과 같은 방식의 공용 팔레트. 대문자=바탕색, 소문자=그늘/무늬,
   '.'은 투명. 모든 스프라이트가 이 하나의 팔레트를 공유하므로 문자가 겹치면 안 된다. */
const FOSSIL_PAL = {
  o:"#3b2f26",                /* 공통 외곽선 */
  W:"#fffdf2",                /* 밝은 하이라이트(눈 반짝·상아) */
  R:"#c9a875", r:"#96774b",   /* 모암(암석) / 모암 그늘 */

  S:"#8fbf5a", s:"#5c8a34",   /* 스트로마톨라이트 밝은 층 / 어두운 층 */
  E:"#e78fb0", e:"#b0607f",   /* 에디아카라 몸 / 몸의 주름 */
  T:"#9b7fd4", t:"#41306e",   /* 삼엽충 등딱지 / 세 엽·마디를 가르는 홈 */
  C:"#ff8b7a", c:"#c2503f",   /* 산호 가지 / 가지 밑동 */
  N:"#f0e6cc", n:"#bcaa86",   /* 공룡 뼈 / 뼈 그늘 */
  F:"#5fae57", f:"#2f6b32",   /* 고사리 깃잎 / 잎줄기(우축) */
  A:"#5aa0e0", a:"#2b6499",   /* 암모나이트 껍데기 / 나선 골 */
  U:"#e8c25c", u:"#a07d24",   /* 화폐석 원반 / 방을 가르는 선 */
  M:"#a9764e", m:"#754d2e",   /* 매머드 털 / 털 그늘 */
  L:"#7cb342", l:"#37631f",   /* 참나무 잎 / 잎맥 */

  I:"#14111a",                /* 이리듐이 많은 검은 점토 */
  Q:"#c6d5e3", q:"#5e7186",   /* 석영 알갱이 / 여러 방향으로 갈라진 금 */
  G:"#9d9d9d", g:"#6a6a6a",   /* 화산재 / 화산재 결 */
  Y:"#ecd63f", y:"#9c8b1e"    /* 황으로 변색된 부분 / 짙은 황 */
};

/* 16x16 도트 스프라이트. 각 화석의 visualHint에 적힌 특징이 드러나도록 그린다.
   키는 아이템 id, 아래쪽에 shape 별칭을 함께 등록한다. */
const FOSSIL_SPRITES = {
  /* 얇은 층이 겹겹이 쌓인 모양 — 밝은 층/어두운 층이 번갈아 쌓인 돔 */
  stromatolite: [
    "................",
    "................",
    "......oooo......",
    ".....oSSSSo.....",
    ".....osssso.....",
    "....oSSSSSSo....",
    "....osssssso....",
    "...oSSSSSSSSo...",
    "...osssssssso...",
    "..oSSSSSSSSSSo..",
    "..osssssssssso..",
    ".oSSSSSSSSSSSSo.",
    ".osssssssssssso.",
    ".oSSSSSSSSSSSSo.",
    ".oooooooooooooo.",
    "................"
  ],
  /* 납작하고 부드러운 몸의 흔적 — 세로로 눌린 타원에 부드러운 주름 */
  ediacara: [
    "................",
    "................",
    "....oooooooo....",
    "..ooEEEEEEEEoo..",
    ".oEEeEEeEEeEEEo.",
    ".oEeEEeEEeEEeEo.",
    "oEEeEEeEEeEEeEEo",
    "oEeEEeEEeEEeEEeo",
    "oEEeEEeEEeEEeEEo",
    ".oEeEEeEEeEEeEo.",
    ".oEEeEEeEEeEEEo.",
    "..ooEEEEEEEEoo..",
    "....oooooooo....",
    "................",
    "................",
    "................"
  ],
  /* 몸이 여러 마디로 나뉘고 세 부분으로 구분됨
     — 세로 홈 두 줄이 몸을 세 엽으로 가르고, 가로 홈이 마디를 만든다 */
  trilobite: [
    "................",
    "....oooooooo....",
    "...oTTTTTTTTo...",
    "..oTTWTTTTWTTo..",
    "..oTTtTTTTtTTo..",
    "..ttttTTTTtttt..",
    "..oTTtTTTTtTTo..",
    "..ttttTTTTtttt..",
    "..oTTtTTTTtTTo..",
    "..ttttTTTTtttt..",
    "..oTTtTTTTtTTo..",
    "..ttttTTTTtttt..",
    "...oTtTTTTtTo...",
    "....oTTTTTTo....",
    ".....oooooo.....",
    "................"
  ],
  /* 가지 모양 또는 여러 개체가 모인 군체 구조 — 여러 가지가 갈라져 올라간다 */
  coral: [
    "................",
    "...C.....C......",
    "...C..C..C..C...",
    "...C..C..C..C...",
    "...CC.C..C.CC...",
    "....CCC..CCC....",
    ".C...CC..CC...C.",
    ".C....CCCC....C.",
    ".CC....CC....CC.",
    "..CC...CC...CC..",
    "...CCC.CC.CCC...",
    "....CCCCCCCC....",
    "....cCCCCCCc....",
    ".....cCCCCc.....",
    "......cccc......",
    "................"
  ],
  /* 큰 뼈, 이빨, 발자국 등의 흔적 — 양 끝이 뭉툭한 큰 뼈 한 점 */
  dinosaur: [
    "................",
    ".........oo.oo..",
    "........oNNoNNo.",
    "........oNNNNNo.",
    "........oNNNNo..",
    ".......oNNno....",
    "......oNNno.....",
    ".....oNNno......",
    "....oNNno.......",
    "...oNNno........",
    "..oNNNno........",
    ".oNNNNNo........",
    ".oNNoNNo........",
    "..oo.oo.........",
    "................",
    "................"
  ],
  /* 잎맥이 갈라진 잎 모양 — 가운데 줄기에서 깃털처럼 갈라진 깃잎 */
  fern: [
    "................",
    ".......ff.......",
    ".....FFffFF.....",
    "....FFFffFFF....",
    ".......ff.......",
    "...FFFFffFFFF...",
    "..FFFFFffFFFFF..",
    ".......ff.......",
    "..FFFFFffFFFFF..",
    ".FFFFFFffFFFFFF.",
    ".......ff.......",
    "..FFFFFffFFFFF..",
    "...FFFFffFFFF...",
    ".......ff.......",
    ".....FFffFF.....",
    ".......ff......."
  ],
  /* 돌돌 말린 나선형 껍데기 — 바깥 껍데기 안에 감긴 나선 */
  ammonite: [
    "................",
    ".....oooooo.....",
    "...ooAAAAAAoo...",
    "..oAaAAAAAAaAo..",
    ".oAAAooooooAAAo.",
    ".oAAoaaaaaaoAAo.",
    "oAAAoaaooaaoAAAo",
    "oAAoaaoAAoaaoAAo",
    "oAAoaaoAAoaaoAAo",
    "oAAAoaaooaaoAAAo",
    ".oAAoaaaaaaoAAo.",
    ".oAAAooooooAAAo.",
    "..oAaAAAAAAaAo..",
    "...ooAAAAAAoo...",
    ".....oooooo.....",
    "................"
  ],
  /* 아주 얇고 검은 띠 모양의 점토 — 두꺼운 암석 사이에 낀 얇은 검은 띠 */
  iridium: [
    "................",
    "..oooooooooooo..",
    "..oRRRRRRRRRRo..",
    "..oRRrRRRRrRRo..",
    "..oRRRRRRRRRRo..",
    "..orRRRRrRRRRo..",
    "..oIIIIIIIIIIo..",
    "..oIIIIIIIIIIo..",
    "..oRRRRRRRRRRo..",
    "..oRrRRRRRRrRo..",
    "..oRRRRrRRRRRo..",
    "..oRRRRRRRRRRo..",
    "..orRRRRRRrRRo..",
    "..oooooooooooo..",
    "................",
    "................"
  ],
  /* 알갱이 안에 여러 방향의 금이 간 석영 — 가로·세로·사선 금이 교차 */
  shocked_quartz: [
    "................",
    ".....oooooo.....",
    "...ooQQQQQQoo...",
    "..oQqQQQQQQqQo..",
    ".oQQqQQQQQQqQQo.",
    ".oQQQqQQQQqQQQo.",
    "oQQQQqQQQQqQQQQo",
    "oqqqqqQQQQqqqqqo",
    "oQQQQqQQQQqQQQQo",
    "oQQQqQQqqQQqQQQo",
    ".oQQqQQqqQQqQQo.",
    ".oQqQQQqqQQQqQo.",
    "..oqQQQQQQQQqo..",
    "...ooQQQQQQoo...",
    ".....oooooo.....",
    "................"
  ],
  /* 회색 화산재가 두껍게 굳은 층 — 얇은 암석 사이에 두꺼운 회색 층 */
  ash_layer: [
    "................",
    "..oooooooooooo..",
    "..oRRRRRRRRRRo..",
    "..oGGGGGGGGGGo..",
    "..oGGgGGGGgGGo..",
    "..oGGGGGGGGGGo..",
    "..oGgGGGgGGGGo..",
    "..oGGGGGGGGGGo..",
    "..oGGGGgGGGgGo..",
    "..oGGGGGGGGGGo..",
    "..oGgGGGGGgGGo..",
    "..oGGGGGGGGGGo..",
    "..oRRRRRRRRRRo..",
    "..oooooooooooo..",
    "................",
    "................"
  ],
  /* 노랗게 변색된 암석 — 암석 가운데가 노랗게 물들었다 */
  sulfur_rock: [
    "................",
    "......oooo......",
    "....ooRRRRoo....",
    "...oRRRYYRRRo...",
    "..oRRYYYYYYRRo..",
    ".oRRYYYYYYYYRRo.",
    "oRRYYYyYYyYYYRRo",
    "oRYYYYyYYyYYYYRo",
    "oRRYYYYYYYYYYRRo",
    "oRRRYYyYYYyYYRRo",
    ".oRRYYYYYYYYRRo.",
    ".oRRRYYYYYYRRRo.",
    "..oRRRRYYRRRRo..",
    "...ooRRRRRRoo...",
    ".....oooooo.....",
    "................"
  ],
  /* 납작하고 둥근 원반 모양 — 동전처럼 둥근 원반에 방을 가르는 선 */
  nummulites: [
    "................",
    ".....oooooo.....",
    "...ooUUUUUUoo...",
    "..oUUUUUUUUUUo..",
    ".oUUUuUUUUuUUUo.",
    ".oUUuUUUUUUuUUo.",
    "oUUUUUUUUUUUUUUo",
    "oUUuUUUuuUUUuUUo",
    "oUUuUUUuuUUUuUUo",
    "oUUUUUUUUUUUUUUo",
    ".oUUuUUUUUUuUUo.",
    ".oUUUuUUUUuUUUo.",
    "..oUUUUUUUUUUo..",
    "...ooUUUUUUoo...",
    ".....oooooo.....",
    "................"
  ],
  /* 긴 상아와 털이 많은 모습 — 덥수룩한 몸 아래로 굽은 흰 상아 한 쌍 */
  mammoth: [
    "................",
    "...mMMMMMMMMm...",
    "..mMMMMMMMMMMm..",
    ".mMMMMMMMMMMMMm.",
    "mMMMMMMMMMMMMMMm",
    "mMMoMMMMMMMMoMMm",
    "mMMMMMMMMMMMMMMm",
    ".mMMMMMMMMMMMMm.",
    "..mMMMMMMMMMMm..",
    ".WWmMMMMMMMMmWW.",
    "WW..mMMMMMMm..WW",
    "W....mMMMMm....W",
    "W.....MMMM.....W",
    ".W....MMMM....W.",
    "..WW..mMMm..WW..",
    "....WW....WW...."
  ],
  /* 잎맥이 그물처럼 퍼진 넓은 잎 — 넓은 잎에 주맥과 그물 잎맥 */
  oakleaf: [
    "................",
    "......LLLL......",
    "....LLLllLLL....",
    "..LLLLLllLLLLL..",
    ".LLLlLLllLLlLLL.",
    "LLLLLLLllLLLLLLL",
    "LLLlLLLllLLLlLLL",
    "LLLLLLLllLLLLLLL",
    ".LLlLLLllLLLlLL.",
    ".LLLLLLllLLLLLL.",
    "..LLlLLllLLlLL..",
    "...LLLLllLLLL...",
    "....LLLllLLL....",
    "......LllL......",
    ".......ll.......",
    ".......ll......."
  ]
};
/* shape 별칭 — 교사가 새 아이템에 같은 shape를 써도 그림이 나오게 한다 */
FOSSIL_SPRITES.dino = FOSSIL_SPRITES.dinosaur;
FOSSIL_SPRITES.coin = FOSSIL_SPRITES.nummulites;
FOSSIL_SPRITES.leaf = FOSSIL_SPRITES.oakleaf;

/* 미발견 실루엣용 팔레트 — 팔레트 키를 그대로 회색조로 바꿔 정체를 감춘다 */
const FOSSIL_PAL_SILHOUETTE = (function(){
  const p = {};
  Object.keys(FOSSIL_PAL).forEach(k => {
    p[k] = (k === "o") ? "#71777f"
         : (k === k.toUpperCase() ? "#9aa0ab" : "#828892");
  });
  return p;
})();
function fossilSpriteSVG(rows, silhouette){
  const q = silhouette
    ? '<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:clamp(18px,42%,34px); color:#565c66; text-shadow:1px 1px 0 #fff;">?</div>'
    : "";
  return pixelSVG(rows, silhouette ? FOSSIL_PAL_SILHOUETTE : FOSSIL_PAL) + q;
}

/* fallback 플레이스홀더 표시
   1순위: 아이템 id 전용 16x16 도트 스프라이트
   2순위: 같은 shape의 스프라이트 (교사가 새로 추가한 아이템)
   3순위: 예전 12x12 기본 도형 (스프라이트가 없는 shape) */
function renderFallbackItem(container, item, silhouette){
  if(!container) return;
  const id = safe(item && item.id, "");
  const shape = safe(item && item.shape, "unknown") || "unknown";
  const rows = FOSSIL_SPRITES[id] || FOSSIL_SPRITES[shape] || null;
  if(rows){
    container.innerHTML = fossilSpriteSVG(rows, !!silhouette);
    return;
  }
  container.innerHTML = fallbackShapeSVG(shape, itemColor(item || {id:"?"}), !!silhouette);
}
/* 공통 이미지 렌더 함수: 성공 시 img, 실패 시 fallback (카드/도감/팝업 공용)
   type: "normal" | "silhouette"  */
function renderAssetImage(container, item, type){
  if(!container) return;
  container.innerHTML = "";
  if(type === "silhouette"){
    // 미발견 카드: 스포일러 방지를 위해 항상 실루엣 fallback
    renderFallbackItem(container, item, true);
    return;
  }
  const src = item && item.img;
  if(!src){ renderFallbackItem(container, item, false); return; }
  const img = document.createElement("img");
  img.className = "item-img";
  img.alt = safe(item.name, "단서");
  img.onerror = () => renderFallbackItem(container, item, false);
  img.src = src;
  container.appendChild(img);
}

/* ---------- 플레이어 캐릭터 ---------- */
/* 캐릭터 공용 팔레트 (도트 스프라이트) */
const PLAYER_PAL = {
  H:"#ffd166", h:"#e0a32e",   /* 안전모 / 안전모 그림자 */
  f:"#ffdcb8", D:"#3a3350",   /* 피부 / 눈 */
  W:"#ffffff", R:"#ffb3a0",   /* 눈 반짝 / 볼터치 */
  M:"#c96a2a",                /* 입 */
  V:"#ff9d5c", C:"#fff2d8",   /* 조끼 / 셔츠 */
  P:"#4a5d78", o:"#7a5236",   /* 바지 / 부츠 */
  K:"#8a5a3c", k:"#c9a468",   /* 배낭 / 배낭 주머니 */
  a:"#7a5236",                /* 뒷머리 */
  g:"#9fb2c4", L:"#55a8d6",   /* 망치 / 루페 */
  Q:"#c48f1a", X:"#c94c3d",   /* 왕관 / 왕관 보석 (모든 단서를 모은 대원) */
  S:"#fff0b8", N:"#8fd6ff",   /* 안전모 하이라이트 / 헤드램프 */
  T:"#ff7fa8",                /* 머리끈 */
  A:"#8c6444",                /* 머리카락 하이라이트 */
  O:"#3b2a20"                 /* 캐릭터 윤곽선 (화석 스프라이트와 같은 색) */
};
/* 시작 화면 전용 탐사대원 (28x37, 여자아이, 보브컷) — 윤곽선이 있는 도트 캐릭터.
   둥근 머리 실루엣, 앞머리와 분홍 머리핀, 얼굴을 감싸다 턱 아래로 말려 들어가는 단발,
   하이라이트 두 점이 있는 큰 눈, 작은 미소, 볼터치. 안전모는 둥근 돔에 챙이 머리 곡선을 따른다.
   좌우 대칭(축 13.5열). 옷차림(노란 안전모·헤드램프·주황 조끼·망치·루페)은 게임 속 스프라이트와 같다. */
const HERO_ROWS = [
  "...........OOOOOO...........",
  ".........OOHHHHHHOO.........",
  "........OHHHHHHHHHHO........",
  ".......OHHSSHHHHSSHHO.......",
  "......OHHSHHHNNHHHSHHO......",
  "......OHHHHHHNNHHHHHHO......",
  ".....OHHHHHHHHHHHHHHHHO.....",
  "....OhhhhhhhhhhhhhhhhhhO....",
  "...OhhOOOOOOOOOOOOOOOOhhO...",
  "....OaaaaaaaaaaaaaaaaaaO....",
  "...OaaAAaaaaaaaaaaaaAAaaO...",
  "..OaaTTaffaffffffaffaAAaaO..",
  "..OaaAaffffffffffffffaAaaO..",
  ".OaaaaaffffffffffffffaaaaaO.",
  ".OaaaaffDDDffffffDDDffaaaaO.",
  ".OaaaaffWWDffffffDWWffaaaaO.",
  ".OaaaaffDDDffffffDDDffaaaaO.",
  ".OaaaaffDDDffffffDDDffaaaaO.",
  ".OaaafRRffffffffffffRRfaaaO.",
  ".OaaaffffffMffffMffffffaaaO.",
  ".OaaaaffffffMMMMffffffaaaaO.",
  "..OaaaaffffffffffffffaaaaO..",
  "..OaaaaaffffffffffffaaaaaO..",
  "...OaaaaaffffffffffaaaaaO...",
  "....OaaaaOffffffffOaaaaO....",
  ".....OaaaOOffffffOOaaaO.....",
  "......OOO..OffffO..OOO......",
  "..........OVVVVVVO..........",
  ".......OOOVVCCCCVVOOO.......",
  "......OfffVVCCCCVVfffO......",
  ".....OgffOVVCkkCVVOffLO.....",
  ".....OggOOVVVVVVVVOOLLO.....",
  ".....Og..OPPPPPPPPO..LO.....",
  ".........OPPPPPPPPO.........",
  ".........OPPPOOPPPO.........",
  "........OooooOOooooO........",
  "........OOOOOOOOOOOO........"
];
const HERO_CROWN_ROWS = [
  "..........X..XX..X..........",
  "..........Q..QQ..Q..........",
  "..........QQQQQQQQ.........."
];
function heroSVG(opt){
  return pixelSVG(opt && opt.crown ? HERO_CROWN_ROWS.concat(HERO_ROWS) : HERO_ROWS, PLAYER_PAL, "player-svg");
}
/* 모든 단서를 모은 탐사대원의 왕관 (안전모 위에 얹는다) */
const PLAYER_CROWN_ROWS = [
  "...X...X...X..",
  "...Q.Q.Q.Q.Q..",
  "...QQQQQQQQQ.."
];
function playerFallbackSVG(opt){
  /* 꼬마 탐사대원 (앞모습, 14x18 도트 스프라이트):
     노란 안전모 + 반짝 눈 + 볼터치 + 조끼 + 망치/루페
     opt.crown: 왕관을 씌운다 (시작 화면, 전체 수집 보상) */
  const rows = [
    "....HHHHHH....",
    "...HHHHHHHH...",
    "...HHHHHHHH...",
    "..HHHHHHHHHH..",
    ".hhhhhhhhhhhh.",
    "..ffffffffff..",
    "..fDDffffDDf..",
    "..fWDffffDWf..",
    ".RffffffffffR.",
    "...fffMMfff...",
    "...VVVVVVVV...",
    "ggfVVCCCCVVfLL",
    ".gfVVCCCCVVfL.",
    "...VVVVVVVV...",
    "....PP..PP....",
    "....PP..PP....",
    "...oo....oo...",
    ".............."
  ];
  return pixelSVG(opt && opt.crown ? PLAYER_CROWN_ROWS.concat(rows) : rows, PLAYER_PAL, "player-svg");
}
/* 뒷모습 꼬마 탐사대원 (3D 길 구간용, 14x18 도트 스프라이트): 큰 배낭 + 안전모 */
function spriteFromMap(rows, palette, scale){
  const c = document.createElement("canvas");
  c.width = rows[0].length * scale;
  c.height = rows.length * scale;
  const g = c.getContext("2d");
  for(let y = 0; y < rows.length; y++){
    for(let x = 0; x < rows[y].length; x++){
      const col = palette[rows[y][x]];
      if(!col) continue;
      g.fillStyle = col;
      g.fillRect(x*scale, y*scale, scale, scale);
    }
  }
  return c;
}
/* 걷기 2프레임: 다리/부츠 줄만 벌어진 변형 맵 생성 */
function walkFrameOf(rows){
  const out = rows.slice();
  for(let i = 0; i < out.length; i++){
    if(out[i] === "....PP..PP....") out[i] = "...PP....PP...";
    else if(out[i] === "...oo....oo...") out[i] = "..oo......oo..";
  }
  return out;
}
const PLAYER_FRONT_MAP = [
  "....HHHHHH....",
  "...HHHHHHHH...",
  "...HHHHHHHH...",
  "..HHHHHHHHHH..",
  ".hhhhhhhhhhhh.",
  "..ffffffffff..",
  "..fDDffffDDf..",
  "..fWDffffDWf..",
  ".RffffffffffR.",
  "...fffMMfff...",
  "...VVVVVVVV...",
  "ggfVVCCCCVVfLL",
  ".gfVVCCCCVVfL.",
  "...VVVVVVVV...",
  "....PP..PP....",
  "....PP..PP....",
  "...oo....oo...",
  ".............."
];
const PLAYER_BACK_MAP = [
  "....HHHHHH....",
  "...HHHHHHHH...",
  "...HHHHHHHH...",
  "..HHHHHHHHHH..",
  ".hhhhhhhhhhhh.",
  "..aaaaaaaaaa..",
  "..aaaaaaaaaa..",
  "..faaaaaaaaf..",
  "...aaaaaaaa...",
  "..VVVVVVVVVV..",
  ".fVKKKKKKKKVf.",
  ".fVKKKkkKKKVf.",
  ".fVKKKkkKKKVf.",
  "..VKKKKKKKKV..",
  "....PP..PP....",
  "....PP..PP....",
  "...oo....oo...",
  ".............."
];
const TREE_MAP = [
  "...GGGG...",
  "..GGGGGG..",
  ".GGGGGGGG.",
  ".GGgGGGGG.",
  "GGGGGGgGGG",
  "GgGGGGGGGg",
  ".GGgGGgGG.",
  "..GGGGGG..",
  "....TT....",
  "....TT....",
  "....TT...."
];
const TREE_PAL = { G:"#5faf5c", g:"#468a4a", T:"#8a5f3e" };
