// ==UserScript==
// @name         Instagram Ultimate Toolkit
// @namespace    Instagram-Toolkit
// @version      9.0
// @description  Reels Speed 2x + Likes New Tab + Reels Layout Resize + Voice Downloader
// @author       Anasqbit
// @match        https://www.instagram.com/*
// @icon        https://www.google.com/s2/favicons?sz=64&domain=instagram.com
// @grant        GM_download
// @connect      cdn.fbsbx.com
// @connect      fbcdn.net
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // =====================================================
    // PART 1: REELS SPEED TOGGLE (2X)
    // =====================================================

    let fast = false;
    let holdActive = false;
    let holdTimer = null;
    let lastVideo = null;
    let suppressNextClick = false;

    const STORAGE_KEY = 'ig_speed_btn_pos';

    function isTargetPage() {
        return /^\/(reels|p)\//.test(location.pathname);
    }

    function applySpeedToAll() {
        document.querySelectorAll('video').forEach(v => {
            v.playbackRate = fast ? 2 : 1;
        });
    }

    function getActiveVideo() {
        const videos = Array.from(document.querySelectorAll('video'));
        const playing = videos.find(v => !v.paused && !v.ended);
        return playing || videos[0] || null;
    }

    // 2X Indicator
    const indicator = document.createElement('div');

    Object.assign(indicator.style, {
        position: 'fixed',
        background: 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(2px)',
        webkitBackdropFilter: 'blur(2px)',
        color: '#ffffff',
        fontSize: '16px',
        fontWeight: '500',
        padding: '8px 18px',
        borderRadius: '40px',
        zIndex: 999999,
        display: 'none',
        pointerEvents: 'none',
        fontFamily: 'Roboto, Arial, sans-serif',
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
        letterSpacing: '0.5px',
        transition: 'opacity 0.15s ease'
    });

    indicator.textContent = '2x';

    let rafId = null;

    function updateIndicatorPosition() {
        const video = getActiveVideo();

        if (!video || indicator.style.display === 'none') {
            rafId = null;
            return;
        }

        const rect = video.getBoundingClientRect();

        const centerX = rect.left + rect.width / 2;
        const topY = rect.top + rect.height * 0.01;

        indicator.style.left = centerX + 'px';
        indicator.style.top = topY + 'px';
        indicator.style.transform = 'translateX(-50%)';

        rafId = requestAnimationFrame(updateIndicatorPosition);
    }

    function showIndicator() {
        indicator.style.display = 'block';

        if (!rafId) {
            rafId = requestAnimationFrame(updateIndicatorPosition);
        }
    }

    function hideIndicator() {
        indicator.style.display = 'none';

        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    // Floating Speed Button
    const savedPos = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || 'null'
    );

    const btn = document.createElement('button');
    btn.textContent = '1x';

    Object.assign(btn.style, {
        position: 'fixed',
        bottom: (savedPos?.bottom ?? 20) + 'px',
        right: (savedPos?.right ?? 20) + 'px',
        left: 'auto',
        top: 'auto',
        zIndex: 999998,
        padding: '8px 18px',
        background: 'linear-gradient(135deg, #6a11cb, #2575fc)',
        color: '#fff',
        border: 'none',
        borderRadius: '20px',
        fontSize: '15px',
        fontWeight: 'bold',
        cursor: 'grab',
        opacity: '0.93',
        boxShadow: '0 3px 12px rgba(0,0,0,0.45)',
        transition: 'background 0.2s',
        userSelect: 'none',
        touchAction: 'none'
    });

    // Drag Button
    let dragging = false;
    let dragMoved = false;
    let startX, startY, startRight, startBottom;

    btn.addEventListener('mousedown', e => {
        dragging = true;
        dragMoved = false;

        startX = e.clientX;
        startY = e.clientY;

        startRight = parseFloat(btn.style.right);
        startBottom = parseFloat(btn.style.bottom);

        btn.style.cursor = 'grabbing';
        btn.style.transition = 'none';

        e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
        if (!dragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            dragMoved = true;
        }

        btn.style.right = Math.max(0, startRight - dx) + 'px';
        btn.style.bottom = Math.max(0, startBottom - dy) + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (!dragging) return;

        dragging = false;
        btn.style.cursor = 'grab';
        btn.style.transition = 'background 0.2s';

        if (dragMoved) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                right: parseFloat(btn.style.right),
                bottom: parseFloat(btn.style.bottom)
            }));
        }
    });

    function updateBtnAppearance() {
        const is2x = fast || holdActive;

        btn.textContent = is2x ? '2x' : '1x';

        btn.style.background = is2x
            ? 'linear-gradient(135deg, #e74c3c, #c0392b)'
            : 'linear-gradient(135deg, #6a11cb, #2575fc)';
    }

    btn.addEventListener('click', () => {
        if (dragMoved) return;

        fast = !fast;
        updateBtnAppearance();
        applySpeedToAll();
    });

    // Hold Logic
    function isOverVideo(e) {
        const video = getActiveVideo();
        if (!video) return false;

        const rect = video.getBoundingClientRect();

        const clientX = e.clientX ?? e.touches?.[0]?.clientX;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY;

        if (clientX == null || clientY == null) return false;

        return (
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom
        );
    }

    function onHoldStart(e) {
        if (btn.contains(e.target)) return;
        if (!isOverVideo(e)) return;

        clearTimeout(holdTimer);

        holdTimer = setTimeout(() => {
            holdActive = true;
            suppressNextClick = true;

            showIndicator();
            updateBtnAppearance();

            document.querySelectorAll('video').forEach(v => {
                v.playbackRate = 2;
            });
        }, 300);
    }

    function onHoldEnd() {
        clearTimeout(holdTimer);

        if (!holdActive) return;

        holdActive = false;

        hideIndicator();
        updateBtnAppearance();

        document.querySelectorAll('video').forEach(v => {
            v.playbackRate = fast ? 2 : 1;
        });
    }

    document.addEventListener('click', e => {
        if (suppressNextClick) {
            suppressNextClick = false;
            e.stopPropagation();
            e.preventDefault();
        }
    }, true);

    document.addEventListener('mousedown', onHoldStart);
    document.addEventListener('mouseup', onHoldEnd);
    document.addEventListener('mouseleave', onHoldEnd);
    document.addEventListener('touchstart', onHoldStart, {
        passive: true
    });
    document.addEventListener('touchend', onHoldEnd);
    document.addEventListener('touchcancel', onHoldEnd);

    // Watch New Videos
    const domObserver = new MutationObserver(() => {
        if (!isTargetPage()) return;

        document.querySelectorAll('video').forEach(v => {
            if (v === lastVideo) return;

            lastVideo = v;

            if (fast || holdActive) {
                v.playbackRate = 2;
            }

            v.addEventListener('play', () => {
                if (fast || holdActive) {
                    v.playbackRate = 2;
                }
            });

            v.addEventListener('ratechange', () => {
                if ((fast || holdActive) && v.playbackRate !== 2) {
                    v.playbackRate = 2;
                }
            });
        });
    });

    domObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });


    // =====================================================
    // PART 2: INSTAGRAM LIKES - OPEN IN NEW TAB
    // =====================================================

    const ALPHABET =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

    const PROCESSED = 'data-ig-link-added';

    function isLikesPage() {
        return location.pathname.includes(
            '/your_activity/interactions/likes'
        );
    }

    // Convert Media ID to Shortcode
    function toShortcode(id) {
        try {
            let number = BigInt(id);
            let shortcode = '';

            while (number > 0n) {
                shortcode =
                    ALPHABET[Number(number % 64n)] + shortcode;
                number /= 64n;
            }

            return shortcode || null;
        } catch {
            return null;
        }
    }

    // Extract Post Information
    function getPostInfo(img, tile) {
        try {
            const src = new URL(img.src);
            const cacheKey = src.searchParams.get('ig_cache_key');

            if (!cacheKey) return null;

            const encoded = cacheKey.split('.')[0];

            const decoded = atob(
                encoded.replace(/-/g, '+').replace(/_/g, '/') +
                '='.repeat((4 - encoded.length % 4) % 4)
            );

            const mediaId = decoded.match(/^\d{19}/)?.[0];

            if (!mediaId) return null;

            const shortcode = toShortcode(mediaId);

            if (!shortcode) return null;

            const label = tile.getAttribute('aria-label') || '';
            const isVideo = /video|reel/i.test(label);

            return {
                url: `https://www.instagram.com/${isVideo ? 'reel' : 'p'}/${shortcode}/`
            };

        } catch (error) {
            console.warn('[IG Likes] Extraction error:', error);
            return null;
        }
    }

    function processLikes() {
        if (!isLikesPage()) return;

        const tiles = document.querySelectorAll(
            '[data-interactable="|click|"]'
        );

        tiles.forEach(container => {
            if (container.hasAttribute(PROCESSED)) return;

            const tile = container.querySelector(
                '[role="button"][aria-label]'
            );

            const img = container.querySelector('img');

            if (!tile || !img) return;

            const info = getPostInfo(img, tile);

            if (!info) return;

            const link = document.createElement('a');

            link.href = info.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.title = 'Open in new tab';

            link.setAttribute(
                'aria-label',
                'Open Instagram post in new tab'
            );

            Object.assign(container.style, {
                position: 'relative'
            });

            Object.assign(link.style, {
                position: 'absolute',
                inset: '0',
                zIndex: '9999',
                display: 'block',
                background: 'transparent',
                cursor: 'pointer'
            });

            link.addEventListener('click', event => {
                event.stopPropagation();
            });

            container.appendChild(link);
            container.setAttribute(PROCESSED, 'true');

            console.log('[IG Likes] Link created:', info.url);
        });
    }


    // =====================================================
    // PART 3: INSTAGRAM LAYOUT RESIZER
    // =====================================================

    function adjustInstagramLayout() {
        const element1 = document.querySelector(
            '.x6s0dn4.x78zum5.xdt5ytf.xdj266r.x11t971q.xat24cr.xvc5jky.x1n2onr6.xh8yej3.xf68679'
        );

        const element2 = document.querySelector(
            '.xnz67gz.xr2y4jy.x1whfx0g.x78zum5.xdt5ytf.x5yr21d.x1n2onr6.xh8yej3'
        );

        if (element1) {
            element1.style.setProperty('--x-maxWidth', '820px');
        }

        if (element2) {
            element2.style.width = '450px';
        }
    }

    adjustInstagramLayout();

    const layoutObserver = new MutationObserver(
        adjustInstagramLayout
    );


    // =====================================================
    // PART 4: INSTAGRAM DIRECT VOICE DOWNLOADER
    // =====================================================

    function isInDirectPage() {
        return location.pathname.startsWith('/direct/');
    }

    const captured = [];

    // Capture Audio URLs
    function registerUrl(url) {
        if (!isInDirectPage()) return;

        if (
            !url ||
            typeof url !== 'string' ||
            !url.includes('audioclip-')
        ) return;

        const durMatch = url.match(
            /audioclip-\d+-(\d+)\.mp4/
        );

        if (!durMatch) return;

        const durationMs = parseInt(durMatch[1], 10);

        const idMatch = url.match(
            /\/\d+_(\d+)_\d+_n\.mp4\//
        );

        const mediaId = idMatch ? idMatch[1] : null;

        if (!captured.some(c => c.url === url)) {
            captured.push({
                durationMs,
                mediaId,
                url
            });

            console.log('[AudioDL] Captured:', {
                durationMs,
                mediaId,
                url
            });
        }
    }

    // Performance Observer
    try {
        const po = new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
                registerUrl(entry.name);
            }
        });

        try {
            po.observe({
                type: 'resource',
                buffered: true
            });
        } catch {
            po.observe({
                entryTypes: ['resource']
            });
        }

    } catch (e) {
        console.warn(
            '[AudioDL] PerformanceObserver failed',
            e
        );
    }

    // Fetch Interception
    const origFetch = window.fetch;

    window.fetch = function (...args) {
        try {
            const u = typeof args[0] === 'string'
                ? args[0]
                : (args[0] && args[0].url);

            registerUrl(u);
        } catch (e) {}

        return origFetch.apply(this, args);
    };

    // XHR Interception
    const origOpen = XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.open = function (
        method,
        url,
        ...rest
    ) {
        try {
            registerUrl(url);
        } catch (e) {}

        return origOpen.call(this, method, url, ...rest);
    };

    // Numeric Matching Tools
    function absBigInt(n) {
        return n < 0n ? -n : n;
    }

    function findBestClip(seconds, waveformId) {
        if (!captured.length) return null;

        const targetMs = Math.round(seconds * 1000);

        if (waveformId) {
            let best = null;
            let bestDiff = null;

            for (const c of captured) {
                if (!c.mediaId) continue;

                try {
                    const diff = absBigInt(
                        BigInt(waveformId) - BigInt(c.mediaId)
                    );

                    if (
                        bestDiff === null ||
                        diff < bestDiff
                    ) {
                        bestDiff = diff;
                        best = c;
                    }
                } catch (e) {}
            }

            if (best) return best;
        }

        let best = null;
        let bestDiff = Infinity;

        for (const c of captured) {
            const d = Math.abs(c.durationMs - targetMs);

            if (d < bestDiff) {
                bestDiff = d;
                best = c;
            }
        }

        return (best && bestDiff <= 15) ? best : null;
    }

    function extractWaveformId(sliderEl) {
        let el = sliderEl;

        for (let i = 0; i < 10 && el; i++) {
            const cp = el.querySelector &&
                el.querySelector(
                    'clipPath[id^="waveform-clip-path-"]'
                );

            if (cp) {
                const m = cp.id.match(
                    /waveform-clip-path-(\d+)/
                );

                if (m) return m[1];
            }

            el = el.parentElement;
        }

        return null;
    }

    function findPlayButton(container) {
        return container && container.querySelector(
            '[aria-label*="تشغيل"],' +
            '[aria-label*="Play"],' +
            '[aria-label*="play"]'
        );
    }

    // Validate Real Audio Messages
    function isRealAudioMessage(sliderEl) {
        const label = sliderEl.getAttribute('aria-label') || '';

        if (!/audio/i.test(label)) return false;

        const waveformId = extractWaveformId(sliderEl);

        if (!waveformId) return false;

        const container =
            sliderEl.closest('[role="presentation"]') ||
            sliderEl.parentElement;

        const hasPlayBtn = findPlayButton(container);

        if (!hasPlayBtn) return false;

        return true;
    }

    // Download Function
    function triggerDownload(url, filename) {
        if (typeof GM_download === 'function') {
            try {
                GM_download({
                    url,
                    name: filename,
                    saveAs: false
                });

                return;
            } catch (e) {
                console.warn(
                    '[AudioDL] GM_download failed:',
                    e
                );
            }
        }

        const a = document.createElement('a');

        a.href = url;
        a.download = filename;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';

        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    // Button States
    function setBtnState(btn, state) {
        if (state === 'loading') {
            btn.innerHTML = spinnerSVG();

            btn.classList.remove('audio-dl-error');
            btn.classList.add('audio-dl-loading');

        } else if (state === 'error') {
            btn.innerHTML = errorSVG();

            btn.classList.remove('audio-dl-loading');
            btn.classList.add('audio-dl-error');

            setTimeout(() => {
                setBtnState(btn, 'idle');
            }, 1600);

        } else {
            btn.innerHTML = downloadSVG();

            btn.classList.remove(
                'audio-dl-loading',
                'audio-dl-error'
            );
        }
    }

    function downloadSVG() {
        return `
            <svg width="15" height="15"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14"
                    stroke="white"
                    stroke-width="2.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>
        `;
    }

    function spinnerSVG() {
        return `
            <svg width="14" height="14"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                class="audio-dl-spin">
                <circle
                    cx="12" cy="12" r="9"
                    stroke="white"
                    stroke-width="2.4"
                    stroke-linecap="round"
                    stroke-dasharray="40 100"
                />
            </svg>
        `;
    }

    function errorSVG() {
        return `
            <svg width="14" height="14"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="white"
                    stroke-width="2.6"
                    stroke-linecap="round"
                />
            </svg>
        `;
    }

    // Download Handler
    async function onDownloadClick(sliderEl, seconds, btn) {
        if (btn.classList.contains('audio-dl-loading')) {
            return;
        }

        let waveformId = extractWaveformId(sliderEl);
        let clip = findBestClip(seconds, waveformId);

        if (!clip) {
            const playBtn = findPlayButton(
                sliderEl.closest('[role="presentation"]') ||
                sliderEl.parentElement
            );

            if (playBtn) {
                setBtnState(btn, 'loading');
                playBtn.click();

                const start = Date.now();

                while (!clip && Date.now() - start < 5000) {
                    await new Promise(resolve => {
                        setTimeout(resolve, 200);
                    });

                    waveformId =
                        waveformId ||
                        extractWaveformId(sliderEl);

                    clip = findBestClip(seconds, waveformId);
                }

                try {
                    playBtn.click();
                } catch (e) {}
            }
        }

        if (clip) {
            triggerDownload(
                clip.url,
                `audio_${clip.mediaId || clip.durationMs}.mp4`
            );

            setBtnState(btn, 'idle');

        } else {
            setBtnState(btn, 'error');
        }
    }

    // Inject Audio Button Styles
    function injectStyles() {
        if (document.getElementById('audio-dl-styles')) {
            return;
        }

        const style = document.createElement('style');

        style.id = 'audio-dl-styles';

        style.textContent = `
            .audio-dl-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                margin: 0 4px;
                padding: 0;
                background: linear-gradient(135deg, #6a11cb, #2575fc);
                color: #fff;
                border: none;
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(106, 17, 203, 0.35);
                transition: transform 0.12s ease,
                            box-shadow 0.15s ease,
                            background 0.2s ease;
                flex-shrink: 0;
            }

            .audio-dl-btn:hover {
                transform: scale(1.08);
                box-shadow: 0 3px 10px rgba(37, 117, 252, 0.45);
            }

            .audio-dl-btn:active {
                transform: scale(0.92);
            }

            .audio-dl-btn.audio-dl-loading {
                cursor: wait;
                background: linear-gradient(135deg, #6a11cb, #2575fc);
                opacity: 0.9;
            }

            .audio-dl-btn.audio-dl-error {
                background: linear-gradient(135deg, #e74c3c, #c0392b);
                box-shadow: 0 2px 8px rgba(231, 76, 60, 0.45);
            }

            .audio-dl-spin {
                animation: audio-dl-rotate 0.8s linear infinite;
            }

            @keyframes audio-dl-rotate {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;

        document.head.appendChild(style);
    }

    // Add Download Button
    function addButtonTo(sliderEl) {
        if (sliderEl.dataset.audioDlAdded) return;
        if (!isRealAudioMessage(sliderEl)) return;

        const seconds = parseFloat(
            sliderEl.getAttribute('aria-valuemax')
        );

        if (!seconds || isNaN(seconds)) return;

        const btn = document.createElement('button');

        btn.type = 'button';
        btn.className = 'audio-dl-btn';
        btn.title = 'تحميل المقطع الصوتي';

        setBtnState(btn, 'idle');

        btn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();

            onDownloadClick(sliderEl, seconds, btn);
        });

        if (sliderEl.parentElement) {
            sliderEl.parentElement.insertBefore(
                btn,
                sliderEl.nextSibling
            );

            sliderEl.dataset.audioDlAdded = '1';
        }
    }

    // Scan Direct Messages
    function scan() {
        if (!isInDirectPage()) return;

        document.querySelectorAll(
            '[role="slider"][aria-valuemax]'
        ).forEach(addButtonTo);
    }

    injectStyles();

    const audioObserver = new MutationObserver(() => {
        injectStyles();
        scan();
    });


    // =====================================================
    // PART 5: NAVIGATION + INITIALIZATION
    // =====================================================

    function onNavigate() {
        if (isTargetPage()) {
            if (!document.body.contains(btn)) {
                document.body.appendChild(btn);
                document.body.appendChild(indicator);
            }

            setTimeout(applySpeedToAll, 600);

        } else {
            btn.remove();

            fast = false;
            updateBtnAppearance();

            hideIndicator();
        }

        processLikes();
        adjustInstagramLayout();
        scan();
    }

    // Instagram SPA Navigation
    const _push = history.pushState.bind(history);
    const _replace = history.replaceState.bind(history);

    history.pushState = (...args) => {
        _push(...args);
        onNavigate();
    };

    history.replaceState = (...args) => {
        _replace(...args);
        onNavigate();
    };

    window.addEventListener('popstate', onNavigate);

    // Initialize Everything
    function initialize() {
        if (isTargetPage()) {
            document.body.appendChild(btn);
            document.body.appendChild(indicator);
        }

        layoutObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        audioObserver.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        processLikes();
        adjustInstagramLayout();
        injectStyles();
        scan();

        console.log(
            '[Instagram Toolkit] Version 9.0 initialized.'
        );
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            initialize,
            { once: true }
        );
    } else {
        initialize();
    }

    // Periodic Checks for SPA Navigation
    let previousUrl = location.href;

    setInterval(() => {
        if (location.href !== previousUrl) {
            previousUrl = location.href;
            onNavigate();

            console.log(
                '[Instagram Toolkit] Navigation detected:',
                location.pathname
            );
        }

        processLikes();
        adjustInstagramLayout();
        scan();

    }, 1200);

    console.log(
        '[Instagram Toolkit] All modules loaded successfully.'
    );

})();
