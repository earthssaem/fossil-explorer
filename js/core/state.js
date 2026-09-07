/* ---------- 상태 · 저장 · 개념별 성취 · 다양성 집계 · 데이터 점검 · 사운드 ---------- */

/* ---------- 전역 상태 ---------- */
const SAVE_KEY = "stratumExplorer_save_v3";

let itemData   = deepClone(DEFAULT_ITEM_DATA);
let layerData  = deepClone(DEFAULT_LAYER_DATA);
let badgeData  = deepClone(DEFAULT_BADGE_DATA);
let missionData = deepClone(DEFAULT_MISSION_DATA);
let noteData = deepClone(DEFAULT_NOTE_DATA);

let state = defaultState();
function defaultState(){
  return {
    discovered: [],      // 발굴한 아이템 id
    completed: [],       // 퀴즈까지 완료한 아이템 id
    unlockedLayers: [],  // 해금된 층 id
    badges: [],          // 획득 배지 id
    seenInDex: [],       // 도감에서 확인한 아이템 id (NEW 스티커 표시용)
    foundOutcrops: [],   // 근접해서 '발견'한 노두(층 id) — 미니맵에 표시
    dugSlots: [],        // 발굴을 끝낸 조사 지점 slot id (경계 노두는 한 화석이 여러 지점에서 나옴)
    visitedCells: [],    // 지나간 맵 칸 (미니맵 안개 걷힘)
    parkDone: false,     // 노두 6개 모두 조사 완료 연출을 봤는지
    evidenceCinematicShown: false, // 경계층 첫 증거 발견 연출을 봤는지
    nickname: "",        // 탐사대원 닉네임 (보고서에 표시)
    startedAt: "",       // 탐사 시작 시각 (보고서용)
    finalMissionDone: false, // 최종 미션(층서 복원) 완료 여부
    mission: {},             // 최종 미션 진행 { stage, placed:[], envDone:[], matched:{}, closingDone }
    score: 0,
    combo: 0,
    maxCombo: 0,
    quizAnswered: 0,     // 응답한 퀴즈 수
    quizFirstCorrect: 0, // 첫 시도 정답 수
    conceptStats: emptyConceptStats(), // 개념(태그)별 성취 {correct, total}
    seenZones: [],       // 구역 이름 배너를 본 구역 id
    talkedNpc: [],       // 대화한 NPC id (해설사 첫 대화 등)
    lastPlayed: ""
  };
}

/* 게임 진행용 런타임 변수 (맵·카메라·입력) */
const game = {
  running: false,
  /* x/y: 월드 좌표(px, 타일 16px 기준), face: 바라보는 방향(up/down/left/right) */
  player: { x: 0, y: 0, moving: false, face: "up", walkT: 0 },
  camX: 0, camY: 0,          // 카메라 (플레이어 추적, 경계 clamp)
  zoom: 3,                   // 타일 확대 배율 (16px 타일 → 48px)
  currentOutcrop: null,      // 열려 있는 조사창의 층 id
  autoTarget: null,          // 클릭 이동 경유지 {waypoints, then}
  input: { left: false, right: false, up: false, down: false },
  sites: [],                 // 조사창 안의 발굴 지점 런타임 정보
  near: null,                // 가까운 상호작용 대상 {kind:"outcrop"|"npc"|"gate"|"sign"|"lookout", ...}
  digging: null,             // {siteId, progress, timer}
  soundOn: true,
  reducedMotion: false,
  smallScreen: false,
  stepSoundTimer: 0,
  zone: null                 // 현재 서 있는 구역 id
};

/* ---------- 유틸 ---------- */
function $(id){ return document.getElementById(id); }
function deepClone(o){ return JSON.parse(JSON.stringify(o)); }
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function safe(v, fallback){ return (v === undefined || v === null || (typeof v === "number" && isNaN(v))) ? (fallback !== undefined ? fallback : "") : v; }
function escapeHTML(s){
  return String(safe(s)).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

/* ---------- 개념별 성취 기록 ---------- */
function emptyConceptStats(){
  const o = {};
  CONCEPT_KEYS.forEach(k => { o[k] = { correct: 0, total: 0 }; });
  return o;
}
/* 저장본이 옛 구조이거나 태그가 늘어난 경우에도 항상 5개 키를 갖도록 보정 */
function normalizeConceptStats(cs){
  const o = emptyConceptStats();
  if(cs && typeof cs === "object"){
    CONCEPT_KEYS.forEach(k => {
      const v = cs[k];
      if(v && typeof v === "object"){
        const total   = Math.max(0, Math.floor(Number(safe(v.total, 0)) || 0));
        const correct = Math.max(0, Math.floor(Number(safe(v.correct, 0)) || 0));
        o[k].total   = total;
        o[k].correct = Math.min(correct, total); // 손상된 저장본에서 correct > total 방지
      }
    });
  }
  return o;
}
/* 문항 하나가 최종적으로 마무리될 때 1회만 호출한다.
   firstTry=true(첫 시도 정답)일 때만 correct가 오르고, 그 밖에는 total만 오른다.
   태그가 없거나 알 수 없는 값이면 집계하지 않고 콘솔에 경고만 남긴다. */
function recordConcept(tag, firstTry){
  state.conceptStats = normalizeConceptStats(state.conceptStats);
  const t = String(safe(tag, "")).trim().toUpperCase();
  if(!t || CONCEPT_KEYS.indexOf(t) < 0){
    if(window.console && console.warn) console.warn("[개념 태그] 알 수 없는 tag: " + JSON.stringify(safe(tag,"(없음)")) + " — 개념별 성취에서 제외됩니다.");
    return;
  }
  state.conceptStats[t].total += 1;
  if(firstTry) state.conceptStats[t].correct += 1;
}
/* 아이템의 시대 (item.era 가 있으면 우선) */
function eraOfItem(item){
  if(!item) return null;
  if(item.era) return item.era;
  const ly = layerById(safe(item.layer, null));
  return ly ? safe(ly.era, null) : null;
}

/* 파일의 데이터를 직접 고쳤을 때 실수를 잡아 준다.
   학생 화면에는 아무것도 띄우지 않고 브라우저 콘솔(F12)에만 남긴다. */
function validateContentData(){
  const warns = [];
  const seen = {};
  itemData.forEach((it, i) => {
    const where = "itemData[" + i + "] " + safe(it.name, safe(it.id, "?"));
    if(!it.id) warns.push(where + ": id가 없습니다.");
    else if(seen[it.id]) warns.push(where + ": id가 중복되었습니다 (" + it.id + ").");
    else seen[it.id] = true;
    if(!layerData.some(l => l.id === it.layer)) warns.push(where + ": layer \"" + safe(it.layer,"") + "\" 에 해당하는 지층이 없습니다.");
    (Array.isArray(it.quiz) ? it.quiz : []).forEach((q, qi) => {
      const t = String(safe(q.tag, "")).trim().toUpperCase();
      if(!t) warns.push(where + " 문항 " + (qi+1) + ": tag가 없습니다 → 개념별 성취에서 빠집니다.");
      else if(CONCEPT_KEYS.indexOf(t) < 0) warns.push(where + " 문항 " + (qi+1) + ": tag \"" + safe(q.tag,"") + "\" 는 " + CONCEPT_KEYS.join("/") + " 중 하나여야 합니다.");
      if(q.type === "choice" && Array.isArray(q.choices) && q.choices.indexOf(q.answer) < 0){
        warns.push(where + " 문항 " + (qi+1) + ": answer가 choices 안에 없습니다.");
      }
      if(q.type === "choice" && Array.isArray(q.choices) && q.choices.indexOf("현재") >= 0){
        warns.push(where + " 문항 " + (qi+1) + ": 선택지에 \"현재\"가 있습니다 — 현재도 지질시대이므로 오개념이 됩니다.");
      }
    });
    const lyOf = layerData.find(l => l.id === it.layer);
    if(lyOf && Array.isArray(lyOf.bands) && lyOf.bands.length && !lyOf.bands.some(b => b.key === it.band)){
      warns.push(where + ": 지층 " + it.layer + "은(는) 띠(bands)로 나뉘어 있는데 band 값 \"" + safe(it.band, "") + "\" 이(가) 어느 띠와도 맞지 않습니다.");
    }
  });
  layerData.forEach(l => {
    if(!l.era) warns.push("layerData " + safe(l.id,"?") + ": era가 없어 다양성 그래프에서 빠집니다.");
  });
  if(!layerData.some(l => l.isBoundary)) warns.push("isBoundary인 지층이 없습니다 — 경계 노두의 검은 띠가 나타나지 않습니다.");
  const fm = DEFAULT_MISSION_DATA.finalMission || {};
  (fm.cards || []).forEach(c => {
    if(!layerData.some(l => l.id === c.layer)) warns.push("최종 미션 카드 " + c.id + ": 지층 " + c.layer + " 이(가) 없습니다.");
    (c.evidence || []).forEach(id => { if(!itemData.some(i => i.id === id)) warns.push("최종 미션 카드 " + c.id + ": 근거 화석 " + id + " 이(가) 없습니다."); });
  });
  if(warns.length && window.console && console.warn){
    console.warn("[화석 탐정] 데이터 점검 " + warns.length + "건\n· " + warns.join("\n· "));
  }
  return warns;
}

/* 결과 화면·보고서에서 쓰는 표시용 목록 (문항이 하나도 없는 개념은 제외) */
function conceptSummary(){
  const cs = normalizeConceptStats(state.conceptStats);
  return CONCEPT_TAGS.map(t => ({
    key: t.key, label: t.label, desc: t.desc,
    correct: cs[t.key].correct, total: cs[t.key].total
  })).filter(r => r.total > 0);
}

/* ---------- 저장 시스템 (localStorage, 실패해도 앱 유지) ---------- */
function loadState(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      state = Object.assign(defaultState(), parsed);
      // 배열 필드 방어
      ["discovered","completed","unlockedLayers","badges","seenInDex","foundOutcrops","visitedCells","dugSlots","seenZones","talkedNpc"].forEach(k=>{
        if(!Array.isArray(state[k])) state[k] = [];
      });
      state.conceptStats = normalizeConceptStats(state.conceptStats);
      if(!state.mission || typeof state.mission !== "object" || Array.isArray(state.mission)) state.mission = {};
      /* 띠가 없는 층은 slot id = 아이템 id 이므로, 발굴 기록을 맞춰 준다 */
      state.discovered.forEach(id => {
        const it = itemData.find(x => x.id === id);
        if(it && !isBandedLayer(it.layer) && state.dugSlots.indexOf(id) < 0) state.dugSlots.push(id);
      });
    }
  }catch(e){ /* localStorage 차단/오류 → 기본 상태로 진행 */ }
}
function saveState(){
  try{
    state.lastPlayed = new Date().toLocaleString();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }catch(e){ /* 저장 불가 환경에서도 게임은 계속 */ }
}
/* 진행 상황 초기화 — 콘텐츠는 항상 파일의 DEFAULT_* 를 쓰므로 지울 것은 진행 상황뿐이다 */
function resetProgress(){
  state = defaultState();
  try{
    localStorage.removeItem(SAVE_KEY);
  }catch(e){ /* localStorage 차단 환경에서도 계속 */ }
  game.digging = null;
  game.near = null;
  renderStartProgress();
  renderHelpMissions();
  updateHud();
}

/* ---------- 사운드 시스템 (Web Audio API, 외부 음원 없음) ---------- */
let audioCtx = null;
function ensureAudio(){
  if(audioCtx) {
    if(audioCtx.state === "suspended") audioCtx.resume().catch(()=>{});
    return;
  }
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    if(AC) audioCtx = new AC();
  }catch(e){ audioCtx = null; }
}
function tone(freq, dur, type, vol, delay){
  if(!audioCtx || !game.soundOn) return;
  try{
    const t0 = audioCtx.currentTime + (delay || 0);
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }catch(e){ }
}
function playSound(type){
  if(!game.soundOn) return;
  ensureAudio();
  if(!audioCtx) return;
  switch(type){
    case "click":    tone(660, .08, "triangle", .1); break;
    case "step":     tone(220 + Math.random()*40, .05, "triangle", .04); break;
    case "dig":      tone(320, .05, "triangle", .09); tone(260, .06, "triangle", .07, .08); break; /* 톡톡 */
    case "found":    tone(523, .12, "triangle", .12); tone(659, .12, "triangle", .12, .1); tone(784, .2, "triangle", .13, .2); break;
    case "correct":  tone(523, .1, "sine", .12); tone(784, .18, "sine", .13, .1); break;
    case "wrong":    tone(220, .18, "sawtooth", .08); tone(180, .22, "sawtooth", .07, .12); break;
    case "register": tone(392, .1, "triangle", .1); tone(523, .1, "triangle", .11, .09); tone(659, .1, "triangle", .12, .18); tone(1047, .25, "triangle", .12, .27); break;
    case "badge":    tone(659, .12, "square", .07); tone(784, .12, "square", .07, .11); tone(988, .12, "square", .08, .22); tone(1319, .3, "square", .08, .33); break;
    case "place":    tone(440, .15, "sine", .1); tone(660, .25, "sine", .12, .13); break;
    default:         tone(440, .08, "sine", .08);
  }
}

/* ---------- 8비트 배경음 (시작 화면 전용, 외부 음원 없음) ----------
   8분음표 단위 시퀀스. 리드는 사각파, 베이스는 삼각파. 화면을 벗어나면 멈춘다. */
const BGM = { on: false, step: 0, nextT: 0, timer: null };
const BGM_STEP = 0.15;   // 8분음표 길이(초) ≈ 100bpm
const BGM_NOTES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteHz(n){
  if(!n) return 0;
  const m = /^([A-G])(#?)(\d)$/.exec(n);
  if(!m) return 0;
  const semi = BGM_NOTES[m[1]] + (m[2] ? 1 : 0) + (parseInt(m[3], 10) - 4) * 12;
  return 440 * Math.pow(2, (semi - 9) / 12);
}
/* 4마디씩 두 악구 (C · G · Am · F) — 모험 시작 느낌의 밝은 5음 음계 */
const BGM_LEAD = [
  "E5","G5","A5","G5", "E5","D5","C5","D5",  "E5","G5","A5","C6", "A5","G5","E5",null,
  "D5","E5","G5","E5", "D5","C5","A4","C5",  "D5","E5","G5","A5", "G5","E5","D5",null,
  "E5","G5","A5","G5", "E5","D5","C5","D5",  "E5","G5","A5","C6", "D6","C6","A5",null,
  "G5","A5","G5","E5", "D5","E5","C5",null,  "A4","C5","D5","E5", "D5",null,"C5",null
];
const BGM_BASS = [
  "C3",null,"G3",null, "C3",null,"G3",null,  "G2",null,"D3",null, "G2",null,"D3",null,
  "A2",null,"E3",null, "A2",null,"E3",null,  "F2",null,"C3",null, "F2",null,"C3",null,
  "C3",null,"G3",null, "C3",null,"G3",null,  "G2",null,"D3",null, "G2",null,"D3",null,
  "A2",null,"E3",null, "A2",null,"E3",null,  "F2",null,"C3",null, "G2",null,"G2",null
];
function bgmTick(){
  if(!BGM.on || !audioCtx) return;
  while(BGM.nextT < audioCtx.currentTime + 0.3){
    const delay = Math.max(0, BGM.nextT - audioCtx.currentTime);
    const lead = noteHz(BGM_LEAD[BGM.step]), bass = noteHz(BGM_BASS[BGM.step]);
    if(lead) tone(lead, BGM_STEP * 0.8, "square", 0.03, delay);
    if(bass) tone(bass, BGM_STEP * 1.6, "triangle", 0.05, delay);
    BGM.nextT += BGM_STEP;
    BGM.step = (BGM.step + 1) % BGM_LEAD.length;
  }
  BGM.timer = setTimeout(bgmTick, 90);
}
function bgmStart(){
  if(BGM.on || !game.soundOn) return;
  ensureAudio();
  if(!audioCtx) return;
  BGM.on = true;
  BGM.step = 0;
  BGM.nextT = audioCtx.currentTime + 0.1;
  bgmTick();
}
function bgmStop(){
  BGM.on = false;
  clearTimeout(BGM.timer);
}

/* ---------- 에셋 사전 로드 ---------- */
