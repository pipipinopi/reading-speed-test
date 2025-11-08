// === 二点読み（縦書き）+ 上限文字数で自動改行 ===
// 右 → 左へ列送り。各列は 上〇 → 下〇。長文は maxCharsPerCol で列分割。

// 元テキスト（長文でもOK）
let sourceTexts = [
  "グローバル経済の進展は、国際貿易と投資の自由化を促し、多くの国々で経済成長と生活水準の向上をもたらした。特に、新興国の生産拠点化や、インターネットを通じた国境を越えた取引は、世界全体の効率と富の総量を増大させた。しかし、同時に、資本と労働の移動の自由化は、各国間の賃金格差の拡大や、国内での富の偏在という負の側面を露呈している。技術革新、特にAIやロボットによる自動化は、高技能労働者の需要を高める一方で、定型的な労働者の雇用を脅かす結果となっている。このように拡大する経済格差は、社会の不安定化や、人々の教育・医療へのアクセス格差を生み出し、社会の分断を深めている。この問題に対処するためには、再分配機能の強化（累進課税や社会保障）や、生涯を通じた職業訓練への投資が必要である。国際社会と各国政府は、自由な市場経済の恩恵を維持しつつ、経済的な公平性を担保するための新たな仕組みを構築しなければならない。"
  ];

// 自動分割後に描画へ使う配列（右から左へ並べる列の“中身”）
let textsWrapped = [];

let textOffsetY = +12.5; // ←文章全体の上下位置調整（正で下、負で上）

const SESSION_MS = 60_000; // ★セッション時間=1分
let elapsedMs = 0;         // 累積経過時間
let lastTick = 0;          // 前フレームの時刻（走行中のみ）


// レイアウト
let topMargin = 100;
let bottomMargin = 100;
let leftMargin = 100;
let rightMargin = 100;
let colGap = 64;   // 列間隔（横）
let charGap = 27;  // 縦の文字間隔
let dotR = 10;

// 時間制御（ミリ秒）
let startHold = 420;       // 列の上端〇の保持
let endHold = 420;         // 列の下端〇の保持
let interColDelay = 120;   // 次の列へ移る間
let speedFactor = 1.0;     // 小さいほど速い

// 状態
let colCount = 0;
let colIndex = 0;          // 0..colCount-1（右端が0）
let phase = "start";       // "start" | "end" | "gap"
let phaseStartedAt = 0;
let running = false;
let showGuides = true;

// 縦書き用
let uiFont = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
let textFontFamily = "serif"; // 縦書きに合う書体
let maxCharsPerCol = 18;      // ★ 1列の最大文字数（[ / ]で変更）

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont(uiFont);
  wrapAllTexts();     // ★ 最初に自動分割
  computeCols();
  drawOnce();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  computeCols();
}

function computeCols() {
  const usableW = width - leftMargin - rightMargin;
  colCount = max(1, floor(usableW / colGap));
  colIndex = constrain(colIndex, 0, colCount - 1);
}

// ---------- テキスト分割 ----------
function splitLongText(str, maxChars) {
  const chunks = [];
  for (let i = 0; i < str.length; i += maxChars) {
    chunks.push(str.substring(i, i + maxChars));
  }
  return chunks;
}

function wrapAllTexts() {
  textsWrapped = [];
  for (const t of sourceTexts) {
    const parts = splitLongText(t.replace(/\s/g, ""), maxCharsPerCol); // 空白は除去して縦詰め
    textsWrapped.push(...parts);
  }
}

// ---------- メイン描画 ----------
function draw() {
  background("#0f1115");
  drawTextArea();
  if (showGuides) drawColGuides();

  // 文章（縦書き）を列ごとに描画（右→左）
  drawVerticalTexts();
  
  // タイマー更新（走行中だけ積算）
if (running) {
  const now = millis();
  elapsedMs += (now - lastTick);
  lastTick = now;

  // 1分到達で自動終了
  if (elapsedMs >= SESSION_MS) {
    elapsedMs = SESSION_MS;
    running = false;
    
  }
}


  // タイミング更新
  const now = millis();
  const startDur = startHold * speedFactor;
  const endDur   = endHold   * speedFactor;
  const gapDur   = interColDelay * speedFactor;

  if (running) {
    if (phase === "start" && now - phaseStartedAt >= startDur) {
      phase = "end"; phaseStartedAt = now;
    } else if (phase === "end" && now - phaseStartedAt >= endDur) {
      phase = "gap"; phaseStartedAt = now;
    } else if (phase === "gap" && now - phaseStartedAt >= gapDur) {
      colIndex = (colIndex + 1) % colCount;   // 左へ1列進む
      phase = "start"; phaseStartedAt = now;
    }
  }

  // 〇（上端→下端）
  const x = colX(colIndex);
  const yStart = topMargin;
  const yEnd   = height - bottomMargin;

  noStroke();
  fill("#79c0ff");
  if (phase === "start")      circle(x, yStart, dotR * 2);
  else if (phase === "end")   circle(x, yEnd,   dotR * 2);

  drawHUD();
}

function drawOnce() {
  background("#0f1115");
  drawTextArea();
  drawColGuides();
  drawVerticalTexts();
  drawHUD();
}

function drawTextArea() {
  noFill();
  stroke("#30363d");
  strokeWeight(1.5);
  rect(leftMargin, topMargin, width - leftMargin - rightMargin, height - topMargin - bottomMargin, 8);
}

function drawColGuides() {
  stroke("#222831");
  strokeWeight(1);
  for (let i = 0; i < colCount; i++) {
    const x = colX(i);
    line(x, topMargin, x, height - bottomMargin);
  }
}

function colX(i) {
  // 右端を i=0 として左へ colGap ずつ
  return width - rightMargin - (i * colGap) - colGap / 2;
}

function drawVerticalTexts() {
  fill(230);
  noStroke();
  textFont(textFontFamily);
  textSize(22);
  textAlign(CENTER, CENTER);

  // 右端列から順に textsWrapped を割り当てる
  const maxCols = min(textsWrapped.length, colCount);
  for (let i = 0; i < maxCols; i++) {
    const x = colX(i);
    drawVerticalText(textsWrapped[i], x);
  }
}

// 1列分の縦書き（中央揃え & 高さオーバー時は間隔を詰める）
function drawVerticalText(str, x) {
  const usableH = height - topMargin - bottomMargin;
  const total = str.length * charGap;
  const gap = total > usableH ? max(18, floor(usableH / max(1, str.length))) : charGap;
  const startY = topMargin + (usableH - (str.length * gap)) / 2 + textOffsetY;

for (let i = 0; i < str.length; i++) {
  text(str[i], x, startY + i * gap);
  }
}

function drawHUD() {
  noStroke();
  fill("#9fb3c8");
  textFont(uiFont);
  textSize(14);
  textAlign(LEFT, TOP);
  
  const remain = Math.max(0, SESSION_MS - elapsedMs);
const remainSec = (remain / 1000).toFixed(1);


  const status = running ? "RUNNING" : "PAUSED";
  const spd = (1 / speedFactor).toFixed(2);
  const info = [
    `二点読み（縦書き）— 列の上〇→下〇 / 列送り：右→左`,
    `状態: ${status}  |  列: ${colIndex + 1}/${colCount}  |  速度: x${spd}  |  1列最大文字: ${maxCharsPerCol}`,
    `[SPACE] 開始/一時停止   [R] リセット   [↑/↓] 速度±   [G] ガイド表示 切替`,
    `残り時間: ${remainSec}s`,

  ];

  let y = 12;
  for (const line of info) {
    text(line, 14, y);
    y += 18;
  }
}

function keyPressed() {
  if (key === " ") {
    running = !running;
    phaseStartedAt = millis();
    return false;
  }
	  if (key === "r" || key === "R") {
	  colIndex = 0;
	  phase = "start";
	  running = false;
	  phaseStartedAt = millis();
	  elapsedMs = 0;   
  }
  if (key === "g" || key === "G") showGuides = !showGuides;

  // 速度：↑で速く、↓で遅く（speedFactor は小さいほど速い）
  if (keyCode === UP_ARROW)   speedFactor = max(0.3, speedFactor - 0.1);
  if (keyCode === DOWN_ARROW) speedFactor = min(3.0, speedFactor + 0.1);

  // ★ 1列の最大文字数（自動再分割）
  if (key === "[") { maxCharsPerCol = max(6,  maxCharsPerCol - 1); wrapAllTexts(); }
  if (key === "]") { maxCharsPerCol = min(40, maxCharsPerCol + 1); wrapAllTexts(); }
  
  if (key === " ") {
  if (!running) {
    // 再開：直近の時刻を記録（ポーズ分はカウントしない）
    lastTick = millis();
    running = true;
  } else {
    // 一時停止
    running = false;
  }
  phaseStartedAt = millis();
  return false;
}
}
