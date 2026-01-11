/**
 * GameDock - Auto Loader
 */

let GAME_DATA = []; // 外部JSONから読み込むため、最初は空にする

/**
 * ゲームデータをJSONから取得する
 */
async function fetchGameData() {
    try {
        const response = await fetch('games/games.json');
        if (!response.ok) throw new Error('Game list not found');
        GAME_DATA = await response.json();
        renderGames(GAME_DATA); // 読み込み完了後に描画
    } catch (e) {
        console.error("Failed to load games:", e);
        document.getElementById('gameGrid').innerHTML = "ゲームデータの読み込みに失敗しました。";
    }
}

/**
 * ゲームカードの描画
 */
function renderGames(games) {
    const grid = document.getElementById('gameGrid');
    if (!grid) return;
    grid.innerHTML = '';

    games.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        
        // JSONのcolorを使ってホバー時の光り方を設定
        card.addEventListener('mouseenter', () => {
            card.style.borderColor = game.color;
            card.style.boxShadow = `0 15px 40px ${game.color}33`; // 20%の透明度で光らせる
        });
        card.addEventListener('mouseleave', () => {
            card.style.borderColor = '#2c3e50';
            card.style.boxShadow = '';
        });

        card.onclick = () => { location.href = game.path; };
        
        card.innerHTML = `
            <div class="game-thumb" style="background-color: ${game.color};">
                ${game.title.charAt(0)}
            </div>
            <div class="game-info">
                <div class="game-title" style="font-weight:bold; margin-bottom: 8px;">${game.title}</div>
                <div class="game-meta">
                    <span class="tag" style="border-color: ${game.color}; color: ${game.color}; background: ${game.color}15;">
                        ${game.genre}
                    </span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}
/**
 * フィルタリングと検索のセットアップ (前回と同様)
 */
function setupFilters() {
    const filterLinks = document.querySelectorAll('[data-genre]');
    filterLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const genre = e.currentTarget.getAttribute('data-genre');
            const filtered = genre === 'all' ? GAME_DATA : GAME_DATA.filter(g => g.genre === genre);
            renderGames(filtered);
        });
    });
}

function setupSearch() {
    const searchInput = document.querySelector('.search-input');
    if (!searchInput) return;
    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase();
        const filtered = GAME_DATA.filter(g => g.title.toLowerCase().includes(keyword));
        renderGames(filtered);
    });
}

/**
 * ヘッダー読み込み
 */
async function includeHTML(elementId, filePath) {
    const target = document.getElementById(elementId);
    if (!target) return;
    try {
        const response = await fetch(filePath);
        target.innerHTML = await response.text();
        if (elementId === 'common-header') {
            setupFilters();
            setupSearch();
        }
    } catch (e) { console.error(e); }
}

document.addEventListener('DOMContentLoaded', async () => {
    await includeHTML('common-header', 'assets/header.html');
    await fetchGameData(); // ここで GAME_DATA が読み込まれる

    // --- 追加：URLパラメータを解析してフィルタリングを実行 ---
    const params = new URLSearchParams(window.location.search);
    const genreParam = params.get('genre');
    const searchParam = params.get('search');

    if (genreParam && genreParam !== 'all') {
        const filtered = GAME_DATA.filter(g => g.genre === genreParam);
        renderGames(filtered);
    } else if (searchParam) {
        const filtered = GAME_DATA.filter(g => g.title.toLowerCase().includes(searchParam.toLowerCase()));
        renderGames(filtered);
        document.querySelector('.search-input').value = searchParam;
    }
});