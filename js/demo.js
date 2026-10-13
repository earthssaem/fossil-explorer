/* ==========================================================================
   교사 시연 모드 (학회·연수 발표용)
   시작 화면 오른쪽 아래 「교사 시연」 → 비밀번호(DEMO_PASSWORD) → 시연 패널.
   · 진행 상태 바로 가기 : 처음 상태 / 노두 n곳까지 조사 완료 / 최종 미션 완료 상태를 즉시 만든다
   · 순간이동            : 입구 · 노두 A~F 앞 · 전망대로 바로 간다 (진행은 그대로)
   · 시연 옵션           : 즉시 발굴 · 퀴즈 정답 표시 · 관문 모두 열기 · 빠른 걷기
   · 최종 미션 1단계 완료 처리 (2단계 지층 대비부터 보여 줄 때)
   시연 진행은 학생 진행과 따로(DEMO_SAVE_KEY) 저장되므로, 시연을 끝내면 이 기기의 학생 기록이 그대로 돌아온다.
   시연 모드가 켜져 있다는 사실은 이 탭(sessionStorage)에만 남는다 — 발표 중 새로고침해도 유지되고,
   다른 탭이나 다음 수업(새 창)에서는 자동으로 꺼져 있다.
   ========================================================================== */
"use strict";

/* ★ 교사 시연 모드 비밀번호 — 바꾸려면 이 줄만 고친다 */
const DEMO_PASSWORD = "2026";
const DEMO_FLAG_KEY = "stratumExplorer_demo_on";   // sessionStorage: 이 탭에서 시연 모드가 켜져 있는지 + 옵션
const DEMO_NICK = "시연";                           // 시연 진행의 탐사대원 이름 (보고서에 표시)

/* 시연 옵션 (패널에서 켜고 끈다. 이 탭에서는 새로고침해도 유지) */
const demoOpts = { fastDig: true, showAnswer: true, openGates: false, fastWalk: false };
const DEMO_OPT_LIST = [
  { key: "fastDig",    name: "즉시 발굴",      desc: "반짝이는 지점을 누르면 바로 발굴이 끝난다." },
  { key: "showAnswer", name: "퀴즈 정답 표시", desc: "퀴즈 보기 중 정답에 노란 테두리가 붙는다. (청중에게도 보이므로 설명하고 쓰기)" },
  { key: "openGates",  name: "관문 모두 열기", desc: "조사하지 않은 구역의 계단도 열려 자유롭게 다닌다." },
  { key: "fastWalk",   name: "빠른 걷기",      desc: "걷는 속도가 2배가 된다." }
];

/* ---------- 게임 코드가 호출하는 훅 (시연 모드가 꺼져 있으면 아무 영향이 없다) ---------- */
function demoDigSpeed(){ return game.demo && demoOpts.fastDig ? 700 : 0; }      // dig.js: 발굴 진행 속도 (0 = 기본)
function demoGatesOpen(){ return !!(game.demo && demoOpts.openGates); }           // map.js: 관문 열림 강제
function demoWalkSpeed(){ return game.demo && demoOpts.fastWalk ? 2 : 1; }       // map.js: 걷기 속도 배율
function demoMarkAnswer(q, choices, box){                                        // quiz.js: 정답 보기 표시
  if(!game.demo || !demoOpts.showAnswer || !q || !box) return;
  const i = (choices || []).findIndex(c => String(c) === String(safe(q.answer, "")));
  const b = i >= 0 ? box.children[i] : null;
  if(b){ b.classList.add("demo-answer"); b.title = "정답 (교사 시연 표시)"; }
}

/* ---------- 이 탭의 시연 상태 기억 ---------- */
function demoSaveFlag(){
  try{
    if(game.demo) sessionStorage.setItem(DEMO_FLAG_KEY, JSON.stringify(demoOpts));
    else sessionStorage.removeItem(DEMO_FLAG_KEY);
  }catch(e){ }
}
function demoReadFlag(){
  try{
    const raw = sessionStorage.getItem(DEMO_FLAG_KEY);
    if(!raw) return false;
    const o = JSON.parse(raw);
    if(o && typeof o === "object") Object.keys(demoOpts).forEach(k => { if(typeof o[k] === "boolean") demoOpts[k] = o[k]; });
    return true;
  }catch(e){ return false; }
}

/* ---------- 초기화 (ui.js initGame에서 호출) ---------- */
function demoInit(){
  const entry = $("btnDemo");
  if(entry) entry.addEventListener("click", () => {
    ensureAudioOnce(); playSound("click");
    if(game.demo) demoOpenPanel(); else demoAskPassword();
  });
  const hud = $("btnDemoHud");
  if(hud) hud.addEventListener("click", () => { playSound("click"); demoOpenPanel(); });
  const form = $("demoPassForm");
  if(form) form.addEventListener("submit", e => { e.preventDefault(); demoCheckPassword(); });
  /* 단축키 ` (Tab 키 위, 물결표 자리): 시연 중 어느 화면에서나 패널을 열고 닫는다 */
  window.addEventListener("keydown", e => {
    if(!game.demo || e.code !== "Backquote" || e.repeat) return;
    const tag = document.activeElement ? document.activeElement.tagName : "";
    if(tag === "INPUT" || tag === "TEXTAREA") return;
    e.preventDefault();
    if($("demoModal").classList.contains("on")) closeModal("demoModal"); else demoOpenPanel();
  });
  if(demoReadFlag()) demoEnter(true);
  demoRefreshUI();
}

/* ---------- 비밀번호 ---------- */
function demoAskPassword(){
  const inp = $("demoPassInput"), msg = $("demoPassMsg");
  if(inp) inp.value = "";
  if(msg) msg.textContent = "";
  openModal("demoPassModal");
  setTimeout(() => { if(inp) inp.focus(); }, 30);
}
function demoCheckPassword(){
  const inp = $("demoPassInput"), msg = $("demoPassMsg");
  const v = (inp ? inp.value : "").trim();
  if(v === DEMO_PASSWORD){
    playSound("register");
    closeModal("demoPassModal");
    demoEnter(false);
    demoOpenPanel();
    return;
  }
  playSound("wrong");
  if(msg) msg.textContent = "비밀번호가 맞지 않습니다.";
  if(inp){
    inp.value = "";
    inp.classList.add("shake-x");
    setTimeout(() => inp.classList.remove("shake-x"), 600);
    inp.focus();
  }
}

/* ---------- 켜기 · 끄기 ---------- */
function demoEnter(silent){
  game.demo = true;
  state = defaultState();
  loadState(DEMO_SAVE_KEY);          // 지난 시연 진행이 있으면 이어서
  if(!state.nickname) state.nickname = DEMO_NICK;
  if(!state.startedAt) state.startedAt = new Date().toLocaleString();
  savedOwner = state.nickname;
  game.player.placed = false;
  game.digging = null; game.near = null; game.autoTarget = null;
  demoSaveFlag();
  saveState();
  renderStartProgress();
  updateHud();
  demoRefreshUI();
  if(!silent) toast("교사 시연 모드를 켰다. 이 기기의 학생 진행 기록은 그대로 남는다.", "gold");
}
function demoExit(){
  demoCloseAllModals();
  game.demo = false;
  demoSaveFlag();
  state = defaultState();
  savedOwner = "";
  loadState();                       // 학생 진행으로 되돌린다
  game.player.placed = false;
  game.digging = null; game.near = null; game.autoTarget = null;
  renderStartProgress();
  updateHud();
  demoRefreshUI();
  renderScreen("startScreen");
  toast("시연 모드를 끝냈다. 학생 진행 상태로 돌아왔다.");
}
/* 시작 화면 구석 버튼·HUD 버튼 표시 갱신 */
function demoRefreshUI(){
  const on = !!game.demo;
  document.body.classList.toggle("demo-on", on);
  const b = $("btnDemo");
  if(b){
    b.classList.toggle("on", on);
    b.innerHTML = iconSVG("lock") + (on ? "시연 모드 ON · 패널 열기" : "교사 시연");
    b.title = on ? "교사 시연 패널 열기 (` 키)" : "학회·연수 발표용 교사 시연 모드 (비밀번호 필요)";
  }
}
/* 열려 있는 팝업·연출·대화창을 모두 닫는다 (진행 상태를 바꾸거나 순간이동할 때) */
function demoCloseAllModals(){
  document.querySelectorAll(".modal-backdrop.on").forEach(m => closeModal(m.id));
  $("cinematicOverlay").classList.remove("on");
  const cg = $("btnCinematicGo");
  if(cg){ cg.onclick = defaultCinematicGo; cg.textContent = "계속"; }
  $("dialogBox").classList.remove("on");
  dialog.onDone = null; dialog.lines = [];
  game.currentOutcrop = null;
  game.sites = [];
  game.digging = null;
}

/* ---------- 시연 패널 ---------- */
function demoOpenPanel(){
  if(!game.demo) return;
  demoRenderPanel();
  openModal("demoModal");
}
function demoRenderPanel(){
  const body = $("demoBody");
  if(!body) return;
  const btn = (act, val, label, sub) =>
    '<button type="button" class="demo-btn" data-act="' + act + '" data-val="' + escapeHTML(val) + '">' +
      '<b>' + escapeHTML(label) + '</b>' + (sub ? '<small>' + escapeHTML(sub) + '</small>' : '') + '</button>';
  const n = layerData.length;
  const status = state.finalMissionDone ? "최종 미션 완료" : (finalMissionReady() ? "최종 미션 열림 (전망대)" : "노두 조사 중");
  let html =
    '<p class="demo-note">시연 진행은 학생 진행과 따로 저장됩니다. 이 패널은 <kbd>`</kbd> 키(Tab 키 위)로도 열고 닫습니다.</p>' +
    '<div class="demo-status">현재 시연 상태 · 노두 ' + exploredOutcropCount() + ' / ' + n +
      ' · 단서 ' + countItems(state.completed) + ' / ' + itemData.length + ' · ' + escapeHTML(status) + '</div>';

  /* 1. 진행 상태 바로 가기 */
  html += '<h4>진행 상태 바로 가기 <small>지금 시연 진행을 지우고 그 상태로 만든 뒤 알맞은 곳에 세운다</small></h4><div class="demo-grid">';
  html += btn("jump", "0", "처음 상태", "입구에서 새 탐사 시작");
  layerData.forEach((ly, i) => {
    const next = layerData[i + 1];
    const label = i === 0 ? "노두 " + ly.id + " 완료" : "노두 " + layerData[0].id + "~" + ly.id + " 완료";
    html += btn("jump", String(i + 1), label, next ? "노두 " + next.id + " 앞에서 시작" : "전망대 앞 · 최종 미션 열림");
  });
  html += btn("jump", "mission", "최종 미션 완료", "결과 화면 · 보고서까지 완성");
  html += '</div>';

  /* 2. 최종 미션 */
  html += '<h4>최종 미션 <small>노두를 모두 조사한 상태에서</small></h4><div class="demo-grid">' +
    btn("stage1", "", "1단계 완료 처리", "카드를 정답 순서로 놓은 채 2단계 지층 대비부터 시연") + '</div>';

  /* 3. 순간이동 */
  html += '<h4>순간이동 <small>진행은 그대로 두고 자리만 옮긴다</small></h4><div class="demo-grid small">';
  html += btn("tp", "start", "입구");
  layerData.forEach(ly => { html += btn("tp", "outcrop:" + ly.id, "노두 " + ly.id); });
  html += btn("tp", "lookout", "전망대");
  html += '</div>';

  /* 4. 옵션 */
  html += '<h4>시연 옵션</h4><div class="demo-opts">';
  DEMO_OPT_LIST.forEach(o => {
    html += '<button type="button" class="demo-opt' + (demoOpts[o.key] ? " on" : "") + '" data-opt="' + o.key + '" aria-pressed="' + (demoOpts[o.key] ? "true" : "false") + '">' +
      '<span class="sw"></span><b>' + escapeHTML(o.name) + '</b><small>' + escapeHTML(o.desc) + '</small></button>';
  });
  html += '</div>';

  /* 5. 끝내기 */
  html += '<div class="modal-actions demo-foot">' +
    '<button type="button" class="btn ghost small" data-close="demoModal">닫기</button>' +
    '<button type="button" class="btn red small" data-act="exit">시연 끝내기 · 학생 모드로</button></div>';
  body.innerHTML = html;

  body.querySelectorAll("[data-act]").forEach(el => el.addEventListener("click", () => {
    const act = el.getAttribute("data-act"), val = el.getAttribute("data-val");
    playSound("click");
    if(act === "jump") demoJump(val);
    else if(act === "tp") demoTeleportTo(val);
    else if(act === "stage1") demoSkipStage1();
    else if(act === "exit") demoExit();
  }));
  body.querySelectorAll("[data-opt]").forEach(el => el.addEventListener("click", () => {
    const k = el.getAttribute("data-opt");
    demoOpts[k] = !demoOpts[k];
    el.classList.toggle("on", demoOpts[k]);
    el.setAttribute("aria-pressed", demoOpts[k] ? "true" : "false");
    demoSaveFlag();
    playSound("click");
    if(k === "openGates" && WORLD.tile.length){
      WORLD.gates.forEach(g => { g.wasOpen = null; });   // '관문이 열렸다' 안내가 한꺼번에 뜨지 않게
      refreshGates();
    }
  }));
  body.querySelectorAll("[data-close]").forEach(el => el.addEventListener("click", () => { playSound("click"); closeModal(el.getAttribute("data-close")); }));
}

/* ---------- 진행 상태 바로 가기 ----------
   level = 조사 완료한 노두 수 (0 ~ layerData.length). missionDone = 최종 미션까지 완료.
   학생이 첫 시도에 모두 맞힌 것으로 만든다 (점수·개념별 성취·배지도 그에 맞춘다). */
function demoJump(val){
  if(val === "mission") demoBuildProgress(layerData.length, true);
  else demoBuildProgress(clamp(parseInt(val, 10) || 0, 0, layerData.length), false);
}
function demoBuildProgress(level, missionDone){
  ensureWorldBuilt();
  const s = defaultState();
  s.nickname = state.nickname || DEMO_NICK;
  s.startedAt = new Date().toLocaleString();
  const tally = tag => {
    const t = String(safe(tag, "")).trim().toUpperCase();
    if(CONCEPT_KEYS.indexOf(t) >= 0){ s.conceptStats[t].total += 1; s.conceptStats[t].correct += 1; }
  };
  const solve = (key, tag) => { s.quizScored.push(key); s.quizAnswered += 1; s.quizFirstCorrect += 1; s.score += 30; tally(tag); };
  if(level > 0) s.talkedNpc.push("ranger");
  layerData.slice(0, level).forEach(ly => {
    const items = itemsOfLayer(ly.id);
    items.forEach(it => {
      s.discovered.push(it.id);
      s.completed.push(it.id);
      s.score += 10 + 20;   // 발굴 10 + 도감 등록 20
      (Array.isArray(it.quiz) ? it.quiz : []).forEach((q, qi) => solve("item:" + it.id + "#" + qi, q.tag));
      if(it.isEvidence) s.evidenceCinematicShown = true;
    });
    const bands = layerBands(ly.id);
    if(bands) bands.forEach(b => b.slots.forEach(sl => s.dugSlots.push(sl.slot)));
    else items.forEach(it => s.dugSlots.push(it.id));
    if(ly.summaryQuiz){ s.layerQuizDone.push(ly.id); solve("summary:" + ly.id + "#0", ly.summaryQuiz.tag); }
    s.unlockedLayers.push(ly.id);
    s.foundOutcrops.push(ly.id);
  });
  s.maxCombo = s.quizFirstCorrect;
  worldData.zones.forEach(z => { if(s.unlockedLayers.indexOf(z.layer) >= 0) s.seenZones.push(z.id); });
  if(level >= layerData.length) s.parkDone = true;
  if(missionDone){
    const ids = missionCards().map(c => c.id);
    const links = {}, tries = { m1_order: "done" };
    neighborLayers().forEach(L => { links[L.n] = L.answer; tries["m2_link_" + L.n] = "done"; });
    s.mission = { stage: 3, order: ids.slice(), placed: ids.slice(), links: links, tries: tries };
    s.labReportShown = true;
    s.finalMissionDone = true;
    s.score += 50 + 10 * (1 + neighborLayers().length);   // 미션 완료 50 + 1단계 순서 10 + 2단계 연결 10씩
    tally("ERA");
    neighborLayers().forEach(() => tally("ERA"));
  }
  state = s;
  checkBadges(true);   // 팝업 없이 배지만 기록
  saveState();
  updateHud();
  renderStartProgress();
  demoCloseAllModals();
  if(missionDone){
    demoPlace("lookout");
    openResultScreen();
    toast("시연 상태: 최종 미션 완료 · 결과 화면", "gold");
    return;
  }
  if(level <= 0){ demoTeleportTo("start"); toast("시연 상태: 처음 상태 (입구)", "gold"); return; }
  if(level >= layerData.length){ demoTeleportTo("lookout"); toast("시연 상태: 노두 " + layerData.length + "곳 모두 조사 완료 · 전망대", "gold"); return; }
  const next = layerData[level];
  demoTeleportTo("outcrop:" + next.id);
  toast("시연 상태: 노두 " + layerData.slice(0, level).map(l => l.id).join("·") + " 조사 완료 · 노두 " + next.id + " 앞", "gold");
}

/* ---------- 순간이동 ---------- */
function demoPlace(where){
  ensureWorldBuilt();
  let x, y;
  if(where === "start"){
    x = worldData.start.col * T + T / 2; y = (worldData.start.row + 1) * T;
  }else if(where === "lookout"){
    if(!WORLD.lookout) return false;
    x = WORLD.lookout.x; y = WORLD.lookout.y + 14;          // goToLookout()이 도착하는 자리
  }else if(where.indexOf("outcrop:") === 0){
    const o = WORLD.outcrops.find(oc => oc.layerId === where.slice(8));
    if(!o) return false;
    x = o.x; y = o.y + 6;                                   // 노두 앞 흙길 (클릭 이동이 도착하는 자리)
  }else return false;
  game.player.x = x; game.player.y = y; game.player.face = "up"; game.player.placed = true;
  game.autoTarget = null; game.digging = null; game.near = null; game.zone = null;
  return true;
}
function demoTeleportTo(where){
  if(!demoPlace(where)){ toast("그곳을 찾을 수 없다."); return; }
  demoCloseAllModals();
  renderScreen("gameScreen");   // enterWorld()가 지금 위치 그대로 카메라·관문을 맞춘다
}

/* ---------- 최종 미션 1단계 완료 처리 ---------- */
function demoSkipStage1(){
  if(!finalMissionReady()){ toast("노두를 모두 조사한 상태에서 쓸 수 있다. 먼저 「노두 A~" + layerData[layerData.length - 1].id + " 완료」를 누르자."); return; }
  if(state.finalMissionDone){ toast("최종 미션이 이미 완료된 상태다."); return; }
  const m = missionState();
  const ids = missionCards().map(c => c.id);
  m.order = ids.slice(); m.placed = ids.slice(); m.stage = 2;
  m.tries.m1_order = "done";
  state.labReportShown = true;
  saveState();
  m1 = { feedback: "", fbKind: "hint" };
  m2 = { feedback: "", fbKind: "hint" };
  closeModal("demoModal");
  if($("finalMissionModal").classList.contains("on")){ renderMission(); }
  else{
    if(!game.running) demoTeleportTo("lookout");
    openFinalMission();
  }
  toast("1단계를 완료 처리했다. 2단계 지층 대비부터 시연한다.", "gold");
}
