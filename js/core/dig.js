/* ---------- 노두 · 경계층 · 발굴 · 발견 · 관찰 ---------- */
function itemsOfLayer(layerId){
  return itemData.filter(i => safe(i.layer, null) === layerId);
}

/* ---------- 여러 띠로 나뉜 노두 모델 ----------
   layers.js 의 bands 배열(아래→위)로 띠를 정의한다. 지층 A(아래층·위층), F(아래층·위층),
   경계 노두 D(아래층·경계층·위층)가 이 모델을 쓴다.
   아래 띠를 모두 판 뒤에야 위 띠가 열린다 — 이것은 "변화를 시간 순서대로 보기 위한"
   게임 진행 규칙이지, 지질 조사의 법칙이 아니다. (실제 조사는 어디부터든 한다) */
function layerById(layerId){ return layerData.find(l => l.id === layerId) || null; }
function layerBands(layerId){
  const ly = layerById(layerId);
  if(!ly || !Array.isArray(ly.bands) || !ly.bands.length) return null;
  const items = itemsOfLayer(layerId);
  return ly.bands.map((b, bi) => {
    const mine = items.filter(i => safe(i.band, "") === b.key);
    const slots = [];
    if(b.repeat){
      const it = mine[0] || null;
      for(let i = 0; i < b.repeat; i++) slots.push({ slot: layerId + "#" + b.key + i, itemId: it ? it.id : null });
    }else{
      mine.forEach((it, i) => slots.push({ slot: layerId + "#" + b.key + i, itemId: it.id }));
    }
    if(b.empty){ for(let i = 0; i < b.empty; i++) slots.push({ slot: layerId + "#" + b.key + "e" + i, itemId: null }); }
    return { key: b.key, name: safe(b.name, "층"), slots: slots, hint: safe(b.hint, ""), lockMsg: safe(b.lockMsg, ""),
             dark: !!b.dark, gapNote: safe(b.gapNote, ""), index: bi };
  });
}
function isBandedLayer(layerId){ return !!layerBands(layerId); }
/* 예전 이름 (저장 데이터 이관·관문 안내에서 씀) */
const boundaryBands = layerBands;
const isBoundaryLayer = isBandedLayer;
/* 화면에는 위→아래로 그리므로 역순 뷰 */
function boundaryBandsTopDown(bands){ return bands.slice().reverse(); }

function slotDug(slot){ return state.dugSlots.indexOf(slot) >= 0; }
function bandAllDug(band){ return band.slots.length > 0 && band.slots.every(s => slotDug(s.slot)); }
/* 아래 띠를 모두 파야 그 위 띠가 열린다 (게임 진행 규칙) */
function bandUnlocked(bands, idx){
  for(let i = 0; i < idx; i++){ if(!bandAllDug(bands[i])) return false; }
  return true;
}
/* 모든 띠의 모든 지점(빈손 포함)을 다 팠는가 */
function boundaryFullyDug(layerId){
  const bands = layerBands(layerId);
  return bands ? bands.every(bandAllDug) : true;
}
/* 경계층에 남은 사건의 흔적 아이템 */
function evidenceItems(){ return itemData.filter(i => i.isEvidence); }
function allEvidenceCollected(){
  const ev = evidenceItems();
  return ev.length > 0 && ev.every(i => state.completed.includes(i.id));
}
/* 아이템 표시 이름: 퀴즈를 풀면 revealName 으로 바뀐다 (이리듐 점토층) */
function itemDisplayName(item){
  if(!item) return "";
  if(item.revealName && state.completed.includes(item.id)) return item.revealName;
  return safe(item.name, "단서");
}

/* 노두 조사 완료 판정 — 경계 노두는 빈손 지점까지 전부 파야 완료로 본다 */
function outcropDone(layerId){
  const items = itemsOfLayer(layerId);
  const collected = items.length > 0 && items.every(i => state.completed.includes(i.id));
  if(!collected) return false;
  return isBandedLayer(layerId) ? boundaryFullyDug(layerId) : true;
}
/* 노두를 '조사했는가'(발굴 기준) — 띠가 있는 노두는 빈손 지점 포함 */
function outcropDug(layerId){
  const items = itemsOfLayer(layerId);
  const dug = items.length > 0 && items.every(i => state.discovered.includes(i.id));
  if(!dug) return false;
  return isBoundaryLayer(layerId) ? boundaryFullyDug(layerId) : true;
}

/* 길 옆 작은 노두들 렌더링 (기존 renderLayers 재정의) */
function mixColor(a, b){
  const pa = hexRGB(a), pb = hexRGB(b);
  if(!pa || !pb) return a;
  const m = pa.map((v, i) => Math.round((v + pb[i]) / 2));
  return "rgb(" + m[0] + "," + m[1] + "," + m[2] + ")";
}
function hexRGB(h){
  const m = /^#?([0-9a-f]{6})$/i.exec(String(h || "").trim());
  if(!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* --- 노두 조사창 (이 공원에서는 강가 절벽) ---
   이 노두에는 그 구역의 지층(+아래층 일부)만 드러난다. 위에 쌓인 층은 북쪽 구역의
   노두에서 본다. 오른쪽 층서 기둥에 조사한 층이 차곡차곡 채워져 전체 층서가 완성된다. */
function openOutcropModal(layerId, quiet){
  const ly = layerById(layerId);
  if(!ly) return;
  game.currentOutcrop = layerId;
  game.sites = [];
  const idx = layerData.findIndex(l => l.id === layerId);
  const below = idx > 0 ? layerData[idx - 1] : null;
  const unlocked = state.unlockedLayers.includes(layerId);
  $("outcropModalTitle").textContent = safe(ly.label, "지층 " + ly.id) + " 노두" + (unlocked ? " · " + safe(ly.hiddenName, "") : "");
  const xsec = $("outcropXsec");
  xsec.className = "xsec-wrap" + (ly.isBoundary ? " has-boundary" : "");
  xsec.innerHTML = "";
  /* 지표 (흙·풀) */
  const top = document.createElement("div");
  top.className = "xsec-soil";
  top.innerHTML = '<span>지표</span>';
  xsec.appendChild(top);
  /* 이 노두의 층 */
  const row = document.createElement("div");
  const c = safe(ly.color1, "#c8a060");
  if(!isBandedLayer(layerId)){
    row.className = "xsec-row here" + (unlocked ? " unlocked" : "");
    row.style.background =
      "repeating-linear-gradient(0deg, rgba(70,40,20,.16) 0 4px, transparent 4px 18px), " +
      "linear-gradient(" + c + ", " + c + ")";
    const name = document.createElement("div");
    name.className = "row-name";
    name.textContent = safe(ly.label, "층") + " · " + (unlocked ? safe(ly.hiddenName, "???") : "???");
    row.appendChild(name);
    renderDigSites(row, itemsOfLayer(layerId).map(i => ({ slot: i.id, itemId: i.id })));
    const tag = document.createElement("div");
    tag.className = "here-tag";
    tag.textContent = outcropDug(layerId) ? "조사 완료" : "여기!";
    row.appendChild(tag);
  }else{
    row.className = "xsec-row here banded-row" + (unlocked ? " unlocked" : "");
    renderBands(row, ly);
  }
  xsec.appendChild(row);
  /* 아래층 일부 (또는 기반암) */
  const sl = document.createElement("div");
  sl.className = "xsec-sliver";
  if(below){
    const bc = safe(below.color2, "#946746");
    sl.style.background =
      "repeating-linear-gradient(0deg, rgba(70,40,20,.2) 0 4px, transparent 4px 14px), linear-gradient(" + bc + ", " + bc + ")";
    const bDug = outcropDug(below.id);
    sl.innerHTML = '<span>' + escapeHTML(safe(below.label, "아래층")) + ' 윗부분 · ' +
      (bDug ? '남쪽 구역에서 조사함' : '남쪽 구역의 노두에서 조사') + '</span>';
  }else{
    sl.style.background = "repeating-linear-gradient(45deg, #6e6672 0 6px, #5d5661 6px 12px)";
    sl.innerHTML = '<span>기반암 · 지층이 아닌 변성암</span>';
  }
  xsec.appendChild(sl);
  /* 층서 기둥 (지층 대비) */
  renderStratColumn(layerId);
  $("outcropNote").textContent = outcropNoteText(layerId) +
    " 다른 구역의 노두도 조사해 이 층과 어떻게 이어지는지 비교해 보자.";
  if(!quiet){
    openModal("outcropModal");
    playSound("place");
  }
}
/* 층서 기둥: 위(젊음)→아래(오래됨). 조사한 층은 색이 칠해지고 현재 노두는 강조 */
function renderStratColumn(currentId){
  const col = $("outcropColumn");
  if(!col) return;
  let html = '<div class="col-title">지층 기둥</div>';
  layerData.slice().reverse().forEach(lr => {
    const dug = outcropDug(lr.id);
    const cur = lr.id === currentId;
    const c = safe(lr.color1, "#c8a060");
    html += '<div class="col-band' + (cur ? " cur" : "") + (dug ? " dug" : "") + (lr.isBoundary ? " bnd" : "") + '"' +
      ' style="' + (dug || cur ? "background:" + c + ";" : "") + '" title="' + escapeHTML(safe(lr.label, "")) + '">' +
      '<b>' + escapeHTML(safe(lr.id, "?")) + '</b>' +
      '<span>' + (dug ? escapeHTML(safe(lr.era, "")) : "?") + '</span></div>';
  });
  html += '<div class="col-base">기반암</div>';
  col.innerHTML = html;
}

/* 조사창 하단 안내 문구 */
function outcropNoteText(layerId){
  const bands = layerBands(layerId);
  if(bands){
    const next = bands.find(b => !bandAllDug(b));
    if(!next) return "이 노두의 모든 띠를 조사했다.";
    const label = next.name + (next.hint ? "(" + next.hint + ")" : "");
    if(next.index === 0) return label + "부터 조사해 보자. 변화를 차례로 살펴보기 위한 탐사 규칙이다.";
    return "이제 그 위의 " + label + "을(를) 조사한다.";
  }
  const left = itemsOfLayer(layerId).filter(i => !state.completed.includes(i.id)).length;
  return left > 0
    ? "반짝이는 곳을 눌러 화석을 발굴한다. (남은 화석 " + left + "개)"
    : "이 지층의 화석을 모두 찾았다.";
}

/* 여러 띠로 나뉜 노두 렌더링 (위→아래). 검은 경계층·긴 시간 간격 표시 포함 */
function renderBands(row, lr){
  const bands = layerBands(lr.id);
  const c1 = safe(lr.color1, "#a8845e"), c2 = safe(lr.color2, "#7c583c");
  const cb1 = safe(lr.colorBoundary1, "#2b2118"), cb2 = safe(lr.colorBoundary2, "#171009");
  boundaryBandsTopDown(bands).forEach((band, i) => {
    const idx = bands.length - 1 - i;   // 화면 위→아래 = 배열 뒤→앞
    const open = bandUnlocked(bands, idx);
    const done = bandAllDug(band);
    const el = document.createElement("div");
    el.className = "xsec-band" + (band.dark ? " is-boundary" : "") + (open ? "" : " locked");
    const a = band.dark ? cb1 : (idx % 2 ? c1 : c2), b = band.dark ? cb2 : (idx % 2 ? c1 : c2);
    el.style.background =
      "repeating-linear-gradient(0deg, rgba(70,40,20,.16) 0 4px, transparent 4px 18px), " +
      "linear-gradient(" + a + ", " + b + ")";
    const name = document.createElement("div");
    name.className = "band-name";
    name.textContent = band.name;
    el.appendChild(name);
    if(open){
      renderDigSites(el, band.slots);
      const tag = document.createElement("div");
      tag.className = done ? "band-done" : "band-turn";
      tag.textContent = done ? "완료" : "여기!";
      el.appendChild(tag);
    }else{
      const lock = document.createElement("div");
      lock.className = "band-lock";
      lock.textContent = band.lockMsg || "아래 띠를 먼저 조사해 보자.";
      lock.addEventListener("click", () => { playSound("wrong"); toast(band.lockMsg || "아래 띠를 먼저 조사해 보자."); });
      el.appendChild(lock);
    }
    row.appendChild(el);
    /* 이 띠와 아래 띠 사이의 긴 시간 간격 */
    if(band.gapNote){
      const gap = document.createElement("div");
      gap.className = "xsec-gap";
      gap.innerHTML = "<span>" + escapeHTML(band.gapNote) + "</span>";
      row.appendChild(gap);
    }
  });
}

/* 확대 조사창 안의 조사 지점 렌더링.
   slots = [{slot, itemId}] — itemId가 null이면 아무것도 나오지 않는 지점이다. */
function renderDigSites(container, slots){
  /* 지점 위치 프리셋: 층 줄(행) 안에 좌우로 배치 (모바일 터치 고려).
     지점이 4개 이상이면 프리셋으로는 서로 겹치므로 균등 배치로 바꾼다. */
  const POS = [ {l:55, t:50}, {l:74, t:50}, {l:38, t:50}, {l:64, t:50}, {l:46, t:50}, {l:82, t:50} ];
  const spread = slots.length >= 4;
  slots.forEach((sl, i) => {
    const item = sl.itemId ? itemData.find(x => x.id === sl.itemId) : null;
    /* 상태는 언제나 '이 지점을 팠는가'가 먼저다.
       같은 화석이 여러 지점에서 나오는 아래층에서, 도감 등록만으로 아직 파지 않은
       지점이 잠겨 버리면 위 띠가 영영 열리지 않는다. */
    let status;
    if(!slotDug(sl.slot))      status = "undiscovered";
    else if(!sl.itemId)        status = "empty";
    else if(state.completed.includes(sl.itemId)) status = "collected";
    else                       status = "discovered";
    const p = POS[i % POS.length];
    /* 오른쪽 끝은 '여기!/완료' 표시가 차지하므로 76%까지만 쓴다 */
    const left = spread ? (32 + (44 * i / (slots.length - 1))) : p.l;
    const site = document.createElement("div");
    site.className = "dig-site " + status;
    site.id = "spot_" + sl.slot.replace(/[^A-Za-z0-9_-]/g, "_");
    site.style.left = left + "%";
    site.style.top = p.t + "%";
    site.innerHTML =
      '<div class="socket"></div>' +
      '<div class="glint"></div>' +
      '<div class="site-item item-visual-slot"></div>' +
      '<div class="check-mark"></div>' +
      '<div class="empty-mark"></div>' +
      '<div class="dig-progress"><div class="fill"></div></div>';
    if(item){
      const slotEl = site.querySelector(".site-item");
      renderAssetImage(slotEl, item, status === "undiscovered" ? "silhouette" : "normal");
    }
    site.addEventListener("click", () => {
      if(game.digging) return;
      if(site.classList.contains("collected")) openItemModal(sl.itemId, false);
      else if(site.classList.contains("discovered")) openDiscoveryPopup(sl.itemId);
      else if(site.classList.contains("empty")) showEmptyDigResult(sl.slot, false);
      else if(site.classList.contains("undiscovered")) startDigging(sl.slot);
    });
    container.appendChild(site);
    game.sites.push({ slot: sl.slot, itemId: sl.itemId || null, x: 0, el: site, status: status });
  });
}

/* ---------- 카메라 (플레이어 추적 + 경계 clamp) ---------- */
function tryAction(){
  if(anyModalOpen()) return;
  const o = game.nearSite;
  if(!o) return;
  playSound("click");
  openOutcropModal(o.layerId);
}
/* 확대 조사창 안 반짝이는 지점 발굴 시작 */
function startDigging(siteId){
  const s = game.sites.find(x => x.slot === siteId);
  if(!s || s.status !== "undiscovered") return;
  game.digging = { siteId: siteId, progress: 0, particleT: 0 };
  s.status = "digging";
  s.el.classList.remove("undiscovered");
  s.el.classList.add("digging");
  playSound("dig");
}
function tickDigging(dt){
  const d = game.digging;
  const s = game.sites.find(x => x.slot === d.siteId);
  if(!s){ game.digging = null; return; }
  d.progress += dt * 55;   // 약 1.8초에 완료
  d.particleT -= dt;
  if(d.particleT <= 0){
    spawnDigParticles(s.el, 3);
    playSound("dig");
    d.particleT = 0.3;
  }
  const fill = s.el.querySelector(".dig-progress .fill");
  if(fill) fill.style.width = clamp(d.progress, 0, 100) + "%";
  if(d.progress >= 100){
    game.digging = null;
    completeDigging(d.siteId);
  }
}
function spawnDigParticles(siteEl, n){
  if(game.reducedMotion) return;
  for(let i=0;i<n;i++){
    const p = document.createElement("div");
    p.className = "dig-particle";
    p.style.left = (30 + Math.random()*24) + "px";
    p.style.top = (40 + Math.random()*20) + "px";
    p.style.setProperty("--dx", (Math.random()*70 - 35) + "px");
    p.style.setProperty("--dy", (-40 - Math.random()*50) + "px");
    p.style.background = Math.random() < 0.5 ? "#c9a468" : "#8a6242";
    siteEl.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}
function completeDigging(siteId){
  const s = game.sites.find(x => x.slot === siteId);
  if(!s) return;
  if(!slotDug(siteId)){
    state.dugSlots.push(siteId);
    saveState();
  }
  s.el.classList.remove("digging");

  /* --- 아무것도 나오지 않는 지점 (경계 노두 위층) --- */
  if(!s.itemId){
    s.status = "empty";
    s.el.classList.add("empty");
    playSound("wrong");
    updateHud();
    refreshOutcropModal();
    setTimeout(() => showEmptyDigResult(siteId, true), 300);
    return;
  }

  const item = itemData.find(i => i.id === s.itemId);
  if(!item) return;
  s.status = "discovered";
  s.el.classList.add("discovered");
  renderAssetImage(s.el.querySelector(".site-item"), item, "normal");
  const firstTime = !state.discovered.includes(item.id);
  if(firstTime){
    state.discovered.push(item.id);
    state.score = safe(state.score,0) + 10;
    saveState();
  }
  playSound("found");
  cameraShake();
  updateHud();
  checkBadges();
  maybeParkComplete(); /* 노두 6/6 조사 완료 연출 */
  refreshOutcropModal();
  /* 경계층에서 처음 증거를 찾았을 때: 화석이 아니라는 것을 먼저 각인시킨다 */
  if(item.isEvidence && !state.evidenceCinematicShown){
    state.evidenceCinematicShown = true;
    saveState();
    setTimeout(() => showEvidenceCinematic(item.id), 350);
    return;
  }
  if(!firstTime){
    /* 같은 화석이 또 나온 경우: 도감 등록은 1회지만 '풍부하다'는 인상은 남긴다 */
    setTimeout(() => toast("또 「" + itemDisplayName(item) + "」이(가) 나왔다. 이 층에는 화석이 많다."), 250);
    return;
  }
  setTimeout(() => openDiscoveryPopup(s.itemId), 350);
}

/* 조사창이 열려 있으면 잠금·완료 표시를 갱신한다 */
function refreshOutcropModal(){
  const m = $("outcropModal");
  if(!m || !m.classList.contains("on") || !game.currentOutcrop) return;
  const layerId = game.currentOutcrop;
  /* 열린 채로 다시 그리면 발굴 애니메이션 중 깜빡이므로, 띠가 있는 노두일 때만 갱신 */
  if(isBandedLayer(layerId)){
    const card = m.querySelector(".modal-card");
    const scroll = card ? card.scrollTop : 0;
    openOutcropModal(layerId, true);   // 소리·팝업 없이 내용만 다시 그림
    const card2 = m.querySelector(".modal-card");
    if(card2) card2.scrollTop = scroll;
  }else{
    $("outcropNote").textContent = outcropNoteText(layerId);
  }
}

/* 위층 빈손 결과 */
function showEmptyDigResult(slot, isNew){
  const layerId = String(slot).split("#")[0];
  const bands = layerBands(layerId) || [];
  const band = bands.find(b => b.slots.some(x => x.slot === slot)) || bands[bands.length - 1];
  const dugCount = band ? band.slots.filter(s => slotDug(s.slot)).length : 0;
  const total = band ? band.slots.length : 0;
  const allEmpty = total > 0 && dugCount >= total;
  const KEY_Q = "이 층에서는 화석이 거의 발견되지 않는다. 아래층과 무엇이 달라진 걸까?";
  /* 위층을 모두 파고 나서야 핵심 질문을 던진다. 토스트는 사라지므로 결과창에도 같은 문장을 남긴다. */
  $("emptyDigNote").textContent = allEmpty
    ? KEY_Q
    : "이 지점에서는 화석이 나오지 않았다. (" + (band ? band.name : "위층") + " " + dugCount + "/" + total + " 지점 조사)";
  openModal("emptyDigModal");
  if(isNew && allEmpty){
    setTimeout(() => toast(KEY_Q), 900);
  }
}

/* 경계층 첫 증거 발견 연출 */
function showEvidenceCinematic(itemId){
  const item = itemData.find(i => i.id === itemId);
  $("cinematicTitle").textContent = "화석이 아니다.";
  $("cinematicSub").textContent = "경계층에는 화석 대신 지층이 쌓일 당시의 사건이 남긴 흔적이 있다.";
  const btn = $("btnCinematicGo");
  const prevText = btn.textContent;
  btn.textContent = "증거를 살펴본다";
  btn.onclick = () => {
    $("cinematicOverlay").classList.remove("on");
    btn.onclick = defaultCinematicGo;
    btn.textContent = prevText;
    openDiscoveryPopup(itemId);
  };
  openCinematic();
  playSound("place");
  cameraShake();
}

/* ---------- 발견 팝업 → 관찰 모달 → 퀴즈 ---------- */
let currentItemId = null;
function openDiscoveryPopup(itemId){
  const item = itemData.find(i => i.id === itemId);
  if(!item) return;
  currentItemId = itemId;
  renderAssetImage($("discoveryVisual"), item, "normal");
  $("discoveryName").textContent = itemDisplayName(item);
  $("discoveryHint").textContent = safe(item.visualHint, "");
  openModal("discoveryModal");
  spawnConfetti();
}
function spawnConfetti(){
  if(game.reducedMotion) return;
  const colors = ["#ff8c42","#2ea79c","#ffd166","#e05a7a","#4a90d9"];
  const zone = document.body;
  for(let i=0;i<18;i++){
    const c = document.createElement("div");
    c.className = "confetti-burst";
    c.style.left = (window.innerWidth/2 + (Math.random()*160-80)) + "px";
    c.style.top = (window.innerHeight*0.28) + "px";
    c.style.background = colors[i % colors.length];
    c.style.setProperty("--cx", (Math.random()*260-130) + "px");
    c.style.setProperty("--cy", (140 + Math.random()*200) + "px");
    zone.appendChild(c);
    setTimeout(() => c.remove(), 1400);
  }
}

/* 아이템 관찰 모달: 발견 전/후, 퀴즈 완료 전/후 정보 공개 범위가 다름 */
function openItemModal(itemId, fromCollection){
  const item = itemData.find(i => i.id === itemId);
  if(!item) return;
  currentItemId = itemId;
  const done = state.completed.includes(itemId);
  const found = state.discovered.includes(itemId) || done;
  $("itemModalTitle").textContent = found ? (itemDisplayName(item) + " 관찰") : "미발견 단서";
  renderAssetImage($("itemModalVisual"), item, found ? "normal" : "silhouette");
  const layer = layerData.find(l => l.id === item.layer);
  const rows = [];
  rows.push(row("발견 지층", found ? (safe(layer && layer.label, "?") + (item.band ? " · " + bandNameOf(item) : "")) : "???", !found));
  rows.push(row("관찰 포인트", found ? safe(item.visualHint,"-") : "발굴하면 관찰할 수 있어요.", !found));
  rows.push(row("분류", done ? safe(item.group,"-") : "퀴즈를 풀면 해금", !done));
  rows.push(row("시대", done ? safe(item.hiddenInfo1,"-") : "???", !done));
  rows.push(row("환경", done ? safe(item.hiddenInfo2,"-") : "???", !done));
  rows.push(row("설명", done ? safe(item.description,"-") : "퀴즈를 풀어 정보를 해금한다.", !done));
  if(done) rows.push(row("한 줄 메모", safe(item.funNote,"-"), false));
  $("itemModalInfo").innerHTML = rows.join("");
  const actions = $("itemModalActions");
  actions.innerHTML = "";
  if(found && !done){
    const hasQuiz = Array.isArray(item.quiz) && item.quiz.length > 0;
    const b = document.createElement("button");
    b.className = "btn";
    b.innerHTML = hasQuiz ? iconSVG("brain") + " 단서 해석 퀴즈" : iconSVG("book") + " 탐사 도감에 등록";
    b.addEventListener("click", () => {
      playSound("click");
      closeModal("itemModal");
      if(hasQuiz) startQuiz(itemId);
      else completeItem(itemId);
    });
    actions.appendChild(b);
  }
  const c = document.createElement("button");
  c.className = "btn ghost small";
  c.textContent = "닫기";
  c.addEventListener("click", () => { playSound("click"); closeModal("itemModal"); });
  actions.appendChild(c);
  openModal("itemModal");
  function row(label, value, locked){
    return '<div class="info-row"><div class="info-label">' + escapeHTML(label) + '</div>' +
           '<div class="info-value' + (locked ? " locked" : "") + '">' + escapeHTML(value) + '</div></div>';
  }
}

/* ---------- 퀴즈 시스템 ----------
   아이템에 딸린 문항과 최종 미션 마무리 문항이 같은 화면을 쓴다.
   quiz.list / quiz.heading / quiz.finishLabel / quiz.onFinish 로 구분한다. */
const quiz = { itemId: null, index: 0, attempts: 0, solvedInModal: 0,
               list: null, heading: "", finishLabel: "", onFinish: null };

/* 아이템이 속한 띠 이름 */
function bandNameOf(item){
  const ly = layerById(item && item.layer);
  const b = ly && Array.isArray(ly.bands) ? ly.bands.find(x => x.key === item.band) : null;
  return b ? safe(b.name, "") : "";
}
