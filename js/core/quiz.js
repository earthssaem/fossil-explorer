/* ---------- 퀴즈 · 도감 등록 · 층 정보 ---------- */
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
    b.innerHTML = "<span>" + (q.type === "ox" ? c : safe(marks[i], "·")) + "</span><span>" + (q.type === "ox" ? (c === "O" ? "O (맞다)" : "X (틀리다)") : escapeHTML(c)) + "</span>";
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
  toast("탐사 도감에 등록: 「" + itemDisplayName(item) + "」");
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
  maybeParkComplete(); /* 경계층의 흔적까지 모두 등록해야 최종 미션이 열리므로 여기서도 확인 */
  /* 전부 수집 시 축하 연출 */
  if(state.completed.length >= itemData.length){
    setTimeout(showAllCollected, 1400);
  }
}
function showAllCollected(){
  /* 다른 창(퀴즈 등)이 열려 있으면 닫힐 때까지 기다린다 */
  if(anyModalOpen()){ setTimeout(showAllCollected, 800); return; }
  playSound("badge");
  $("cinematicTitle").textContent = "도감 완성";
  $("cinematicSub").textContent = "모든 단서를 수집했다. 이제 북쪽 전망대에서 흩어진 기록을 하나로 잇자.";
  const btn = $("btnCinematicGo");
  btn.textContent = "전망대로 가자";
  btn.onclick = () => {
    $("cinematicOverlay").classList.remove("on");
    btn.onclick = defaultCinematicGo;
    btn.textContent = "계속";
    if(state.finalMissionDone) openResultScreen();
  };
  openCinematic();
  spawnConfetti();
}
function defaultCinematicGo(){ playSound("click"); $("cinematicOverlay").classList.remove("on"); }

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
  $("layerModalInfo").innerHTML = html;
  openModal("layerModal");
}

/* ---------- HUD ---------- */
