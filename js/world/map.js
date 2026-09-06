/* ==========================================================================
   맵 엔진: 월드 생성 · 충돌 · 길찾기 · 카메라 · 렌더링 · 지질도 미니맵 · 상호작용
   ========================================================================== */
"use strict";

const worldData = deepClone(DEFAULT_WORLD_DATA);
const WORLD = {
  cols: 0, rows: 0, W: 0, H: 0,
  tile: [],        // 셀별 지면 타일 key (물·폭포는 프레임을 그릴 때 결정)
  solid: [],       // 셀별 통행 불가
  zone: [],        // 셀별 구역 id (절벽·강 포함)
  shadow: [],      // 절벽 아래 그늘
  props: [],       // {key, x, y}  (월드 px, 발 위치)
  outcrops: [],    // {layerId, x, y, col, row}
  gates: [],       // {id, needs, needsEvidence, col, row, x, y, open}
  npcs: [],        // {id, key, x, y, name, lines, again}
  signs: [],       // {id, x, y, text}
  lookout: null,   // {x, y}
  geoMap: null,    // 지질도 미니맵 오프스크린
  canvas: null, ctx: null
};
const MINI = { w: 128, h: 128 };
let lastT = 0;

/* ---------- 좌표 도우미 ---------- */
function riverCol(r){
  const rv = worldData.river;
  return Math.round(rv.center + rv.amp * Math.sin(r * rv.freq));
}
function cellIdx(c, r){ return r * WORLD.cols + c; }
function inWorld(c, r){ return c >= 0 && r >= 0 && c < WORLD.cols && r < WORLD.rows; }
function zoneByRow(r){
  return worldData.zones.find(z => r >= z.rows[0] && r <= z.rows[1]) || null;
}
function zoneById(id){ return worldData.zones.find(z => z.id === id) || null; }
function cliffAtRow(r){ return worldData.cliffs.find(cf => r >= cf.rows[0] && r <= cf.rows[1]) || null; }

/* ---------- 월드 생성 ---------- */
function buildWorld(){
  WORLD.cols = worldData.cols; WORLD.rows = worldData.rows;
  WORLD.W = WORLD.cols * T; WORLD.H = WORLD.rows * T;
  const N = WORLD.cols * WORLD.rows;
  WORLD.tile = new Array(N).fill("");
  WORLD.solid = new Array(N).fill(false);
  WORLD.zone = new Array(N).fill("");
  WORLD.shadow = new Array(N).fill(false);
  WORLD.props = []; WORLD.outcrops = []; WORLD.gates = []; WORLD.npcs = []; WORLD.signs = [];
  const kind = new Array(N).fill("grass");   // grass/water/sand/cliff/stairs/falls/bridge/path/slab
  const rv = worldData.river;

  /* 1. 구역 잔디 */
  for(let r = 0; r < WORLD.rows; r++){
    const cf = cliffAtRow(r);
    /* 절벽 행은 지질도상 아래 구역에 속한다 (절벽 면에 아래층이 드러남) */
    const z = cf ? zoneById(cf.below) : zoneByRow(r);
    for(let c = 0; c < WORLD.cols; c++){
      const i = cellIdx(c, r);
      WORLD.zone[i] = z ? z.id : "";
      WORLD.tile[i] = "g_" + (z ? z.id : "A") + "_" + Math.floor(hash2(c, r, 1) * 4);
    }
  }
  const setKind = (c, r, k, tile, solid) => {
    if(!inWorld(c, r)) return;
    const i = cellIdx(c, r);
    kind[i] = k; if(tile) WORLD.tile[i] = tile; WORLD.solid[i] = !!solid;
  };
  /* 2. 호수 */
  (worldData.lakes || []).forEach(lk => {
    for(let r = lk.cy - lk.ry - 1; r <= lk.cy + lk.ry + 1; r++)
      for(let c = lk.cx - lk.rx - 1; c <= lk.cx + lk.rx + 1; c++){
        if(!inWorld(c, r)) continue;
        const dx = (c - lk.cx) / lk.rx, dy = (r - lk.cy) / lk.ry;
        const d = dx * dx + dy * dy;
        if(d <= 1) setKind(c, r, "water", "water", true);
        else if(d <= 1.9 && kind[cellIdx(c, r)] === "grass") setKind(c, r, "sand", "sand" + Math.floor(hash2(c, r, 2) * 4), false);
      }
  });
  /* 3. 강 (절벽 행에서는 폭포) */
  for(let r = 0; r < WORLD.rows; r++){
    const rc = riverCol(r);
    const cf = cliffAtRow(r);
    for(let c = rc - rv.halfWidth - 1; c <= rc + rv.halfWidth + 1; c++){
      const isWater = Math.abs(c - rc) <= rv.halfWidth;
      if(cf){
        if(isWater) setKind(c, r, "falls", "falls", true);
      }else{
        if(isWater) setKind(c, r, "water", "water", true);
        else if(kind[cellIdx(c, r)] === "grass") setKind(c, r, "sand", "sand" + Math.floor(hash2(c, r, 2) * 4), false);
      }
    }
  }
  /* 4. 절벽 + 계단 + 관문 */
  worldData.cliffs.forEach(cf => {
    const key = "cliff_" + cf.below + "_";
    for(let r = cf.rows[0]; r <= cf.rows[1]; r++){
      const part = r - cf.rows[0];
      for(let c = 0; c < WORLD.cols; c++){
        const i = cellIdx(c, r);
        if(kind[i] === "falls") continue;
        if(c === cf.stairCol || c === cf.stairCol + 1) setKind(c, r, "stairs", "stairs" + part, false);
        else setKind(c, r, "cliff", key + part, true);
      }
    }
    /* 절벽 아래 그늘 */
    const rs = cf.rows[1] + 1;
    for(let c = 0; c < WORLD.cols; c++){
      const i = cellIdx(c, rs);
      if(kind[i] === "grass" || kind[i] === "sand") WORLD.shadow[i] = true;
    }
    if(cf.gate){
      WORLD.gates.push({
        id: cf.gate.id, needs: cf.gate.needs, needsEvidence: !!cf.gate.needsEvidence,
        col: cf.stairCol, row: cf.rows[1],
        x: (cf.stairCol + 1) * T, y: (cf.rows[1] + 1) * T, open: false, wasOpen: null
      });
    }
  });
  /* 5. 다리 (2행) */
  (worldData.bridges || []).forEach(r => {
    const rc = riverCol(r);
    for(let c = rc - rv.halfWidth - 1; c <= rc + rv.halfWidth + 1; c++){
      setKind(c, r, "bridge", "bridgeTop", false);
      setKind(c, r + 1, "bridge", "bridgeBot", false);
    }
  });
  /* 6. 흙길 (ㄱ자 연결, 2칸 폭) */
  const paint = (c, r) => {
    if(!inWorld(c, r)) return;
    const i = cellIdx(c, r);
    if(kind[i] !== "grass" && kind[i] !== "sand") return;
    const z = WORLD.zone[i] || "A";
    kind[i] = "path";
    WORLD.tile[i] = "p_" + z + "_" + Math.floor(hash2(c, r, 3) * 4);
  };
  (worldData.paths || []).forEach(pl => {
    for(let k = 0; k + 1 < pl.length; k++){
      const [c0, r0] = pl[k], [c1, r1] = pl[k + 1];
      const sc = Math.sign(c1 - c0), sr = Math.sign(r1 - r0);
      for(let c = c0; c !== c1 + sc; c += (sc || 1)){ paint(c, r0); paint(c, r0 + 1); if(!sc) break; }
      for(let r = r0; r !== r1 + sr; r += (sr || 1)){ paint(c1, r); paint(c1 + 1, r); if(!sr) break; }
    }
  });
  /* 7. 발자국 광장 */
  const pz = worldData.plaza;
  if(pz){
    for(let r = pz.row; r < pz.row + pz.h; r++) for(let c = pz.col; c < pz.col + pz.w; c++){
      if(!inWorld(c, r)) continue;
      const i = cellIdx(c, r);
      if(kind[i] === "grass" || kind[i] === "path"){ kind[i] = "slab"; WORLD.tile[i] = "slab" + Math.floor(hash2(c, r, 4) * 4); }
    }
    for(let k = 0; k < 4; k++){
      WORLD.props.push({ key: "track", x: (pz.col + 1 + k * 1.3) * T + 4, y: (pz.row + 1 + (k % 2)) * T + 8, flat: true });
    }
  }
  /* 8. 노두 (강물이 깎아 만든 절벽) */
  const reserved = [];   // 소품 배치 금지 셀 (c,r)
  const reserve = (c, r, w, h) => { for(let rr = r; rr < r + h; rr++) for(let cc = c; cc < c + w; cc++) reserved.push(cellIdx(cc, rr)); };
  (worldData.outcrops || []).forEach(o => {
    const rc = riverCol(o.row);
    const col = o.side === "east" ? rc + rv.halfWidth + 3 : rc - rv.halfWidth - 5;
    const x = (col + 1.5) * T, y = (o.row + 1) * T;
    WORLD.outcrops.push({ layerId: o.layer, x: x, y: y, col: col, row: o.row });
    reserve(col - 1, o.row - 2, 5, 5);
    /* 노두 앞은 흙길로 */
    for(let c = col - 1; c <= col + 3; c++) paint(c, o.row + 1);
  });
  /* 9. 고정 소품·NPC·전망대 */
  (worldData.fixed || []).forEach(f => {
    const p = PROPS[f.key]; if(!p) return;
    const x = f.col * T + T / 2, y = (f.row + 1) * T;
    if(f.key === "sign") WORLD.signs.push({ id: f.id, x: x, y: y, text: f.text || [] });
    if(f.key === "lookout") WORLD.lookout = { x: x, y: y };
    WORLD.props.push({ key: f.key, x: x, y: y });
    const cw = Math.ceil(p.w / T) + 1, ch = Math.ceil(p.h / T) + 1;
    reserve(f.col - Math.floor(cw / 2), f.row - ch + 1, cw + 1, ch + 1);
  });
  (worldData.npcs || []).forEach(n => {
    const x = n.col * T + T / 2, y = (n.row + 1) * T;
    WORLD.npcs.push({ id: n.id, key: n.key, x: x, y: y, name: n.name, lines: n.lines || [], again: n.again || [] });
    reserve(n.col - 1, n.row - 1, 3, 3);
  });
  WORLD.gates.forEach(g => reserve(g.col - 1, g.row, 4, 3));
  /* 10. 구역별 소품 흩뿌리기 (길·강·절벽·예약 셀 회피) */
  const nearKind = (c, r, ks, rad) => {
    const R = rad || 1;
    for(let dr = -R; dr <= R; dr++) for(let dc = -R; dc <= R; dc++){
      if(!inWorld(c + dc, r + dr)) continue;
      if(ks.indexOf(kind[cellIdx(c + dc, r + dr)]) >= 0) return true;
    }
    return false;
  };
  worldData.zones.forEach(z => {
    for(let r = z.rows[0]; r <= z.rows[1]; r++) for(let c = 0; c < WORLD.cols; c++){
      const i = cellIdx(c, r);
      if(kind[i] !== "grass") continue;
      if(reserved.indexOf(i) >= 0) continue;
      if(nearKind(c, r, ["path", "stairs", "bridge", "slab"])) continue;
      const h = hash2(c, r, 5);
      if(h > z.density) continue;
      const key = z.props[Math.floor(hash2(c, r, 6) * z.props.length)];
      /* 물가 소품(스트로마톨라이트·갈대)은 물 근처에만 */
      if((key === "strom" || key === "reed") && !nearKind(c, r, ["water", "sand"]) && !nearKind(c, r, ["sand"], 2)) continue;
      const p = PROPS[key]; if(!p) continue;
      WORLD.props.push({ key: key, x: c * T + T / 2, y: (r + 1) * T });
    }
  });
  /* 10b. 소품 군락 */
  (worldData.clusters || []).forEach(cl => {
    for(let r = cl.row; r < cl.row + cl.h; r++) for(let c = cl.col; c < cl.col + cl.w; c++){
      if(!inWorld(c, r)) continue;
      const i = cellIdx(c, r);
      if(kind[i] !== "grass" && kind[i] !== "sand") continue;
      if(reserved.indexOf(i) >= 0) continue;
      if(nearKind(c, r, ["path", "stairs", "bridge", "slab"])) continue;
      if(hash2(c, r, 8) > cl.fill) continue;
      if(!PROPS[cl.key]) continue;
      WORLD.props.push({ key: cl.key, x: c * T + T / 2 + Math.floor(hash2(c, r, 9) * 6) - 3, y: (r + 1) * T });
    }
  });
  /* 11. 소품 충돌 → 셀 통행 불가 */
  WORLD.props.forEach(pr => {
    const p = PROPS[pr.key];
    if(!p || !p.solid) return;
    const s = p.solid;
    const c0 = Math.floor((pr.x + s.x) / T), c1 = Math.floor((pr.x + s.x + s.w - 1) / T);
    const r0 = Math.floor((pr.y + s.y) / T), r1 = Math.floor((pr.y + s.y + s.h - 1) / T);
    for(let r = r0; r <= r1; r++) for(let c = c0; c <= c1; c++) if(inWorld(c, r)) WORLD.solid[cellIdx(c, r)] = true;
  });
  WORLD.npcs.forEach(n => { const c = Math.floor(n.x / T), r = Math.floor((n.y - 2) / T); if(inWorld(c, r)) WORLD.solid[cellIdx(c, r)] = true; });
  WORLD.kind = kind;
  buildGeoMap();
}

/* 관문 열림 여부 (진행 상태에서 계산) */
function gateIsOpen(g){
  if(!outcropDone(g.needs)) return false;
  if(g.needsEvidence && !allEvidenceCollected()) return false;
  return true;
}
function refreshGates(){
  WORLD.gates.forEach(g => {
    g.open = gateIsOpen(g);
    const i0 = cellIdx(g.col, g.row), i1 = cellIdx(g.col + 1, g.row);
    WORLD.solid[i0] = !g.open; WORLD.solid[i1] = !g.open;
    if(g.wasOpen === false && g.open && game.running){
      playSound("place");
      const z = zoneById(g.needs);
      toast("관문이 열렸다. " + (z ? z.name : "다음 구역") + "의 조사가 끝나 계단이 열렸습니다.", "gold");
    }
    g.wasOpen = g.open;
  });
}

/* ---------- 충돌 ---------- */
function solidAtPx(x, y){
  const c = Math.floor(x / T), r = Math.floor(y / T);
  if(!inWorld(c, r)) return true;
  return WORLD.solid[cellIdx(c, r)];
}
/* 발 위치 (x,y) 기준 충돌 상자 10×6 */
function blockedAt(x, y){
  return solidAtPx(x - 5, y - 1) || solidAtPx(x + 4, y - 1) || solidAtPx(x - 5, y - 6) || solidAtPx(x + 4, y - 6);
}

/* ---------- 길찾기 (BFS, 셀 단위) ---------- */
function findPath(sx, sy, tx, ty){
  const cols = WORLD.cols, rows = WORLD.rows;
  const walk = i => !WORLD.solid[i];
  const cellOf = (x, y) => clamp(Math.floor(x / T), 0, cols - 1) + cols * clamp(Math.floor(y / T), 0, rows - 1);
  let target = cellOf(tx, ty);
  if(!walk(target)){
    let best = -1, bd = 1e9;
    for(let i = 0; i < cols * rows; i++){
      if(!walk(i)) continue;
      const cx = (i % cols) * T + T / 2, cy = Math.floor(i / cols) * T + T / 2;
      const d = (cx - tx) * (cx - tx) + (cy - ty) * (cy - ty);
      if(d < bd){ bd = d; best = i; }
    }
    if(best < 0) return null;
    target = best;
  }
  const start = cellOf(sx, sy);
  const prev = new Int32Array(cols * rows).fill(-1);
  const seen = new Uint8Array(cols * rows);
  const q = [start]; seen[start] = 1;
  let head = 0, found = false;
  while(head < q.length){
    const cur = q[head++];
    if(cur === target){ found = true; break; }
    const cx = cur % cols, cy = Math.floor(cur / cols);
    const nb = [[1,0],[-1,0],[0,1],[0,-1]];
    for(const [dx, dy] of nb){
      const nx = cx + dx, ny = cy + dy;
      if(nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const ni = ny * cols + nx;
      if(seen[ni] || !walk(ni)) continue;
      seen[ni] = 1; prev[ni] = cur; q.push(ni);
    }
  }
  if(!found) return null;
  const path = [];
  for(let cur = target; cur !== -1 && cur !== start; cur = prev[cur]){
    path.push({ x: (cur % cols) * T + T / 2, y: Math.floor(cur / cols) * T + T / 2 + 4 });
  }
  path.reverse();
  return path;
}

/* ---------- 카메라 ---------- */
function viewportW(){ return $("sceneViewport").clientWidth || window.innerWidth; }
function viewportH(){ return $("sceneViewport").clientHeight || window.innerHeight; }
function resizeWorldCanvas(){
  if(!WORLD.canvas) return;
  WORLD.canvas.width = viewportW();
  WORLD.canvas.height = viewportH();
  game.zoom = viewportW() < 700 ? 2 : 3;
  WORLD.ctx.imageSmoothingEnabled = false;
  updateCamera(true);
}
function updateCamera(snap){
  const z = game.zoom;
  const vw = viewportW() / z, vh = viewportH() / z;
  const tx = clamp(game.player.x - vw / 2, 0, Math.max(0, WORLD.W - vw));
  const ty = clamp(game.player.y - vh / 2 - 8, 0, Math.max(0, WORLD.H - vh));
  const ease = (snap || game.reducedMotion) ? 1 : 0.14;
  game.camX += (tx - game.camX) * ease;
  game.camY += (ty - game.camY) * ease;
  if(Math.abs(tx - game.camX) < 0.3) game.camX = tx;
  if(Math.abs(ty - game.camY) < 0.3) game.camY = ty;
}

/* ---------- 렌더링 ---------- */
function drawWorld(){
  const ctx = WORLD.ctx;
  if(!ctx) return;
  const z = game.zoom;
  const cw = WORLD.canvas.width, ch = WORLD.canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#1c2416";
  ctx.fillRect(0, 0, cw, ch);
  ctx.imageSmoothingEnabled = false;
  const camX = Math.round(game.camX * z) / z, camY = Math.round(game.camY * z) / z;
  ctx.setTransform(z, 0, 0, z, -Math.round(camX * z), -Math.round(camY * z));
  const frame = Math.floor(performance.now() / 450) % 2;
  const c0 = Math.max(0, Math.floor(camX / T)), r0 = Math.max(0, Math.floor(camY / T));
  const c1 = Math.min(WORLD.cols - 1, Math.ceil((camX + cw / z) / T)), r1 = Math.min(WORLD.rows - 1, Math.ceil((camY + ch / z) / T));
  /* 지면 */
  for(let r = r0; r <= r1; r++) for(let c = c0; c <= c1; c++){
    const i = cellIdx(c, r);
    let key = WORLD.tile[i];
    if(key === "water") key = "water" + frame;
    else if(key === "falls"){ const cf = cliffAtRow(r); key = "falls" + frame + "_" + (cf ? r - cf.rows[0] : 0); }
    const t = TILES[key];
    if(t) ctx.drawImage(t, c * T, r * T);
    if(WORLD.shadow[i]) ctx.drawImage(TILES.shadow, c * T, r * T);
  }
  /* y-정렬 엔티티 */
  const ents = [];
  const vis = (x, y, w, h) => x + w > camX && x - w < camX + cw / z && y + h > camY && y - h < camY + ch / z;
  WORLD.props.forEach(p => { if(vis(p.x, p.y, 32, 48)) ents.push({ y: p.flat ? -1 : p.y, kind: "prop", o: p }); });
  WORLD.outcrops.forEach(o => { if(vis(o.x, o.y, 32, 32)) ents.push({ y: o.y, kind: "outcrop", o: o }); });
  WORLD.gates.forEach(g => { if(vis(g.x, g.y, 32, 16)) ents.push({ y: g.y, kind: "gate", o: g }); });
  WORLD.npcs.forEach(n => { if(vis(n.x, n.y, 16, 24)) ents.push({ y: n.y, kind: "npc", o: n }); });
  ents.push({ y: game.player.y, kind: "player" });
  ents.sort((a, b) => a.y - b.y);
  const blink = Math.floor(performance.now() / 420) % 2 === 0;
  ents.forEach(e => {
    if(e.kind === "prop"){
      const p = PROPS[e.o.key]; if(!p) return;
      ctx.drawImage(p.img, Math.round(e.o.x - p.ax), Math.round(e.o.y - p.ay));
    }else if(e.kind === "outcrop"){
      const p = PROPS["outcrop_" + e.o.layerId]; if(!p) return;
      ctx.drawImage(p.img, Math.round(e.o.x - p.ax), Math.round(e.o.y - p.ay));
      const done = outcropDug(e.o.layerId);
      if(done){ ctx.drawImage(PROPS.flag.img, Math.round(e.o.x - 20), Math.round(e.o.y - p.h - 6)); }
      else if(blink){ ctx.drawImage(PROPS.glint.img, Math.round(e.o.x - 3), Math.round(e.o.y - p.h - 9)); }
    }else if(e.kind === "gate"){
      const p = PROPS[e.o.open ? "gateOpen" : "gateClosed"];
      ctx.drawImage(p.img, Math.round(e.o.x - p.ax), Math.round(e.o.y - p.ay));
    }else if(e.kind === "npc"){
      const p = PROPS[e.o.key]; if(!p) return;
      ctx.drawImage(p.img, Math.round(e.o.x - p.ax), Math.round(e.o.y - p.ay));
      if(blink && state.talkedNpc.indexOf(e.o.id) < 0){
        ctx.fillStyle = "#fff8e6"; ctx.fillRect(Math.round(e.o.x - 3), Math.round(e.o.y - p.h - 8), 6, 6);
        ctx.fillStyle = "#2b1d15"; ctx.fillRect(Math.round(e.o.x - 1), Math.round(e.o.y - p.h - 7), 2, 3);
        ctx.fillRect(Math.round(e.o.x - 1), Math.round(e.o.y - p.h - 3), 2, 1);
      }
    }else{
      drawPlayer(ctx);
    }
  });
  /* 근접 표시 */
  if(game.near && blink){
    ctx.strokeStyle = "#ffe066"; ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(game.near.x - 12) + .5, Math.round(game.near.y - 22) + .5, 24, 24);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  positionHint();
  drawMiniMap();
}
function drawPlayer(ctx){
  const p = game.player;
  ctx.fillStyle = "rgba(20,10,0,.3)";
  ctx.fillRect(Math.round(p.x - 5), Math.round(p.y - 2), 10, 3);
  const frame = p.moving && Math.floor(p.walkT * 7) % 2 === 1 ? "2" : "";
  const base = p.face === "up" ? "up" : "down";
  const s = PLAYER_SPRITES[base + frame] || PLAYER_SPRITES[base];
  if(p.face === "left"){
    ctx.save();
    ctx.translate(Math.round(p.x), 0);
    ctx.scale(-1, 1);
    ctx.drawImage(s, -7, Math.round(p.y - 17));
    ctx.restore();
  }else{
    ctx.drawImage(s, Math.round(p.x - 7), Math.round(p.y - 17));
  }
}
const PLAYER_SPRITES = {};
function buildPlayerSprites(){
  PLAYER_SPRITES.down  = spriteFromMap(PLAYER_FRONT_MAP, PLAYER_PAL, 1);
  PLAYER_SPRITES.down2 = spriteFromMap(walkFrameOf(PLAYER_FRONT_MAP), PLAYER_PAL, 1);
  PLAYER_SPRITES.up    = spriteFromMap(PLAYER_BACK_MAP, PLAYER_PAL, 1);
  PLAYER_SPRITES.up2   = spriteFromMap(walkFrameOf(PLAYER_BACK_MAP), PLAYER_PAL, 1);
}
/* 말풍선(HTML) 위치 */
function positionHint(){
  const hint = $("actionHint");
  if(!hint || !hint.classList.contains("on") || !game.near) return;
  const z = game.zoom;
  const sx = (game.near.x - game.camX) * z, sy = (game.near.y - 30 - game.camY) * z;
  hint.style.left = clamp(sx, 120, WORLD.canvas.width - 120) + "px";
  hint.style.top = clamp(sy, 70, WORLD.canvas.height - 120) + "px";
}

/* ---------- 지질도 미니맵 ---------- */
const GEO_COLORS = { "선캄브리아 시대": "#c98bb8", "고생대": "#79b3d8", "중생대": "#8fcf8a", "중생대 말~신생대 초": "#3a3230", "신생대": "#f0d46a" };
function eraColorOfZone(zid){
  const z = zoneById(zid); const ly = z ? layerById(z.layer) : null;
  return ly ? (GEO_COLORS[ly.era] || "#bbb") : "#bbb";
}
function buildGeoMap(){
  const m = makeCanvas(MINI.w, MINI.h);
  const g = m.getContext("2d");
  const sx = MINI.w / WORLD.cols, sy = MINI.h / WORLD.rows;
  for(let r = 0; r < WORLD.rows; r++) for(let c = 0; c < WORLD.cols; c++){
    const i = cellIdx(c, r);
    const k = WORLD.kind[i];
    let col = eraColorOfZone(WORLD.zone[i]);
    if(k === "water" || k === "falls") col = "#3f7fb5";
    else if(k === "cliff") col = shade(col, -60);
    else if(k === "stairs" || k === "bridge") col = "#e6d7b0";
    g.fillStyle = col;
    g.fillRect(Math.floor(c * sx), Math.floor(r * sy), Math.ceil(sx), Math.ceil(sy));
  }
  WORLD.geoMap = m;
}
function drawMiniMap(){
  const mm = $("miniMap");
  if(!mm || !WORLD.geoMap) return;
  const g = mm.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(WORLD.geoMap, 0, 0);
  const sx = MINI.w / WORLD.W, sy = MINI.h / WORLD.H;
  /* 발견한 노두 */
  WORLD.outcrops.forEach(o => {
    if(!state.foundOutcrops.includes(o.layerId)) return;
    g.fillStyle = "#2b1d15"; g.fillRect(Math.round(o.x * sx) - 3, Math.round(o.y * sy) - 3, 6, 6);
    g.fillStyle = outcropDug(o.layerId) ? "#3ec6b5" : "#ffe066";
    g.fillRect(Math.round(o.x * sx) - 2, Math.round(o.y * sy) - 2, 4, 4);
  });
  /* 카메라 범위 */
  const z = game.zoom;
  g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1;
  g.strokeRect(Math.round(game.camX * sx) + .5, Math.round(game.camY * sy) + .5, Math.round(WORLD.canvas.width / z * sx), Math.round(WORLD.canvas.height / z * sy));
  /* 플레이어 */
  if(Math.floor(performance.now() / 300) % 2 === 0){
    g.fillStyle = "#2b1d15"; g.fillRect(Math.round(game.player.x * sx) - 3, Math.round(game.player.y * sy) - 3, 6, 6);
    g.fillStyle = "#fff"; g.fillRect(Math.round(game.player.x * sx) - 2, Math.round(game.player.y * sy) - 2, 4, 4);
  }
}

/* ---------- 상호작용 대상 감지 ---------- */
function updateNear(){
  let best = null, bd = 1e9;
  const P = game.player;
  const consider = (kind, o, x, y, radius) => {
    const d = Math.hypot(x - P.x, y - P.y);
    if(d < radius && d < bd){ bd = d; best = { kind: kind, o: o, x: x, y: y }; }
  };
  WORLD.outcrops.forEach(o => {
    const d = Math.hypot(o.x - P.x, o.y - P.y);
    if(d < 64 && !state.foundOutcrops.includes(o.layerId)){
      state.foundOutcrops.push(o.layerId);
      saveState();
      toast("새 노두 발견: " + safe((layerById(o.layerId) || {}).label, "지층 " + o.layerId) + ". 지질도에 표시했다.");
      playSound("place");
    }
    consider("outcrop", o, o.x, o.y, 34);
  });
  WORLD.npcs.forEach(n => consider("npc", n, n.x, n.y, 26));
  WORLD.signs.forEach(s => consider("sign", s, s.x, s.y, 22));
  WORLD.gates.forEach(g => { if(!g.open) consider("gate", g, g.x, g.y + 6, 26); });
  if(WORLD.lookout) consider("lookout", WORLD.lookout, WORLD.lookout.x, WORLD.lookout.y, 34);
  game.near = best;
  const hint = $("actionHint");
  const show = !!best && !game.digging && !anyModalOpen();
  hint.classList.toggle("on", show);
  if(show) hint.querySelector(".bubble").textContent = hintTextFor(best);
}
function hintTextFor(n){
  if(n.kind === "outcrop"){
    const ly = layerById(n.o.layerId);
    return (outcropDug(n.o.layerId) ? "조사 완료 · 다시 보기" : safe(ly && ly.label, "노두") + " 조사하기") + " (E)";
  }
  if(n.kind === "npc") return safe(n.o.name, "대화") + "와 대화 (E)";
  if(n.kind === "sign") return "표지판 읽기 (E)";
  if(n.kind === "gate") return "관문 · 잠김 (E)";
  if(n.kind === "lookout") return finalMissionReady() ? "전망대 · 최종 미션 (E)" : "전망대 (E)";
  return "(E)";
}
function finalMissionReady(){
  if(exploredOutcropCount() < layerData.length) return false;
  if(evidenceItems().length && !allEvidenceCollected()) return false;
  return true;
}
function exploredOutcropCount(){ return layerData.filter(ly => outcropDug(ly.id)).length; }

/* E / 클릭 / 조사 버튼 */
function tryAction(){
  if(anyModalOpen()) return;
  const n = game.near;
  if(!n) return;
  playSound("click");
  if(n.kind === "outcrop"){ openOutcropModal(n.o.layerId); return; }
  if(n.kind === "npc"){
    const first = state.talkedNpc.indexOf(n.o.id) < 0;
    if(first){ state.talkedNpc.push(n.o.id); saveState(); }
    openDialog(n.o.name, first || !n.o.again.length ? n.o.lines : n.o.again);
    return;
  }
  if(n.kind === "sign"){ openDialog(n.o.text[0] || "표지판", n.o.text.slice(1)); return; }
  if(n.kind === "gate"){
    const z = zoneById(n.o.needs);
    const ly = layerById(n.o.needs);
    const items = itemsOfLayer(n.o.needs);
    const doneN = items.filter(i => state.completed.includes(i.id)).length;
    const lines = [
      "이 계단은 " + (z ? z.name : "앞 구역") + "의 노두 조사를 마쳐야 열립니다.",
      safe(ly && ly.label, "노두") + " 진행: 단서 " + doneN + " / " + items.length + " 도감 등록" +
        (isBandedLayer(n.o.needs) ? (boundaryFullyDug(n.o.needs) ? " · 모든 띠 조사 완료" : " · 노두의 모든 띠를 아래층부터 차례로 조사해야 합니다") : "") + ".",
      "앞 구역의 변화를 시간 순서대로 확인한 뒤 다음 구역으로 가는 게임 진행 규칙입니다."
    ];
    openDialog("관문 안내", lines);
    return;
  }
  if(n.kind === "lookout"){
    if(finalMissionReady()){ openFinalMission(); return; }
    const left = layerData.length - exploredOutcropCount();
    openDialog("전망대", [
      "여기서는 공원 전체의 지층이 한눈에 보입니다. 남쪽 입구가 가장 오래된 층, 이곳이 가장 젊은 층이에요.",
      left > 0 ? "아직 조사하지 않은 노두가 " + left + "곳 남았습니다. 노두를 모두 조사하면 여기서 흩어진 기록을 하나로 잇는 최종 미션이 열립니다."
               : "경계층에 남은 흔적을 모두 도감에 등록하면 여기서 최종 미션이 열립니다."
    ]);
  }
}

/* 노두 6곳 + 증거 수집 완료 시 안내 연출 (모달이 닫힌 뒤) */
function maybeParkComplete(){
  if(state.parkDone) return;
  if(!finalMissionReady()) return;
  state.parkDone = true;
  saveState();
  const show = () => {
    if(anyModalOpen()){ setTimeout(show, 800); return; }
    $("cinematicTitle").textContent = "모든 노두 조사 완료";
    $("cinematicSub").textContent = "지질공원의 노두 " + layerData.length + "곳을 전부 조사했다. 북쪽 전망대에서 흩어진 기록을 하나로 잇자.";
    const btn = $("btnCinematicGo");
    btn.textContent = "전망대로 가자";
    btn.onclick = () => {
      $("cinematicOverlay").classList.remove("on");
      btn.onclick = defaultCinematicGo;
      btn.textContent = "계속";
    };
    openCinematic();
    playSound("badge");
    spawnConfetti();
  };
  setTimeout(show, 900);
}
function openCinematic(){ $("cinematicOverlay").classList.add("on"); }
function cameraShake(){
  if(game.reducedMotion) return;
  const appEl = $("app");
  appEl.classList.remove("shake");
  void appEl.offsetWidth;
  appEl.classList.add("shake");
  setTimeout(() => appEl.classList.remove("shake"), 400);
}

/* ---------- 구역 배너 ---------- */
function checkZoneChange(){
  const r = Math.floor(game.player.y / T);
  const z = zoneByRow(r);
  const id = z ? z.id : null;
  if(id && id !== game.zone){
    game.zone = id;
    showZoneBanner(z);
    if(state.seenZones.indexOf(id) < 0){ state.seenZones.push(id); saveState(); }
  }
}

/* ---------- 씬 시작 ---------- */
function enterWorld(){
  const vp = $("sceneViewport");
  if(!WORLD.canvas){
    vp.insertAdjacentHTML("afterbegin", '<canvas id="worldCanvas"></canvas>');
    WORLD.canvas = $("worldCanvas");
    WORLD.ctx = WORLD.canvas.getContext("2d");
    WORLD.canvas.addEventListener("click", onWorldClick);
    window.addEventListener("resize", resizeWorldCanvas);
  }
  if(!WORLD.tile.length){
    buildTiles(worldData.zones);
    buildPlayerSprites();
    buildWorld();
  }
  const st = worldData.start;
  if(!game.player.placed){
    game.player.x = st.col * T + T / 2;
    game.player.y = (st.row + 1) * T;
    game.player.face = "up";
    game.player.placed = true;
  }
  game.zone = null;
  game.near = null;
  game.autoTarget = null;
  refreshGates();
  resizeWorldCanvas();
  updateCamera(true);
  $("actionHint").classList.remove("on");
  updateHud();
}
function onWorldClick(e){
  ensureAudioOnce();
  if(anyModalOpen()) return;
  const r = WORLD.canvas.getBoundingClientRect();
  const z = game.zoom;
  const wx = (e.clientX - r.left) / z + game.camX;
  const wy = (e.clientY - r.top) / z + game.camY;
  /* 가까운 상호작용 대상을 눌렀나? */
  let target = null, bd = 26;
  const chk = (kind, o, x, y) => { const d = Math.hypot(x - wx, y - wy); if(d < bd){ bd = d; target = { kind, o, x, y }; } };
  WORLD.outcrops.forEach(o => chk("outcrop", o, o.x, o.y - 10));
  WORLD.npcs.forEach(n => chk("npc", n, n.x, n.y - 8));
  WORLD.signs.forEach(s => chk("sign", s, s.x, s.y - 6));
  if(WORLD.lookout) chk("lookout", WORLD.lookout, WORLD.lookout.x, WORLD.lookout.y - 10);
  /* 이미 가까이 있으면 바로 실행 */
  if(target && game.near && game.near.o === target.o){ tryAction(); return; }
  const dest = target ? { x: target.x, y: target.y + 14 } : { x: wx, y: wy };
  const wp = findPath(game.player.x, game.player.y, dest.x, dest.y);
  if(wp === null){ toast("그쪽으로는 갈 수 없다."); return; }
  playSound("click");
  game.autoTarget = { waypoints: wp, then: target ? "action" : null };
}

/* ---------- 게임 루프 ---------- */
function gameLoop(t){
  requestAnimationFrame(gameLoop);
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
  lastT = t;
  if(!game.running || !WORLD.ctx) return;
  const speed = 84;
  let moving = false;
  if(!game.digging && !anyModalOpen()){
    let dx = 0, dy = 0;
    if(game.input.left)  dx -= 1;
    if(game.input.right) dx += 1;
    if(game.input.up)    dy -= 1;
    if(game.input.down)  dy += 1;
    const manual = dx !== 0 || dy !== 0;
    if(manual) game.autoTarget = null;
    if(!manual && game.autoTarget){
      const at = game.autoTarget;
      while(at.waypoints.length && Math.hypot(at.waypoints[0].x - game.player.x, at.waypoints[0].y - game.player.y) < 3){
        at.waypoints.shift();
      }
      if(!at.waypoints.length){
        const then = at.then;
        game.autoTarget = null;
        if(then === "action"){ updateNear(); tryAction(); }
      }else{
        const w = at.waypoints[0];
        const ad = Math.hypot(w.x - game.player.x, w.y - game.player.y) || 1;
        dx = (w.x - game.player.x) / ad;
        dy = (w.y - game.player.y) / ad;
      }
    }
    if(dx !== 0 || dy !== 0){
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
      let nx = game.player.x + dx * speed * dt;
      let ny = game.player.y + dy * speed * dt;
      nx = clamp(nx, 6, WORLD.W - 6);
      ny = clamp(ny, 18, WORLD.H - 2);
      if(blockedAt(nx, ny)){
        if(!blockedAt(nx, game.player.y)) ny = game.player.y;
        else if(!blockedAt(game.player.x, ny)) nx = game.player.x;
        else { nx = game.player.x; ny = game.player.y; game.autoTarget = null; }
      }
      moving = (nx !== game.player.x || ny !== game.player.y);
      game.player.x = nx;
      game.player.y = ny;
      if(Math.abs(dy) >= Math.abs(dx)) game.player.face = dy < 0 ? "up" : "down";
      else game.player.face = dx < 0 ? "left" : "right";
    }
  }
  game.player.moving = moving;
  if(moving) game.player.walkT += dt; else game.player.walkT = 0;
  if(moving){
    game.stepSoundTimer -= dt;
    if(game.stepSoundTimer <= 0){ playSound("step"); game.stepSoundTimer = 0.28; }
  }
  refreshGates();
  updateNear();
  checkZoneChange();
  if(game.digging) tickDigging(dt);
  updateCamera(false);
  drawWorld();
}
