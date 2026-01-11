const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');

// 修正ポイント1: スケールを固定ではなく計算でリセット
// これにより、CSSでキャンバスサイズを変えても比率が保たれます
context.scale(20, 20);

const colors = [
    null,
    '#FF0D72', // T
    '#0DC2FF', // I
    '#0DFF72', // S
    '#F538FF', // Z
    '#FF8E0D', // O
    '#FFE138', // L
    '#3877FF', // J
];

function createMatrix(w, h) {
    const matrix = [];
    while (h--) { matrix.push(new Array(w).fill(0)); }
    return matrix;
}

function createPiece(type) {
    if (type === 'I') return [[0,2,0,0],[0,2,0,0],[0,2,0,0],[0,2,0,0]];
    if (type === 'L') return [[0,6,0],[0,6,0],[0,6,6]];
    if (type === 'J') return [[0,7,0],[0,7,0],[7,7,0]];
    if (type === 'O') return [[5,5],[5,5]];
    if (type === 'Z') return [[1,1,0],[0,1,1],[0,0,0]];
    if (type === 'S') return [[0,3,3],[3,3,0],[0,0,0]];
    if (type === 'T') return [[0,4,0],[4,4,4],[0,0,0]];
}

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // 背景の補助線
    context.strokeStyle = '#111';
    context.lineWidth = 0.05;
    for(let i=0; i<20; i++) {
        context.beginPath(); context.moveTo(0, i); context.lineTo(12, i); context.stroke();
        context.beginPath(); context.moveTo(i, 0); context.lineTo(i, 20); context.stroke();
    }

    drawMatrix(arena, {x: 0, y: 0});
    drawMatrix(player.matrix, player.pos);
}

function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = colors[value];
                context.fillRect(x + offset.x, y + offset.y, 1, 1);
                
                // 光沢エフェクト
                context.fillStyle = 'rgba(255, 255, 255, 0.3)';
                context.fillRect(x + offset.x, y + offset.y, 1, 0.05);
                context.fillRect(x + offset.x, y + offset.y, 0.05, 1);
            }
        });
    });
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) arena[y + player.pos.y][x + player.pos.x] = value;
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) matrix.forEach(row => row.reverse());
    else matrix.reverse();
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
    }
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) player.pos.x -= dir;
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function playerReset() {
    const pieces = 'ILJOTSZ';
    player.matrix = createPiece(pieces[pieces.length * Math.random() | 0]);
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    
    // ゲームオーバー判定
    if (collide(arena, player)) {
        arena.forEach(row => row.fill(0));
        player.score = 0;
        dropInterval = 1000; // 速度もリセット
        updateScore();
    }
}

function arenaSweep() {
    let rowCount = 1;
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) continue outer;
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        player.score += rowCount * 10;
        rowCount *= 2;
        
        // 修正ポイント2: スコアに応じて少しずつ速くする
        dropInterval = Math.max(100, 1000 - (player.score / 2));
    }
    updateScore();
}

function updateScore() {
    document.getElementById('score').innerText = player.score;
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let isFastDrop = false; // 高速落下フラグ

function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    // 高速落下中は50ms固定、通常時は動的なdropIntervalを使用
    const currentInterval = isFastDrop ? 50 : dropInterval;

    if (dropCounter > currentInterval) {
        playerDrop();
    }
    draw();
    requestAnimationFrame(update);
}

const arena = createMatrix(12, 20);
const player = { pos: {x: 0, y: 0}, matrix: null, score: 0 };

// --- 入力系（キーボード） ---
document.addEventListener('keydown', event => {
    if (event.keyCode === 37) playerMove(-1);        // 左
    else if (event.keyCode === 39) playerMove(1);     // 右
    else if (event.keyCode === 40) isFastDrop = true; // 下（高速落下開始）
    else if (event.keyCode === 38) playerRotate(1);  // 上（回転）
});

document.addEventListener('keyup', event => {
    if (event.keyCode === 40) isFastDrop = false;    // 下を離したら通常速度へ
});

// --- 入力系（モバイル・タッチ操作） ---
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    e.preventDefault();
}, {passive: false});

canvas.addEventListener('touchend', e => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
        // 横スワイプ：移動
        if (Math.abs(dx) > 30) {
            playerMove(dx > 0 ? 1 : -1);
        }
    } else {
        // 縦スワイプ：回転（上）または高速落下（下）
        if (dy < -30) playerRotate(1); // 上スワイプで回転
        if (dy > 30) playerDrop();     // 下スワイプで1段落とす
    }
    e.preventDefault();
}, {passive: false});

// キャンバスタップで回転（お好みで）
canvas.addEventListener('click', () => playerRotate(1));

playerReset();
updateScore();
update();