/* ==========================================================================
   도트 타일셋 · 소품 스프라이트 (전부 코드에서 생성 — 외부 이미지 없음)
   - 타일 한 칸 = 16×16 px. 화면에는 game.zoom 배로 확대(최근접 보간)해서 그린다.
   - 지면 타일은 함수로 생성(점 무늬가 칸마다 다르도록 변형 4종),
     소품은 문자열 도트 맵으로 그린다.
   ========================================================================== */
"use strict";

const T = 16;                       // 타일 크기(px)
const TILES = {};                   // key → canvas(16×16)
const PROPS = {};                   // key → { img: canvas, w, h, ax, ay, solid:{x,y,w,h} }

/* 결정적 해시 (0~1) — 타일 무늬·소품 배치를 항상 같게 만든다 */
function hash2(x, y, seed){
  let h = (x * 374761393 + y * 668265263 + (seed || 0) * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function shade(hex, amt){
  const p = hexRGB(hex); if(!p) return hex;
  const f = v => Math.max(0, Math.min(255, Math.round(v + amt)));
  return "rgb(" + f(p[0]) + "," + f(p[1]) + "," + f(p[2]) + ")";
}
function makeCanvas(w, h){
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}
/* (x,y) → 색 함수를 16×16에 찍어 타일을 만든다 */
function genTile(key, fn){
  const c = makeCanvas(T, T);
  const g = c.getContext("2d");
  for(let y = 0; y < T; y++) for(let x = 0; x < T; x++){
    const col = fn(x, y);
    if(col){ g.fillStyle = col; g.fillRect(x, y, 1, 1); }
  }
  TILES[key] = c;
  return c;
}
/* 문자열 도트 맵 → 캔버스 */
function mapCanvas(rows, pal){
  const h = rows.length, w = rows[0].length;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){
    const col = pal[rows[y][x]];
    if(col){ g.fillStyle = col; g.fillRect(x, y, 1, 1); }
  }
  return c;
}
/* 소품 등록: ax/ay = 기준점(발 위치) 오프셋, solid = 충돌 상자(px, 기준점 기준) */
function defProp(key, rows, pal, opt){
  const img = mapCanvas(rows, pal);
  const o = opt || {};
  PROPS[key] = {
    img: img, w: img.width, h: img.height,
    ax: o.ax !== undefined ? o.ax : Math.floor(img.width / 2),
    ay: o.ay !== undefined ? o.ay : img.height,
    solid: o.solid || null,
    tall: !!o.tall
  };
  return PROPS[key];
}

/* ---------- 지면 타일 ---------- */
/* 잔디/흙: base 색에 점 무늬·풀 포기. variant 0~3 */
function genGround(key, base, speck, tuft, variant){
  genTile(key + variant, (x, y) => {
    const r = hash2(x + variant * 17, y + variant * 31, 7);
    if(tuft && r > 0.965 && y < 15 && (x % 2 === 0)) return tuft;
    if(r > 0.90) return speck;
    if(r < 0.035) return shade(base, 8);
    return base;
  });
}
function genPath(key, base, speck, variant){
  genTile(key + variant, (x, y) => {
    const r = hash2(x + variant * 13, y + variant * 29, 11);
    if(r > 0.92) return speck;
    if(r < 0.05) return shade(base, 10);
    return base;
  });
}
/* 물: 2프레임 (반짝임 줄이 어긋남) */
function genWater(key, frame){
  const base = "#4c93c9", light = "#7ec2e4", deep = "#3b7fb2";
  genTile(key + frame, (x, y) => {
    const yy = (y + frame * 2) % 8;
    const xx = (x + Math.floor(y / 4) * 3 + frame * 2) % 16;
    if(yy === 1 && xx >= 2 && xx <= 6) return light;
    if(yy === 5 && xx >= 9 && xx <= 12) return light;
    if(hash2(x, y, 21 + frame) > 0.93) return deep;
    return base;
  });
}
/* 물가 모래 */
function genSand(key, variant){
  genTile(key + variant, (x, y) => {
    const r = hash2(x + variant * 7, y + variant * 3, 5);
    if(r > 0.9) return "#d9c58f";
    if(r < 0.06) return "#f2e6bd";
    return "#e8d7a3";
  });
}
/* 절벽 면: 위 구역(젊은 층)·아래 구역(오래된 층) 색으로 층리 표현. part: 0=윗칸, 1=아랫칸
   band: 검은 경계층 띠를 그릴 y(0~31, 두 칸 합친 좌표) — 없으면 -1 */
function genCliff(key, upperGrass, cUp1, cUp2, cLow1, cLow2, band, part){
  const beds = [];   // 두 칸(32px) 높이의 층 목록: [y0, y1, color]
  let y = 3;
  const seq = [cUp1, cUp2, cUp1, cUp2, cLow1, cLow2, cLow1, cLow2, cLow1];
  let i = 0;
  while(y < 32){
    const h = 3 + Math.floor(hash2(i, 3, 9) * 3);
    beds.push([y, Math.min(32, y + h), seq[i % seq.length]]);
    y += h + 1; i++;
  }
  genTile(key + part, (x, ty) => {
    const yy = ty + part * 16;
    if(yy < 2) return upperGrass;                     // 위 구역 잔디 (능선)
    if(yy === 2) return "#3a2a1c";                     // 능선 윤곽
    if(band >= 0 && (yy === band || yy === band + 1)) return "#1b140e";
    const jitter = Math.floor(hash2(x, 1, 3) * 2);
    for(const b of beds){
      if(yy >= b[0] + jitter && yy < b[1] + jitter){
        const r = hash2(x, yy, 4);
        if(x === 15 || yy === 31) return shade(b[2], -40);
        if(r > 0.9) return shade(b[2], -18);
        if(r < 0.08) return shade(b[2], 14);
        return b[2];
      }
    }
    return "#4a3626";                                  // 층 사이 그늘 선
  });
}
/* 계단 (절벽 틈): part 0/1 */
function genStairs(key, part){
  genTile(key + part, (x, y) => {
    if(x === 0 || x === 15) return "#4a3626";
    const yy = y + part * 16;
    const step = Math.floor(yy / 4);
    if(yy % 4 === 3) return "#6a5540";
    return step % 2 === 0 ? "#c4b08a" : "#b7a27c";
  });
}
/* 폭포 (절벽을 가로지르는 강): 2프레임 × part 0/1 */
function genFalls(key, frame, part){
  genTile(key + frame + "_" + part, (x, y) => {
    const yy = y + part * 16;
    if(yy < 2) return "#4c93c9";
    const s = (x * 5 + Math.floor((yy + frame * 3) / 2)) % 7;
    if(part === 1 && yy > 26 && hash2(x, yy, frame) > 0.5) return "#eef8ff";
    if(s === 0) return "#eef8ff";
    if(s === 3) return "#a7d8f0";
    return "#6fb5e0";
  });
}
/* 다리 널빤지 (남북으로 흐르는 강을 동서로 건넘): rail = top/bottom/none */
function genBridge(key, rail){
  genTile(key, (x, y) => {
    if(rail === "top"    && y < 3)  return y === 2 ? "#5a3d24" : "#8a5a33";
    if(rail === "bottom" && y > 12) return y === 13 ? "#5a3d24" : "#8a5a33";
    if(x % 4 === 3) return "#7a4f2c";
    return (Math.floor(x / 4) % 2 === 0) ? "#b8834a" : "#ad7a43";
  });
}
/* 공룡 발자국 광장 (사암 슬래브) */
function genSlab(key, variant){
  genTile(key + variant, (x, y) => {
    const r = hash2(x + variant * 5, y + variant * 9, 13);
    if(r > 0.93) return "#b58a5a";
    return "#c9a072";
  });
}
/* 절벽 아래 그늘 (아래 구역 잔디 위에 덧그림) */
function genShadow(key){
  genTile(key, (x, y) => (y < 3 ? "rgba(20,10,0,.28)" : (y < 5 ? "rgba(20,10,0,.14)" : null)));
}

/* ---------- 소품 도트 맵 ---------- */
const PP = {   // 공용 소품 팔레트
  o:"#2b1d15",            // 윤곽
  G:"#5faf5c", g:"#3f8a46", H:"#8ad07a",   // 활엽수 잎
  C:"#3f8f5a", c:"#2f6e45", d:"#5fb06e",   // 침엽수
  T:"#8a5f3e", t:"#6a4630",                // 나무 줄기
  R:"#9c948c", r:"#7a726a", W:"#c9c2ba",   // 바위
  L:"#d8d2c4", l:"#b8b1a2",                // 석회암(밝은 바위)
  S:"#b7955e", s:"#96774a", u:"#d4b47a",   // 스트로마톨라이트 층
  F:"#5f9e4a", f:"#3f7a34",                // 고사리
  E:"#a9b56a", e:"#7d8a45",                // 갈대
  P:"#f6d36b", p:"#ff8a8a", q:"#8fd0f0",   // 꽃
  B:"#b07a45", b:"#7a4f2c", k:"#5a3d24",   // 나무판
  Y:"#ffd166", y:"#e0a32e",                // 노란 팻말
  N:"#fff8e6", n:"#3a2a1c",                // 팻말 글자판
  M:"#c94c3d", m:"#8f2f25",                // 밧줄/빨강
  A:"#ffffff"
};

function buildProps(){
  /* 침엽수 (중생대 구역) */
  defProp("conifer", [
    ".......oo.......",
    "......oCCo......",
    "......oCCo......",
    ".....oCdCCo.....",
    ".....oCCCCo.....",
    "....oCdCCcCo....",
    "....oCCCCcCo....",
    "...oCCdCCCcCo...",
    "...oCCCCCCcCo...",
    "..oCdCCCCCccCo..",
    "..oCCCCCCCccCo..",
    ".oCCdCCCCCcccCo.",
    ".oCCCCCCCCcccCo.",
    "oCdCCCCCCCccccCo",
    "oCCCCCCCCCccccCo",
    ".oooooooooooooo.",
    ".......oTTo.....",
    ".......oTto.....",
    ".......oTto.....",
    "........oo......"
  ], PP, { solid: { x: -4, y: -5, w: 8, h: 5 }, tall: true });
  /* 활엽수 (신생대 구역·참나무) */
  defProp("oak", [
    ".....oooooo.....",
    "...ooGGGGGGoo...",
    "..oGGHGGGGGGGo..",
    ".oGGHHGGGGGGGGo.",
    ".oGGHGGGGGGgGGo.",
    "oGGGGGGGGGGGgGGo",
    "oGGGGGGGGGGGGgGo",
    "oGgGGGGGGGGGGGGo",
    "oGgGGGGGGGGGggGo",
    ".oGggGGGGGGgggo.",
    ".oGGgggGGGgggGo.",
    "..oGGgggggggGo..",
    "...oooTTTTooo...",
    "......oTTto.....",
    "......oTTto.....",
    "......oTTto.....",
    ".......oo.o....."
  ], PP, { solid: { x: -4, y: -4, w: 8, h: 4 }, tall: true });
  /* 덤불 */
  defProp("bush", [
    "...oooooo...",
    "..oGGHGGGo..",
    ".oGGHGGGGGo.",
    "oGGGGGGGgGGo",
    "oGgGGGGGggGo",
    ".oGggGGggGo.",
    "..oooooooo.."
  ], PP, { solid: { x: -5, y: -4, w: 10, h: 4 } });
  /* 바위 */
  defProp("rock", [
    ".....oooo.....",
    "...ooWWRRoo...",
    "..oWWRRRRRRo..",
    ".oWRRRRRRRrRo.",
    ".oRRRRRRrrrRo.",
    "oRRRRRRrrrrrRo",
    "oRrRRRrrrrrrro",
    ".oooooooooooo."
  ], PP, { solid: { x: -6, y: -5, w: 12, h: 5 } });
  defProp("rockBig", [
    "......ooooooo.......",
    "....ooWWWRRRRoo.....",
    "...oWWWRRRRRRRRo....",
    "..oWWRRRRRRRRRRRo...",
    ".oWRRRRRRRRRRrrRRo..",
    ".oRRRRRRRRRRrrrrRRo.",
    "oRRRRRRRRRrrrrrrrRRo",
    "oRrRRRRRRrrrrrrrrrro",
    "oRrrRRRRrrrrrrrrrrro",
    ".oooooooooooooooooo."
  ], PP, { solid: { x: -9, y: -7, w: 18, h: 7 } });
  /* 석회암 바위 (고생대 카르스트) */
  defProp("karst", [
    "....oo...oo.....",
    "...oLLo.oLLo....",
    "..oLLLLoLLLLo...",
    ".oLLlLLLLLlLLo..",
    ".oLLLLLlLLLLLLo.",
    "oLlLLLLLLLLlLLLo",
    "oLLLLlLLlLLLLllo",
    "oLlLLLLLLLLllllo",
    ".oooooooooooooo."
  ], PP, { solid: { x: -7, y: -5, w: 14, h: 5 } });
  /* 스트로마톨라이트 돔 (선캄브리아 시대 구역 물가) */
  defProp("strom", [
    ".....oooooo.....",
    "...ooSuuuuSoo...",
    "..oSSuuuuuuSSo..",
    ".oSssssssssssSo.",
    ".oSuuuuuuuuuuSo.",
    "oSssssssssssssSo",
    "oSuuuuuuuuuuuuSo",
    "oSsssssssssssSso",
    ".oooooooooooooo."
  ], PP, { solid: { x: -7, y: -5, w: 14, h: 5 } });
  /* 고사리 */
  defProp("fern", [
    "..F....F....",
    ".FfF..FfF.F.",
    "F.f.F.f.FfF.",
    ".FfF.FfF.f..",
    "..f.F.f.FfF.",
    ".FfF.Ff.f...",
    "..f...f.f...",
    "...ff.f.f...",
    "....fff.....",
    ".....f......"
  ], PP, {});
  /* 갈대 (신생대 호숫가) */
  defProp("reed", [
    "..E...E...",
    "..e.E.e...",
    "E.e.e.e.E.",
    "e.e.e.e.e.",
    "e.e.E.e.e.",
    ".ee.e.ee..",
    "..e.e.e...",
    "..e.e.e...",
    "...eee....",
    "....e....."
  ], PP, {});
  /* 꽃 */
  defProp("flowerY", ["P.P", "PPP", ".g.", ".g."], PP, {});
  defProp("flowerP", ["p.p", "ppp", ".g.", ".g."], PP, {});
  defProp("flowerB", ["q.q", "qqq", ".g.", ".g."], PP, {});
  /* 팻말 (구역 안내·표지판) */
  defProp("sign", [
    "oooooooooooooo",
    "oNNNNNNNNNNNNo",
    "oNnnNnnnNnnNNo",
    "oNNNNNNNNNNNNo",
    "oNnnnNnnNnnnNo",
    "oNNNNNNNNNNNNo",
    "oooooooooooooo",
    "......oTo.....",
    "......oTo.....",
    "......oTo.....",
    "......oTo.....",
    ".....ooToo...."
  ], PP, { solid: { x: -3, y: -3, w: 6, h: 3 } });
  /* 밧줄 관문 (닫힘 / 열림) — 계단 폭 2칸(32px)에 맞춤 */
  defProp("gateClosed", [
    "oo............................oo",
    "oYo..........................oYo",
    "oYoMM......................MMoYo",
    "oYo..MMM................MMM..oYo",
    "oYo.....MMMMMMMMMMMMMMMM.....oYo",
    "oYo..........................oYo",
    "oYoMM......................MMoYo",
    "oYo.MMMMMMMMMMMMMMMMMMMMMMMM.oYo",
    "oYo..........................oYo",
    "ooo..........................ooo"
  ], PP, { ax: 16, ay: 10, solid: { x: -16, y: -8, w: 32, h: 8 } });
  defProp("gateOpen", [
    "oo............................oo",
    "oYo..........................oYo",
    "oYoM........................MoYo",
    "oYoM........................MoYo",
    "oYo.M......................M.oYo",
    "oYo.M......................M.oYo",
    "oYoM........................MoYo",
    "oYo..........................oYo",
    "oYo..........................oYo",
    "ooo..........................ooo"
  ], PP, { ax: 16, ay: 10 });
  /* 안내소 건물 (48×36) */
  const bld = [];
  for(let y = 0; y < 36; y++){
    let row = "";
    for(let x = 0; x < 48; x++){
      let ch = ".";
      if(y >= 2 && y < 14){                              // 지붕
        const inRoof = x >= (12 - y) && x < (36 + y);
        if(inRoof) ch = (x === 12 - y || x === 35 + y || y === 13) ? "o" : ((x + y) % 6 === 0 ? "m" : "M");
      }else if(y >= 14 && y < 34){                        // 벽
        if(x >= 2 && x < 46){
          ch = (x === 2 || x === 45 || y === 33) ? "o" : "N";
          if(y >= 20 && y < 27 && ((x >= 8 && x < 16) || (x >= 32 && x < 40))) ch = (y === 20 || y === 26 || x === 8 || x === 15 || x === 32 || x === 39) ? "n" : "q"; // 창
          if(y >= 22 && y < 33 && x >= 20 && x < 28) ch = (x === 20 || x === 27 || y === 22) ? "k" : "B"; // 문
          if(y === 16 && x >= 18 && x < 30) ch = "y";      // 간판
          if(y === 17 && x >= 18 && x < 30) ch = (x % 3 === 0) ? "n" : "Y";
          if(y === 18 && x >= 18 && x < 30) ch = "y";
        }
      }else if(y === 34 || y === 35){
        if(x >= 0 && x < 48) ch = "o";
      }
      row += ch;
    }
    bld.push(row);
  }
  defProp("center", bld, PP, { ax: 24, ay: 34, solid: { x: -23, y: -20, w: 46, h: 20 } });
  /* 전망대 데크 (40×26) */
  const deck = [];
  for(let y = 0; y < 26; y++){
    let row = "";
    for(let x = 0; x < 40; x++){
      let ch = ".";
      if(y < 4){ if(x % 4 === 0) ch = "k"; else if(y === 1) ch = "b"; }
      else if(y < 20){ ch = (x === 0 || x === 39 || y === 19) ? "k" : ((x % 5 === 4) ? "b" : "B"); if(y === 4) ch = "b"; }
      else { if(x === 2 || x === 3 || x === 36 || x === 37) ch = "k"; }
      row += ch;
    }
    deck.push(row);
  }
  defProp("lookout", deck, PP, { ax: 20, ay: 24, solid: { x: -20, y: -16, w: 40, h: 16 } });
  /* 공룡 발자국 (슬래브 위) */
  defProp("track", [
    ".o..o..o.",
    "oooooooo.",
    ".oooooo..",
    "..oooo...",
    "..oooo...",
    "...oo...."
  ], { o: "#8a6242" }, {});
  /* 조사 완료 깃발·미조사 반짝임 */
  defProp("flag", [
    "oMMMMM",
    "oMMMM.",
    "oMMM..",
    "o.....",
    "o.....",
    "o....."
  ], PP, {});
  defProp("glint", [
    "...A...",
    "...A...",
    ".A.A.A.",
    "AAAAAAA",
    ".A.A.A.",
    "...A...",
    "...A..."
  ], { A: "#ffe066" }, {});
  /* 해설사(공원 레인저) — 탐사대원 도트 맵 재사용, 초록 조끼·갈색 모자 */
  const RANGER_PAL = Object.assign({}, PLAYER_PAL, { H:"#8a6a3a", h:"#6a4e2a", V:"#3f8f5a", C:"#e8f0d8", g:"#3f8f5a", L:"#3f8f5a" });
  defProp("ranger", PLAYER_FRONT_MAP, RANGER_PAL, { ax: 7, ay: 17, solid: { x: -5, y: -4, w: 10, h: 4 } });
}

/* ---------- 노두(강가 절벽) 스프라이트: 층 색으로 생성 ---------- */
function buildOutcropProp(ly, below){
  const W = 48, H = 26;
  const c = makeCanvas(W, H);
  const g = c.getContext("2d");
  const c1 = safe(ly.color1, "#c8a060"), c2 = safe(ly.color2, "#946746");
  const cb = below ? safe(below.color1, "#8a7050") : "#6e6672";     // 아래층 (없으면 기본색)
  /* 위: 잔디 능선 */
  g.fillStyle = "#3a2a1c"; g.fillRect(0, 2, W, 1);
  /* 층리 (위 70%: 이 층, 아래 30%: 아래층) */
  let y = 3;
  const bedsTop = Math.floor(H * 0.7);
  let i = 0;
  while(y < H - 1){
    const h = 2 + Math.floor(hash2(i, 5, 17) * 3);
    const col = y < bedsTop ? (i % 2 ? c2 : c1) : (i % 2 ? shade(cb, -14) : cb);
    g.fillStyle = col;
    g.fillRect(1, y, W - 2, h);
    g.fillStyle = "rgba(40,20,5,.35)";
    g.fillRect(1, y + h, W - 2, 1);
    /* 경계 노두: 검은 띠 */
    if(ly.isBoundary && y >= bedsTop - 6 && y < bedsTop - 3){
      g.fillStyle = safe(ly.colorBoundary1, "#1b140e");
      g.fillRect(1, y, W - 2, h + 1);
    }
    y += h + 1; i++;
  }
  /* 점 무늬·윤곽 */
  for(let yy = 3; yy < H; yy++) for(let x = 1; x < W - 1; x++){
    const r = hash2(x, yy, 33);
    if(r > 0.94){ g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(x, yy, 1, 1); }
    else if(r < 0.05){ g.fillStyle = "rgba(0,0,0,.14)"; g.fillRect(x, yy, 1, 1); }
  }
  g.fillStyle = "#2b1d15";
  g.fillRect(0, 2, 1, H - 2); g.fillRect(W - 1, 2, 1, H - 2); g.fillRect(0, H - 1, W, 1);
  /* 표지판 (노두 기호) */
  g.fillStyle = "#2b1d15"; g.fillRect(W - 12, H - 12, 10, 8);
  g.fillStyle = "#fff8e6"; g.fillRect(W - 11, H - 11, 8, 6);
  g.fillStyle = "#2b1d15"; g.font = "bold 6px sans-serif"; g.textBaseline = "top";
  g.fillText(String(ly.id), W - 9, H - 11);
  PROPS["outcrop_" + ly.id] = { img: c, w: W, h: H, ax: 24, ay: H, solid: { x: -24, y: -8, w: 48, h: 8 }, tall: false };
}

/* ---------- 타일셋 빌드 (구역 스타일은 world.js에서) ---------- */
function buildTiles(zones){
  zones.forEach(z => {
    for(let v = 0; v < 4; v++){
      genGround("g_" + z.id + "_", z.grass, shade(z.grass, -14), shade(z.grass, 26), v);
      genPath("p_" + z.id + "_", z.soil, shade(z.soil, -16), v);
    }
  });
  for(let v = 0; v < 4; v++){ genSand("sand", v); genSlab("slab", v); }
  genWater("water", 0); genWater("water", 1);
  genShadow("shadow");
  genStairs("stairs", 0); genStairs("stairs", 1);
  genFalls("falls", 0, 0); genFalls("falls", 0, 1); genFalls("falls", 1, 0); genFalls("falls", 1, 1);
  genBridge("bridgeTop", "top"); genBridge("bridgeBot", "bottom");
  /* 절벽: 각 경계(위 구역 z, 아래 구역 zl) */
  for(let i = 0; i < zones.length - 1; i++){
    const low = zones[i], up = zones[i + 1];
    const lyUp = layerById(up.layer) || {}, lyLow = layerById(low.layer) || {};
    const band = up.bandInCliff ? 20 : -1;
    genCliff("cliff_" + low.id + "_", up.grass,
      safe(lyUp.color1, "#b0805a"), safe(lyUp.color2, "#946746"),
      safe(lyLow.color1, "#c8a060"), safe(lyLow.color2, "#a07850"), band, 0);
    genCliff("cliff_" + low.id + "_", up.grass,
      safe(lyUp.color1, "#b0805a"), safe(lyUp.color2, "#946746"),
      safe(lyLow.color1, "#c8a060"), safe(lyLow.color2, "#a07850"), band, 1);
  }
  buildProps();
  layerData.forEach((ly, i) => buildOutcropProp(ly, i > 0 ? layerData[i - 1] : null));
}
