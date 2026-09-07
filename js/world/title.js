/* ==========================================================================
   시작 화면 도트 배경 (타이틀 씬)
   - 게임의 타일·소품·화석 스프라이트를 그대로 재사용해 캔버스에 그린다.
   - 층: 하늘·해 → 구름(2겹 패럴랙스) → 새 → 능선 나무 → 지층 절벽(화석 박힘) → 강·모래·잔디·길 → 걷는 탐사대원
   - 절벽의 화석은 도감과 같은 규칙: 퀴즈까지 끝낸 것은 본색, 아직인 것은 회색 실루엣 + 반짝임.
     클릭하면 이름(또는 어느 노두를 조사해야 하는지)을 토스트로 알려 준다.
   ========================================================================== */
"use strict";

const TITLE = {
  canvas: null, ctx: null,
  zoom: 3, W: 0, H: 0,        // W/H: 월드 px 단위의 화면 크기
  P: 640,                      // 배경 띠의 반복 주기(월드 px)
  lay: null, strips: {}, fossils: [], sprites: null,
  t: 0, last: 0, raf: 0, on: false,
  birds: [], nextBird: 4,
  player: { x: 40, walkT: 0 },
  resizeTimer: null
};
/* 층별 스크롤 속도 (월드 px/s) — 멀수록 느리게 */
const TITLE_SPEED = { cloudFar: 2.5, cloudNear: 5, ridge: 6, ground: 12 };
const TITLE_RIDGE_TREE_H = 22;          // 능선 위 나무가 차지하는 높이
const TITLE_PLAYER_SPEED = 36;          // 땅 기준 걷는 속도 (게임 속도의 절반 정도)

/* ---------- 도트 맵 ---------- */
const TITLE_CLOUD_BIG = [
  "......WWWWW.......",
  "....WWWWWWWWW.....",
  "..WWWWWWWWWWWWW...",
  ".WWWWWWWWWWWWWWWW.",
  "WWWWWWWWWWWWWWWWWW",
  "WWWWWWWWWWWWWWWWWW",
  ".ssWWWWWWWWWWWWss.",
  "...sssssssssss...."
];
const TITLE_CLOUD_SMALL = [
  "....WWWW....",
  "..WWWWWWWW..",
  ".WWWWWWWWWW.",
  "WWWWWWWWWWWW",
  ".ssWWWWWWss.",
  "...ssssss..."
];
const TITLE_SUN = [
  "....YYYY....",
  "..YYYYYYYY..",
  ".YYYYYYYYYY.",
  ".YYYyYYYYYY.",
  "YYYyYYYYYYYY",
  "YYYYYYYYYYYY",
  "YYYYYYYYYYYY",
  "YYYYYYYYYYyY",
  ".YYYYYYYYYY.",
  ".YYYYYYYyYY.",
  "..YYYYYYYY..",
  "....YYYY...."
];
const TITLE_BIRD = [
  ["o...o", ".o.o.", "..o.."],
  ["..o..", ".o.o.", "o...o"]
];
const TITLE_QMARK = ["WWW.", "...W", "..W.", ".W..", ".W..", "....", ".W.."];

/* ---------- 배치 계산 (월드 px, 위에서 아래로) ---------- */
function titleLayout(){
  const H = TITLE.H;
  /* 하늘은 화면의 1/3 정도만 — 지층·강·탐사로가 더 많이 보이게 */
  const fgH = clamp(Math.round(H * 0.3), 32, 96);
  const sandH = 4, riverH = 14, ridgeH = 8;
  const cliffH = clamp(Math.round(H * 0.24), 36, 72);
  const yFg = H - fgH, ySand = yFg - sandH, yRiver = ySand - riverH, yCliff = yRiver - cliffH, yRidge = yCliff - ridgeH;
  TITLE.lay = { fgH, sandH, riverH, ridgeH, cliffH, yFg, ySand, yRiver, yCliff, yRidge, pathY: yFg + 10, pathH: 18 };
}

/* ---------- 띠(스트립) 생성 ---------- */
function titleBuildClouds(P, skyH, near){
  const c = makeCanvas(P, Math.max(1, skyH));
  const g = c.getContext("2d");
  const pal = near ? { W: "#ffffff", s: "#d6e9f2" } : { W: "#dff1fa", s: "#c9e3ef" };
  const big = mapCanvas(TITLE_CLOUD_BIG, pal), small = mapCanvas(TITLE_CLOUD_SMALL, pal);
  const n = near ? 3 : 5;
  for(let i = 0; i < n; i++){
    const img = near ? (i % 3 === 1 ? small : big) : (i % 2 ? big : small);
    const x = Math.floor((i + 0.5) * P / n + (hash2(i, near, 51) - 0.5) * 60);
    const y = Math.floor(4 + hash2(i, near, 52) * Math.max(4, skyH * (near ? 0.55 : 0.4)));
    g.drawImage(img, x, y);
    if(x + img.width > P) g.drawImage(img, x - P, y);     // 이어 붙일 때 끊기지 않게
  }
  return c;
}
function titleBuildRidge(P){
  const L = TITLE.lay;
  const H = TITLE_RIDGE_TREE_H + L.ridgeH;
  const c = makeCanvas(P, H);
  const g = c.getContext("2d");
  /* 신생대 초원(F 구역) 잔디 */
  for(let x = 0; x < P; x += T){
    const t = TILES["g_F_" + Math.floor(hash2(x, 1, 61) * 4)] || TILES["g_A_0"];
    if(t) g.drawImage(t, 0, 0, T, L.ridgeH, x, TITLE_RIDGE_TREE_H, T, L.ridgeH);
  }
  /* 나무·덤불 (발이 잔디 안에 오도록) */
  let x = 10;
  let i = 0;
  while(x < P - 8){
    const r = hash2(i, 2, 62);
    const key = r < 0.45 ? "oak" : (r < 0.8 ? "conifer" : "bush");
    const p = PROPS[key];
    if(p) g.drawImage(p.img, x - p.ax, TITLE_RIDGE_TREE_H + 6 - p.ay);
    x += 34 + Math.floor(hash2(i, 3, 63) * 40);
    i++;
  }
  return c;
}
/* 지층 절벽: 젊은 층(F)이 위, 오래된 층(A)이 아래. 경계층의 검은 띠·부정합 물결선도 그린다 */
function titleBuildCliff(P, H){
  const c = makeCanvas(P, H);
  const g = c.getContext("2d");
  const layers = layerData.slice().reverse();
  const n = layers.length || 1;
  const sections = [];
  let y = 0;
  layers.forEach((ly, i) => {
    const h = Math.floor(H / n) + (i < H % n ? 1 : 0);
    sections.push({ ly: ly, y0: y, y1: y + h });
    y += h;
  });
  sections.forEach((s, si) => {
    const c1 = safe(s.ly.color1, "#c8a060"), c2 = safe(s.ly.color2, "#946746");
    let yy = s.y0, i = 0;
    while(yy < s.y1){
      const h = Math.max(1, Math.min(s.y1 - yy, 2 + Math.floor(hash2(i, si, 17) * 3)));
      g.fillStyle = i % 2 ? c2 : c1;
      g.fillRect(0, yy, P, h);
      if(yy + h < s.y1){ g.fillStyle = "rgba(40,20,5,.35)"; g.fillRect(0, yy + h, P, 1); }
      yy += h + 1; i++;
    }
    if(s.ly.isBoundary){
      g.fillStyle = safe(s.ly.colorBoundary1, "#1b140e");
      g.fillRect(0, s.y0 + 1, P, 2);
    }
    if(s.ly.unconformityBelow && si < n - 1){
      g.fillStyle = "#1b140e";
      for(let x = 0; x < P; x++) g.fillRect(x, s.y1 - 2 + (Math.floor(x / 3) % 2), 1, 1);
    }
    g.fillStyle = "#3a2a1c";
    g.fillRect(0, s.y1 - 1, P, 1);
  });
  /* 점 무늬 */
  for(let yy = 0; yy < H; yy++) for(let x = 0; x < P; x++){
    const r = hash2(x, yy, 33);
    if(r > 0.94){ g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(x, yy, 1, 1); }
    else if(r < 0.05){ g.fillStyle = "rgba(0,0,0,.14)"; g.fillRect(x, yy, 1, 1); }
  }
  /* 능선 잔디가 절벽 위로 조금씩 내려온 들쭉날쭉한 윗선 + 윤곽 */
  const grass = "#8cc063";
  for(let x = 0; x < P; x += 8){
    const d = Math.floor(hash2(x, 7, 64) * 3);
    if(d){ g.fillStyle = grass; g.fillRect(x, 0, 8, d); }
    g.fillStyle = "#3a2a1c"; g.fillRect(x, d, 8, 1);
  }
  g.fillStyle = "#2b1d15";
  g.fillRect(0, H - 1, P, 1);
  return { canvas: c, sections: sections };
}
/* 절벽에 박힌 화석 — 자기 층 자리에 놓는다.
   시작 화면은 산만하지 않게 "여기서 뭔가 찾을 수 있다" 정도만: 이미 밝혀낸 화석은 모두 본색으로,
   아직 못 찾은 것은 주기(P)마다 3곳만 물음표로 보여 준다. */
const TITLE_HINT_SPOTS = 3;
function titlePlaceFossils(P, sections){
  const all = itemData.filter(it => FOSSIL_SPRITES[it.id] || FOSSIL_SPRITES[it.shape]);
  const found = all.filter(it => state.completed.includes(it.id));
  const hidden = all.filter(it => !state.completed.includes(it.id));
  const step = Math.max(1, Math.floor(hidden.length / TITLE_HINT_SPOTS));
  const hints = hidden.filter((it, i) => i % step === 0).slice(0, TITLE_HINT_SPOTS);
  const items = all.filter(it => found.includes(it) || hints.includes(it));
  const m = items.length || 1;
  const H = TITLE.lay.cliffH;
  return items.map((it, i) => {
    const rows = FOSSIL_SPRITES[it.id] || FOSSIL_SPRITES[it.shape];
    const ok = found.includes(it);
    const sec = sections.find(s => s.ly.id === it.layer) || sections[sections.length - 1];
    const cy = Math.round((sec.y0 + sec.y1) / 2);
    return {
      item: it, found: ok,
      img: mapCanvas(rows, ok ? FOSSIL_PAL : FOSSIL_PAL_SILHOUETTE),
      x: Math.floor((i + 0.5) * P / m + (hash2(i, 1, 41) - 0.5) * 40),
      y: clamp(cy - 8, 1, Math.max(1, H - 17))
    };
  });
}
/* 강·모래·잔디·길·소품 (물은 2프레임이라 띠도 2장) */
function titleBuildGround(P, frame){
  const L = TITLE.lay;
  const H = L.riverH + L.sandH + L.fgH;
  const c = makeCanvas(P, H);
  const g = c.getContext("2d");
  const grassTop = L.riverH + L.sandH;
  const pathTop = grassTop + 8;
  for(let x = 0; x < P; x += T){
    const w = TILES["water" + frame];
    if(w) g.drawImage(w, 0, 0, T, L.riverH, x, 0, T, L.riverH);
    const s = TILES["sand" + Math.floor(hash2(x, 2, 71) * 4)];
    if(s) g.drawImage(s, 0, 0, T, L.sandH, x, L.riverH, T, L.sandH);
    for(let y = grassTop; y < H; y += T){
      const t = TILES["g_A_" + Math.floor(hash2(x, y, 72) * 4)];
      if(t) g.drawImage(t, 0, 0, T, Math.min(T, H - y), x, y, T, Math.min(T, H - y));
    }
    const p = TILES["p_A_" + Math.floor(hash2(x, 3, 73) * 4)];
    if(p) g.drawImage(p, 0, 0, T, L.pathH, x, pathTop, T, L.pathH);
  }
  /* 강물 가장자리 밝은 선 */
  g.fillStyle = "rgba(255,255,255,.35)";
  for(let x = 0; x < P; x += 6) if(hash2(x, 4, 74) > 0.35) g.fillRect(x, L.riverH - 1, 4, 1);
  /* 소품: 길 위쪽엔 작은 것, 길 아래쪽엔 큰 것 */
  const above = ["reed", "flowerY", "flowerP", "flowerB", "fern", "reed"];
  const below = ["rock", "bush", "fern", "strom", "flowerY", "bush", "rock"];
  let x = 6, i = 0;
  while(x < P - 6){
    const p = PROPS[above[Math.floor(hash2(i, 5, 75) * above.length)]];
    if(p && p.h <= 12) g.drawImage(p.img, x - p.ax, grassTop + 7 - p.ay);
    x += 20 + Math.floor(hash2(i, 6, 76) * 44);
    i++;
  }
  x = 14; i = 0;
  const footY = H - 2;
  while(x < P - 14){
    const p = PROPS[below[Math.floor(hash2(i, 7, 77) * below.length)]];
    if(p && footY - p.ay >= pathTop + L.pathH) g.drawImage(p.img, x - p.ax, footY - p.ay);
    x += 36 + Math.floor(hash2(i, 8, 78) * 60);
    i++;
  }
  /* 탐사로 입구 팻말: 길가에 두 개 (한 주기 안에서 좌우로 나뉘어 보이도록) */
  const sign = PROPS.sign;
  if(sign){
    [Math.floor(P * 0.12), Math.floor(P * 0.62)].forEach(sx => {
      g.drawImage(sign.img, sx - sign.ax, pathTop + L.pathH + 12 - sign.ay);
    });
  }
  return c;
}

function titleBuild(){
  if(!TILES.shadow) buildTiles(worldData.zones);    // 게임과 같은 타일셋 (한 번만 생성)
  titleLayout();
  const P = TITLE.P, L = TITLE.lay;
  TITLE.strips.cloudFar = titleBuildClouds(P, L.yRidge, 0);
  TITLE.strips.cloudNear = titleBuildClouds(P, L.yRidge, 1);
  TITLE.strips.ridge = titleBuildRidge(P);
  const cliff = titleBuildCliff(P, L.cliffH);
  TITLE.strips.cliff = cliff.canvas;
  TITLE.fossils = titlePlaceFossils(P, cliff.sections);
  TITLE.strips.ground0 = titleBuildGround(P, 0);
  TITLE.strips.ground1 = titleBuildGround(P, 1);
  if(!TITLE.sprites){
    TITLE.sprites = {
      walk: [spriteFromMap(PLAYER_FRONT_MAP, PLAYER_PAL, 1), spriteFromMap(walkFrameOf(PLAYER_FRONT_MAP), PLAYER_PAL, 1)],
      sun: mapCanvas(TITLE_SUN, { Y: "#ffd166", y: "#ffe58a" }),
      bird: TITLE_BIRD.map(r => mapCanvas(r, { o: "#3a3350" })),
      qDark: mapCanvas(TITLE_QMARK, { W: "#2b1d15" }),
      qLight: mapCanvas(TITLE_QMARK, { W: "#fff8e6" })
    };
  }
}

/* ---------- 크기 ---------- */
function titleResize(force){
  const cv = TITLE.canvas;
  if(!cv) return;
  const bg = cv.parentNode;
  const w = bg.clientWidth || window.innerWidth, h = bg.clientHeight || window.innerHeight;
  const zoom = w < 700 ? 2 : 3;
  const W = Math.ceil(w / zoom), H = Math.ceil(h / zoom);
  if(!force && W === TITLE.W && H === TITLE.H && zoom === TITLE.zoom) return;
  cv.width = w; cv.height = h;
  TITLE.zoom = zoom; TITLE.W = W; TITLE.H = H;
  titleBuild();
  if(TITLE.player.x > W + 32) TITLE.player.x = -32;
  titleDraw();
}

/* ---------- 새 (가끔 지나간다) ---------- */
function titleUpdateBirds(dt){
  TITLE.nextBird -= dt;
  if(TITLE.nextBird <= 0 && TITLE.birds.length < 3){
    const L = TITLE.lay;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const n = 1 + Math.floor(Math.random() * 3);
    const y = 6 + Math.random() * Math.max(4, L.yRidge * 0.5);
    for(let i = 0; i < n; i++){
      TITLE.birds.push({ x: dir > 0 ? -10 - i * 9 : TITLE.W + 10 + i * 9, y: y + (i % 2) * 4, dir: dir, t: Math.random() });
    }
    TITLE.nextBird = 7 + Math.random() * 9;
  }
  TITLE.birds.forEach(b => { b.x += b.dir * 28 * dt; b.t += dt; });
  TITLE.birds = TITLE.birds.filter(b => b.x > -20 && b.x < TITLE.W + 20);
}
function titleUpdatePlayer(dt){
  const p = TITLE.player;
  p.x += (TITLE_PLAYER_SPEED - TITLE_SPEED.ground) * dt;
  p.walkT += dt;
  if(p.x > TITLE.W + 32) p.x = -32;
}

/* ---------- 그리기 ---------- */
function titleScroll(speed){ return game.reducedMotion ? 0 : Math.floor(TITLE.t * speed) % TITLE.P; }
function titleDrawStrip(ctx, img, y, speed){
  if(!img) return;
  const P = TITLE.P;
  for(let x = -titleScroll(speed); x < TITLE.W; x += P) ctx.drawImage(img, x, y);
}
function titleDraw(){
  const ctx = TITLE.ctx;
  if(!ctx || !TITLE.lay || !TITLE.sprites) return;
  const z = TITLE.zoom, L = TITLE.lay, S = TITLE.sprites, P = TITLE.P;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(z, 0, 0, z, 0, 0);
  ctx.fillStyle = "#8fc3e0";
  ctx.fillRect(0, 0, TITLE.W, TITLE.H);
  ctx.drawImage(S.sun, TITLE.W - 44, 12);
  titleDrawStrip(ctx, TITLE.strips.cloudFar, 0, TITLE_SPEED.cloudFar);
  titleDrawStrip(ctx, TITLE.strips.cloudNear, 0, TITLE_SPEED.cloudNear);
  TITLE.birds.forEach(b => {
    const img = S.bird[Math.floor(b.t * 5) % 2];
    ctx.drawImage(img, Math.round(b.x), Math.round(b.y));
  });
  titleDrawStrip(ctx, TITLE.strips.ridge, L.yRidge - TITLE_RIDGE_TREE_H, TITLE_SPEED.ridge);
  titleDrawStrip(ctx, TITLE.strips.cliff, L.yCliff, TITLE_SPEED.ridge);
  /* 화석: 미완료는 실루엣 + '?' + 반짝임 */
  const blink = game.reducedMotion || Math.floor(TITLE.t / 0.42) % 2 === 0;
  const sc = titleScroll(TITLE_SPEED.ridge);
  TITLE.fossils.forEach(f => {
    for(let x = f.x - sc; x < TITLE.W; x += P){
      if(x + 16 < 0) continue;
      const y = L.yCliff + f.y;
      ctx.drawImage(f.img, x, y);
      if(!f.found){
        ctx.drawImage(S.qDark, x + 7, y + 5);
        ctx.drawImage(S.qLight, x + 6, y + 4);
        if(blink) ctx.drawImage(PROPS.glint.img, x + 12, y - 5);
      }
    }
  });
  const frame = game.reducedMotion ? 0 : Math.floor(TITLE.t / 0.45) % 2;
  titleDrawStrip(ctx, TITLE.strips["ground" + frame], L.yRiver, TITLE_SPEED.ground);
  /* 걷는 탐사대원 (길 위, 카메라에 가까운 앞쪽 층이라 2배 크기로) */
  const p = TITLE.player;
  const footY = L.pathY + L.pathH - 3;
  const wf = game.reducedMotion ? 0 : Math.floor(p.walkT * 3) % 2;
  const spr = S.walk[wf];
  ctx.fillStyle = "rgba(20,10,0,.3)";
  ctx.fillRect(Math.round(p.x - 10), footY - 3, 20, 4);
  ctx.drawImage(spr, Math.round(p.x - 14), footY - 34, spr.width * 2, spr.height * 2);
  /* 아주 약한 어두운 오버레이: 중앙 패널이 더 떠 보이게 (블러 없음) */
  ctx.fillStyle = "rgba(20,14,10,.12)";
  ctx.fillRect(0, 0, TITLE.W, TITLE.H);
}
function titleFrame(t){
  if(!TITLE.on) return;
  TITLE.raf = requestAnimationFrame(titleFrame);
  const dt = clamp((t - TITLE.last) / 1000 || 0.016, 0, 0.05);   // 첫 프레임의 시각이 last보다 앞설 수 있다
  TITLE.last = t;
  if(document.hidden) return;
  if(!game.reducedMotion){
    TITLE.t += dt;
    titleUpdateBirds(dt);
    titleUpdatePlayer(dt);
  }
  titleDraw();
}

/* ---------- 화석 클릭 ---------- */
function titleFossilAt(clientX, clientY){
  const r = TITLE.canvas.getBoundingClientRect();
  const wx = (clientX - r.left) / TITLE.zoom, wy = (clientY - r.top) / TITLE.zoom;
  const L = TITLE.lay;
  if(!L || wy < L.yCliff || wy > L.yCliff + L.cliffH) return null;
  const lx = (wx + titleScroll(TITLE_SPEED.ridge)) % TITLE.P;
  const ly = wy - L.yCliff;
  return TITLE.fossils.find(f => lx >= f.x - 2 && lx < f.x + 18 && ly >= f.y - 4 && ly < f.y + 18) || null;
}
function titleClick(e){
  ensureAudioOnce();
  const f = titleFossilAt(e.clientX, e.clientY);
  if(!f) return;
  const ly = layerById(f.item.layer);
  if(f.found){
    playSound("click");
    toast(safe(f.item.name, "단서") + " · " + safe(f.item.hiddenInfo1, "") + " · " + safe(f.item.hiddenInfo2, ""), "gold");
  }else{
    playSound("dig");
    toast("아직 밝혀내지 못한 단서다. " + (ly ? safe(ly.label, "이 층") + " 노두를 조사해 보자!" : "노두를 조사해 보자!"));
  }
}
function titleMove(e){
  if(!TITLE.canvas) return;
  TITLE.canvas.style.cursor = titleFossilAt(e.clientX, e.clientY) ? "pointer" : "";
}

/* ---------- 시작·정지 ---------- */
function titleStart(){
  const bg = $("startBg");
  if(!bg) return;
  if(!TITLE.canvas){
    TITLE.canvas = document.createElement("canvas");
    TITLE.canvas.id = "startCanvas";
    bg.appendChild(TITLE.canvas);
    TITLE.ctx = TITLE.canvas.getContext("2d");
    TITLE.canvas.addEventListener("click", titleClick);
    TITLE.canvas.addEventListener("mousemove", titleMove);
    window.addEventListener("resize", () => {
      if(!TITLE.on) return;
      clearTimeout(TITLE.resizeTimer);
      TITLE.resizeTimer = setTimeout(() => titleResize(false), 120);
    });
  }
  titleResize(true);                 // 진행 상황(발견한 화석)이 바뀌었을 수 있으니 매번 다시 만든다
  TITLE.on = true;
  TITLE.last = performance.now();
  cancelAnimationFrame(TITLE.raf);
  TITLE.raf = requestAnimationFrame(titleFrame);
}
function titleStop(){
  TITLE.on = false;
  cancelAnimationFrame(TITLE.raf);
}
