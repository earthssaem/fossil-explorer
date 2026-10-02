/* ---------- HUD · 배지 · 도감 · 결과 · 보고서 ---------- */
"use strict";

/* ---------- HUD ---------- */
function updateHud(){
  const s = $("hudScore"); if(s) s.textContent = safe(state.score, 0);
  const o = $("hudOutcrops"); if(o) o.textContent = exploredOutcropCount() + "/" + layerData.length;
  const c = $("hudCollect"); if(c) c.textContent = countItems(state.completed) + "/" + itemData.length;
  const comboEl = $("hudCombo");
  if(comboEl){
    if(safe(state.combo, 0) >= 2){ comboEl.style.display = ""; $("hudComboNum").textContent = state.combo; }
    else comboEl.style.display = "none";
  }
}

/* ---------- 배지 시스템 ---------- */
function checkBadges(){
  const total = Math.max(1, itemData.length);
  badgeData.forEach(b => {
    if(state.badges.includes(b.id)) return;
    let earned = false;
    switch(b.type){
      case "discoverCount": earned = countItems(state.discovered) >= safe(b.value,1); break;
      case "completeRate":  earned = (countItems(state.completed) / total) >= safe(b.value,0.5); break;
      case "layerUnlock":   earned = state.unlockedLayers.length >= safe(b.value,1); break;
      case "completeAll":   earned = countItems(state.completed) >= total; break;
      /* 경계층에 남은 흔적을 모두 발굴했는가 (퀴즈까지는 아니어도 됨) */
      case "evidenceAll":   earned = evidenceItems().length > 0 &&
                                     evidenceItems().every(i => state.discovered.includes(i.id)); break;
      case "finalMission":  earned = !!state.finalMissionDone; break;
      default: earned = false;
    }
    if(earned){
      state.badges.push(b.id);
      saveState();
      setTimeout(() => showBadgePopup(b), 500);
    }
  });
}
function showBadgePopup(b){
  if(anyModalOpen()){ setTimeout(() => showBadgePopup(b), 700); return; }
  $("badgeModalIcon").innerHTML = badgeIcon(b);
  $("badgeModalName").textContent = safe(b.name, "배지");
  $("badgeModalDesc").textContent = safe(b.desc, "");
  playSound("badge");
  openModal("badgeModal");
  spawnConfetti();
}

/* ---------- 도감 (컬렉션) ---------- */
let collectionReturnTo = "startScreen";
function renderCollection(){
  const grid = $("collectionGrid");
  grid.innerHTML = "";
  const total = Math.max(1, itemData.length);
  const done = countItems(state.completed);
  $("collectRateFill").style.width = Math.round(done / total * 100) + "%";
  const stats = $("collectStats");
  let chips = '<span class="chip"><i data-icon="bone"></i>전체 ' + done + "/" + total + " (" + Math.round(done / total * 100) + "%)</span>";
  layerData.forEach(ly => {
    const items = itemData.filter(i => i.layer === ly.id);
    if(!items.length) return;
    const c = items.filter(i => state.completed.includes(i.id)).length;
    chips += '<span class="chip' + (c >= items.length ? " done" : "") + '">' + escapeHTML(safe(ly.label, "층")) + " " + c + "/" + items.length + "</span>";
  });
  stats.innerHTML = chips;
  applyIcons(stats);
  const groupList = [...new Set(itemData.map(i => safe(i.group, "기타")))];
  itemData.forEach((item, idx) => {
    const completed = state.completed.includes(item.id);
    const discovered = state.discovered.includes(item.id) || completed;
    const cls = completed ? "completed" : (discovered ? "discovered" : "locked");
    const card = document.createElement("div");
    card.className = "collect-card " + cls + " g" + (groupList.indexOf(safe(item.group, "기타")) % 6);
    const layer = layerData.find(l => l.id === item.layer);
    const isNew = completed && !state.seenInDex.includes(item.id);
    card.innerHTML =
      '<div class="card-no">No.' + String(idx + 1).padStart(2, "0") + '</div>' +
      (completed ? '<div class="card-get">GET</div>' : '') +
      (isNew ? '<div class="card-new">NEW</div>' : '') +
      (item.isEvidence && discovered ? '<div class="card-type">지층 단서</div>' : '') +
      '<div class="card-ring"><div class="card-visual item-visual-slot"></div></div>' +
      '<div class="card-name">' + (discovered ? escapeHTML(itemDisplayName(item)) : "???") + '</div>' +
      '<div class="card-sub">' + (discovered ? escapeHTML(safe(layer && layer.label, "?")) : "미발견") +
        (completed ? " · " + escapeHTML(safe(item.group, "")) : "") + '</div>' +
      '<div class="card-state">' + (completed ? iconSVG("star") + iconSVG("star") + iconSVG("star") : (discovered ? iconSVG("lens") : iconSVG("lock"))) + '</div>';
    renderAssetImage(card.querySelector(".card-visual"), item, discovered ? "normal" : "silhouette");
    card.addEventListener("click", () => {
      playSound("click");
      if(!discovered){ toast("아직 발견하지 못한 단서다. 노두를 조사하자."); return; }
      if(isNew){
        state.seenInDex.push(item.id);
        saveState();
        const badge = card.querySelector(".card-new");
        if(badge) badge.remove();
      }
      openItemModal(item.id, true);
    });
    grid.appendChild(card);
  });
  renderBadgeGrid($("badgeGrid"));
  renderNoteCards($("dexNoteCard"));
}
function renderBadgeGrid(el){
  el.innerHTML = "";
  badgeData.forEach(b => {
    const got = state.badges.includes(b.id);
    const t = document.createElement("div");
    t.className = "badge-token" + (got ? "" : " locked");
    t.innerHTML = '<div class="icon">' + (got ? badgeIcon(b) : iconSVG("lock")) + '</div>' +
                  '<div class="name">' + escapeHTML(safe(b.name, "배지")) + '</div>' +
                  '<div class="desc">' + escapeHTML(safe(b.desc, "")) + '</div>';
    el.appendChild(t);
  });
}

/* ---------- 결과 화면 ---------- */
function openResultScreen(){
  const total = Math.max(1, itemData.length);
  const acc = state.quizAnswered > 0 ? Math.round(state.quizFirstCorrect / state.quizAnswered * 100) : 0;
  const m = missionState();
  const cardsN = Math.max(1, missionCards().length);
  const stat = (icon, label, val) => '<div class="result-stat"><span><i data-icon="' + icon + '"></i>' + label + '</span><span class="val">' + val + '</span></div>';
  $("resultStats").innerHTML =
    stat("pick", "조사한 노두", exploredOutcropCount() + " / " + layerData.length) +
    stat("bone", "발견한 단서", countItems(state.completed) + " / " + total) +
    stat("map", "완성한 지층", m.placed.length + " / " + cardsN) +
    stat("book", "화석도감 완성도", Math.round(countItems(state.completed) / total * 100) + "%") +
    stat("brain", "퀴즈 정답률 (첫 시도)", acc + "%") +
    stat("star", "총 점수", safe(state.score, 0) + "점") +
    stat("medal", "획득 배지", state.badges.length + " / " + badgeData.length);
  applyIcons($("resultStats"));
  renderConceptScores();
  renderResultColumn();
  renderBadgeGrid($("resultBadges"));
  $("reportSavedMsg").textContent = "";
  drawReport();
  showReportImage();
  renderScreen("resultScreen");
}
/* 완성한 지층 기록 미리보기 */
function renderResultColumn(){
  const m = missionState();
  const cardsN = missionCards().length;
  $("resultColumn").innerHTML = stratColumnHTML(m.placed, { small: true });
  $("resultColumnNote").textContent = state.finalMissionDone
    ? "서로 떨어져 있던 노두 " + layerData.length + "곳의 기록을 하나의 지층 기록으로 완성했다. 층의 시기는 지층이 쌓였을 것으로 추정되는 때(연구소 분석 결과)다."
    : (m.placed.length ? "지층 기록 " + m.placed.length + " / " + cardsN + " 완성. 전망대의 최종 미션에서 마저 완성할 수 있다."
                       : "노두를 모두 조사한 뒤 북쪽 전망대에서 최종 미션을 하면 이 기둥이 채워진다.");
}

/* ---------- 개념별 성취 (결과 화면) ---------- */
function renderConceptScores(){
  const card = $("conceptCard");
  if(!card) return;
  const rows = conceptSummary();
  if(!rows.length){ card.style.display = "none"; return; }
  card.style.display = "";
  $("conceptList").innerHTML = rows.map(r => {
    let dots = "";
    for(let i = 0; i < r.total; i++){
      dots += (i < r.correct) ? "<span></span>" : '<span class="off"></span>';
    }
    const low = r.total > 0 && (r.correct / r.total) < 0.5;
    return '<div class="cc-row' + (low ? " low" : "") + '" title="' + escapeHTML(r.desc) + '">' +
             '<div class="cc-name">' + escapeHTML(r.label) + '</div>' +
             '<div class="cc-dots">' + dots + '</div>' +
             '<div class="cc-num">' + r.correct + " / " + r.total + '</div>' +
           '</div>';
  }).join("");
}

/* ---------- 제출용 탐사 보고서 이미지 (Canvas → PNG 다운로드) ---------- */
const REPORT_FONT = "'Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo',sans-serif";
function drawReport(){
  const cv = $("reportCanvas");
  if(!cv) return;
  const g = cv.getContext("2d");
  const W = cv.width, H = cv.height;
  const total = Math.max(1, itemData.length);
  const acc = state.quizAnswered > 0 ? Math.round(state.quizFirstCorrect / state.quizAnswered * 100) : 0;
  g.fillStyle = "#f4e6c8"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#3b2a20"; g.fillRect(0, 0, W, 14); g.fillRect(0, H - 14, W, 14); g.fillRect(0, 0, 14, H); g.fillRect(W - 14, 0, 14, H);
  /* 헤더 */
  g.fillStyle = "#2f9e8f"; g.fillRect(40, 44, W - 80, 96);
  g.fillStyle = "#1d7a6e"; g.fillRect(40, 128, W - 80, 12);
  g.fillStyle = "#fff8e6";
  g.font = "900 42px " + REPORT_FONT; g.textBaseline = "middle";
  g.fillText("탐사 보고서", 70, 92);
  g.font = "800 20px " + REPORT_FONT;
  g.fillText("지층 탐사대 · 사라진 시간을 이어라", 74, 122);
  g.fillStyle = "#3b2a20";
  g.font = "900 28px " + REPORT_FONT;
  g.fillText("탐사대원: " + safe(state.nickname, "익명"), 60, 190);
  g.font = "700 18px " + REPORT_FONT; g.fillStyle = "#7a6048";
  g.fillText(safe(state.startedAt, "-") + "  ~  " + new Date().toLocaleString(), 60, 226);

  /* 개념별 성취 */
  let y = 268;
  const concepts = conceptSummary();
  g.fillStyle = "#3b2a20"; g.font = "900 24px " + REPORT_FONT;
  const cTitle = "개념별 성취";
  g.fillText(cTitle, 60, y);
  const cTitleW = g.measureText(cTitle).width;
  g.fillStyle = "#8a7a5d"; g.font = "700 16px " + REPORT_FONT;
  g.fillText("(첫 시도에 맞힌 문항만 채워집니다)", 60 + cTitleW + 14, y + 3);
  y += 22;
  if(!concepts.length){
    g.fillStyle = "#8a7a5d"; g.font = "700 19px " + REPORT_FONT;
    g.fillText("아직 푼 문항이 없습니다.", 60, y + 24);
    y += 44;
  }else{
    const dotX = 300, dotRight = W - 150;
    concepts.forEach((r, i) => {
      const cy = y + 26 + i * 34;
      if(i % 2 === 0){ g.fillStyle = "#ead9b5"; g.fillRect(52, cy - 15, W - 104, 30); }
      g.fillStyle = "#3b2a20"; g.font = "900 19px " + REPORT_FONT;
      g.fillText(r.label, 62, cy);
      const step = Math.min(22, (dotRight - dotX) / Math.max(1, r.total));
      const sz = Math.max(6, Math.min(14, step * 0.7));
      for(let k = 0; k < r.total; k++){
        const px = dotX + step * k + step / 2 - sz / 2;
        if(k < r.correct){ g.fillStyle = "#1d7a6e"; g.fillRect(px, cy - sz / 2, sz, sz); }
        else{ g.fillStyle = "#fff8e6"; g.fillRect(px, cy - sz / 2, sz, sz); g.strokeStyle = "#b9a37a"; g.lineWidth = 2; g.strokeRect(px, cy - sz / 2, sz, sz); }
      }
      const weak = r.total > 0 && (r.correct / r.total) < 0.5;
      g.fillStyle = weak ? "#b3261e" : "#3b2a20";
      g.font = "900 20px " + REPORT_FONT; g.textAlign = "right";
      g.fillText(r.correct + " / " + r.total, W - 62, cy);
      g.textAlign = "left";
    });
    y += 26 + concepts.length * 34;
  }
  /* 성적 카드 6개 */
  y += 22;
  const mst = missionState();
  const stats = [
    ["조사한 노두", exploredOutcropCount() + " / " + layerData.length],
    ["발견한 단서", countItems(state.completed) + " / " + total],
    ["완성한 지층", mst.placed.length + " / " + Math.max(1, missionCards().length)],
    ["퀴즈 정답률 (첫 시도)", acc + "%"],
    ["총 점수", safe(state.score, 0) + "점"],
    ["획득 배지", state.badges.length + " / " + badgeData.length]
  ];
  const cardW = (W - 120 - 40) / 3, cardH = 86;
  stats.forEach((s, i) => {
    const cx = 60 + (i % 3) * (cardW + 20);
    const cy = y + Math.floor(i / 3) * (cardH + 16);
    g.fillStyle = "#fff8e6"; g.fillRect(cx, cy, cardW, cardH);
    g.strokeStyle = "#3b2a20"; g.lineWidth = 4; g.strokeRect(cx, cy, cardW, cardH);
    g.fillStyle = "#7a6048"; g.font = "800 18px " + REPORT_FONT;
    g.fillText(s[0], cx + 16, cy + 26);
    g.fillStyle = "#1d7a6e"; g.font = "900 30px " + REPORT_FONT;
    g.fillText(s[1], cx + 16, cy + 60);
  });
  y += cardH * 2 + 16;
  /* 완성한 지층 기록 + 수집 도감 요약 (좌우 배치) */
  y += 40;
  g.fillStyle = "#3b2a20"; g.font = "900 22px " + REPORT_FONT;
  g.fillText("완성한 지층 기록", 60, y);
  g.fillText("화석도감 수집 현황", 330, y);
  y += 20;
  drawColumnOnCanvas(g, 60, y, 230, 250, mst.placed);
  g.fillStyle = "#7a6048"; g.font = "700 13px " + REPORT_FONT;
  g.fillText(state.finalMissionDone ? "최종 미션 완료" : "지층 기록 " + mst.placed.length + " / " + missionCards().length, 60, y + 282);
  if(mst.placed.length){ g.font = "700 12px " + REPORT_FONT; g.fillText("층의 시기 = " + periodLabel() + " (지층이 쌓였을 것으로 추정되는 때)", 60, y + 300); }
  const perRow = 4, gridX = 330, boxW = (W - gridX - 60 - (perRow - 1) * 10) / perRow, boxH = 52;
  itemData.forEach((it, i) => {
    const bx = gridX + (i % perRow) * (boxW + 10);
    const by = y + Math.floor(i / perRow) * (boxH + 10);
    const completed = state.completed.includes(it.id);
    const discovered = state.discovered.includes(it.id) || completed;
    g.fillStyle = completed ? "#3ec6b5" : (discovered ? "#ffd166" : "#d8cbb0");
    g.fillRect(bx, by, boxW, boxH);
    g.strokeStyle = "#3b2a20"; g.lineWidth = 3; g.strokeRect(bx, by, boxW, boxH);
    g.fillStyle = "#3b2a20"; g.font = "900 14px " + REPORT_FONT;
    g.fillText(fitText(g, itemDisplayName(it), boxW - 16), bx + 8, by + 18);
    g.font = "700 13px " + REPORT_FONT;
    g.fillText(completed ? "완료" : (discovered ? "발견" : "미발견"), bx + 8, by + 38);
  });
}
function fitText(g, text, maxW){
  let t = String(text);
  if(g.measureText(t).width <= maxW) return t;
  while(t.length > 1 && g.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}
/* 보고서 미리보기를 그림(img)으로도 보여 준다 — 다운로드가 막힌 기기에서도 길게 누르거나(휴대폰·태블릿)
   오른쪽 클릭으로(컴퓨터) 저장할 수 있게 */
function showReportImage(){
  const cv = $("reportCanvas"), box = $("reportPreview");
  if(!cv || !box) return;
  let img = $("reportImg");
  if(!img){
    img = document.createElement("img");
    img.id = "reportImg";
    img.alt = "제출용 탐사 보고서";
    box.appendChild(img);
  }
  try{ img.src = cv.toDataURL("image/png"); cv.style.display = "none"; img.style.display = ""; }
  catch(e){ img.style.display = "none"; cv.style.display = ""; }
}
function saveReport(){
  drawReport();
  const cv = $("reportCanvas");
  const nm = (safe(state.nickname, "탐사대원") || "탐사대원").replace(/[^\wㄱ-힣]/g, "");
  const fname = "탐사보고서_" + nm + ".png";
  const msg = $("reportSavedMsg");
  const fallback = "저장이 안 되면 위 보고서 그림을 길게 누르거나(휴대폰·태블릿) 오른쪽 클릭해(컴퓨터) 저장하세요.";
  const download = blobOrUrl => {
    const a = document.createElement("a");
    const url = typeof blobOrUrl === "string" ? blobOrUrl : URL.createObjectURL(blobOrUrl);
    a.href = url; a.download = fname;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    if(typeof blobOrUrl !== "string") setTimeout(() => URL.revokeObjectURL(url), 4000);
    /* 다운로드가 실제로 됐는지는 브라우저가 알려 주지 않는다 — 확인할 곳과 대안을 함께 안내한다 */
    msg.textContent = "「" + fname + "」 파일을 내려받았어요. 다운로드 폴더에서 확인해 선생님께 제출하세요. " + fallback;
  };
  try{
    cv.toBlob(blob => {
      if(!blob){ msg.textContent = fallback; return; }
      /* 휴대폰·태블릿: 공유 창(사진에 저장, 메신저 등)을 쓸 수 있으면 그쪽이 확실하다 */
      const file = typeof File === "function" ? new File([blob], fname, { type: "image/png" }) : null;
      const touch = window.matchMedia && window.matchMedia("(pointer:coarse)").matches;
      if(touch && file && navigator.canShare && navigator.canShare({ files: [file] })){
        navigator.share({ files: [file], title: "탐사 보고서" })
          .then(() => { msg.textContent = "보고서를 공유(저장)했어요. 선생님께 제출하세요."; })
          .catch(err => { if(!err || err.name !== "AbortError") download(blob); });
        return;
      }
      download(blob);
    }, "image/png");
  }catch(e){
    try{ download(cv.toDataURL("image/png")); }
    catch(e2){ msg.textContent = "이 브라우저에서는 파일 저장이 막혀 있습니다. 위 보고서 그림을 길게 누르거나 오른쪽 클릭해 저장하거나, 화면을 캡처해 제출하세요."; }
  }
  playSound("register");
}
