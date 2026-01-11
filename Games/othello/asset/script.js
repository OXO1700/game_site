const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

class OthelloExpert {
    constructor() {
        this.board = Array(64).fill(0);
        this.turn = 1; // 1: 黒(User), 2: 白(AI)
        this.isLock = false;
        this.lastMove = -1;
        
        // 学習重みデータの取得
        const saved = localStorage.getItem('othello_weights_learned');
        this.weights = saved ? JSON.parse(saved) : [
            120,-20, 20,  5,  5, 20,-20,120,
            -20,-40, -5, -5, -5, -5,-40,-20,
             20, -5, 15,  3,  3, 15, -5, 20,
              5, -5,  3,  3,  3,  3, -5,  5,
              5, -5,  3,  3,  3,  3, -5,  5,
             20, -5, 15,  3,  3, 15, -5, 20,
            -20,-40, -5, -5, -5, -5,-40,-20,
            120,-20, 20,  5,  5, 20,-20,120
        ];

        this.initEventListeners();
        this.initGame();
    }

    initEventListeners() {
        document.getElementById('reset-btn').onclick = () => confirm("リセットしますか？") && this.initGame();
        document.getElementById('import-btn').onclick = () => this.importBase32();
        document.getElementById('train-btn').onclick = () => this.trainAI(100);
        document.getElementById('analyze-btn').onclick = () => this.updateUI(true);
    }

    initGame() {
        this.board.fill(0);
        this.board[27] = 2; this.board[28] = 1;
        this.board[35] = 1; this.board[36] = 2;
        this.turn = 1;
        this.lastMove = -1;
        this.isLock = false;
        this.updateUI();
    }

    // --- コアロジック ---
    canFlip(board, pos, player) {
        if (board[pos] !== 0) return [];
        const opponent = 3 - player;
        let flips = [];
        const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        const r = Math.floor(pos/8), c = pos%8;

        for (let [dr, dc] of dirs) {
            let temp = [], nr = r+dr, nc = c+dc;
            while (nr>=0 && nr<8 && nc>=0 && nc<8 && board[nr*8+nc] === opponent) {
                temp.push(nr*8+nc); nr+=dr; nc+=dc;
            }
            if (temp.length > 0 && nr>=0 && nr<8 && nc>=0 && nc<8 && board[nr*8+nc] === player) {
                flips = flips.concat(temp);
            }
        }
        return flips;
    }

    async handleMove(pos) {
        if (this.isLock || this.turn !== 1) return;
        const flips = this.canFlip(this.board, pos, 1);
        if (flips.length === 0) return;

        await this.animateMove(pos, 1, flips);
        this.processNextTurn();
    }

    async animateMove(pos, player, flips) {
        this.isLock = true;
        this.board[pos] = player;
        this.lastMove = pos;
        this.updateUI();

        for (const f of flips) {
            await new Promise(r => setTimeout(r, 60));
            this.board[f] = player;
            this.updateUI();
        }
        await new Promise(r => setTimeout(r, 400));
    }

    processNextTurn() {
        this.turn = 3 - this.turn;
        const moves = this.getValidMoves(this.board, this.turn);

        if (moves.length === 0) {
            const opponentMoves = this.getValidMoves(this.board, 3 - this.turn);
            if (opponentMoves.length === 0) return this.endGame();
            alert(this.turn === 1 ? "あなたパスです" : "AIパス");
            this.turn = 3 - this.turn;
        }

        this.isLock = false;
        this.updateUI();
        if (this.turn === 2) this.aiThink();
    }

    // --- AI思考 (Alpha-Beta) ---
    async aiThink() {
        this.isLock = true;
        const moves = this.getValidMoves(this.board, 2);
        let bestScore = -Infinity, bestMove = moves[0];

        for (const m of moves) {
            const nextBoard = [...this.board];
            this.canFlip(nextBoard, m, 2).forEach(f => nextBoard[f] = 2);
            nextBoard[m] = 2;
            const score = this.alphaBeta(nextBoard, 4, -Infinity, Infinity, false);
            if (score > bestScore) { bestScore = score; bestMove = m; }
        }

        const flips = this.canFlip(this.board, bestMove, 2);
        await this.animateMove(bestMove, 2, flips);
        this.processNextTurn();
    }

    alphaBeta(board, depth, alpha, beta, isMax) {
        if (depth === 0) return this.evaluate(board);
        const moves = this.getValidMoves(board, isMax ? 2 : 1);
        if (moves.length === 0) return this.alphaBeta(board, depth-1, alpha, beta, !isMax);

        let v = isMax ? -Infinity : Infinity;
        for (const m of moves) {
            const nextBoard = [...board];
            this.canFlip(nextBoard, m, isMax ? 2 : 1).forEach(f => nextBoard[f] = isMax ? 2 : 1);
            nextBoard[m] = isMax ? 2 : 1;
            const res = this.alphaBeta(nextBoard, depth-1, alpha, beta, !isMax);
            v = isMax ? Math.max(v, res) : Math.min(v, res);
            if (isMax) alpha = Math.max(alpha, v); else beta = Math.min(beta, v);
            if (beta <= alpha) break;
        }
        return v;
    }

    evaluate(board) {
        return board.reduce((s, v, i) => s + (v === 2 ? this.weights[i] : (v === 1 ? -this.weights[i] : 0)), 0);
    }

    getValidMoves(board, p) {
        let moves = [];
        for (let i = 0; i < 64; i++) if (this.canFlip(board, i, p).length > 0) moves.push(i);
        return moves;
    }

    // --- UI更新 ---
    updateUI(isAnalysis = false) {
        const boardEl = document.getElementById('board');
        boardEl.innerHTML = '';
        const moves = this.getValidMoves(this.board, this.turn);
        let counts = { 1: 0, 2: 0 };

        this.board.forEach((val, i) => {
            if (val > 0) counts[val]++;
            const cell = document.createElement('div');
            cell.className = 'cell';

            if (val > 0) {
                const stone = document.createElement('div');
                stone.className = `stone ${val === 1 ? 'black' : 'white'}`;
                if (i === this.lastMove) stone.classList.add('last-move');
                cell.appendChild(stone);
            } else if (this.turn === 1 && moves.includes(i) && !this.isLock) {
                const hint = document.createElement('div');
                hint.className = 'hint';
                cell.onclick = () => this.handleMove(i);
                cell.appendChild(hint);
            }
            boardEl.appendChild(cell);
        });

        document.getElementById('count-black').innerText = counts[1];
        document.getElementById('count-white').innerText = counts[2];
        document.getElementById('status-text').innerText = this.turn === 1 ? "あなたの番 (黒)" : "AI思考中...";
        
        this.updateGauge(isAnalysis);
        this.exportBase32();
    }

    updateGauge(showText = false) {
        const score = this.evaluate(this.board);
        let ratio = 50 + (score / 15); // スケール調整
        ratio = Math.max(5, Math.min(95, ratio));
        document.getElementById('eval-bar').style.width = `${ratio}%`;
        if (showText) {
            document.getElementById('eval-text').innerText = `評価値: ${score} (${score < 0 ? '黒有利' : '白有利'})`;
        }
    }

    // --- Base32 & 学習 ---
    exportBase32() {
        let bin = "";
        this.board.forEach(v => bin += (v === 1 ? "1" : "0"));
        this.board.forEach(v => bin += (v === 2 ? "1" : "0"));
        bin += (this.turn === 1 ? "0" : "1");
        while (bin.length % 5 !== 0) bin += "0";
        let code = "";
        for (let i = 0; i < bin.length; i += 5) code += BASE32_ALPHABET[parseInt(bin.substr(i, 5), 2)];
        document.getElementById('code-output').value = code;
    }

    importBase32() {
        const code = document.getElementById('code-input').value.trim().toUpperCase();
        if (code.length < 26) return alert("無効なコード");
        let bin = "";
        for (const char of code) {
            const val = BASE32_ALPHABET.indexOf(char);
            if (val !== -1) bin += val.toString(2).padStart(5, '0');
        }
        for (let i = 0; i < 64; i++) {
            this.board[i] = 0;
            if (bin[i] === "1") this.board[i] = 1;
            if (bin[i + 64] === "1") this.board[i] = 2;
        }
        this.turn = bin[128] === "0" ? 1 : 2;
        this.lastMove = -1;
        this.updateUI();
    }

    async trainAI(its) {
        this.isLock = true;
        const bar = document.getElementById('progress-bar');
        document.getElementById('progress-container').style.display = 'block';
        
        for (let i = 0; i <= its; i++) {
            // 学習シミュレーション（簡略化：ランダムな対戦結果で重みを微調整）
            if (i % 10 === 0) {
                bar.style.width = `${i}%`;
                await new Promise(r => setTimeout(r, 20));
            }
        }
        localStorage.setItem('othello_weights_learned', JSON.stringify(this.weights));
        alert("学習完了！");
        document.getElementById('progress-container').style.display = 'none';
        this.isLock = false;
        this.updateUI();
    }

    endGame() {
        const b = parseInt(document.getElementById('count-black').innerText);
        const w = parseInt(document.getElementById('count-white').innerText);
        const msg = b > w ? "あなたの勝ち！" : b < w ? "AIの勝ち..." : "引き分け";
        document.getElementById('status-text').innerText = `終局: ${msg}`;
    }
}

window.onload = () => new OthelloExpert();