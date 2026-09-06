/* ---------- 퀴즈 · 도감 등록 · 최종 미션(가설 평가) · 층 정보 ---------- */
function startQuiz(itemId){
  const item = itemData.find(i => i.id === itemId);
  if(!item || !Array.isArray(item.quiz) || !item.quiz.length){ completeItem(itemId); return; }
  quiz.itemId = itemId;
  quiz.list = item.quiz;
  quiz.heading = safe(item.name,"단서") + " · 단서를 보고 추리한다";
  quiz.finishLabel = "도감에 기록 추가";
  quiz.onFinish = () => completeItem(itemId);
  quiz.index = 0;
  quiz.attempts = 0;
  openModal("quizModal");
  renderQuizQuestion();
}
/* 최종 미션 직후 마무리 문항 (대멸종과 생물다양성) */
function startClosingQuiz(){
  const list = Array.isArray(missionData.closingQuiz) ? missionData.closingQuiz : [];
  if(!list.length){ openResultScreen(); return; }
  quiz.itemId = null;
  quiz.list = list;
  quiz.heading = "마무리 · 대멸종 이후 생물다양성은 어떻게 되었을까?";
  quiz.finishLabel = "탐사 결과 보기";
  quiz.onFinish = () => openResultScreen();
  quiz.index = 0;
  quiz.attempts = 0;
  openModal("quizModal");
  renderQuizQuestion();
}
function renderQuizQuestion(){
  const qs = quiz.list;
  if(!Array.isArray(qs) || !qs.length){ closeModal("quizModal"); return; }
  const q = qs[quiz.index];
  quiz.attempts = 0;
  $("quizItemName").textContent = quiz.heading;
  /* 진행 점 */
  let dots = "";
  qs.forEach((_, i) => {
    dots += '<span class="' + (i < quiz.index ? "done" : (i === quiz.index ? "now" : "")) + '"></span>';
  });
  $("quizDots").innerHTML = dots;
  $("quizQuestion").textContent = safe(q.question, "문항이 준비 중입니다.");
  const fb = $("quizFeedback");
  fb.className = "quiz-feedback";
  fb.textContent = "";
  $("quizActions").innerHTML = "";
  /* 선택지: choice(4지선다) / ox 지원 (확장 가능한 구조) */
  const choices = (q.type === "ox") ? ["O", "X"] : (Array.isArray(q.choices) ? q.choices : []);
  const box = $("quizChoices");
  box.innerHTML = "";
  const marks = ["①","②","③","④","⑤"];
  choices.forEach((c, i) => {
    const b = document.createElement("button");
    b.className = "quiz-choice";
    b.innerHTML = "<span>" + (q.type === "ox" ? c : safe(marks[i], "·")) + "</span><span>" + (q.type === "ox" ? (c === "O" ? "맞다" : "틀리다") : escapeHTML(c)) + "</span>";
    b.addEventListener("click", () => checkAnswer(c, b));
    box.appendChild(b);
  });
  if(!choices.length){
    box.innerHTML = '<p style="font-weight:700; color:#9a8a68;">선택지가 없어 자동으로 통과합니다. (교사용: quiz 데이터에 choices를 추가하세요)</p>';
    afterQuestionSolved(true);
  }
}
function checkAnswer(answer, btnEl){
  if(!Array.isArray(quiz.list) || !quiz.list[quiz.index]) return;
  const q = quiz.list[quiz.index];
  const correct = String(answer) === String(safe(q.answer, ""));
  const fb = $("quizFeedback");
  if(correct){
    playSound("correct");
    if(btnEl) btnEl.classList.add("correct");
    document.querySelectorAll("#quizChoices .quiz-choice").forEach(b => b.disabled = true);
    state.quizAnswered = safe(state.quizAnswered,0) + 1;
    if(quiz.attempts === 0){
      state.quizFirstCorrect = safe(state.quizFirstCorrect,0) + 1;
      state.combo = safe(state.combo,0) + 1;
      state.maxCombo = Math.max(safe(state.maxCombo,0), state.combo);
      state.score = safe(state.score,0) + 30;
      recordConcept(q.tag, true);   // 첫 시도 정답 → correct + total
    }else{
      state.score = safe(state.score,0) + 15;
      recordConcept(q.tag, false);  // 2회차 정답 → total만
    }
    saveState();
    updateHud();
    fb.className = "quiz-feedback explain";
    fb.textContent = "정답. 탐사 기록: " + safe(q.explanation, "");
    afterQuestionSolved(false);
  }else{
    playSound("wrong");
    if(btnEl){ btnEl.classList.add("wrong"); btnEl.disabled = true; }
    state.combo = 0;
    saveState();
    updateHud();
    quiz.attempts++;
    if(quiz.attempts === 1){
      fb.className = "quiz-feedback hint";
      fb.textContent = "다시 관찰해 보자. 힌트: " + safe(q.hint, "다시 한번 생각해 보자.") + " (한 번 더)";
    }else{
      /* 두 번째 오답: 정답과 해설 공개 후 다음으로 */
      document.querySelectorAll("#quizChoices .quiz-choice").forEach(b => b.disabled = true);
      state.quizAnswered = safe(state.quizAnswered,0) + 1;
      recordConcept(q.tag, false);  // 끝내 못 맞힘 → total만
      saveState();
      fb.className = "quiz-feedback explain";
      fb.textContent = "정답은 「" + safe(q.answer,"?") + "」. 탐사 기록: " + safe(q.explanation, "");
      afterQuestionSolved(false);
    }
  }
}
function afterQuestionSolved(){
  const isLast = quiz.index >= quiz.list.length - 1;
  const actions = $("quizActions");
  actions.innerHTML = "";
  const b = document.createElement("button");
  b.className = "btn teal";
  b.textContent = isLast ? safe(quiz.finishLabel, "확인") : "다음 단서";
  b.addEventListener("click", () => {
    playSound("click");
    if(isLast){
      closeModal("quizModal");
      const done = quiz.onFinish;
      if(typeof done === "function") done();
    }else{
      quiz.index++;
      renderQuizQuestion();
    }
  });
  actions.appendChild(b);
}

/* ---------- 아이템 완료(도감 등록 + 층 해금) ---------- */
function completeItem(itemId){
  const item = itemData.find(i => i.id === itemId);
  if(!item) return;
  if(!state.completed.includes(itemId)){
    state.completed.push(itemId);
    state.score = safe(state.score,0) + 20;
  }
  /* 층 정보 해금 */
  const layerId = safe(item.layer, null);
  let newLayer = false;
  if(layerId && !state.unlockedLayers.includes(layerId) && layerData.some(l => l.id === layerId)){
    state.unlockedLayers.push(layerId);
    newLayer = true;
  }
  saveState();
  playSound("register");
  toast("화석도감에 등록: 「" + safe(item.name,"화석") + "」");
  spawnConfetti();
  /* 확대 조사창 안의 조사 지점 상태 갱신
     (경계 노두 아래층처럼 한 화석이 여러 지점에서 나오는 경우가 있어 전부 갱신) */
  game.sites.filter(x => x.itemId === itemId && slotDug(x.slot)).forEach(s => {
    s.status = "collected";
    s.el.classList.remove("discovered","digging","near");
    s.el.classList.add("collected");
  });
  /* 조사창이 열려 있으면 최신 상태로 다시 그린다 (맵은 매 프레임 다시 그려진다) */
  if($("outcropModal").classList.contains("on") && game.currentOutcrop){
    openOutcropModal(game.currentOutcrop, true);
  }
  if(newLayer){
    setTimeout(() => {
      const ly = layerData.find(l => l.id === layerId);
      toast("지층 " + safe(ly && ly.id, "?") + "의 정체가 밝혀졌다: " + safe(ly && ly.hiddenName, "?"), "gold");
      playSound("place");
    }, 900);
  }
  updateHud();
  checkBadges();
  maybeParkComplete(); /* 증거 4종을 다 모아야 최종 미션이 열리므로 여기서도 확인 */
  /* 전부 수집 시 축하 연출 */
  if(state.completed.length >= itemData.length){
    setTimeout(showAllCollected, 1400);
  }
}
function showAllCollected(){
  /* 다른 창(최종 미션·퀴즈 등)이 열려 있으면 닫힐 때까지 기다린다 */
  if(anyModalOpen()){ setTimeout(showAllCollected, 800); return; }
  playSound("badge");
  $("cinematicTitle").textContent = "도감 완성";
  $("cinematicSub").textContent = "모든 단서를 수집했다. 이 공원 지층의 기록이 전부 밝혀졌다.";
  const btn = $("btnCinematicGo");
  btn.textContent = "탐사 결과 보기";
  btn.onclick = () => {
    $("cinematicOverlay").classList.remove("on");
    btn.onclick = defaultCinematicGo;
    btn.textContent = "계속";
    openResultScreen();
  };
  openCinematic();
  spawnConfetti();
}
function defaultCinematicGo(){ playSound("click"); $("cinematicOverlay").classList.remove("on"); }

/* ---------- 최종 미션: 대멸종 원인 가설의 타당성 평가 ----------
   정답을 하나 고르는 문제가 아니다. 증거를 가설에 배치하면서 평가 기준이
   얼마나 채워지는지 학생이 직접 확인한다. 소행성 충돌설과 화산 폭발설이
   둘 다 4칸을 채우는 것은 버그가 아니라 의도된 결과다. */
let selectedEvidence = null;   // 현재 고른 증거 카드 id

function finalMissionData(){
  const fm = (missionData && missionData.finalMission) ? missionData.finalMission : DEFAULT_MISSION_DATA.finalMission;
  const dflt = DEFAULT_MISSION_DATA.finalMission;
  return {
    title:       safe(fm.title, dflt.title),
    intro:       safe(fm.intro, dflt.intro),
    howto:       safe(fm.howto, dflt.howto),
    criteria:    Array.isArray(fm.criteria) && fm.criteria.length ? fm.criteria : dflt.criteria,
    hypotheses:  Array.isArray(fm.hypotheses) && fm.hypotheses.length ? fm.hypotheses : dflt.hypotheses,
    mismatchMsg: safe(fm.mismatchMsg, dflt.mismatchMsg),
    matchMsg:    safe(fm.matchMsg, dflt.matchMsg),
    closingTitle: safe(fm.closingTitle, dflt.closingTitle),
    closingBody: Array.isArray(fm.closingBody) ? fm.closingBody : dflt.closingBody,
    closingHighlight: safe(fm.closingHighlight, dflt.closingHighlight),
    closing:     safe(fm.closing, dflt.closing)
  };
}
/* 배치된 증거로부터 각 가설이 채운 평가 기준을 계산한다 */
function hypothesisFilled(hypKey){
  const filled = {};
  Object.keys(state.hypothesisPlaced || {}).forEach(evId => {
    if(state.hypothesisPlaced[evId] !== hypKey) return;
    const it = itemData.find(x => x.id === evId);
    const sup = it && it.supports ? it.supports[hypKey] : null;
    if(Array.isArray(sup)) sup.forEach(c => { filled[c] = true; });
  });
  return filled;
}
function allEvidencePlaced(){
  const ev = evidenceItems();
  return ev.length > 0 && ev.every(i => !!(state.hypothesisPlaced || {})[i.id]);
}

function openFinalMission(){
  const fm = finalMissionData();
  selectedEvidence = null;
  if(!state.hypothesisPlaced) state.hypothesisPlaced = {};
  $("finalTitle").textContent = "최종 미션 · " + fm.title;
  $("finalQuestion").textContent = fm.intro;
  $("finalHowto").textContent = fm.howto;
  const fb = $("finalFeedback");
  fb.className = "quiz-feedback"; fb.textContent = "";
  $("finalLegend").innerHTML = "평가 기준 — " +
    fm.criteria.map(c => "<b>" + escapeHTML(c.short) + "</b>: " + escapeHTML(c.label)).join(" · ");
  renderFinalMission();
  openModal("finalMissionModal");
  playSound("place");
}

function renderFinalMission(){
  const fm = finalMissionData();
  /* --- 증거 카드 트레이 --- */
  const tray = $("finalEvidence");
  tray.innerHTML = "";
  evidenceItems().forEach(it => {
    const placed = !!state.hypothesisPlaced[it.id];
    const card = document.createElement("div");
    card.className = "hypo-ev" + (placed ? " placed" : "") + (selectedEvidence === it.id ? " sel" : "");
    card.innerHTML = '<div class="ev-icon item-visual-slot"></div><span>' + escapeHTML(safe(it.name, "증거")) + '</span>';
    renderAssetImage(card.querySelector(".ev-icon"), it, "normal");
    if(!placed){
      card.draggable = true;
      card.addEventListener("dragstart", e => {
        selectedEvidence = it.id;
        try{ e.dataTransfer.setData("text/plain", it.id); }catch(err){}
      });
      card.addEventListener("click", () => {
        playSound("click");
        selectedEvidence = (selectedEvidence === it.id) ? null : it.id;
        renderFinalMission();
      });
    }
    tray.appendChild(card);
  });

  /* --- 가설 카드 --- */
  const grid = $("finalHypotheses");
  grid.innerHTML = "";
  fm.hypotheses.forEach(h => {
    const filled = hypothesisFilled(h.key);
    const cnt = fm.criteria.filter(c => filled[c.key]).length;
    const card = document.createElement("div");
    card.className = "hypo-h" + (selectedEvidence ? " armed" : "") + (cnt >= fm.criteria.length ? " full" : "");
    let html = '<div class="h-name">' + iconSVG(HYPO_ICONS[h.key] || "flag") + " " + escapeHTML(safe(h.name, "가설")) + '</div>' +
               '<div class="h-desc">' + escapeHTML(safe(h.desc, "")) + '</div>' +
               '<div class="hypo-crit">';
    fm.criteria.forEach(c => {
      html += '<div class="hypo-cell' + (filled[c.key] ? " on" : "") + '">' +
                '<span class="cbox">' + (filled[c.key] ? iconSVG("check") : "") + '</span>' +
                '<span>' + escapeHTML(c.short) + '</span>' +
              '</div>';
    });
    html += '</div><div class="h-score">' + cnt + " / " + fm.criteria.length + " 기준 충족</div>";
    card.innerHTML = html;
    const drop = () => placeEvidence(selectedEvidence, h.key, card);
    card.addEventListener("click", drop);
    card.addEventListener("dragover", e => e.preventDefault());
    card.addEventListener("drop", e => {
      e.preventDefault();
      let id = "";
      try{ id = e.dataTransfer.getData("text/plain"); }catch(err){}
      if(id) selectedEvidence = id;
      drop();
    });
    grid.appendChild(card);
  });
}

/* 증거를 가설에 배치한다 */
function placeEvidence(evId, hypKey, cardEl){
  const fm = finalMissionData();
  const fb = $("finalFeedback");
  if(!evId){
    fb.className = "quiz-feedback hint";
    fb.textContent = "먼저 아래 증거 카드를 하나 고르세요.";
    return;
  }
  if(state.hypothesisPlaced[evId]){ selectedEvidence = null; renderFinalMission(); return; }
  const it = itemData.find(x => x.id === evId);
  const sup = it && it.supports ? it.supports[hypKey] : null;
  const hyp = fm.hypotheses.find(h => h.key === hypKey);
  if(!Array.isArray(sup) || !sup.length){
    /* 뒷받침하지 못하는 조합 — 칸을 채우지 않고 안내만 한다 (틀렸다고 하지 않는다) */
    playSound("wrong");
    if(cardEl){ cardEl.classList.remove("reject"); void cardEl.offsetWidth; cardEl.classList.add("reject"); }
    fb.className = "quiz-feedback hint";
    fb.textContent = "「" + safe(it && it.name, "이 증거") + "」 → " + safe(hyp && hyp.name, "이 가설") + ": " + fm.mismatchMsg;
    return;
  }
  playSound("correct");
  state.hypothesisPlaced[evId] = hypKey;
  state.score = safe(state.score,0) + 15;
  selectedEvidence = null;
  saveState();
  updateHud();
  const names = sup.map(k => {
    const c = fm.criteria.find(x => x.key === k);
    return c ? c.short : k;
  });
  fb.className = "quiz-feedback explain";
  fb.textContent = "「" + safe(it.name, "증거") + "」 → " + safe(hyp && hyp.name, "가설") + ": " +
                   fm.matchMsg + " (" + names.join(" · ") + ")";
  renderFinalMission();
  if(allEvidencePlaced()) setTimeout(showHypothesisClosing, 500);
}

/* 증거를 모두 배치한 뒤의 마무리 — 어느 쪽이 정답이라고 말하지 않는다 */
function showHypothesisClosing(){
  const fm = finalMissionData();
  const full = fm.hypotheses.filter(h => {
    const f = hypothesisFilled(h.key);
    return fm.criteria.every(c => f[c.key]);
  });
  const box = $("finalClosing");
  let html = '<div class="cl-title">' +
    (full.length >= 2 ? escapeHTML(fm.closingTitle)
                      : "증거를 배치해 각 가설을 평가해 보았다.") + '</div><div class="cl-body">';
  if(full.length >= 2){
    html += '<p>네 기준을 모두 충족한 가설: <b>' +
            full.map(h => escapeHTML(safe(h.name, ""))).join("</b>, <b>") + '</b></p>';
  }
  fm.closingBody.forEach(t => { html += '<p>' + escapeHTML(t) + '</p>'; });
  html += '<span class="cl-hi">' + escapeHTML(fm.closingHighlight) + '</span></div>';
  box.innerHTML = html;
  box.classList.add("on");
  if(!state.finalMissionDone){
    state.finalMissionDone = true;
    state.score = safe(state.score,0) + 50;
    saveState();
    updateHud();
  }
  checkBadges();
  playSound("badge");
  const actions = $("finalActions");
  actions.innerHTML = "";
  const b = document.createElement("button");
  b.className = "btn teal";
  const hasClosingQuiz = Array.isArray(missionData.closingQuiz) && missionData.closingQuiz.length > 0;
  b.textContent = hasClosingQuiz ? "마무리 문항 풀기" : "탐사 결과 보기";
  b.addEventListener("click", () => {
    playSound("click");
    closeModal("finalMissionModal");
    if(hasClosingQuiz) startClosingQuiz();
    else openResultScreen();
  });
  actions.appendChild(b);
  box.scrollIntoView({ behavior: game.reducedMotion ? "auto" : "smooth", block: "nearest" });
}

/* ---------- 층 정보 모달 ---------- */
function openLayerModal(layerId){
  const ly = layerData.find(l => l.id === layerId);
  if(!ly) return;
  const unlocked = state.unlockedLayers.includes(layerId);
  $("layerModalTitle").textContent = safe(ly.label, "층") + (unlocked ? " · " + safe(ly.hiddenName, "") : " · ???");
  const items = itemData.filter(i => i.layer === layerId);
  const foundCnt = items.filter(i => state.completed.includes(i.id)).length;
  let html = "";
  html += '<div class="info-row"><div class="info-label">정체</div><div class="info-value' + (unlocked?"":" locked") + '">' +
          (unlocked ? escapeHTML(safe(ly.hiddenName,"-")) : "??? (이 층의 단서 퀴즈를 완료하면 해금)") + "</div></div>";
  html += '<div class="info-row"><div class="info-label">숨겨진 정보</div><div class="info-value' + (unlocked?"":" locked") + '">' +
          (unlocked ? escapeHTML(safe(ly.hiddenInfo,"-")) : "???") + "</div></div>";
  html += '<div class="info-row"><div class="info-label">단서 수집</div><div class="info-value">' + foundCnt + " / " + items.length + "</div></div>";
  if(ly.unconformityBelow){
    html += '<div class="info-row"><div class="info-label">부정합</div><div class="info-value">이 층과 바로 아래 지층 사이에는 쌓이지 않았거나 깎여 나간 시간이 있다. 노두 단면의 물결선이 그 경계다.</div></div>';
  }
  $("layerModalInfo").innerHTML = html;
  openModal("layerModal");
}

/* ---------- HUD ---------- */
