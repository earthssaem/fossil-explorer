/* ==========================================================================
   최종 미션 · 흩어진 지층 기록을 완성하라
   1단계: 탐사에서 확인한 지층 기록 카드를 끌어 옮겨 오래된 것부터 차례로 배치한다 (순서 확인만 한다).
   2단계: 두 지역의 지층 기둥을 나란히 놓고 확실한 단서가 있는 층만 끌어서 선으로 잇는다 (지층 대비).
          산호층은 위아래 관계로 상대적인 순서를, 경계층 바로 아래의 공룡층은 같은 시기·다른 환경으로 해석하고,
          정리 문항 1개로 마무리한다. 모든 층을 1:1로 잇는 활동이 아니다.
   완료 : 연결선이 남은 두 기둥을 그대로 보여 준다. 우리 공원 층을 누르면 시대·화석·환경을 다시 본다.
   진행 상태는 state.mission 에 저장되어 창을 닫았다 열어도 이어진다.
   ========================================================================== */
"use strict";

function finalMissionData(){
  return (missionData && missionData.finalMission) ? missionData.finalMission : DEFAULT_MISSION_DATA.finalMission;
}
function missionCards(){ return finalMissionData().cards || []; }
function missionState(){
  if(!state.mission || typeof state.mission !== "object") state.mission = {};
  const m = state.mission;
  if(!m.stage) m.stage = 1;
  if(!Array.isArray(m.placed)) m.placed = [];
  /* 예전 방식(카드를 하나씩 고르던 저장 데이터)에서 기둥이 덜 완성된 채 남아 있으면 비운다 */
  if(m.stage === 1 && m.placed.length && m.placed.length < missionCards().length) m.placed = [];
  if(!Array.isArray(m.order)) m.order = [];   // 1단계에서 학생이 배치한 카드 순서 (아래→위)
  if(!m.links || typeof m.links !== "object") m.links = {};   // 2단계 연결 {이웃 층 번호: 우리 공원 층 key}
  /* 직접 잇지 않는 층(answer "none")이 예전 저장 데이터에 이어져 있으면 지운다 */
  ((DEFAULT_MISSION_DATA.finalMission.stage2 || {}).layers || []).forEach(L => { if(L.answer === "none" && m.links[L.n]) delete m.links[L.n]; });
  if(!m.tries || typeof m.tries !== "object") m.tries = {};   // 문항별 시도 횟수 (첫 시도 정답 집계용)
  return m;
}
/* 문항 하나의 결과를 개념별 성취에 1회만 기록한다 */
function missionRecord(qid, tag, correct){
  const m = missionState();
  if(m.tries[qid] === "done") return;
  if(correct){
    const first = !m.tries[qid];
    recordConcept(tag, first);
    state.score = safe(state.score, 0) + (first ? 10 : 5);
    m.tries[qid] = "done";
  }else{
    m.tries[qid] = (m.tries[qid] || 0) + 1;
  }
  saveState();
  updateHud();
}
function itemById(id){ return itemData.find(i => i.id === id) || null; }
function cardItems(card){
  return itemData.filter(i => i.layer === card.layer && (!card.band || i.band === card.band) && !i.isEvidence);
}
function cardColor(card){
  const ly = layerById(card.layer);
  if(!ly) return "#c8a060";
  return card.band === "upper" ? safe(ly.color2, ly.color1) : safe(ly.color1, "#c8a060");
}
/* 어두운 층 색 위에는 밝은 글자를 쓴다 */
function darkColor(hex){
  const c = hexRGB(hex);
  return !!c && (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) < 110;
}
function shuffledCards(){
  const cards = missionCards().slice();
  return cards.map((c, i) => ({ c: c, k: hash2(i + 1, 3, 91) })).sort((a, b) => a.k - b.k).map(x => x.c);
}

/* ---------- 층서 기둥 HTML (미션·결과·완료 화면 공용) ----------
   placed: 놓인 카드 id 목록 (아래→위). clickable: 층을 눌러 정보 보기 */
function stratColumnHTML(placed, opts){
  const o = opts || {};
  const cards = missionCards();
  let html = '<div class="m-column' + (o.small ? " small" : "") + '">';
  cards.slice().reverse().forEach(card => {
    const on = placed.indexOf(card.id) >= 0;
    const ly = layerById(card.layer);
    const share = 100 / cards.length;
    const items = cardItems(card).map(i => safe(i.name, "")).join("·");
    html += '<div class="m-band' + (on ? " on" : " empty") + (ly && ly.isBoundary ? " bnd" : "") + (o.clickable && on ? " click" : "") + (on && darkColor(cardColor(card)) ? " dark" : "") + '"' +
      ' data-card="' + card.id + '" style="flex-basis:' + share + '%;' + (on ? "background:" + cardColor(card) + ";" : "") + '">' +
      (on ? '<b>' + escapeHTML(safe(ly && ly.label, card.layer)) + (card.band ? " " + (card.band === "upper" ? "위층" : "아래층") : "") + '</b>' +
            '<span>' + escapeHTML(o.small ? safe(ly && ly.era, "") : items) + '</span>'
          : '<span class="q">?</span>') +
      '</div>';
  });
  html += '</div>';
  return html;
}

/* ---------- 열기 ---------- */
function openFinalMission(){
  const fm = finalMissionData();
  $("finalTitle").textContent = "최종 미션 · " + safe(fm.title, "");
  renderMission();
  openModal("finalMissionModal");
  playSound("place");
}
function renderMission(){
  const m = missionState();
  const steps = $("missionSteps");
  const names = ["1단계 지층 기둥", "2단계 지층 대비", "탐사 완료"];
  steps.innerHTML = names.map((n, i) => '<span class="' + (m.stage === i + 1 ? "now" : (m.stage > i + 1 ? "done" : "")) + '">' + n + '</span>').join("");
  if(m.stage === 1) renderStage1();
  else if(m.stage === 2) renderStage2();
  else renderMissionComplete();
}
function feedbackBox(text, kind){
  return '<div class="quiz-feedback ' + (kind || "hint") + '" id="mFeedback">' + escapeHTML(text) + '</div>';
}

/* ---------- 1단계 · 카드 끌어 놓기로 순서 맞추기 ----------
   카드에는 탐사에서 이미 해금한 정보(시대·화석·환경)만 보여 준다. 학생은 시대나 환경을 새로 추측하지 않고,
   따로 조사한 기록을 시간 순서(아래=오래됨 → 위=젊음)로 다시 연결한다. 「순서 확인」을 누르면 한 번에 판정한다. */
let m1 = { feedback: "", fbKind: "hint" };
/* 학생의 현재 배치 (아래→위). 처음이면 섞인 순서로 시작한다. */
function stage1Order(){
  const m = missionState();
  const ids = missionCards().map(c => c.id);
  const valid = m.order.length === ids.length && ids.every(id => m.order.indexOf(id) >= 0);
  if(!valid){ m.order = shuffledCards().map(c => c.id); saveState(); }
  return m.order;
}
/* 카드 한 장의 정보 줄: 시대 / 화석 / 환경 (모두 탐사에서 확인한 것) */
function sortCardHTML(card){
  const ly = layerById(card.layer);
  const items = cardItems(card);
  return '<div class="m-sort-card" data-card="' + card.id + '">' +
    '<span class="m-sort-grip" aria-hidden="true">⋮⋮</span>' +
    '<span class="m-card-icons">' + items.map(i => '<i class="item-visual-slot" data-item="' + i.id + '"></i>').join("") + '</span>' +
    '<span class="m-sort-lines">' +
      '<b>' + escapeHTML(safe(card.era, safe(ly && ly.era, ""))) + '</b>' +
      '<span>' + escapeHTML(items.map(i => safe(i.name, "")).join("·")) + '</span>' +
      '<span class="env">' + escapeHTML(safe(card.env, "")) + '</span>' +
    '</span></div>';
}
function renderStage1(){
  const fm = finalMissionData(), st = fm.stage1 || {};
  const m = missionState();
  const cards = missionCards();
  const body = $("missionBody");
  const done = m.placed.length >= cards.length;
  let right = "";
  if(done){
    right = '<div class="m-prompt done">' + escapeHTML(st.done || "") + '</div>' +
      '<div class="modal-actions"><button class="btn primary" id="m1Next">2단계로</button></div>';
  }else{
    const order = stage1Order();
    /* 화면은 위→아래로 그리므로 배열(아래→위)을 뒤집는다 */
    right = '<div class="m-prompt">' + escapeHTML(st.howto || "") +
      (st.hint ? '<small>' + escapeHTML(st.hint) + '</small>' : "") + '</div>' +
      '<div class="m-sort-end top">' + escapeHTML(st.topLabel || "") + '</div>' +
      '<div class="m-sort" id="mSort">' +
        order.slice().reverse().map(id => sortCardHTML(cards.find(c => c.id === id))).join("") +
      '</div>' +
      '<div class="m-sort-end bottom">' + escapeHTML(st.bottomLabel || "") + '</div>' +
      '<div class="modal-actions"><button class="btn primary" id="m1Check">' + escapeHTML(st.check || "순서 확인") + '</button></div>' +
      (m1.feedback ? feedbackBox(m1.feedback, m1.fbKind) : "");
  }
  body.innerHTML =
    '<div class="m-layout m-stage1"><div class="m-left"><div class="m-col-title">우리 공원 지층 기둥 <small>' + m.placed.length + ' / ' + cards.length + '</small></div>' +
    stratColumnHTML(m.placed, {}) + '</div><div class="m-right">' + right + '</div></div>';
  body.querySelectorAll("[data-item]").forEach(el => renderAssetImage(el, itemById(el.getAttribute("data-item")), "normal"));
  /* 이벤트 */
  const sort = $("mSort");
  if(sort) setupSortable(sort);
  const ck = $("m1Check");
  if(ck) ck.addEventListener("click", checkOrder);
  const nx = $("m1Next");
  if(nx) nx.addEventListener("click", () => { playSound("click"); m.stage = 2; saveState(); renderMission(); });
}
/* 화면의 카드 순서(위→아래)를 읽어 배열(아래→위)로 저장한다 */
function readSortOrder(){
  const sort = $("mSort");
  if(!sort) return;
  const m = missionState();
  m.order = Array.from(sort.querySelectorAll(".m-sort-card")).map(el => el.getAttribute("data-card")).reverse();
  saveState();
}
function checkOrder(){
  const st = finalMissionData().stage1 || {};
  const m = missionState();
  readSortOrder();
  const answer = missionCards().map(c => c.id);
  const ok = m.order.length === answer.length && m.order.every((id, i) => id === answer[i]);
  if(ok){
    m.placed = answer.slice();
    missionRecord("m1_order", "ERA", true);
    playSound("found");
    m1 = { feedback: "", fbKind: "hint" };
    spawnConfetti();
  }else{
    missionRecord("m1_order", "ERA", false);
    playSound("wrong");
    m1 = { feedback: st.wrong || "", fbKind: "hint" };
  }
  saveState();
  renderStage1();
}
/* 카드 끌어 옮기기 (마우스·터치 공용 pointer 이벤트). 카드 전체가 손잡이다.
   끌고 있는 카드를 포인터 위치의 다른 카드 앞·뒤로 옮겨 넣고, 놓으면 순서를 저장한다.
   카드를 DOM에서 옮겨 넣으면 포인터 캡처가 풀리므로, 끄는 동안의 이동·놓기 이벤트는 document에서 받는다.
   목록이 창보다 길면 가장자리에서 창을 자동으로 스크롤한다. */
function setupSortable(list){
  let drag = null, pid = null;
  const move = e => {
    if(!drag || e.pointerId !== pid) return;
    e.preventDefault();
    autoScroll(list, e.clientY);
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const over = under && under.closest ? under.closest(".m-sort-card") : null;
    if(!over || over === drag || over.parentNode !== list) return;
    const r = over.getBoundingClientRect();
    const ref = (e.clientY < r.top + r.height / 2) ? over : over.nextSibling;
    if(ref === drag || ref === drag.nextSibling) return;   // 이미 그 자리
    list.insertBefore(drag, ref);
  };
  const finish = e => {
    if(!drag || e.pointerId !== pid) return;
    drag.classList.remove("dragging");
    drag = null; pid = null;
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", finish);
    document.removeEventListener("pointercancel", finish);
    readSortOrder();
    playSound("place");
  };
  list.querySelectorAll(".m-sort-card").forEach(card => {
    card.addEventListener("pointerdown", e => {
      if(drag || (e.button !== undefined && e.button !== 0)) return;
      drag = card; pid = e.pointerId;
      card.classList.add("dragging");
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", finish);
      document.addEventListener("pointercancel", finish);
      e.preventDefault();
    });
  });
}
function autoScroll(list, y){
  const box = list.closest(".modal-card");
  if(!box) return;
  const r = box.getBoundingClientRect();
  const edge = 40;
  if(y < r.top + edge) box.scrollTop -= 8;
  else if(y > r.bottom - edge) box.scrollTop += 8;
}

/* ---------- 2단계 · 두 지역의 지층 대비 (선으로 잇기) ----------
   왼쪽: 1단계에서 완성한 우리 공원 지층 기둥 (경계 노두는 아래층·경계층으로 나뉨)
   오른쪽: 이웃 마을 노두 (아래→위). 같은 시대의 층끼리 끌어서 선으로 잇는다.
   바른 연결만 저장되어 선이 남고, 틀리면 짧은 안내만 보여 준 뒤 다시 이을 수 있다.
   연결할 수 있는 층을 다 이으면 → 산호층의 상대적 순서 확인 → 정리 문항 1개 → 완료. */
let m2 = { feedback: "", fbKind: "hint", relPick: {}, relFb: "", closingFb: "" };
function neighborLayers(){ return (finalMissionData().stage2 || {}).layers || []; }
/* 우리 공원 기둥의 층 목록 (아래→위). 경계 노두 카드는 아래층과 경계층 두 칸으로 나뉜다. */
function ourTargets(){
  const out = [];
  missionCards().forEach(card => {
    const ly = layerById(card.layer);
    const items = cardItems(card);
    if(ly && ly.isBoundary){
      out.push({ key: card.id + "_lower", card: card, era: safe(card.lowerEra, safe(ly.era, "")), items: items, color: cardColor(card), thick: card.thick });
      out.push({ key: card.id + "_boundary", card: card, era: safe(card.boundaryEra, "경계층"), items: [], band: true, color: "#1b140e" });
    }else{
      out.push({ key: card.id, card: card, era: safe(card.era, safe(ly && ly.era, "")), items: items, color: cardColor(card), thick: card.thick });
    }
  });
  return out;
}
function linkableLayers(){ return neighborLayers().filter(L => L.answer !== "none"); }
function allLinked(){ const m = missionState(); return linkableLayers().every(L => !!m.links[L.n]); }

/* 두 기둥 비교 화면 HTML. links: {이웃 층 n: 우리 층 key}
   opts.live: 끌어서 잇기 가능 / opts.clickable: 우리 공원 층을 눌러 정보 보기 / opts.tags: {n: 문구} 이웃 층에 붙일 표시 */
function compareHTML(links, opts){
  const o = opts || {};
  const s2 = finalMissionData().stage2 || {};
  const ours = ourTargets(), nbs = neighborLayers();
  const linkedKeys = Object.keys(links || {}).map(n => links[n]);
  const st = o.sameTime || null;   // {ourKey, layerN} 같은 시기·다른 환경으로 해석한 두 층
  const grow = v => 'flex-grow:' + (Number(v) > 0 ? Number(v) : 1) + ';';
  const left = ours.slice().reverse().map(t =>
    '<div class="cmp-band ours' + (t.band ? " bnd" : "") + (linkedKeys.indexOf(t.key) >= 0 ? " linked" : "") + (st && st.ourKey === t.key ? " same" : "") +
      (o.clickable ? " click" : "") + (darkColor(t.color) ? " dark" : "") + '"' +
      ' data-side="ours" data-key="' + t.key + '" data-card="' + t.card.id + '" style="background:' + t.color + ';' + (t.band ? "" : grow(t.thick)) + '">' +
      '<b>' + escapeHTML(t.era) + '</b>' +
      (t.items.length ? '<span>' + escapeHTML(t.items.map(i => safe(i.name, "")).join("·")) + '</span>' : "") +
    '</div>').join("");
  const right = nbs.slice().reverse().map(L => {
    const tag = (o.tags || {})[L.n];
    return '<div class="cmp-band nb' + (L.band ? " bnd" : "") + (links && links[L.n] ? " linked" : "") + (st && st.layerN === L.n ? " same" : "") +
      '" data-side="nb" data-n="' + L.n + '" style="' + (L.band ? "" : grow(L.thick)) + '">' +
      '<b>' + L.n + '층</b>' +
      '<span class="n-fossils">' + (L.band ? '<em>' + escapeHTML(safe(L.label, "검은 경계층")) + '</em>' :
        L.fossils.map(id => '<i class="item-visual-slot" data-item="' + id + '"></i>' + escapeHTML(safe((itemById(id) || {}).name, id))).join(" ")) + '</span>' +
      (tag ? '<span class="cmp-tag gold">' + escapeHTML(tag) + '</span>' : "") +
    '</div>';
  }).join("") + (s2.hiddenBase ? '<div class="cmp-band nb base"><span>' + escapeHTML(s2.hiddenBase) + '</span></div>' : "");
  return '<div class="m-compare' + (o.live ? " live" : "") + '" id="mCompare">' +
    '<div class="cmp-col"><div class="m-col-title">' + escapeHTML(safe(s2.ourTitle, "우리 공원")) + '</div><div class="cmp-column">' + left + '</div></div>' +
    '<svg class="cmp-lines" id="cmpLines" aria-hidden="true"></svg>' +
    '<div class="cmp-col"><div class="m-col-title">' + escapeHTML(safe(s2.neighborTitle, "이웃 마을 노두")) + '</div><div class="cmp-column">' + right + '</div></div>' +
  '</div>';
}
/* 연결선 그리기. temp: 끌고 있는 임시 선 {x1,y1,x2,y2} (컨테이너 기준 좌표) */
function drawLinks(links, temp, sameTime){
  const wrap = $("mCompare"), svg = $("cmpLines");
  if(!wrap || !svg) return;
  const wr = wrap.getBoundingClientRect();
  svg.setAttribute("viewBox", "0 0 " + Math.max(1, wr.width) + " " + Math.max(1, wr.height));
  const anchor = el => {
    const r = el.getBoundingClientRect();
    const ours = el.getAttribute("data-side") === "ours";
    return { x: (ours ? r.right : r.left) - wr.left, y: r.top - wr.top + r.height / 2 };
  };
  const seg = (a, b, cls) =>
    '<line class="' + cls + '" x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '"></line>' +
    '<circle class="' + cls + '" cx="' + a.x + '" cy="' + a.y + '" r="5"></circle>' +
    '<circle class="' + cls + '" cx="' + b.x + '" cy="' + b.y + '" r="5"></circle>';
  let out = "";
  Object.keys(links || {}).forEach(n => {
    const a = wrap.querySelector('.cmp-band[data-side="ours"][data-key="' + links[n] + '"]');
    const b = wrap.querySelector('.cmp-band[data-side="nb"][data-n="' + n + '"]');
    if(a && b) out += seg(anchor(a), anchor(b), "done");
  });
  if(temp) out += seg({ x: temp.x1, y: temp.y1 }, { x: temp.x2, y: temp.y2 }, "drag");
  /* 같은 시기·다른 환경: 직접 연결선과 구별되는 점선 + 표시 */
  if(sameTime){
    const a = wrap.querySelector('.cmp-band[data-side="ours"][data-key="' + sameTime.ourKey + '"]');
    const b = wrap.querySelector('.cmp-band[data-side="nb"][data-n="' + sameTime.layerN + '"]');
    if(a && b){
      const pa = anchor(a), pb = anchor(b);
      const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
      out += '<line class="same" x1="' + pa.x + '" y1="' + pa.y + '" x2="' + pb.x + '" y2="' + pb.y + '"></line>' +
        '<text class="same" x="' + mx + '" y="' + (my - 8) + '" text-anchor="middle">' + escapeHTML(safe(sameTime.label, "같은 시기")) + '</text>';
    }
  }
  svg.innerHTML = out;
}
function sameTimeShown(){
  const m = missionState(), st = (finalMissionData().stage2 || {}).sameTime || null;
  return (m.sameTimeSeen && st) ? st : null;
}
window.addEventListener("resize", () => { if($("cmpLines")) drawLinks(missionState().links, null, sameTimeShown()); });
/* 완료 조건 표시: 직접 연결 / 상대 연령 판단 / 같은 시기·다른 환경 이해 */
function checklistHTML(){
  const s2 = finalMissionData().stage2 || {}, ck = s2.checklist || {};
  const m = missionState();
  const total = linkableLayers().length, done = linkableLayers().filter(L => !!m.links[L.n]).length;
  const item = (label, ok) => '<span class="m-check-item' + (ok ? " ok" : "") + '">' + escapeHTML(label) + '</span>';
  return '<div class="m-check">' +
    item(String(ck.links || "직접 연결 {done} / {total}").replace("{done}", done).replace("{total}", total), done >= total) +
    item(safe(ck.relative, "상대 연령 판단"), !!m.relDone) +
    item(safe(ck.sameTime, "같은 시기 · 다른 환경 이해"), !!m.closingDone) + '</div>';
}

function renderStage2(){
  const s2 = finalMissionData().stage2 || {};
  const m = missionState();
  const rel = s2.relative || {}, st = s2.sameTime || {};
  const linked = allLinked();
  const tags = {};
  if(m.relDone && rel.layerN) tags[rel.layerN] = safe(rel.tag, "");
  if(m.sameTimeSeen && st.layerN) tags[st.layerN] = safe(st.tag, "");
  let panel = checklistHTML();
  if(!linked){
    /* ① 확실한 단서가 있는 층만 직접 잇는다 */
    panel += '<div class="m-howto">' + escapeHTML(safe(s2.howto, "")) + '</div>' +
      (m2.feedback ? feedbackBox(m2.feedback, m2.fbKind) : "");
  }else if(!m.relDone){
    /* ② 산호층: 직접 대비는 못 하지만 위아래 관계로 상대적인 순서는 안다 */
    panel += (m2.feedback ? feedbackBox(m2.feedback, m2.fbKind) : "") +
      '<div class="m-prompt">' + escapeHTML(safe(rel.question, "")) + '</div>' +
      '<div class="m-howto">' + escapeHTML(safe(rel.howto, "")) + '</div>' +
      '<div class="rel-parts">' + (rel.parts || []).map((pt, i) =>
        '<span>' + escapeHTML(pt.text) + '</span>' +
        (pt.choices || []).map(c => '<button class="rel-choice' + (m2.relPick[i] === c ? " on" : "") + '" data-rel="' + i + '" data-val="' + escapeHTML(c) + '">' + escapeHTML(c) + '</button>').join("") +
        (i < (rel.parts || []).length - 1 ? '<span>,</span>' : '<span>.</span>')).join("") + '</div>' +
      '<div class="modal-actions"><button class="btn primary" id="m2RelCheck">' + escapeHTML(safe(rel.check, "확인")) + '</button></div>' +
      (m2.relFb ? feedbackBox(m2.relFb, "hint") : "");
  }else if(!m.relSeen){
    panel += '<div class="m-prompt done">' + escapeHTML(safe(rel.result, "")) + '</div>' +
      '<div class="quiz-feedback explain">' + escapeHTML(safe(rel.explain, "")) + '</div>' +
      '<div class="modal-actions"><button class="btn teal" id="m2RelNext">' + escapeHTML(safe(rel.next, "다음")) + '</button></div>';
  }else if(!m.sameTimeSeen){
    /* ③ 경계층 바로 아래 층끼리 비교: 같은 시기·다른 환경 (선으로 잇지 않고 점선으로 표시) */
    panel += '<div class="m-prompt">' + escapeHTML(safe(st.title, "")) + '</div>' +
      '<div class="quiz-feedback explain">' + escapeHTML(safe(st.text, "")) + '</div>' +
      (st.extra ? '<div class="m-note">' + escapeHTML(st.extra) + '</div>' : "") +
      '<div class="modal-actions"><button class="btn teal" id="m2SameNext">' + escapeHTML(safe(st.next, "다음")) + '</button></div>';
  }else{
    /* ④ 정리 문항 1개 → 완료 */
    const cl = s2.closing || {};
    if(m.closingDone){
      const dn = s2.done || {};
      panel += '<div class="m-prompt">' + escapeHTML(cl.question || "") + '</div>' +
        '<div class="quiz-feedback explain">' + escapeHTML(cl.explanation || "") + '</div>' +
        '<div class="m-complete"><div class="m-complete-title">' + escapeHTML(dn.title || "") + '</div><p>' + escapeHTML(dn.body || "") + '</p></div>' +
        '<div class="modal-actions"><button class="btn primary" id="m2Finish">탐사 완료</button></div>';
    }else{
      panel += '<div class="m-prompt">' + escapeHTML(cl.question || "") + '</div><div class="quiz-choices">' +
        (cl.choices || []).map((c, i) => '<button class="quiz-choice" data-close-ans="' + i + '"><span>' + ["①","②","③","④","⑤"][i] + '</span><span>' + escapeHTML(c) + '</span></button>').join("") +
        '</div>' + (m2.closingFb ? feedbackBox(m2.closingFb, "hint") : "");
    }
  }
  /* 같은 시기 표시는 ③을 본 뒤부터. ③ 화면에서는 미리 보여 주어 설명과 함께 읽게 한다 */
  const showSame = (m.sameTimeSeen || (linked && m.relSeen)) && st.layerN ? st : null;
  const body = $("missionBody");
  body.innerHTML =
    '<div class="m-request"><b>의뢰</b> ' + escapeHTML(s2.request || "") + '</div>' +
    compareHTML(m.links, { live: !linked, tags: tags, sameTime: showSame }) +
    '<div class="m-panel">' + panel + '</div>';
  body.querySelectorAll("[data-item]").forEach(el => renderAssetImage(el, itemById(el.getAttribute("data-item")), "normal"));
  drawLinks(m.links, null, showSame);
  if(!linked) setupLinking($("mCompare"));
  body.querySelectorAll("[data-rel]").forEach(b => b.addEventListener("click", () => {
    playSound("click"); m2.relPick[Number(b.getAttribute("data-rel"))] = b.getAttribute("data-val"); m2.relFb = ""; renderStage2();
  }));
  const rc = $("m2RelCheck"); if(rc) rc.addEventListener("click", checkRelative);
  const rn = $("m2RelNext"); if(rn) rn.addEventListener("click", () => { playSound("click"); m.relSeen = true; saveState(); renderStage2(); });
  const sn = $("m2SameNext"); if(sn) sn.addEventListener("click", () => { playSound("click"); m.sameTimeSeen = true; saveState(); renderStage2(); });
  body.querySelectorAll("[data-close-ans]").forEach(b => b.addEventListener("click", () => answerClosing(Number(b.getAttribute("data-close-ans")), b)));
  const fin = $("m2Finish"); if(fin) fin.addEventListener("click", finishMission);
}
/* 한 쌍을 이어 본다: 이웃 층 n ↔ 우리 공원 층 key */
function tryLink(n, key){
  const s2 = finalMissionData().stage2 || {};
  const m = missionState();
  const L = neighborLayers().find(x => x.n === n);
  if(!L || m.links[n]) return;
  if(L.answer === "none"){
    /* 직접 잇지 않는 층: 오답이 아니라 해석 방법만 안내한다 */
    playSound("click");
    m2.feedback = safe(L.skipNote, safe(s2.wrong, "")); m2.fbKind = "hint";
    renderStage2();
    return;
  }
  if(L.answer === key){
    m.links[n] = key; saveState();
    missionRecord("m2_link_" + n, "ERA", true);
    playSound("correct");
    m2.feedback = safe(s2.ok, "") + (L.note ? " " + L.note : ""); m2.fbKind = "explain";
  }else{
    missionRecord("m2_link_" + n, "ERA", false);
    playSound("wrong");
    m2.feedback = (L.wrongHints || {})[key] || safe(s2.wrong, ""); m2.fbKind = "hint";
  }
  renderStage2();
}
/* 끌어서 잇기 (마우스·터치 공용 pointer 이벤트). 어느 쪽 기둥에서 시작해도 되고, 반대쪽 층 위에서 놓으면 판정한다. */
function setupLinking(wrap){
  if(!wrap) return;
  const m = missionState();
  let drag = null, pid = null, over = null;
  const rel = e => { const r = wrap.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const anchorOf = el => {
    const r = el.getBoundingClientRect(), w = wrap.getBoundingClientRect();
    return { x: (el.getAttribute("data-side") === "ours" ? r.right : r.left) - w.left, y: r.top - w.top + r.height / 2 };
  };
  const setOver = el => {
    if(over === el) return;
    if(over) over.classList.remove("over");
    over = el;
    if(over) over.classList.add("over");
  };
  const move = e => {
    if(!drag || e.pointerId !== pid) return;
    e.preventDefault();
    const p = rel(e), a = anchorOf(drag.el);
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const band = under && under.closest ? under.closest(".cmp-band") : null;
    setOver(band && band.getAttribute("data-side") !== drag.side && wrap.contains(band) ? band : null);
    drawLinks(m.links, { x1: a.x, y1: a.y, x2: p.x, y2: p.y });
  };
  const finish = e => {
    if(!drag || e.pointerId !== pid) return;
    const target = over;
    drag.el.classList.remove("dragging");
    setOver(null);
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", finish);
    document.removeEventListener("pointercancel", finish);
    const d = drag; drag = null; pid = null;
    if(!target || e.type === "pointercancel"){ drawLinks(m.links); return; }
    if(target.classList.contains("base")) { drawLinks(m.links); return; }
    const n = Number(d.side === "nb" ? d.el.getAttribute("data-n") : target.getAttribute("data-n"));
    const key = d.side === "ours" ? d.el.getAttribute("data-key") : target.getAttribute("data-key");
    tryLink(n, key);
  };
  wrap.querySelectorAll(".cmp-band[data-side]").forEach(el => {
    el.addEventListener("pointerdown", e => {
      if(drag || (e.button !== undefined && e.button !== 0)) return;
      const side = el.getAttribute("data-side");
      if(side === "nb" && m.links[el.getAttribute("data-n")]) return;   // 이미 이은 층
      drag = { el: el, side: side }; pid = e.pointerId;
      el.classList.add("dragging");
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", finish);
      document.addEventListener("pointercancel", finish);
      e.preventDefault();
    });
  });
}
/* 산호층의 상대적 순서: 빈칸 두 개를 모두 맞게 골라야 한다 */
function checkRelative(){
  const rel = (finalMissionData().stage2 || {}).relative || {};
  const m = missionState();
  const parts = rel.parts || [];
  const ok = parts.length > 0 && parts.every((pt, i) => m2.relPick[i] === pt.answer);
  if(ok){
    missionRecord("m2_relative", "ERA", true);
    playSound("correct");
    m.relDone = true; saveState();
    m2.feedback = ""; m2.relFb = "";
  }else{
    missionRecord("m2_relative", "ERA", false);
    playSound("wrong");
    m2.feedback = "";
    m2.relFb = safe(rel.wrong, "다시 골라 보세요.");
  }
  renderStage2();
}
function answerClosing(idx, btn){
  const cl = (finalMissionData().stage2 || {}).closing || {};
  const m = missionState();
  const chosen = (cl.choices || [])[idx];
  if(chosen === cl.answer){
    missionRecord("m2_closing", "ENV", true);
    playSound("correct");
    m.closingDone = true; saveState();
    spawnConfetti();
  }else{
    missionRecord("m2_closing", "ENV", false);
    playSound("wrong");
    if(btn) btn.classList.add("wrong");
    m2.closingFb = safe(cl.hint, "다시 생각해 보자.");
  }
  renderStage2();
}
function finishMission(){
  const m = missionState();
  playSound("badge");
  if(!state.finalMissionDone){
    state.finalMissionDone = true;
    state.score = safe(state.score, 0) + 50;
  }
  m.stage = 3;
  saveState();
  updateHud();
  checkBadges();
  spawnConfetti();
  renderMission();
}

/* ---------- 완료 화면 ---------- */
function renderMissionComplete(){
  const c = finalMissionData().complete || {};
  const m = missionState();
  const s2 = finalMissionData().stage2 || {};
  const rel = s2.relative || {}, st = s2.sameTime || null;
  const tags = {};
  if(rel.layerN && rel.tag) tags[rel.layerN] = rel.tag;
  if(st && st.layerN && st.tag) tags[st.layerN] = st.tag;
  $("missionBody").innerHTML =
    '<div class="m-complete"><div class="m-complete-title">' + escapeHTML(c.title || "탐사 완료!") + '</div>' +
    '<p>' + escapeHTML(c.body || "") + '</p><p class="m-note">' + escapeHTML(c.note || "") + '</p></div>' +
    compareHTML(m.links, { clickable: true, tags: tags, sameTime: st }) +
    '<div class="m-panel"><div class="m-howto">' + escapeHTML(c.columnHint || "") + '</div><div id="mLayerInfo" class="m-layer-info"></div>' +
    '<div class="modal-actions"><button class="btn primary" id="mToResult">탐사 결과 보기</button></div></div>';
  $("missionBody").querySelectorAll("[data-item]").forEach(el => renderAssetImage(el, itemById(el.getAttribute("data-item")), "normal"));
  drawLinks(m.links, null, st);
  $("missionBody").querySelectorAll(".cmp-band.click").forEach(el => el.addEventListener("click", () => showColumnInfo(el.getAttribute("data-card"))));
  $("mToResult").addEventListener("click", () => { playSound("click"); closeModal("finalMissionModal"); openResultScreen(); });
  if(m.placed.length) showColumnInfo(m.placed[m.placed.length - 1]);
}
function showColumnInfo(cardId){
  const card = missionCards().find(c => c.id === cardId);
  const box = $("mLayerInfo");
  if(!card || !box) return;
  const ly = layerById(card.layer);
  const items = cardItems(card);
  box.innerHTML =
    '<div class="info-row"><div class="info-label">지층</div><div class="info-value">' + escapeHTML(safe(ly && ly.label, "")) + (card.band ? " " + (card.band === "upper" ? "위층" : "아래층") : "") + '</div></div>' +
    '<div class="info-row"><div class="info-label">지질 시대</div><div class="info-value">' + escapeHTML(safe(ly && ly.era, "")) + '</div></div>' +
    '<div class="info-row"><div class="info-label">대표 화석</div><div class="info-value icons">' + items.map(i => '<i class="item-visual-slot" data-item="' + i.id + '"></i>' + escapeHTML(safe(i.name, ""))).join(" · ") + '</div></div>' +
    '<div class="info-row"><div class="info-label">당시 환경</div><div class="info-value">' + escapeHTML(card.env || "") + '</div></div>';
  box.querySelectorAll("[data-item]").forEach(el => renderAssetImage(el, itemById(el.getAttribute("data-item")), "normal"));
  document.querySelectorAll("#missionBody .m-band, #missionBody .cmp-band").forEach(el => el.classList.toggle("sel", el.getAttribute("data-card") === cardId));
}

/* ---------- 보고서 PNG용 층서 기둥 ---------- */
function drawColumnOnCanvas(g, x, y, w, h, placed){
  const cards = missionCards();
  const n = Math.max(1, cards.length);
  const bh = Math.floor(h / n);
  g.font = "700 14px " + REPORT_FONT; g.textBaseline = "middle";
  cards.slice().reverse().forEach((card, i) => {
    const on = placed.indexOf(card.id) >= 0;
    const by = y + i * bh;
    const ly = layerById(card.layer);
    g.fillStyle = on ? cardColor(card) : "#d8cbb0";
    g.fillRect(x, by, w, bh);
    g.strokeStyle = "#3b2a20"; g.lineWidth = 2; g.strokeRect(x, by, w, bh);
    if(on && ly && ly.isBoundary){ g.fillStyle = "#1b140e"; g.fillRect(x, by + 3, w, 4); }
    g.fillStyle = on ? "#1b140e" : "#8a7a5d";
    const label = on ? (safe(ly && ly.label, "") + (card.band ? (card.band === "upper" ? " 위" : " 아래") : "") + " · " + safe(ly && ly.era, "")) : "?";
    g.fillText(fitText(g, label, w - 12), x + 6, by + bh / 2);
  });
}
