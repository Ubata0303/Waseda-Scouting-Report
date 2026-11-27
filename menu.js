// 閲覧アプリ：左上の「≡」メニュー
// 画面上部に固定バー（≡ ボタン＋アプリ名＋今の画面名）を置き、≡ を押すと左から画面一覧が開く
(function () {
    const PAGES = [
        { href: 'index.html', label: 'Dashboard' },
        { href: 'passzone.html', label: 'Pass Zone' },
        { href: 'dd.html', label: 'Down & Distance' },
        { href: 'livereport.html', label: 'Live Report' },
        { href: 'play.html', label: 'Play Diagram' },
        { href: 'member.html', label: 'Member List' },
        { href: 'cadence.html', label: 'Cadence' }
    ];
    // Netlify は /passzone のような拡張子なしURLでも開けるので、ファイル名の先頭で判定する
    const path = location.pathname.split('/').pop() || 'index.html';
    const current = PAGES.find(p => p.href.replace('.html', '') === path.replace('.html', '')) || PAGES[0];

    const css = `
    .sidebar, .tb-nav { display: none !important; }
    .tbm-bar { position: fixed; top: 0; left: 0; right: 0; height: 52px; z-index: 3000; display: flex; align-items: center; gap: 10px;
        padding: 0 12px; background: #fff; border-bottom: 1px solid #e2e8f0; font-family: Inter, -apple-system, sans-serif; box-sizing: border-box; }
    .tbm-btn { width: 40px; height: 40px; border: none; background: none; border-radius: 8px; cursor: pointer; display: flex;
        flex-direction: column; justify-content: center; align-items: center; gap: 5px; padding: 0; }
    .tbm-btn:active { background: #f1f5f9; }
    .tbm-btn span { display: block; width: 22px; height: 2.5px; background: #1e293b; border-radius: 2px; }
    .tbm-title { font-weight: 700; color: #3b82f6; font-size: 1rem; }
    .tbm-badge { display: none; align-items: center; justify-content: center; padding: 2px 7px; border-radius: 4px; color: #fff;
        font-size: 0.72rem; font-weight: 700; line-height: 1.25; letter-spacing: 0.02em; white-space: nowrap; box-shadow: 0 1px 2px rgba(0,0,0,0.12); flex-shrink: 0; }
    .tbm-page { margin-left: auto; font-size: 0.85rem; color: #64748b; font-weight: 600; }
    .tbm-spacer { height: 52px; flex-basis: 100%; width: 100%; flex-shrink: 0; }
    .tbm-overlay { position: fixed; inset: 0; z-index: 3100; background: rgba(15, 23, 42, 0.45); opacity: 0; pointer-events: none; transition: opacity .2s; }
    .tbm-drawer { position: fixed; top: 0; bottom: 0; left: 0; width: 260px; max-width: 80vw; z-index: 3200; background: #fff;
        transform: translateX(-100%); visibility: hidden; transition: transform .22s ease, visibility .22s; box-shadow: 4px 0 20px rgba(0,0,0,.15);
        font-family: Inter, -apple-system, sans-serif; display: flex; flex-direction: column; padding: 14px 12px; box-sizing: border-box; }
    .tbm-open .tbm-overlay { opacity: 1; pointer-events: auto; }
    .tbm-open .tbm-drawer { transform: translateX(0); visibility: visible; }
    .tbm-head { display: flex; align-items: center; justify-content: space-between; margin: 0 4px 14px; }
    .tbm-head b { color: #3b82f6; font-size: 1.05rem; }
    .tbm-close { border: none; background: none; font-size: 1.6rem; line-height: 1; color: #475569; cursor: pointer; padding: 4px 8px; }
    .tbm-drawer a { display: block; padding: 13px 14px; margin-bottom: 4px; border-radius: 10px; text-decoration: none; color: #334155; font-weight: 600; font-size: 1rem; }
    .tbm-drawer a.active { background: #3b82f6; color: #fff; }
    .tbm-drawer a:not(.active):active { background: #f1f5f9; }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    const bar = document.createElement('div');
    bar.className = 'tbm-bar';
    bar.innerHTML = '<button class="tbm-btn" type="button" aria-label="メニューを開く"><span></span><span></span><span></span></button>' +
        '<span class="tbm-title">Scouting Report</span>' +
        '<span class="tbm-badge" id="tbm-team-badge"></span>' +
        '<span class="tbm-page"></span>';
    bar.querySelector('.tbm-page').textContent = current.label;

    const badge = bar.querySelector('#tbm-team-badge');

    function readExtraFallback() {
        if (typeof window !== 'undefined' && window.TBScoutingExtra && window.TBScoutingExtra.getExtraData) {
            try { return window.TBScoutingExtra.getExtraData(); } catch (_) {}
        }
        const WN_PREFIX = 'tb-extra-data:';
        try {
            if (typeof window !== 'undefined' && window.name && window.name.indexOf(WN_PREFIX) === 0) {
                return JSON.parse(window.name.slice(WN_PREFIX.length));
            }
        } catch (_) {}
        try {
            const raw = localStorage.getItem('tb-extra-data');
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        try {
            const feed = localStorage.getItem('tb-shared-feed');
            if (feed) {
                const parsed = JSON.parse(feed);
                if (parsed && parsed.extra) return parsed.extra;
            }
        } catch (_) {}
        return null;
    }

    function getTeamInfo(customExtra) {
        const extra = customExtra || readExtraFallback();
        let name = '';
        let color = '#ad181f';
        if (extra) {
            const ml = extra.memberList || {};
            if (ml.numColor) color = ml.numColor;

            // 保存済みのチーム名（PDF取り込み時にファイル名から決定 or 手動設定）をそのまま使う
            name = String(extra.teamName || '').trim();
            if (name === 'Fighters' || !name) {
                name = '';
                {
                    const cleanOpp = (extra.opponent === '20261015 / Fighters') ? '' : String(extra.opponent || '');
                    const target = String(extra.pdfFileName || '') + ' ' + cleanOpp;
                    if (/早稲田|waseda|big\s*bears/i.test(target)) name = '早稲田';
                    else if (/法政|hosei|orange/i.test(target)) name = '法政';
                    else if (/明治|meiji|griffins/i.test(target)) name = '明治';
                    else if (/立教|rikkyo|rikkyou|rushers/i.test(target)) name = '立教';
                    else if (/中央|chuo|chuuou|raccons|raccoons/i.test(target)) name = '中央';
                    else if (/日本体育|日体|nittai/i.test(target)) name = '日体大';
                    else if (/日本大学|日大|nihon|phoenix/i.test(target)) name = '日大';
                    else if (/慶應|慶応|keio|unicorns/i.test(target)) name = '慶應';
                    else if (/関西学院|関学|kwansei|kg/i.test(target)) name = '関学';
                    else if (/立命館|立命|rits|panthers/i.test(target)) name = '立命館';
                    else if (/関西大学|関大|kaisers/i.test(target)) name = '関大';
                    else if (/京都大学|京大|gangsters/i.test(target)) name = '京大';
                    else if (/神戸大学|神戸|ravens/i.test(target)) name = '神戸';
                    else if (name === 'Fighters') name = '';
                }
            }
        }
        return { name, color };
    }

    function updateTeamBadge(customExtra) {
        if (!badge) return;
        const info = getTeamInfo(customExtra);
        if (info.name) {
            badge.textContent = info.name;
            badge.style.display = 'inline-flex';
            badge.style.backgroundColor = info.color;
            const hex = String(info.color).replace(/^#/, '');
            if (hex.length === 6) {
                const r = parseInt(hex.slice(0, 2), 16);
                const g = parseInt(hex.slice(2, 4), 16);
                const b = parseInt(hex.slice(4, 6), 16);
                const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                badge.style.color = (yiq >= 170) ? '#0f172a' : '#ffffff';
            } else {
                badge.style.color = '#ffffff';
            }
        } else {
            badge.style.display = 'none';
        }
    }
    updateTeamBadge();

    window.addEventListener('tb-extra-published', e => {
        updateTeamBadge(e.detail);
    });
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => updateTeamBadge());
    }
    setTimeout(() => updateTeamBadge(), 300);
    setTimeout(() => updateTeamBadge(), 1000);

    // 閲覧アプリ（data.json）から直接非同期でチーム情報を取得して全ページで確実に表示
    if (typeof window !== 'undefined' && window.TBSecure && window.TBSecure.getPublished) {
        window.TBSecure.getPublished().then(payload => {
            if (payload && payload.scoutingExtra) {
                updateTeamBadge(payload.scoutingExtra);
            }
        }).catch(() => {});
    }

    const overlay = document.createElement('div');
    overlay.className = 'tbm-overlay';

    const drawer = document.createElement('nav');
    drawer.className = 'tbm-drawer';
    drawer.innerHTML = '<div class="tbm-head"><b>メニュー</b><button class="tbm-close" type="button" aria-label="閉じる">×</button></div>';
    PAGES.forEach(p => {
        const a = document.createElement('a');
        a.href = p.href;
        a.textContent = p.label;
        if (p === current) a.className = 'active';
        drawer.appendChild(a);
    });

    // パスワードを保存している人向けに、メニューからもログアウトできるように
    const logout = document.createElement('a');
    logout.href = '#';
    logout.textContent = 'ログアウト';
    logout.style.cssText = 'margin-top:auto;color:#64748b;font-weight:500;border:1px solid #e2e8f0;text-align:center;';
    logout.addEventListener('click', e => { e.preventDefault(); if (window.TBSecure) window.TBSecure.logout(); });
    drawer.appendChild(logout);

    const spacer = document.createElement('div');
    spacer.className = 'tbm-spacer';

    document.body.prepend(spacer);
    document.body.append(bar, overlay, drawer);

    const open = () => document.documentElement.classList.add('tbm-open');
    const close = () => document.documentElement.classList.remove('tbm-open');
    bar.querySelector('.tbm-btn').addEventListener('click', open);
    overlay.addEventListener('click', close);
    drawer.querySelector('.tbm-close').addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    // 戻るボタンで戻ってきたときに開いたままにならないように
    window.addEventListener('pageshow', close);
})();
