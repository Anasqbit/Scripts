// ==UserScript==
// @name         Youtube Video Downloader 7.3.0
// @namespace    http://tampermonkey.net/
// @author       Anasqbit
// @version      7.3.0
// @description  Download Youtube videos using any4k api -FIXED VIDEO MP4 AND TITEL.
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      any4k.com
// @connect      api.any4k.com
// @license      GPL-3.0-or-later
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const ANY4K_PAGE   = 'https://any4k.com/download/youtube/';
    const API_DOWNLOAD = 'https://api.any4k.com/v1/dlp/download';
    const API_PROGRESS = 'https://api.any4k.com/v1/dlp/download_progress';
    const API_FILE     = 'https://api.any4k.com/v1/file/o';
    const DEVICE_ID    = '00000000000000000000000000000000';

    const IDS = {
        WRAPPER  : 'yt-dl-wrapper',
        FMT_BTN  : 'yt-dl-fmt-btn',
        DL_BTN   : 'yt-dl-dl-btn',
        POPUP    : 'yt-dl-popup',
        BACKDROP : 'yt-dl-backdrop',
        STYLE    : 'yt-dl-style',
    };

    let cache = { videoId: null, groups: null, title: null };
    let selectedFmt = null;

    const commonFields = () => ({
        lang: 'en', country: 'US', platform: 'Web',
        sysVer: '1.0', appVer: '1.0',
        bundleId: 'OK', deviceId: DEVICE_ID,
    });

    const isWatch  = () => location.pathname === '/watch';
    const isShorts = () => location.pathname.startsWith('/shorts/');
    const isDark   = () => document.documentElement.hasAttribute('dark');
    const isLive   = () => !!(
        window.ytInitialPlayerResponse?.videoDetails?.isLiveContent ||
        document.querySelector('.ytp-live')
    );

    function getVideoId() {
        if (isWatch())  return new URLSearchParams(location.search).get('v');
        if (isShorts()) return location.pathname.split('/shorts/')[1]?.split('/')[0] || null;
        return null;
    }

    function getVideoUrl() {
        const id = getVideoId();
        if (!id) return null;
        if (isWatch())  return `https://www.youtube.com/watch?v=${id}`;
        if (isShorts()) return `https://www.youtube.com/shorts/${id}`;
        return null;
    }

    function buildFileName(rawTitle, fmt) {
        let title = rawTitle || 'video';
        title = title.replace(/\s*[-–|]\s*YouTube\s*$/i, '').trim();
        title = title.replace(/any4k\.com[-\s]*/gi, '').trim();
        title = title.replace(/_/g, ' ');
        title = title.replace(/\s{2,}/g, ' ').trim();
        title = title.replace(/[\\/:*?"<>|]/g, '').trim();
        title = title.slice(0, 120) || 'video';
        const qualityLabel = extractQualityLabel(fmt.label);
        if (qualityLabel) return `${title} (${qualityLabel}).${fmt.ext}`;
        return `${title}.${fmt.ext}`;
    }

    function extractQualityLabel(label) {
        const match = label.match(/(\d+(?:\.\d+)?(?:kHz|p))/i);
        return match ? match[1] : '';
    }

    function formatSize(bytes) {
        if (!bytes) return '';
        const mb = bytes / (1024 * 1024);
        if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
        return mb >= 100 ? `${Math.round(mb)} MB` : `${mb.toFixed(2)} MB`;
    }

    function formatHz(asr) {
        if (!asr) return '';
        return asr >= 1000 ? `${(asr / 1000).toFixed(0)}kHz` : `${asr}Hz`;
    }

    function fixJson(str) {
        return str
            .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')
            .replace(/:\s*b\b/g,  ':"mp4"')
            .replace(/:\s*h\b/g,  ':"m4a"')
            .replace(/:\s*d\b/g,  ':"mp4"')
            .replace(/:\s*i\b/g,  ':"mp4a"')
            .replace(/:\s*f\b/g,  ':"av01"')
            .replace(/:\s*g\b/g,  ':"avc1"')
            .replace(/void\s+0/g, 'null')
            .replace(/:\s*c\b/g,  ':false')
            .replace(/:\s*a\b/g,  ':true');
    }

    function scrapeFormats(videoId, cb) {
        GM_xmlhttpRequest({
            method  : 'GET',
            url     : `${ANY4K_PAGE}${videoId}`,
            headers : { 'Accept': 'text/html,*/*' },
            timeout : 25_000,
            onload(res) {
                if (res.status !== 200) { cb(`HTTP ${res.status}`); return; }
                const clean = res.responseText.replace(/\\u002F/g, '/');
                let title = '';
                const tm = clean.match(/title\s*:\s*"((?:[^"\\]|\\.)*)"/);
                if (tm) {
                    title = tm[1]
                        .replace(/\\u([\dA-Fa-f]{4})/g,
                            (_, h) => String.fromCharCode(parseInt(h, 16)))
                        .replace(/\\"/g, '"')
                        .replace(/\\\\/g, '\\');
                }
                const dlMatch    = clean.match(/download:(\[.*?\]),raw_video/);
                const audioMatch = clean.match(/raw_audio:(\[.*?\])\}/);
                if (!dlMatch && !audioMatch) { cb('No formats found'); return; }
                const groups = [];
                if (audioMatch) {
                    try {
                        const list = JSON.parse(fixJson(audioMatch[1]));
                        if (list.length) {
                            groups.push({
                                label: 'Audio',
                                items: list.map(f => ({
                                    id   : f.id,
                                    label: `${(f.ext||'m4a').toUpperCase()} ${formatHz(f.asr)} — ${formatSize(f.filesize)}`,
                                    ext  : f.ext || 'm4a',
                                }))
                            });
                        }
                    } catch(e) { console.warn('[YTDl] audio:', e); }
                }
                if (dlMatch) {
                    try {
                        const list = JSON.parse(fixJson(dlMatch[1]));
                        if (list.length) {
                            groups.push({
                                label: 'Video + Audio',
                                items: list.map(f => ({
                                    id   : f.id,
                                    label: `MP4 ${f.res_text||''} — ${formatSize(f.filesize)}`,
                                    ext  : 'mp4',
                                }))
                            });
                        }
                    } catch(e) { console.warn('[YTDl] video:', e); }
                }
                if (!groups.length) { cb('Could not parse formats'); return; }
                cache = { videoId, groups, title };
                cb(null, groups);
            },
            onerror  () { cb('Network error'); },
            ontimeout() { cb('Request timed out'); },
        });
    }

    function injectStyle() {
        if (document.getElementById(IDS.STYLE)) return;
        const dark  = isDark();
        const hover = dark ? '#3f3f3f' : '#e5e5e5';
        const color = dark ? '#fff'    : '#030303';
        const popBg = dark ? '#1e1e1e' : '#fff';
        const popBd = dark ? '#444'    : '#ddd';
        const grpCl = dark ? '#999'    : '#666';
        const s = document.createElement('style');
        s.id = IDS.STYLE;
        s.textContent = `
#${IDS.WRAPPER}{display:inline-flex;align-items:center;gap:6px;margin:0 8px;}
#${IDS.BACKDROP}{
    position:fixed;inset:0;z-index:2200;
    background:rgba(0,0,0,0.55);
    backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);
    animation:yt-dl-fade-in .15s ease;
}
@keyframes yt-dl-fade-in{from{opacity:0}to{opacity:1}}
#${IDS.POPUP}{
    position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
    z-index:2201;background:${popBg};color:${color};
    border:1px solid ${popBd};border-radius:14px;
    box-shadow:0 20px 60px rgba(0,0,0,.4);
    padding:8px;width:320px;max-width:calc(100vw - 32px);
    max-height:70vh;overflow-y:auto;
    animation:yt-dl-popup-in .18s ease;
}
@keyframes yt-dl-popup-in{
    from{opacity:0;transform:translate(-50%,-48%)}
    to  {opacity:1;transform:translate(-50%,-50%)}
}
.yt-dl-popup-header{
    display:flex;align-items:center;justify-content:space-between;
    padding:6px 8px 10px;font-size:13px;font-weight:700;color:${grpCl};
    border-bottom:1px solid ${popBd};margin-bottom:4px;
}
.yt-dl-popup-close{
    background:none;border:none;cursor:pointer;color:${grpCl};
    font-size:18px;line-height:1;padding:0 4px;border-radius:4px;transition:color .15s;
}
.yt-dl-popup-close:hover{color:${color};}
.yt-dl-grp{
    font-size:11px;font-weight:700;color:${grpCl};
    text-transform:uppercase;letter-spacing:.5px;padding:10px 8px 4px;user-select:none;
}
.yt-dl-opt{
    display:block;width:100%;padding:9px 12px;font-size:13.5px;
    background:none;border:none;border-radius:8px;
    color:inherit;cursor:pointer;text-align:left;
    box-sizing:border-box;transition:background .1s;
}
.yt-dl-opt:hover{background:${hover};}
.yt-dl-opt.active{font-weight:700;background:rgba(62,130,247,.13);color:${dark?'#60a5fa':'#1d4ed8'};}
.yt-dl-spin-wrap{
    display:flex;align-items:center;justify-content:center;
    flex-direction:column;gap:10px;padding:28px;font-size:13px;color:${grpCl};
}
.yt-dl-spin{
    width:26px;height:26px;border-radius:50%;
    border:2.5px solid ${dark?'#444':'#ddd'};
    border-top-color:${dark?'#fff':'#333'};
    animation:yt-dl-rot .7s linear infinite;
}
@keyframes yt-dl-rot{to{transform:rotate(360deg);}}
.yt-dl-loading{background:#d97706 !important;color:#fff !important;border-color:transparent !important;}
.yt-dl-done   {background:#16a34a !important;color:#fff !important;border-color:transparent !important;}
.yt-dl-loading .ytSpecButtonShapeNextButtonTextContent, .yt-dl-done .ytSpecButtonShapeNextButtonTextContent { color: #fff !important; }
        `;
        document.head.appendChild(s);
    }

    function makeDownloadSvg() {
        const NS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('height', '24');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '24');
        svg.style.cssText = 'pointer-events: none; display: inherit; width: 100%; height: 100%; stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round;';
        ['M12 4v12', 'M8 12l4 4 4-4', 'M4 18h16'].forEach(d => {
            const p = document.createElementNS(NS, 'path');
            p.setAttribute('d', d); svg.appendChild(p);
        });
        return svg;
    }

    function makeArrowSvg() {
        const NS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('height', '24');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '24');
        svg.style.cssText = 'pointer-events: none; display: inherit; width: 100%; height: 100%; stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round;';
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', 'M6 9l6 6 6-6');
        svg.appendChild(p);
        return svg;
    }

    function createPerfectYtButton(text, iconSvgElement, id) {
        const wrapper = document.createElement('yt-button-view-model');
        wrapper.className = "ytd-menu-renderer";

        const buttonViewModel = document.createElement('button-view-model');
        buttonViewModel.className = 'ytSpecButtonViewModelHost style-scope ytd-menu-renderer';

        const btn = document.createElement('button');
        btn.id = id;
        btn.className = "ytSpecButtonShapeNextHost ytSpecButtonShapeNextTonal ytSpecButtonShapeNextMono ytSpecButtonShapeNextSizeM ytSpecButtonShapeNextIconLeading ytSpecButtonShapeNextEnableBackdropFilterExperiment";
        btn.setAttribute('aria-label', text);
        btn.setAttribute('aria-disabled', 'false');

        const iconContainer = document.createElement('div');
        iconContainer.className = "ytSpecButtonShapeNextIcon ytSpecButtonShapeNextElevatedContent";
        iconContainer.setAttribute('aria-hidden', 'true');

        const span1 = document.createElement('span');
        span1.className = "ytIconWrapperHost";
        span1.style.cssText = "width: 24px; height: 24px;";

        const span2 = document.createElement('span');
        span2.className = "yt-icon-shape ytSpecIconShapeHost";

        const iconDiv = document.createElement('div');
        iconDiv.style.cssText = "width: 100%; height: 100%; display: block; fill: currentcolor;";

        iconDiv.appendChild(iconSvgElement);
        span2.appendChild(iconDiv);
        span1.appendChild(span2);
        iconContainer.appendChild(span1);
        btn.appendChild(iconContainer);

        const textDiv = document.createElement('div');
        textDiv.className = "ytSpecButtonShapeNextButtonTextContent ytSpecButtonShapeNextElevatedContent";
        textDiv.textContent = text;
        btn.appendChild(textDiv);

        const feedbackShape = document.createElement('yt-touch-feedback-shape');
        feedbackShape.setAttribute('aria-hidden', 'true');
        feedbackShape.className = "ytSpecTouchFeedbackShapeHost ytSpecTouchFeedbackShapeTouchResponse";
        const strokeDiv = document.createElement('div'); strokeDiv.className = "ytSpecTouchFeedbackShapeStroke";
        const fillDiv = document.createElement('div'); fillDiv.className = "ytSpecTouchFeedbackShapeFill";
        feedbackShape.appendChild(strokeDiv);
        feedbackShape.appendChild(fillDiv);
        btn.appendChild(feedbackShape);

        const lightShape = document.createElement('yt-light-shape');
        lightShape.setAttribute('aria-hidden', 'true');
        lightShape.className = "contribYtLightShapeHost contribYtLightShapeStaticRimLight contribYtLightShapeStaticRimLightTonal";
        lightShape.style.cssText = "--yt-light-wash-opacity: 0; --yt-light-wash-x: 0px; --yt-light-wash-y: 0px; --yt-light-wash-size: 0px;";
        const washLight = document.createElement('div'); washLight.className = "contribYtLightShapeStaticWashLight contribYtLightShapeStaticWashLightTonal";
        lightShape.appendChild(washLight);
        btn.appendChild(lightShape);

        buttonViewModel.appendChild(btn);
        wrapper.appendChild(buttonViewModel);

        return { btn, wrapper };
    }

    function findContainer() {
        if (isWatch())  return document.querySelector('#top-level-buttons-computed');
        if (isShorts()) return document.querySelector('#end');
        return null;
    }

    function buildUI(container) {
        if (document.getElementById(IDS.WRAPPER)) return;
        injectStyle();

        const fmtObj = createPerfectYtButton('Select Format', makeArrowSvg(), IDS.FMT_BTN);
        const dlObj = createPerfectYtButton('Download', makeDownloadSvg(), IDS.DL_BTN);

        fmtObj.btn.addEventListener('click', onFmtClick);
        dlObj.btn.addEventListener('click', onDlClick);

        const wrapper = document.createElement('div');
        wrapper.id = IDS.WRAPPER;
        wrapper.appendChild(fmtObj.wrapper);
        wrapper.appendChild(dlObj.wrapper);

        // هنا تم إعادة طريقة الحقن الأصلية
        const like = container.querySelector('#segmented-like-button');
        if (like) like.after(wrapper);
        else container.appendChild(wrapper);

        syncDisabled();
    }

    function removeUI() {
        document.getElementById(IDS.WRAPPER)?.remove();
        closePopup();
        cache = { videoId: null, groups: null, title: null };
        selectedFmt = null;
    }

    function syncDisabled() {
        const off = !(isWatch() || isShorts()) || isLive();
        [IDS.FMT_BTN, IDS.DL_BTN].forEach(id => {
            const b = document.getElementById(id);
            if (b && !b.dataset.loading) {
                b.disabled = off;
                if(off) {
                    b.setAttribute('aria-disabled', 'true');
                    b.style.opacity = '0.5';
                    b.style.pointerEvents = 'none';
                } else {
                    b.setAttribute('aria-disabled', 'false');
                    b.style.opacity = '1';
                    b.style.pointerEvents = 'auto';
                }
            }
        });
        const vid = getVideoId();
        if (vid && vid !== cache.videoId) {
            cache = { videoId: null, groups: null, title: null };
            selectedFmt = null;
            const lbl = document.querySelector(`#${IDS.FMT_BTN} .ytSpecButtonShapeNextButtonTextContent`);
            if (lbl) lbl.textContent = 'Select Format';
        }
    }

    function onFmtClick(e) {
        e.stopPropagation();
        if (document.getElementById(IDS.POPUP)) { closePopup(); return; }
        openPopup();
    }

    function openPopup() {
        const backdrop = document.createElement('div');
        backdrop.id = IDS.BACKDROP;
        backdrop.addEventListener('click', closePopup);
        document.body.appendChild(backdrop);

        const popup = document.createElement('div');
        popup.id = IDS.POPUP;

        const header = document.createElement('div');
        header.className = 'yt-dl-popup-header';
        const headerTitle = document.createElement('span');
        headerTitle.textContent = 'Choose Quality';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'yt-dl-popup-close';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', closePopup);
        header.appendChild(headerTitle);
        header.appendChild(closeBtn);
        popup.appendChild(header);
        document.body.appendChild(popup);

        const vid = getVideoId();

        if (cache.videoId === vid && cache.groups) {
            renderFormats(popup, cache.groups);
        } else {
            showSpinner(popup, 'Loading formats…');
            scrapeFormats(vid, (err, groups) => {
                const p = document.getElementById(IDS.POPUP);
                if (!p) return;
                while (p.children.length > 1) p.removeChild(p.lastChild);
                if (err) {
                    const msg = document.createElement('div');
                    msg.style.cssText = 'padding:20px;font-size:13px;text-align:center;color:#f87171;';
                    msg.textContent = '⚠️ ' + err;
                    p.appendChild(msg);
                    return;
                }
                renderFormats(p, groups);
            });
        }

        document.addEventListener('keydown', onEscKey, true);
    }

    function showSpinner(popup, text) {
        const wrap = document.createElement('div');
        wrap.className = 'yt-dl-spin-wrap';
        const spin = document.createElement('div');
        spin.className = 'yt-dl-spin';
        const lbl = document.createElement('span');
        lbl.textContent = text;
        wrap.appendChild(spin);
        wrap.appendChild(lbl);
        popup.appendChild(wrap);
    }

    function renderFormats(popup, groups) {
        groups.forEach(({ label, items }) => {
            const grp = document.createElement('div');
            grp.className = 'yt-dl-grp';
            grp.textContent = label;
            popup.appendChild(grp);
            items.forEach(fmt => {
                const btn = document.createElement('button');
                btn.className = 'yt-dl-opt' + (selectedFmt?.id === fmt.id ? ' active' : '');
                btn.textContent = fmt.label;
                btn.addEventListener('click', () => {
                    selectedFmt = fmt;
                    const lbl = document.querySelector(`#${IDS.FMT_BTN} .ytSpecButtonShapeNextButtonTextContent`);
                    if (lbl) lbl.textContent = fmt.label;
                    closePopup();
                });
                popup.appendChild(btn);
            });
        });
    }

    function closePopup() {
        document.getElementById(IDS.POPUP)?.remove();
        document.getElementById(IDS.BACKDROP)?.remove();
        document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach(el => el.remove());
        document.removeEventListener('keydown', onEscKey, true);
    }

    function onEscKey(e) {
        if (e.key === 'Escape') closePopup();
    }

    function onDlClick() {
        const dlBtn  = document.getElementById(IDS.DL_BTN);
        const fmtBtn = document.getElementById(IDS.FMT_BTN);
        if (!dlBtn || !fmtBtn || dlBtn.dataset.loading) return;

        if (!selectedFmt) {
            alert('الرجاء اختيار الصيغة أولاً');
            return;
        }

        const url = getVideoUrl();
        if (!url) return;

        const dlLabel = dlBtn.querySelector('.ytSpecButtonShapeNextButtonTextContent');
        const icon    = dlBtn.querySelector('.ytSpecButtonShapeNextIcon');

        const setLoading = txt => {
            dlBtn.dataset.loading = '1';
            dlBtn.disabled  = true;
            fmtBtn.disabled = true;
            if (icon) icon.style.display = 'none';
            dlLabel.textContent = txt;
            dlBtn.classList.add('yt-dl-loading');
        };

        const resetBtn = () => {
            delete dlBtn.dataset.loading;
            dlBtn.classList.remove('yt-dl-loading', 'yt-dl-done');
            if (icon) icon.style.display = '';
            dlLabel.textContent = 'Download';
            syncDisabled();
        };

        const setDone = () => {
            dlBtn.classList.remove('yt-dl-loading');
            dlBtn.classList.add('yt-dl-done');
            if (icon) icon.style.display = 'none';
            dlLabel.textContent = '✅ Done!';
            setTimeout(resetBtn, 3000);
        };

        const rawTitle = cache.title ||
            (document.title || 'video')
                .replace(/\s*[-–|]\s*YouTube\s*$/i, '').trim();
        const fileName = buildFileName(rawTitle, selectedFmt);

        setLoading('⏳ Starting…');

        GM_xmlhttpRequest({
            method  : 'POST',
            url     : API_DOWNLOAD,
            headers : { 'Content-Type': 'application/json' },
            data    : JSON.stringify({ url, format: selectedFmt.id, ...commonFields() }),
            timeout : 25_000,
            onload(res) {
                let json;
                try { json = JSON.parse(res.responseText); }
                catch { alert('❌ Bad server response'); resetBtn(); return; }

                if (json?.err_code !== 0) {
                    alert(`❌ ${json?.err_msg || 'API error'}`);
                    resetBtn(); return;
                }

                const dlId = json.id;
                if (!dlId) { alert('❌ No download ID'); resetBtn(); return; }

                setLoading('⏳ 0%');

                listenSSE(dlId, 0, dlLabel, setDone, resetBtn);
            },
            onerror  () { alert('❌ Network error'); resetBtn(); },
            ontimeout() { alert('❌ Timeout');        resetBtn(); },
        });
    }

    function listenSSE(dlId, attempt, dlLabel, setDone, resetBtn) {
        if (attempt > 8) {
            alert('❌ Failed after multiple retries.');
            resetBtn();
            return;
        }

        const url = `${API_PROGRESS}?id=${dlId}`;
        let es;
        let finished = false;

        const finish = fn => {
            if (finished) return;
            finished = true;
            try { es?.close(); } catch(e) {}
            fn();
        };

        try {
            es = new EventSource(url);
        } catch(e) {
            console.warn('[YTDl] EventSource not available');
            alert('❌ EventSource not supported');
            resetBtn();
            return;
        }

        es.addEventListener('progress', e => {
            const n = parseFloat(e.data);
            if (!isNaN(n)) {
                dlLabel.textContent = `⏳ ${Math.floor(n)}%`;
            }
        });

        es.addEventListener('done', () => {
            finish(() => {
                triggerIframeDownload(dlId);
                setDone();
            });
        });

        es.addEventListener('error', e => {
            const data = e.data || '';

            if (data.includes('High demand')) {
                finish(() => {
                    dlLabel.textContent = `⏳ Queue (${attempt + 1})…`;
                    setTimeout(() => {
                        listenSSE(dlId, attempt + 1, dlLabel, setDone, resetBtn);
                    }, 40_000);
                });
                return;
            }

            if (data) {
                finish(() => {
                    alert(`❌ ${data}`);
                    resetBtn();
                });
            }
        });

        const guardTimer = setTimeout(() => {
            finish(() => {
                console.warn('[YTDl] SSE guard timeout — retry');
                setTimeout(() => {
                    listenSSE(dlId, attempt + 1, dlLabel, setDone, resetBtn);
                }, 2000);
            });
        }, 300_000);

        es.addEventListener('done',  () => clearTimeout(guardTimer));
        es.addEventListener('error', () => clearTimeout(guardTimer));
    }

    function triggerIframeDownload(dlId) {
        const fileUrl = `${API_FILE}?i=${dlId}`;
        const iframe  = document.createElement('iframe');
        iframe.style.cssText = 'display:none;width:0;height:0;border:none;position:fixed;';
        iframe.src = fileUrl;
        document.body.appendChild(iframe);
        setTimeout(() => iframe.remove(), 60_000);
    }

    function checkAndInject() {
        const container = findContainer();
        const existing  = document.getElementById(IDS.WRAPPER);
        if      (container && !existing)  buildUI(container);
        else if (!container &&  existing) removeUI();
        else    syncDisabled();
    }

    let moTimer = null;
    new MutationObserver(() => {
        if (moTimer) return;
        moTimer = setTimeout(() => { moTimer = null; checkAndInject(); }, 350);
    }).observe(document.body, { childList: true, subtree: true });

    document.addEventListener('yt-navigate-finish', () => {
        removeUI();
        setTimeout(checkAndInject, 900);
        setTimeout(checkAndInject, 2500);
    });

    window.addEventListener('load', () => {
        checkAndInject();
        setTimeout(checkAndInject, 1800);
    });

})();