/* ==========================================================================
   UI: 도트 아이콘 · 대화창 · 구역 배너 · 토스트 · 화면 전환 · 입력 · 초기화
   ========================================================================== */
"use strict";

/* ---------- 도트 아이콘 (이모지 대신) ---------- */
const ICON_PAL = { o:"#2b1d15", y:"#ffd166", Y:"#e0a32e", w:"#fff8e6", t:"#3ec6b5", T:"#1d9184", r:"#c94c3d", b:"#7ec2e4", B:"#3f7fb5", g:"#8ad07a", n:"#8a6a3a", p:"#c98bb8" };
const ICON_MAPS = {
  star: ["....o....", "...oyo...", "...oyo...", "oooyyyooo", "oyyyyyyyo", ".oyyyyyo.", "..oyyyo..", ".oyyoyyo.", "oo.....oo"],
  pick: ["...oooo..", "..oyyyyo.", ".oyoooyo.", "oyo...oyo", "oo.oo..oo", "...ono...", "..ono....", ".ono.....", "oo......."],
  bone: ["oo.....oo", "owo...owo", ".owoooowo", "..owwwwo.", "..owwwwo.", ".owoooowo", "owo...owo", "oo.....oo", "........."],
  book: ["ooooooooo", "otttottto", "otwtotwto", "otttottto", "otwtotwto", "otttottto", "otwtotwto", "oTTToTTTo", "ooooooooo"],
  home: ["....o....", "...oro...", "..orrro..", ".orrrrro.", "oooooooo.", ".owwwwwo.", ".owoowwo.", ".owoowwo.", ".ooooooo."],
  sound: ["....oo...", "...owo...", "ooowwo.o.", "owwwwo.o.", "owwwwo.o.", "ooowwo.o.", "...owo...", "....oo...", "........."],
  mute: ["....oo...", "...owo...", "ooowwo...", "owwwwo.o.", "owwwwoo.o", "ooowwo.o.", "...owo...", "....oo...", "........."],
  medal: [".oo...oo.", ".oro.oro.", "..orooro.", "...ooo...", "..oyyyo..", ".oyywyyo.", ".oyywyyo.", "..oyyyo..", "...ooo..."],
  lens: ["..oooo...", ".obbbbo..", "obwbbbbo.", "obbbbbbo.", "obbbbbbo.", ".obbbbo..", "..oooono.", "......ono", ".......oo"],
  map: ["ooooooooo", "ogggobbbo", "oggggbbbo", "onnnoggoo", "onnnggggo", "oppppgggo", "opppppggo", "opppppggo", "ooooooooo"],
  flag: ["oo.......", "orrrrro..", "orwwrrro.", "orrrrrro.", "orrrrro..", "oo.......", "oo.......", "oo.......", "oo......."],
  check: [".......oo", "......oto", ".....oto.", "oo..oto..", "oto.oto..", ".otooto..", "..otto...", "...oo....", "........."],
  lock: ["...ooo...", "..oYYYo..", "..oY.Yo..", ".ooooooo.", ".oyyyyyo.", ".oyyoyyo.", ".oyyoyyo.", ".oyyyyyo.", ".ooooooo."],
  back: ["...o.....", "..oo.....", ".owoooooo", "owwwwwwwo", ".owoooooo", "..oo.....", "...o.....", ".........", "........."],
  next: [".....o...", ".....oo..", "ooooooowo", "owwwwwwwo", "ooooooowo", ".....oo..", ".....o...", ".........", "........."],
  brain: ["..ooooo..", ".oppppo..", "opwppppo.", "opppwppo.", "oppppppo.", ".opppppo.", "..opppo..", "...ooo...", "........."],
  report: [".ooooooo.", ".owwwwwo.", ".owoowwo.", ".owwwwwo.", ".owooowo.", ".owwwwwo.", ".owooowo.", ".owwwwwo.", ".ooooooo."],
  clock: ["..ooooo..", ".owwwwwo.", "owwwowwwo", "owwwowwwo", "owwwoooooo".slice(0,9), "owwwwwwwo", ".owwwwwo.", "..ooooo..", "........."],
  reset: ["..oooo...", ".owwwwo..", "owo..owo.", "oo...oww.", ".....owwo", "oo...owwo", "owo..owo.", ".owwwwo..", "..oooo..."],
  meteor: ["......oo.", ".....orro", "....orro.", "...oyyo..", "..oyyyo..", ".oyyyyo..", ".oyyyoo..", "..ooo....", "........."],
  volcano: ["....r....", "...rrr...", "..oooo...", "..onno...", ".onnnno..", ".onnnnno.", "onnnnnnno", "onnnnnnno", "ooooooooo"],
  thermo: ["...ooo...", "..owwo...", "..owwo...", "..orwo...", "..orro...", ".orrrro..", ".orrrro..", "..orro...", "...oo...."],
  wave: [".........", "..oo..oo.", ".obbo.obb", "obbbbobbo", "bbbbbbbbb", ".........", "..oo..oo.", ".obbo.obb", "obbbbobbo"],
  talk: ["ooooooo..", "owwwwwo..", "owowowo..", "owwwwwo..", "ooooooo..", "..oo.....", "..o......", ".........", "........."],
  fossil: ["...ooo...", "..opppo..", ".opwppo..", ".oppoppo.", ".oppoppo.", ".oppppo..", "..oppo...", "...oo....", "........."]
};
function iconSVG(name, cls){
  const rows = ICON_MAPS[name];
  if(!rows) return "";
  return pixelSVG(rows, ICON_PAL, "ico-svg" + (cls ? " " + cls : ""));
}
function applyIcons(root){
  (root || document).querySelectorAll("[data-icon]").forEach(el => {
    if(el.getAttribute("data-icon-done")) return;
    el.innerHTML = iconSVG(el.getAttribute("data-icon"));
    el.setAttribute("data-icon-done", "1");
  });
}
/* 배지 id → 아이콘 (데이터의 icon 필드는 예비용) */
const BADGE_ICONS = { first_find: "lens", rookie: "pick", collector: "book", layer_reader: "map", evidence_hunter: "fossil", strat_restorer: "flag", perfect: "medal" };
function badgeIcon(b){ return iconSVG(BADGE_ICONS[b.id] || "medal"); }

/* ---------- 화면 전환 ---------- */
function renderScreen(name){
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const el = $(name);
  if(el) el.classList.add("active");
  game.running = (name === "gameScreen");
  if(name === "startScreen"){ renderStartProgress(); titleStart(); bgmStart(); }
  else { titleStop(); bgmStop(); }
  if(name === "gameScreen"){ enterWorld(); }
}
/* 지층을 파고 내려가는 와이프 전환: 땅이 아래에서 올라와 화면을 덮고, 위로 빠져나간다 */
function wipeTo(name, after){
  const w = $("screenWipe");
  if(!w || game.reducedMotion){ renderScreen(name); if(after) after(); return; }
  w.classList.remove("exit");
  void w.offsetWidth;
  w.classList.add("rise");
  setTimeout(() => {
    renderScreen(name);
    w.classList.remove("rise");
    w.classList.add("exit");
    setTimeout(() => { w.classList.remove("exit"); if(after) after(); }, 520);
  }, 520);
}
/* 와이프 배경: 젊은 층(F)이 위, 오래된 층(A)이 아래 — 하드 스톱 띠 */
function buildWipeBackground(){
  const w = $("screenWipe");
  if(!w) return;
  const layers = layerData.slice().reverse();
  const stops = ["#8cc063 0 5%", "#3a2a1c 5% 5.6%"];
  const share = (100 - 5.6) / Math.max(1, layers.length);
  layers.forEach((ly, i) => {
    const a = 5.6 + i * share, b = a + share;
    stops.push(safe(ly.color1, "#c8a060") + " " + a + "% " + (a + share * 0.55) + "%");
    stops.push(safe(ly.color2, "#946746") + " " + (a + share * 0.55) + "% " + (b - 0.5) + "%");
    stops.push("#3a2a1c " + (b - 0.5) + "% " + b + "%");
  });
  w.style.background = "linear-gradient(" + stops.join(", ") + ")";
}
/* 소리 켜기/끄기 (시작 화면·게임 HUD 버튼 공용) */
function setSoundOn(v){
  game.soundOn = !!v;
  ["btnSound", "btnSoundTitle"].forEach(id => { const b = $(id); if(b) b.innerHTML = iconSVG(game.soundOn ? "sound" : "mute"); });
  if(game.soundOn){
    playSound("click");
    if($("startScreen").classList.contains("active")) bgmStart();
  }else{
    bgmStop();
  }
}
function closeModal(id){ const m = $(id); if(m) m.classList.remove("on"); }
function openModal(id){ const m = $(id); if(m) m.classList.add("on"); applyIcons(m); }
function anyModalOpen(){
  return !!document.querySelector(".modal-backdrop.on") ||
         $("cinematicOverlay").classList.contains("on") ||
         $("dialogBox").classList.contains("on");
}

/* ---------- 대화창 (RPG식) ---------- */
const dialog = { lines: [], idx: 0, onDone: null };
function openDialog(name, lines, onDone){
  dialog.lines = Array.isArray(lines) && lines.length ? lines.slice() : [""];
  dialog.idx = 0;
  dialog.onDone = onDone || null;
  $("dialogName").textContent = name || "";
  $("dialogBox").classList.add("on");
  game.input.left = game.input.right = game.input.up = game.input.down = false;
  renderDialogLine();
}
function renderDialogLine(){
  $("dialogText").textContent = dialog.lines[dialog.idx] || "";
  $("dialogMore").textContent = dialog.idx < dialog.lines.length - 1 ? "▼ 다음" : "닫기";
}
function advanceDialog(){
  if(dialog.idx < dialog.lines.length - 1){ dialog.idx++; renderDialogLine(); playSound("click"); return; }
  $("dialogBox").classList.remove("on");
  const cb = dialog.onDone; dialog.onDone = null;
  if(typeof cb === "function") cb();
}

/* ---------- 구역 배너 ---------- */
let zoneBannerTimer = null;
function showZoneBanner(z){
  const el = $("zoneBanner");
  if(!el || !z) return;
  const ly = layerById(z.layer);
  $("zoneBannerName").textContent = z.name;
  $("zoneBannerSub").textContent = (ly ? safe(ly.label, "") + " · " : "") + safe(z.sub, "");
  el.classList.add("on");
  clearTimeout(zoneBannerTimer);
  zoneBannerTimer = setTimeout(() => el.classList.remove("on"), 2400);
}

/* ---------- 토스트 (한 줄 메시지, 최대 2개) ---------- */
function toast(msg, kind){
  const zone = $("toastZone");
  if(!zone) return;
  const t = document.createElement("div");
  t.className = "toast" + (kind ? " " + kind : "");
  t.textContent = msg;
  zone.appendChild(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 300); }, 2800);
  while(zone.children.length > 2) zone.firstChild.remove();
}

/* ---------- 시작 화면 ---------- */
function renderStartProgress(){
  const total = itemData.length;
  const allDone = total > 0 && state.completed.length >= total;
  /* 처음부터 다시 시작: 지울 진행 상황이 있을 때만 활성 */
  const restart = $("btnRestart");
  if(restart) restart.disabled = !(state.startedAt || state.discovered.length > 0 || state.completed.length > 0);
  const hero = $("startHero");
  if(hero){
    hero.innerHTML = heroSVG({ crown: allDone });
    hero.classList.toggle("crown", allDone);
  }
  const nick = $("nickInput");
  if(nick && document.activeElement !== nick) nick.value = safe(state.nickname, "");
  const cont = $("btnStart");
  if(cont) cont.textContent = (state.discovered.length > 0 || state.startedAt) ? "탐사 계속하기" : "탐사 시작";
}
/* 카드 위 탐사대원의 말풍선 (닉네임을 적으면 반응한다) */
let heroTimer = null;
function heroSay(msg, hop){
  const b = $("heroBubble"), h = $("startHero");
  if(b){
    b.textContent = msg;
    b.classList.add("on");
    clearTimeout(heroTimer);
    heroTimer = setTimeout(() => b.classList.remove("on"), 2600);
  }
  if(hop && h && !game.reducedMotion && !h.classList.contains("hop")){
    h.classList.add("hop");
    setTimeout(() => h.classList.remove("hop"), 480);
  }
}
function heroGreeting(){
  const nm = (state.nickname || "").trim();
  if(!nm) return "탐사대원, 이름을 알려줘!";
  if(itemData.length && state.completed.length >= itemData.length) return nm + " 대원, 전설의 탐정이군!";
  return nm + " 대원, 준비됐어?";
}
function renderHelpMissions(){
  const card = $("helpMissionCard");
  if(!card) return;
  let bonus = "";
  (missionData.bonus || []).forEach(b => { bonus += "<li>" + escapeHTML(b) + "</li>"; });
  card.innerHTML =
    '<h3><i data-icon="flag"></i> 메인 미션</h3>' +
    '<p class="mission-main">' + escapeHTML(safe(missionData.main, "")) + '</p>' +
    '<h3><i data-icon="star"></i> 보너스 미션</h3>' +
    '<ul class="mission-list">' + bonus + '</ul>';
  applyIcons(card);
  renderNoteCards($("helpNoteCard"));
}
function renderNoteCards(container){
  if(!container) return;
  let cards = "";
  (noteData || []).forEach(n => {
    cards += '<div class="note-card"><b>' + escapeHTML(safe(n.title, "")) + '</b>' +
      '<div>' + escapeHTML(safe(n.body, "")) + '</div></div>';
  });
  container.innerHTML = '<h3><i data-icon="book"></i> 탐사 노트</h3>' + cards;
  applyIcons(container);
}

/* ---------- 입력 ---------- */
function bindInputs(){
  window.addEventListener("keydown", e => {
    if(e.repeat) return ensureAudioOnce();
    ensureAudioOnce();
    if(!game.running) return;
    if($("dialogBox").classList.contains("on")){
      if(e.key === "e" || e.key === "E" || e.key === " " || e.key === "Enter"){ e.preventDefault(); advanceDialog(); }
      return;
    }
    if(anyModalOpen()) return;
    if(e.key === "ArrowLeft" || e.key === "a" || e.key === "A") game.input.left = true;
    if(e.key === "ArrowRight" || e.key === "d" || e.key === "D") game.input.right = true;
    if(e.key === "ArrowUp" || e.key === "w" || e.key === "W") game.input.up = true;
    if(e.key === "ArrowDown" || e.key === "s" || e.key === "S") game.input.down = true;
    if(e.key === "e" || e.key === "E" || e.key === " "){ e.preventDefault(); tryAction(); }
    if(e.key === "m" || e.key === "M"){ $("btnCollectionHud").click(); }
  });
  window.addEventListener("keyup", e => {
    if(e.key === "ArrowLeft" || e.key === "a" || e.key === "A") game.input.left = false;
    if(e.key === "ArrowRight" || e.key === "d" || e.key === "D") game.input.right = false;
    if(e.key === "ArrowUp" || e.key === "w" || e.key === "W") game.input.up = false;
    if(e.key === "ArrowDown" || e.key === "s" || e.key === "S") game.input.down = false;
  });
  bindHold($("btnLeft"), v => game.input.left = v);
  bindHold($("btnRight"), v => game.input.right = v);
  bindHold($("btnUp"), v => game.input.up = v);
  bindHold($("btnDown"), v => game.input.down = v);
  $("btnAction").addEventListener("click", () => {
    ensureAudioOnce();
    if($("dialogBox").classList.contains("on")){ advanceDialog(); return; }
    tryAction();
  });
  $("dialogBox").addEventListener("click", advanceDialog);
  ["pointerdown", "touchstart"].forEach(ev => window.addEventListener(ev, ensureAudioOnce, { passive: true }));
}
let audioReady = false;
function ensureAudioOnce(){
  if(audioReady){ ensureAudio(); }
  else { audioReady = true; ensureAudio(); }
  /* 브라우저는 첫 입력 뒤에야 소리를 허용한다 — 시작 화면이면 이때 배경음을 튼다 */
  if($("startScreen").classList.contains("active")) bgmStart();
}
function bindHold(el, setter){
  if(!el) return;
  const on = e => { e.preventDefault(); ensureAudioOnce(); setter(true); };
  const off = e => { e.preventDefault(); setter(false); };
  el.addEventListener("pointerdown", on);
  el.addEventListener("pointerup", off);
  el.addEventListener("pointerleave", off);
  el.addEventListener("pointercancel", off);
  el.addEventListener("contextmenu", e => e.preventDefault());
}

/* ---------- UI 이벤트 ---------- */
function bindUI(){
  const nickEl = $("nickInput");
  if(nickEl){
    nickEl.addEventListener("input", () => {
      state.nickname = nickEl.value.replace(/\s+/g, " ").slice(0, 12);
      saveState();
      heroSay(heroGreeting(), true);
    });
    nickEl.addEventListener("focus", () => heroSay(heroGreeting(), false));
    nickEl.addEventListener("keydown", e => { if(e.key === "Enter") $("btnStart").click(); });
  }
  $("btnStart").addEventListener("click", () => {
    const nm = (nickEl ? nickEl.value : state.nickname || "").trim();
    if(!nm){
      toast("먼저 탐사대원 닉네임을 입력하세요. (실명은 쓰지 않습니다)");
      heroSay("이름이 없으면 출발할 수 없어!", true);
      if(nickEl){ nickEl.focus(); nickEl.classList.add("shake-x"); setTimeout(() => nickEl.classList.remove("shake-x"), 600); }
      return;
    }
    state.nickname = nm.slice(0, 12);
    const firstRun = !state.startedAt;
    if(!state.startedAt) state.startedAt = new Date().toLocaleString();
    saveState();
    playSound("dig");
    wipeTo("gameScreen", () => {
      if(firstRun){
        setTimeout(() => openDialog("탐사 시작", [
          state.nickname + " 탐사대원, 지질공원에 도착했다.",
          "먼저 입구의 해설사에게 말을 걸어 보자. (가까이 가서 E 또는 클릭)"
        ]), 300);
      }
    });
  });
  const sndT = $("btnSoundTitle");
  if(sndT) sndT.addEventListener("click", () => { ensureAudioOnce(); setSoundOn(!game.soundOn); });
  $("btnHelp").addEventListener("click", () => { playSound("click"); renderHelpMissions(); renderScreen("helpScreen"); });
  $("btnCollectionFromStart").addEventListener("click", () => {
    playSound("click"); collectionReturnTo = "startScreen"; renderCollection(); renderScreen("collectionScreen");
  });
  $("btnCollectionHud").addEventListener("click", () => {
    playSound("click"); collectionReturnTo = "gameScreen"; renderCollection(); renderScreen("collectionScreen");
  });
  $("btnCollectionBack").addEventListener("click", () => { playSound("click"); renderScreen(collectionReturnTo); });
  $("btnHome").addEventListener("click", () => { playSound("click"); saveState(); renderScreen("startScreen"); });
  $("btnSound").addEventListener("click", () => setSoundOn(!game.soundOn));
  $("btnCinematicGo").onclick = defaultCinematicGo;
  $("btnOutcropLayerInfo").addEventListener("click", () => {
    playSound("click");
    if(game.currentOutcrop) openLayerModal(game.currentOutcrop);
  });
  $("btnObserve").addEventListener("click", () => {
    playSound("click"); closeModal("discoveryModal"); openItemModal(currentItemId, false);
  });
  document.querySelectorAll("[data-goto]").forEach(b => {
    b.addEventListener("click", () => { playSound("click"); renderScreen(b.getAttribute("data-goto")); });
  });
  document.querySelectorAll("[data-close]").forEach(b => {
    b.addEventListener("click", () => { playSound("click"); closeModal(b.getAttribute("data-close")); });
  });
  $("btnRestart").addEventListener("click", () => {
    if(!confirm("저장된 진행 상황을 지우고 처음부터 시작할까요?")) return;
    playSound("click");
    resetProgress();
    game.player.placed = false;
    renderScreen("startScreen");
    toast("새 탐사를 시작할 준비가 되었다.");
  });
  $("btnResultFromCollection").addEventListener("click", () => { playSound("click"); openResultScreen(); });
  $("btnResultBack").addEventListener("click", () => { playSound("click"); renderScreen("startScreen"); });
  $("btnSaveReport").addEventListener("click", () => { playSound("click"); saveReport(); });
  $("btnResultCollection").addEventListener("click", () => {
    playSound("click"); collectionReturnTo = "resultScreen"; renderCollection(); renderScreen("collectionScreen");
  });
  $("btnRetry").addEventListener("click", () => {
    if(!confirm("저장된 진행 상황을 지우고 처음부터 시작할까요?")) return;
    playSound("click");
    resetProgress();
    game.player.placed = false;
    renderScreen("startScreen");
  });
  ["itemModal", "layerModal", "badgeModal", "outcropModal", "emptyDigModal"].forEach(id => {
    $(id).addEventListener("click", e => { if(e.target === $(id)) closeModal(id); });
  });
  /* 지질도 범례 (지층 기호만 표시 — 시대는 추리 대상이므로 쓰지 않는다) */
  const lg = $("miniLegend");
  if(lg){
    lg.innerHTML = Object.keys(GEO_COLORS).map(k =>
      '<span><i style="background:' + GEO_COLORS[k] + '"></i>' + escapeHTML("지층 " + k) + '</span>').join("");
  }
}

/* ---------- 초기화 ---------- */
function initGame(){
  game.reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  game.smallScreen = window.innerWidth < 760;
  window.addEventListener("resize", () => { game.smallScreen = window.innerWidth < 760; });
  try{
    if(/[?&]reset=1/.test(location.search)){
      localStorage.removeItem(SAVE_KEY);
      if(history.replaceState) history.replaceState(null, "", location.pathname);
    }
  }catch(e){ }
  try{ localStorage.removeItem("stratumExplorer_teacherData_v2"); localStorage.removeItem("stratumExplorer_teacherData_v1"); }catch(e){ }
  loadState();
  validateContentData();
  applyIcons(document);
  buildWipeBackground();
  bindUI();
  bindInputs();
  renderStartProgress();
  renderHelpMissions();
  updateHud();
  renderScreen("startScreen");
  requestAnimationFrame(gameLoop);
}
document.addEventListener("DOMContentLoaded", initGame);
