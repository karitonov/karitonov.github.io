const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;

// ボール
const ball = {
  x: W / 2, y: H - 60,
  dx: 3, dy: -3,
  radius: 8,
  color: "#4a90e2",
};

// パドル
const paddle = {
  width: 80, height: 12,
  x: (W - 80) / 2, y: H - 30,
  speed: 6,
  color: "#0f3460",
};

// ブロック設定
const COLS = 8, ROWS = 5;
const BLOCK_W = 50, BLOCK_H = 18;
const BLOCK_PAD = 8;
const OFFSET_X = (W - (COLS * (BLOCK_W + BLOCK_PAD) - BLOCK_PAD)) / 2;
const OFFSET_Y = 40;
const BLOCK_COLORS = ["#e94560", "#f5a623", "#7ed321", "#4a90e2", "#9b59b6"];

let blocks = [];
function initBlocks() {
  blocks = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      blocks.push({
        x: OFFSET_X + c * (BLOCK_W + BLOCK_PAD),
        y: OFFSET_Y + r * (BLOCK_H + BLOCK_PAD),
        alive: true,
        color: BLOCK_COLORS[r % BLOCK_COLORS.length],
      });
    }
  }
}

// 入力
const keys = {};
document.addEventListener("keydown", (e) => { keys[e.key] = true; });
document.addEventListener("keyup",  (e) => { keys[e.key] = false; });

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  paddle.x = Math.max(0, Math.min(W - paddle.width, mouseX - paddle.width / 2));
});

let score = 0;
let lives = 3;
let gameState = "playing"; // "playing" | "clear" | "gameover"

function resetBall() {
  ball.x = W / 2;
  ball.y = H - 60;
  ball.dx = 3 * (Math.random() < 0.5 ? 1 : -1);
  ball.dy = -3;
}

function update() {
  if (gameState !== "playing") return;

  // パドル移動
  if ((keys["ArrowLeft"] || keys["a"]) && paddle.x > 0) {
    paddle.x -= paddle.speed;
  }
  if ((keys["ArrowRight"] || keys["d"]) && paddle.x + paddle.width < W) {
    paddle.x += paddle.speed;
  }

  // ボール移動
  ball.x += ball.dx;
  ball.y += ball.dy;

  // 左右壁
  if (ball.x - ball.radius < 0) { ball.x = ball.radius; ball.dx *= -1; }
  if (ball.x + ball.radius > W) { ball.x = W - ball.radius; ball.dx *= -1; }

  // 天井
  if (ball.y - ball.radius < 0) { ball.y = ball.radius; ball.dy *= -1; }

  // パドル衝突
  if (
    ball.dy > 0 &&
    ball.y + ball.radius >= paddle.y &&
    ball.y + ball.radius <= paddle.y + paddle.height &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.width
  ) {
    // 当たった位置によって跳ね返り角度を変える
    const hit = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    ball.dx = hit * 5;
    ball.dy = -Math.abs(ball.dy);
  }

  // 底に落ちた
  if (ball.y - ball.radius > H) {
    lives--;
    if (lives <= 0) {
      gameState = "gameover";
    } else {
      resetBall();
    }
  }

  // ブロック衝突
  for (const b of blocks) {
    if (!b.alive) continue;
    if (
      ball.x + ball.radius > b.x &&
      ball.x - ball.radius < b.x + BLOCK_W &&
      ball.y + ball.radius > b.y &&
      ball.y - ball.radius < b.y + BLOCK_H
    ) {
      b.alive = false;
      score += 10;
      // どの面に当たったか判定
      const overlapLeft   = ball.x + ball.radius - b.x;
      const overlapRight  = b.x + BLOCK_W - (ball.x - ball.radius);
      const overlapTop    = ball.y + ball.radius - b.y;
      const overlapBottom = b.y + BLOCK_H - (ball.y - ball.radius);
      const minH = Math.min(overlapLeft, overlapRight);
      const minV = Math.min(overlapTop, overlapBottom);
      if (minH < minV) { ball.dx *= -1; } else { ball.dy *= -1; }
    }
  }

  // クリア判定
  if (blocks.every((b) => !b.alive)) {
    gameState = "clear";
  }
}

function drawBlock(b) {
  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, BLOCK_W, BLOCK_H, 4);
  ctx.fill();

  // ハイライト
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath();
  ctx.roundRect(b.x + 2, b.y + 2, BLOCK_W - 4, 5, 2);
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  // ブロック
  for (const b of blocks) {
    if (b.alive) drawBlock(b);
  }

  // パドル
  ctx.fillStyle = paddle.color;
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 6);
  ctx.fill();

  // ボール
  ctx.fillStyle = ball.color;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  // スコア & ライフ
  ctx.fillStyle = "#fff";
  ctx.font = "16px sans-serif";
  ctx.fillText(`Score: ${score}`, 8, 20);
  ctx.fillText(`Lives: ${"♥".repeat(lives)}`, W - 110, 20);

  // ゲームオーバー / クリア
  if (gameState === "gameover" || gameState === "clear") {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = gameState === "clear" ? "#7ed321" : "#e94560";
    ctx.font = "bold 40px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(gameState === "clear" ? "CLEAR!" : "GAME OVER", W / 2, H / 2 - 20);
    ctx.fillStyle = "#fff";
    ctx.font = "18px sans-serif";
    ctx.fillText(`Score: ${score}`, W / 2, H / 2 + 20);
    ctx.fillText("Enterキーでリスタート", W / 2, H / 2 + 50);
    ctx.textAlign = "left";
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && gameState !== "playing") {
    score = 0;
    lives = 3;
    gameState = "playing";
    initBlocks();
    resetBall();
    paddle.x = (W - paddle.width) / 2;
  }
});

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

initBlocks();
loop();
