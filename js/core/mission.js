/* ==========================================================================
   최종 미션 · 흩어진 지층 기록을 완성하라
   1단계: 노두 카드를 오래된 것부터 쌓아 층서 기둥을 완성한다. 카드마다 환경·근거 화석 확인.
   2단계: 이름표 없는 이웃 마을 노두를 우리 공원 지층과 대비한다 (표준 화석이 열쇠).
   완료 : 완성된 층서 기둥을 크게 보여 준다. 층을 누르면 시대·화석·환경을 다시 본다.
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
  if(!Array.isArray(m.envDone)) m.envDone = [];
  if(!m.matched || typeof m.matched !== "object") m.matched = {};
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
function fillTpl(s, vars){ return String(s || "").replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined) ? vars[k] : ""); }
function itemById(id){ return itemData.find(i => i.id === id) || null; }
function cardItems(card){
  return itemData.filter(i => i.layer === card.layer && (!card.band || i.band === card.band) && !i.isEvidence);
}
/* 카드의 대표 화석 이름 (힌트용): 표준 화석 우선 */
function cardIndexFossil(card){
  const items = cardItems(card);
  const idx = items.find(i => /표준/.test(safe(i.group, ""))) || items[0];
  return idx ? safe(idx.name, "") : "";
}
function cardColor(card){
  const ly = layerById(card.layer);
  if(!ly) return "#c8a060";
  return card.band === "upper" ? safe(ly.color2, ly.color1) : safe(ly.color1, "#c8a060");
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
    html += '<div class="m-band' + (on ? " on" : " empty") + (ly && ly.isBoundary ? " bnd" : "") + (o.clickable && on ? " click" : "") + '"' +
      ' data-card="' + card.id + '" style="flex-basis:' + share + '%;' + (on ? "background:" + cardColor(card) + ";" : "") + '">' +
      (on ? '<b>' + escapeHTML(safe(ly && ly.label, card.layer)) + (card.band ? " " + (card.band === "upper" ? "위층" : "아래층") : "") + '</b>' +
            '<span>' + escapeHTML(o.small ? safe(ly && ly.era, "") : items) + '</span>'
          : '<span class="q">?</span>') +
      '</div>';
  });
  html += '<div class="m-base">기반암</div></div>';
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
  const names = ["1단계 지층 기둥", "2단계 이웃 노두", "탐사 완료"];
  steps.innerHTML = names.map((n, i) => '<span class="' + (m.stage === i + 1 ? "now" : (m.stage > i + 1 ? "done" : "")) + '">' + n + '</span>').join("");
  if(m.stage === 1) renderStage1();
  else if(m.stage === 2) renderStage2();
  else renderMissionComplete();
}
function feedbackBox(text, kind){
  return '<div class="quiz-feedback ' + (kind || "hint") + '" id="mFeedback">' + escapeHTML(text) + '</div>';
}

/* ---------- 1단계 ---------- */
let m1 = { phase: "pick", feedback: "", fbKind: "hint" };
function renderStage1(){
  const fm = finalMissionData(), st = fm.stage1 || {};
  const m = missionState();
  const cards = missionCards();
  const body = $("missionBody");
  const done = m.placed.length >= cards.length && m.envDone.length >= cards.length;
  /* 놓았지만 환경·근거 확인이 안 끝난 카드가 있으면 그 단계부터 */
  const pending = m.placed.find(id => m.envDone.indexOf(id) < 0);
  if(pending && m1.phase === "pick") m1.phase = "env";
  let right = "";
  if(done){
    right = '<div class="m-prompt done">' + escapeHTML(st.done || "") + '</div>' +
      '<div class="modal-actions"><button class="btn primary" id="m1Next">2단계로</button></div>';
  }else if(m1.phase === "pick"){
    const remaining = shuffledCards().filter(c => m.placed.indexOf(c.id) < 0);
    right = '<div class="m-prompt">' + escapeHTML(st.askNext || "") + '</div><div class="m-cards">' +
      remaining.map(c => {
        const its = cardItems(c);
        return '<button class="m-card" data-card="' + c.id + '">' +
          '<span class="m-card-icons">' + its.map(i => '<i class="item-visual-slot" data-item="' + i.id + '"></i>').join("") + '</span>' +
          '<span class="m-card-title">' + escapeHTML(c.title) + '</span></button>';
      }).join("") + '</div>' + (m1.feedback ? feedbackBox(m1.feedback, m1.fbKind) : "");
  }else{
    const card = cards.find(c => c.id === pending);
    const ly = layerById(card.layer);
    const head = '<div class="m-current">방금 쌓은 층: <b>' + escapeHTML(card.title) + '</b></div>';
    if(m1.phase === "env"){
      right = head + '<div class="m-prompt">' + escapeHTML(st.askEnv || "") + '</div><div class="m-choices">' +
        (fm.envOptions || []).map(e => '<button class="m-choice" data-env="' + escapeHTML(e) + '">' + escapeHTML(e) + '</button>').join("") + '</div>';
    }else{
      const own = cardItems(card);
      const others = itemData.filter(i => !i.isEvidence && own.indexOf(i) < 0);
      const d1 = others[(missionCards().indexOf(card) * 3) % others.length];
      const d2 = others[(missionCards().indexOf(card) * 3 + 5) % others.length];
      const choices = own.concat([d1, d2].filter((x, i, a) => x && a.indexOf(x) === i && own.indexOf(x) < 0));
      right = head + '<div class="m-prompt">' + escapeHTML(st.askEvidence || "") + '</div><div class="m-choices icons">' +
        choices.map(i => '<button class="m-choice" data-ev="' + i.id + '"><i class="item-visual-slot" data-item="' + i.id + '"></i>' + escapeHTML(safe(i.name, "")) + '</button>').join("") + '</div>';
    }
    right += (m1.feedback ? feedbackBox(m1.feedback, m1.fbKind) : "");
    void ly;
  }
  body.innerHTML =
    '<div class="m-howto">' + escapeHTML(st.howto || "") + '</div>' +
    '<div class="m-layout"><div class="m-left"><div class="m-col-title">우리 공원 지층 기둥 <small>' + m.placed.length + ' / ' + cards.length + '</small></div>' +
    stratColumnHTML(m.placed, {}) + '</div><div class="m-right">' + right + '</div></div>';
  body.querySelectorAll("[data-item]").forEach(el => renderAssetImage(el, itemById(el.getAttribute("data-item")), "normal"));
  /* 이벤트 */
  body.querySelectorAll(".m-card").forEach(b => b.addEventListener("click", () => pickCard(b.getAttribute("data-card"))));
  body.querySelectorAll("[data-env]").forEach(b => b.addEventListener("click", () => pickEnv(pending, b.getAttribute("data-env"))));
  body.querySelectorAll("[data-ev]").forEach(b => b.addEventListener("click", () => pickEvidence(pending, b.getAttribute("data-ev"))));
  const nx = $("m1Next");
  if(nx) nx.addEventListener("click", () => { playSound("click"); m.stage = 2; saveState(); renderMission(); });
}
function pickCard(cardId){
  const st = finalMissionData().stage1 || {};
  const m = missionState();
  const cards = missionCards();
  const next = cards[m.placed.length];
  if(!next) return;
  if(cardId === next.id){
    m.placed.push(cardId);
    missionRecord("m1_order_" + cardId, "ERA", true);
    playSound("found");
    m1 = { phase: "env", feedback: fillTpl(st.placed, { title: next.title }), fbKind: "explain" };
  }else{
    missionRecord("m1_order_" + next.id, "ERA", false);
    playSound("wrong");
    m1.feedback = fillTpl(st.wrongOrder, { fossil: cardIndexFossil(next) });
    m1.fbKind = "hint";
  }
  renderStage1();
}
function pickEnv(cardId, env){
  const st = finalMissionData().stage1 || {};
  const card = missionCards().find(c => c.id === cardId);
  if(!card) return;
  if(env === card.env){
    missionRecord("m1_env_" + cardId, "ENV", true);
    playSound("correct");
    m1 = { phase: "evidence", feedback: "", fbKind: "hint" };
  }else{
    missionRecord("m1_env_" + cardId, "ENV", false);
    playSound("wrong");
    m1.feedback = st.wrongEnv || ""; m1.fbKind = "hint";
  }
  renderStage1();
}
function pickEvidence(cardId, itemId){
  const st = finalMissionData().stage1 || {};
  const m = missionState();
  const card = missionCards().find(c => c.id === cardId);
  if(!card) return;
  const it = itemById(itemId);
  if((card.evidence || []).indexOf(itemId) >= 0){
    missionRecord("m1_ev_" + cardId, "IDX", true);
    playSound("correct");
    if(m.envDone.indexOf(cardId) < 0) m.envDone.push(cardId);
    saveState();
    m1 = { phase: "pick", feedback: "", fbKind: "hint" };
  }else{
    missionRecord("m1_ev_" + cardId, "IDX", false);
    playSound("wrong");
    const own = cardItems(card).some(i => i.id === itemId);
    const per = (card.wrongEvidence || {})[itemId];
    m1.feedback = per ? per : fillTpl(own ? st.wrongEvidenceIndex : st.wrongEvidenceOther, { fossil: safe(it && it.name, "") });
    m1.fbKind = "hint";
  }
  renderStage1();
}

/* ---------- 2단계 ---------- */
let m2 = { phase: "match", pick: null, feedback: "", fbKind: "hint", explain: "", closingFb: "", closingKind: "hint" };
function neighborLayers(){ return (finalMissionData().stage2 || {}).layers || []; }
function neighborLayerLabel(n){
  const s2 = finalMissionData().stage2 || {};
  const L = neighborLayers().find(l => l.n === n);
  if(!L) return "";
  if(L.band) return "화석 없음 · 얇고 검은 띠";
  return L.fossils.map(id => safe((itemById(id) || {}).name, id)).join(", ");
}
function matchChoices(){
  const s2 = finalMissionData().stage2 || {};
  const list = layerData.map(ly => ({
    key: ly.id,
    label: ly.isBoundary ? "지층 " + ly.id + " · " + safe(s2.boundaryLabel, "경계층") : safe(ly.label, ly.id) + " · " + safe(ly.era, "")
  }));
  list.push({ key: "none", label: safe(s2.noneLabel, "시대를 정할 수 없음") });
  return list;
}
function renderStage2(){
  const fm = finalMissionData(), s2 = fm.stage2 || {};
  const m = missionState();
  const layers = neighborLayers();
  const cur = layers.find(L => !m.matched[L.n]);
  const allMatched = !cur;
  /* 왼쪽: 이웃 노두 기둥 (위→아래) */
  let left = '<div class="m-col-title">이웃 마을 노두</div><div class="n-column">' +
    layers.slice().reverse().map(L => {
      const done = !!m.matched[L.n];
      const isCur = cur && cur.n === L.n;
      let tag = "";
      if(done){
        const ans = m.matched[L.n];
        tag = L.doneTag ? L.doneTag : (ans === "none" ? safe(s2.noneTag, "시대 판정 불가") : (ans === "D" ? "경계층" : "지층 " + ans));
      }
      return '<div class="n-layer' + (L.band ? " band" : "") + (isCur ? " cur" : "") + (done ? " done" : "") + '">' +
        '<b>' + L.n + '층</b>' +
        '<span class="n-fossils">' + (L.band ? '<em>얇고 검은 띠 · 화석 없음</em>' :
          L.fossils.map(id => '<i class="item-visual-slot" data-item="' + id + '"></i>' + escapeHTML(safe((itemById(id) || {}).name, id))).join(" ")) + '</span>' +
        (done ? '<span class="n-tag">' + escapeHTML(tag) + '</span>' : (isCur ? '<span class="n-tag now">조사 중</span>' : "")) +
        '</div>';
    }).join("") + '</div>';
  /* 오른쪽 */
  let right = "";
  if(allMatched){
    const cl = s2.closing || {};
    if(m.closingDone){
      right = '<div class="m-prompt">' + escapeHTML(cl.question || "") + '</div>' +
        '<div class="quiz-feedback explain">' + escapeHTML(cl.explanation || "") + '</div>' +
        (cl.extra ? '<div class="m-note">' + escapeHTML(cl.extra) + '</div>' : "") +
        '<div class="modal-actions"><button class="btn primary" id="m2Finish">탐사 완료</button></div>';
    }else{
      right = '<div class="m-prompt">' + escapeHTML(cl.question || "") + '</div><div class="quiz-choices">' +
        (cl.choices || []).map((c, i) => '<button class="quiz-choice" data-close-ans="' + i + '"><span>' + ["①","②","③","④","⑤"][i] + '</span><span>' + escapeHTML(c) + '</span></button>').join("") +
        '</div>' + (m2.closingFb ? feedbackBox(m2.closingFb, m2.closingKind) : "");
    }
  }else if(m2.explain){
    right = '<div class="m-current">' + cur.n + '층 · ' + escapeHTML(neighborLayerLabel(cur.n)) + '</div>' +
      '<div class="quiz-feedback explain">' + escapeHTML(m2.explain) + '</div>' +
      '<div class="modal-actions"><button class="btn teal" id="m2Next">' + (layers.indexOf(cur) === layers.length - 1 ? "마무리 문항" : "다음 층") + '</button></div>';
  }else if(cur.era && !m2.eraDone && m2.phase === "match"){
    /* 시대 먼저 묻기 (era 단계) */
    right = '<div class="m-current">' + cur.n + '층 · 발견된 것: ' + escapeHTML(neighborLayerLabel(cur.n)) + '</div>' +
      '<div class="m-prompt">' + escapeHTML(cur.era.ask || "") + '</div><div class="m-choices">' +
      (cur.era.choices || []).map(c => '<button class="m-choice" data-era="' + escapeHTML(c) + '">' + escapeHTML(c) + '</button>').join("") + '</div>' +
      (m2.feedback ? feedbackBox(m2.feedback, m2.fbKind) : "");
  }else if(cur.era && !m2.eraDone && m2.phase === "eraKey"){
    right = '<div class="m-current">' + cur.n + '층 → <b>' + escapeHTML(cur.era.answer || "") + '</b></div>' +
      '<div class="m-prompt">' + escapeHTML(cur.era.askKey || s2.askKey || "") + '</div><div class="m-choices icons">' +
      cur.fossils.map(id => '<button class="m-choice" data-era-key="' + id + '"><i class="item-visual-slot" data-item="' + id + '"></i>' + escapeHTML(safe((itemById(id) || {}).name, id)) + '</button>').join("") + '</div>' +
      (m2.feedback ? feedbackBox(m2.feedback, m2.fbKind) : "");
  }else if(m2.phase === "match"){
    const choices = Array.isArray(cur.matchChoices) ? cur.matchChoices : matchChoices();
    right = '<div class="m-current">' + cur.n + '층 · 발견된 것: ' + escapeHTML(neighborLayerLabel(cur.n)) + '</div>' +
      '<div class="m-prompt">' + escapeHTML(cur.askMatch || s2.askMatch || "") + '</div><div class="m-choices">' +
      choices.map(c => '<button class="m-choice" data-match="' + c.key + '">' + escapeHTML(c.label) + '</button>').join("") + '</div>' +
      (m2.feedback ? feedbackBox(m2.feedback, m2.fbKind) : "");
  }else{
    const picked = matchChoices().find(c => c.key === m2.pick);
    const opts = [];
    if(cur.band){
      opts.push({ key: "order", label: safe((s2.reasons || {}).order, "") });
      opts.push({ key: "band", label: safe((s2.reasons || {}).band, "") });
    }else{
      cur.fossils.forEach(id => opts.push({ key: id, label: safe((itemById(id) || {}).name, id), item: id }));
      opts.push({ key: "order", label: safe((s2.reasons || {}).order, "") });
    }
    right = '<div class="m-current">' + cur.n + '층 → <b>' + escapeHTML(picked ? picked.label : "") + '</b></div>' +
      '<div class="m-prompt">' + escapeHTML(s2.askKey || "") + '</div><div class="m-choices icons">' +
      opts.map(o => '<button class="m-choice" data-key="' + o.key + '">' + (o.item ? '<i class="item-visual-slot" data-item="' + o.item + '"></i>' : "") + escapeHTML(o.label) + '</button>').join("") + '</div>' +
      '<button class="btn ghost small" id="m2Back">지층 다시 고르기</button>' +
      (m2.feedback ? feedbackBox(m2.feedback, m2.fbKind) : "");
  }
  $("missionBody").innerHTML =
    '<div class="m-request"><b>의뢰</b> ' + escapeHTML(s2.request || "") + '</div>' +
    '<div class="m-howto">' + escapeHTML(s2.howto || "") + '</div>' +
    '<div class="m-layout"><div class="m-left">' + left + '</div><div class="m-right">' + right + '</div></div>';
  const body = $("missionBody");
  body.querySelectorAll("[data-item]").forEach(el => renderAssetImage(el, itemById(el.getAttribute("data-item")), "normal"));
  body.querySelectorAll("[data-era]").forEach(b => b.addEventListener("click", () => pickEra(cur, b.getAttribute("data-era"))));
  body.querySelectorAll("[data-era-key]").forEach(b => b.addEventListener("click", () => pickEraKey(cur, b.getAttribute("data-era-key"))));
  body.querySelectorAll("[data-match]").forEach(b => b.addEventListener("click", () => pickMatch(cur, b.getAttribute("data-match"))));
  body.querySelectorAll("[data-key]").forEach(b => b.addEventListener("click", () => pickKey(cur, b.getAttribute("data-key"))));
  body.querySelectorAll("[data-close-ans]").forEach(b => b.addEventListener("click", () => answerClosing(Number(b.getAttribute("data-close-ans")), b)));
  const bk = $("m2Back"); if(bk) bk.addEventListener("click", () => { playSound("click"); m2 = { phase: "match", pick: null, feedback: "", fbKind: "hint", explain: "" }; renderStage2(); });
  const nx = $("m2Next"); if(nx) nx.addEventListener("click", () => { playSound("click"); m2 = { phase: "match", pick: null, feedback: "", fbKind: "hint", explain: "" }; renderStage2(); });
  const fin = $("m2Finish"); if(fin) fin.addEventListener("click", finishMission);
}
/* era 단계: 대비 전에 먼저 시대를 판단한다 (공룡 → 중생대) */
function pickEra(L, choice){
  const era = L.era || {};
  if(choice === era.answer){
    missionRecord("m2_era_" + L.n, "ERA", true);
    playSound("correct");
    m2.phase = "eraKey"; m2.feedback = "";
  }else{
    missionRecord("m2_era_" + L.n, "ERA", false);
    playSound("wrong");
    m2.feedback = safe(era.wrong, "다시 생각해 보자."); m2.fbKind = "hint";
  }
  renderStage2();
}
function pickEraKey(L, key){
  const s2 = finalMissionData().stage2 || {};
  const era = L.era || {};
  const trap = (era.trap || {})[key];
  if(trap){
    missionRecord("m2_erakey_" + L.n, "IDX", false);
    playSound("wrong");
    m2.feedback = trap; m2.fbKind = "hint";
  }else if((era.key || []).indexOf(key) >= 0){
    missionRecord("m2_erakey_" + L.n, "IDX", true);
    playSound("correct");
    m2.eraDone = true; m2.phase = "match"; m2.pick = null;
    m2.feedback = safe(era.feedback, ""); m2.fbKind = "explain";
  }else{
    missionRecord("m2_erakey_" + L.n, "IDX", false);
    playSound("wrong");
    m2.feedback = safe(s2.wrongMatch, ""); m2.fbKind = "hint";
  }
  renderStage2();
}
function pickMatch(L, key){
  const s2 = finalMissionData().stage2 || {};
  const m = missionState();
  playSound("click");
  m2.pick = key;
  if(L.skipKey){
    /* 근거를 따로 묻지 않는 층 (위치 관계를 질문에 담은 경우) */
    const answerKey = L.answer === "boundary" ? "D" : L.answer;
    if(key === answerKey){
      missionRecord("m2_match_" + L.n, "ERA", true);
      playSound("correct");
      m.matched[L.n] = answerKey; saveState();
      m2 = { phase: "match", pick: null, feedback: "", fbKind: "hint", explain: L.explain || "" };
    }else{
      missionRecord("m2_match_" + L.n, "ERA", false);
      playSound("wrong");
      const per = (L.wrongMatch && typeof L.wrongMatch === "object") ? L.wrongMatch[key] : null;
      m2.feedback = per || safe(s2.wrongMatch, ""); m2.fbKind = "hint";
      m2.eraDone = true; m2.phase = "match"; m2.pick = null;
    }
    renderStage2();
    return;
  }
  if(L.answer === "none"){
    if(key === "none"){
      missionRecord("m2_match_" + L.n, "ERA", true);
      playSound("correct");
      m.matched[L.n] = "none"; saveState();
      m2 = { phase: "match", pick: null, feedback: "", fbKind: "hint", explain: L.explain || "" };
    }else{
      /* 시대를 골랐다면 근거를 물어 함정(산호)을 겪게 한다 */
      m2.phase = "key"; m2.feedback = "";
    }
  }else{
    /* 정답이든 아니든 근거를 묻는다 — 근거가 이 미션의 핵심 */
    m2.phase = "key"; m2.feedback = "";
  }
  renderStage2();
}
function pickKey(L, key){
  const s2 = finalMissionData().stage2 || {};
  const m = missionState();
  const answerKey = L.answer === "boundary" ? "D" : L.answer;
  const trap = (L.trap || {})[key];
  if(trap){
    missionRecord("m2_key_" + L.n, "IDX", false);
    playSound("wrong");
    m2.feedback = trap; m2.fbKind = "hint";
    if(L.answer === "none"){ m2.phase = "match"; m2.pick = null; }
    renderStage2();
    return;
  }
  const keyOk = (L.key || []).indexOf(key) >= 0;
  const matchOk = m2.pick === answerKey;
  if(matchOk && keyOk){
    missionRecord("m2_match_" + L.n, "ERA", true);
    missionRecord("m2_key_" + L.n, "IDX", true);
    playSound("correct");
    m.matched[L.n] = answerKey; saveState();
    m2 = { phase: "match", pick: null, feedback: "", fbKind: "hint",
           explain: L.explain || "" };
  }else if(!keyOk){
    missionRecord("m2_key_" + L.n, "IDX", false);
    playSound("wrong");
    m2.feedback = key === "order"
      ? (L.band ? safe(s2.wrongOrderBand, "순서만으로는 경계층인지 알 수 없다.") : safe(s2.wrongOrderKey, "아래위 층의 순서로는 범위만 좁힐 수 있다. 이 층에는 시대를 정해 주는 표준 화석이 있다."))
      : safe(s2.wrongMatch, "");
    m2.fbKind = "hint";
  }else{
    missionRecord("m2_match_" + L.n, "ERA", false);
    playSound("wrong");
    m2.feedback = safe(s2.wrongMatch, ""); m2.fbKind = "hint";
    m2.phase = "match"; m2.pick = null;
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
  }else{
    missionRecord("m2_closing", "ENV", false);
    playSound("wrong");
    if(btn) btn.classList.add("wrong");
    m2.closingFb = safe(cl.hint, "다시 생각해 보자."); m2.closingKind = "hint";
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
  $("missionBody").innerHTML =
    '<div class="m-complete"><div class="m-complete-title">' + escapeHTML(c.title || "탐사 완료!") + '</div>' +
    '<p>' + escapeHTML(c.body || "") + '</p><p class="m-note">' + escapeHTML(c.note || "") + '</p></div>' +
    '<div class="m-layout"><div class="m-left big">' + stratColumnHTML(m.placed, { clickable: true }) + '</div>' +
    '<div class="m-right"><div class="m-howto">' + escapeHTML(c.columnHint || "") + '</div><div id="mLayerInfo" class="m-layer-info"></div>' +
    '<div class="modal-actions"><button class="btn primary" id="mToResult">탐사 결과 보기</button></div></div></div>';
  $("missionBody").querySelectorAll(".m-band.click").forEach(el => el.addEventListener("click", () => showColumnInfo(el.getAttribute("data-card"))));
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
  document.querySelectorAll("#missionBody .m-band").forEach(el => el.classList.toggle("sel", el.getAttribute("data-card") === cardId));
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
  g.fillStyle = "#6e6672"; g.fillRect(x, y + n * bh, w, 16);
  g.strokeStyle = "#3b2a20"; g.strokeRect(x, y + n * bh, w, 16);
  g.fillStyle = "#fff8e6"; g.font = "700 11px " + REPORT_FONT;
  g.fillText("기반암", x + 6, y + n * bh + 8);
}
