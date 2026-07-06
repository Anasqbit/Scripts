// ==UserScript==
// @name Instagram Download Button
// @name:zh-TW Instagram 下載器
// @name:zh-CN Instagram 下载器
// @name:ja Instagram ダウンローダー
// @name:ko Instagram 다운로더
// @name:es Descargador de Instagram
// @name:fr Téléchargeur Instagram
// @name:ru Загрузчик Instagram
// @version v1.2
// @compatible chrome
// @description Add the download button to download profile picture and media in the posts, stories, and highlights in Instagram
// @author Anasqbit
// @match https://www.instagram.com/*
// @icon https://www.google.com/s2/favicons?sz=64&domain=instagram.com
// @updateURL     https://github.com/Anasqbit/Scripts/blob/main/INSTA%20DOWNLOADER%20v2.2.js
// @downloadURL   https://github.com/Anasqbit/Scripts/blob/main/INSTA%20DOWNLOADER%20v2.2.js
// @grant none
// @license MIT
// @run-at document-start
// ==/UserScript==

(function () {
    'use strict';

    // ================================const postFilenameTemplate
    // ==== الإعدادات ====
    // ================================
    const disableNewUrlFetchMethod = false;
    const replaceJpegWithJpg = false;
    const postFilenameTemplate = '%id%_%postId%_%mediaIndex%';
    const storyFilenameTemplate = postFilenameTemplate;
    const datetimeTemplate = '%y%%m%%d%_%H%%M%%S%';

    const postIdPattern = /^\/p\/([^/]+)\//;
    const postUrlPattern = /instagram\.com\/p\/[\w-]+\//;

    var preUrl = "";

    // ================================
    // ==== CSS ====
    // ================================
    const styleCSS = `
        /* إخفاء الأزرار القديمة */
        a.custom-btn.download-btn,
        a.custom-btn.newtab-btn {
            display: none !important;
        }

        /* تنسيق زر التنزيل الجديد */
        .ig-dl-btn {
            cursor: pointer;
        }
        .ig-dl-btn:hover {
            opacity: 0.6;
        }
        .ig-dl-btn:active {
            transform: scale(0.95);
        }

        /* تنسيق زر تضمين المحول */
        [data-replaced="1"] {
            color: #0095f6 !important;
        }

        /* زر التحميل للقصص */
        .story-dl-btn {
            cursor: pointer;
            margin-left: 8px;
        }
        .story-dl-btn:hover {
            opacity: 0.7;
        }

        /* زر تحميل البروفايل */
        .profile-dl-btn {
            cursor: pointer;
        }
        .profile-dl-btn:hover {
            opacity: 0.6;
        }
        .profile-dl-btn:active {
            transform: scale(0.95);
        }
    `;

    function addGlobalStyle() {
        if (document.getElementById('ig-dl-style')) return;
        const style = document.createElement('style');
        style.id = 'ig-dl-style';
        style.type = 'text/css';
        style.textContent = styleCSS;
        (document.head || document.documentElement).appendChild(style);
    }
    addGlobalStyle();

    // ================================
    // ==== أيقونة التنزيل ====
    // ================================
    const downloadSVG = `
        <svg aria-label="تنزيل" class="x1lliihq x1n2onr6 x5n08af" fill="currentColor" height="31" role="img" viewBox="-1 3 20 23" width="31">
            <title>تنزيل</title>
            <path d="M12 15.57a1.1 1.1 0 0 1-.38-.06.88.88 0 0 1-.32-.21l-3.6-3.6a.92.92 0 0 1-.29-.7c.01-.27.1-.5.29-.7.2-.2.44-.3.71-.31.28-.01.52.08.71.29L11 12.14V5c0-.28.1-.52.29-.71.19-.2.43-.29.71-.29.28 0 .52.1.71.29.2.19.29.43.29.71v7.15l1.88-1.88c.2-.2.43-.3.7-.28a1.02 1.02 0 0 1 1 1.01c.02.27-.08.5-.28.7l-3.6 3.6c-.1.1-.2.17-.32.21a1.1 1.1 0 0 1-.38.06ZM6 20c-.55 0-1.02-.2-1.41-.59-.4-.39-.59-.86-.59-1.41v-2c0-.28.1-.52.29-.71.19-.2.43-.29.71-.29.28 0 .52.1.71.29.2.19.29.43.29.71v2h12v-2c0-.28.1-.52.29-.71.19-.2.43-.29.71-.29.28 0 .52.1.71.29.2.19.29.43.29.71v2c0 .55-.2 1.02-.59 1.41-.39.4-.86.59-1.41.59H6Z"></path>
        </svg>
    `;

    const downloadSVGSmall = `
        <svg aria-label="تنزيل" class="x1lliihq x1n2onr6 x5n08af" fill="currentColor" height="30" role="img" viewBox="0 0 24 24" width="30">
            <title>تنزيل</title>
            <path d="M12 15.57a1.1 1.1 0 0 1-.38-.06.88.88 0 0 1-.32-.21l-3.6-3.6a.92.92 0 0 1-.29-.7c.01-.27.1-.5.29-.7.2-.2.44-.3.71-.31.28-.01.52.08.71.29L11 12.14V5c0-.28.1-.52.29-.71.19-.2.43-.29.71-.29.28 0 .52.1.71.29.2.19.29.43.29.71v7.15l1.88-1.88c.2-.2.43-.3.7-.28a1.02 1.02 0 0 1 1 1.01c.02.27-.08.5-.28.7l-3.6 3.6c-.1.1-.2.17-.32.21a1.1 1.1 0 0 1-.38.06ZM6 20c-.55 0-1.02-.2-1.41-.59-.4-.39-.59-.86-.59-1.41v-2c0-.28.1-.52.29-.71.19-.2.43-.29.71-.29.28 0 .52.1.71.29.2.19.29.43.29.71v2h12v-2c0-.28.1-.52.29-.71.19-.2.43-.29.71-.29.28 0 .52.1.71.29.2.19.29.43.29.71v2c0 .55-.2 1.02-.59 1.41-.39.4-.86.59-1.41.59H6Z"></path>
        </svg>
    `;

    const downloadSVGWhite = `
        <svg aria-label="تنزيل" fill="white" height="24" role="img" viewBox="0 0 24 24" width="24">
            <title>تنزيل</title>
            <path d="M12 15.57a1.1 1.1 0 0 1-.38-.06.88.88 0 0 1-.32-.21l-3.6-3.6a.92.92 0 0 1-.29-.7c.01-.27.1-.5.29-.7.2-.2.44-.3.71-.31.28-.01.52.08.71.29L11 12.14V5c0-.28.1-.52.29-.71.19-.2.43-.29.71-.29.28 0 .52.1.71.29.2.19.29.43.29.71v7.15l1.88-1.88c.2-.2.43-.3.7-.28a1.02 1.02 0 0 1 1 1.01c.02.27-.08.5-.28.7l-3.6 3.6c-.1.1-.2.17-.32.21a1.1 1.1 0 0 1-.38.06ZM6 20c-.55 0-1.02-.2-1.41-.59-.4-.39-.59-.86-.59-1.41v-2c0-.28.1-.52.29-.71.19-.2.43-.29.71-.29.28 0 .52.1.71.29.2.19.29.43.29.71v2h12v-2c0-.28.1-.52.29-.71.19-.2.43-.29.71-.29.28 0 .52.1.71.29.2.19.29.43.29.71v2c0 .55-.2 1.02-.59 1.41-.39.4-.86.59-1.41.59H6Z"></path>
        </svg>
    `;

    // ================================
    // ==== التحقق من نوع الصفحة ====
    // ================================
    function isReelsPage() {
        return window.location.pathname.match(/^\/reels?\//);
    }

    function isPostPage() {
        return Boolean(window.location.href.match(postUrlPattern));
    }

    function isStoryPage() {
        return window.location.pathname.includes('stories');
    }

    function isProfilePage() {
        // صفحة بروفايل: ليست قصة، ليست ريلز، ليست منشور، وفيها header
        const path = window.location.pathname;
        return !isStoryPage() &&
               !isReelsPage() &&
               !path.startsWith('/p/') &&
               !path.startsWith('/explore/') &&
               path !== '/' &&
               document.querySelector('header section');
    }

    // ================================
    // ==== إضافة زر التنزيل للمنشورات ====
    // ================================
    function addDownloadButton() {
        if (isReelsPage() || isStoryPage()) return;

        const sections = document.querySelectorAll('section');

        sections.forEach(section => {
            if (section.querySelector('.ig-dl-wrapper')) return;

            const shareBtn = section.querySelector('svg[aria-label="مشاركة المنشور"], svg[aria-label="مشاركة"], svg[aria-label="Share Post"], svg[aria-label="Share"]');
            if (!shareBtn) return;

            let shareParent = shareBtn.closest('span.x1rg5ohu') || shareBtn.closest('button') || shareBtn.closest('div[role="button"]');
            if (!shareParent) return;

            const wrapper = document.createElement('span');
            wrapper.className = 'x1rg5ohu ig-dl-wrapper';

            const btn = document.createElement('div');
            btn.className = 'x1i10hfl x972fbf xcuag5g x10w94by x1qhh985 x14e42zd x9f619 x3ct3a4 xdj266r x14z9mp xat24cr x1lziwak x16tdsg8 x1hl2dhg xggy1nq x1a2a7pz x6s0dn4 xjbqb8w x1ejq31n x18oe1m7 x1sy0etr xstzfhl x1ypdohk x78zum5 xl56j7k x1y1aw1k xf159sx xwib8y2 xmzvs34 xcdnw81 x1epzrsm x1jplu5e x14snt5h ig-dl-btn download-btn';
            btn.setAttribute('role', 'button');
            btn.setAttribute('tabindex', '0');
            btn.setAttribute('title', 'تنزيل');

            const innerDiv = document.createElement('div');
            innerDiv.className = 'x6s0dn4 x78zum5 xdt5ytf xl56j7k';
            innerDiv.innerHTML = downloadSVG;

            btn.appendChild(innerDiv);
            wrapper.appendChild(btn);

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                postOnClicked(btn);
            }, true);

            if (shareParent.parentNode) {
                shareParent.parentNode.insertBefore(wrapper, shareParent.nextSibling);
            }
        });
    }

    // ================================
    // ==== إضافة زر التنزيل للقصص ====
    // ================================
    function addStoryDownloadButton() {
        if (!isStoryPage()) return;
        if (document.querySelector('.story-dl-btn')) return;

        const playSvgPathSelector = 'path[d="M5.888 22.5a3.46 3.46 0 0 1-1.721-.46l-.003-.002a3.451 3.451 0 0 1-1.72-2.982V4.943a3.445 3.445 0 0 1 5.163-2.987l12.226 7.059a3.444 3.444 0 0 1-.001 5.967l-12.22 7.056a3.462 3.462 0 0 1-1.724.462Z"]';
        const pauseSvgPathSelector = 'path[d="M15 1c-3.3 0-6 1.3-6 3v40c0 1.7 2.7 3 6 3s6-1.3 6-3V4c0-1.7-2.7-3-6-3zm18 0c-3.3 0-6 1.3-6 3v40c0 1.7 2.7 3 6 3s6-1.3 6-3V4c0-1.7-2.7-3-6-3z"]';

        let playPauseSvg = queryHas(document, 'svg', playSvgPathSelector) || queryHas(document, 'svg', pauseSvgPathSelector);
        if (playPauseSvg) {
            let buttonDiv = playPauseSvg.parentNode;

            const btn = document.createElement('div');
            btn.className = 'story-dl-btn download-btn';
            btn.setAttribute('role', 'button');
            btn.setAttribute('title', 'تنزيل');
            btn.innerHTML = downloadSVGWhite;
            btn.style.cssText = 'cursor: pointer; margin-left: 16px; margin-top: 8px; z-index: 999;';

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                storyOnClicked(btn);
            }, true);

            buttonDiv.parentNode.parentNode.parentNode.append(btn);
        }
    }

    // ================================
    // ==== إضافة زر التنزيل للبروفايل ====
    // ================================
    function addProfileDownloadButton() {
        if (!isProfilePage()) return;
        if (document.querySelector('.profile-dl-btn')) return;

        // البحث عن زر الخيارات (النقاط الثلاث)
        const optionsBtn = document.querySelector('svg[aria-label="الخيارات"], svg[aria-label="Options"]');
        if (!optionsBtn) return;

        // الحصول على العنصر الأب (الزر الكامل)
        const optionsBtnContainer = optionsBtn.closest('div[role="button"]');
        if (!optionsBtnContainer) return;

        // الحصول على الحاوية الأب
        const parentContainer = optionsBtnContainer.parentNode;
        if (!parentContainer) return;

        // إنشاء زر التحميل بنفس الـ classes
        const downloadBtn = document.createElement('div');
        downloadBtn.className = 'x1i10hfl x9f619 x3ct3a4 xdj266r x14z9mp xat24cr x1lziwak x16tdsg8 x1hl2dhg xggy1nq x1a2a7pz x6s0dn4 xjbqb8w x1ejq31n x18oe1m7 x1sy0etr xstzfhl x1ypdohk xl56j7k x1y1aw1k xf159sx xwib8y2 xmzvs34 xcdnw81 x1epzrsm x1jplu5e x14snt5h x1obq294 x5a5i1n xde0f50 x15x8krk x972fbf x10w94by x1qhh985 x14e42zd xt0psk2 profile-dl-btn download-btn';
        downloadBtn.setAttribute('role', 'button');
        downloadBtn.setAttribute('tabindex', '0');
        downloadBtn.setAttribute('title', 'تنزيل صورة البروفايل');

        // إنشاء الـ div الداخلي
        const innerDiv = document.createElement('div');
        innerDiv.className = 'x6s0dn4 x78zum5 xdt5ytf xl56j7k';
        innerDiv.innerHTML = downloadSVGSmall;

        downloadBtn.appendChild(innerDiv);

        // إضافة حدث الضغط
        downloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            profileOnClicked(downloadBtn);
        }, true);

        // إضافة الزر بعد زر الخيارات
        parentContainer.insertBefore(downloadBtn, optionsBtnContainer.nextSibling);
    }

    // ================================
    // ==== دالة استبدال زر تضمين ====
    // ================================
    function replaceEmbedButton(span) {
        const txt = (span.textContent || '').trim();
        if (txt !== 'تضمين' && txt.toLowerCase() !== 'embed') return;

        const btnRoot = span.closest('[role="button"]');
        if (!btnRoot) return;
        if (btnRoot.dataset.replaced === '1') return;

        btnRoot.dataset.replaced = '1';
        span.dataset.replaced = '1';

        span.textContent = 'تنزيل';
        span.style.color = '#0095f6';

        btnRoot.style.cursor = 'pointer';
        btnRoot.addEventListener('click', handleEmbedDownloadClick, true);
    }

    // ================================
    // ==== دالة تحميل من زر تضمين ====
    // ================================
    async function handleEmbedDownloadClick(e) {
        try {
            e.stopPropagation();
            e.preventDefault();
            e.stopImmediatePropagation();

            let currentUrl = window.location.href;
            let mediaId = null;

            let reelsMatch = currentUrl.match(/\/reels?\/([^\/\?]+)/);
            let postMatch = currentUrl.match(/\/p\/([^\/\?]+)/);

            if (reelsMatch) {
                mediaId = reelsMatch[1];
            } else if (postMatch) {
                mediaId = postMatch[1];
            }

            if (!mediaId) {
                let articleNode = document.querySelector('article') || document.querySelector('main');
                if (articleNode) {
                    let aNodes = articleNode.querySelectorAll('a');
                    for (let i = 0; i < aNodes.length; ++i) {
                        let link = aNodes[i].getAttribute('href');
                        if (link) {
                            let match = link.match(/\/p\/([^\/\?]+)/) || link.match(/\/reels?\/([^\/\?]+)/);
                            if (match) {
                                mediaId = match[1];
                                break;
                            }
                        }
                    }
                }
            }

            if (!mediaId) {
                alert('لم يتم العثور على معرف الوسائط!');
                return;
            }

            let postUrl = `https://www.instagram.com/p/${mediaId}/`;
            let resp = await fetch(postUrl);
            let text = await resp.text();

            const mediaIdPattern = /instagram:\/\/media\?id=(\d+)|["' ]media_id["' ]:["' ](\d+)["' ]/;
            let idMatch = text.match(mediaIdPattern);
            let internalMediaId = null;

            if (idMatch) {
                for (let i = 0; i < idMatch.length; ++i) {
                    if (idMatch[i] && /^\d+$/.test(idMatch[i])) {
                        internalMediaId = idMatch[i];
                    }
                }
            }

            if (!internalMediaId) {
                let pkMatch = text.match(/"pk":"(\d+)"/);
                if (pkMatch) internalMediaId = pkMatch[1];
            }

            if (!internalMediaId) {
                alert('لم يتم العثور على معرف الوسائط الداخلي!');
                return;
            }

            let appId = findAppId();

            let apiUrl = `https://i.instagram.com/api/v1/media/${internalMediaId}/info/`;
            let apiResp = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': '*/*',
                    'X-IG-App-ID': appId
                },
                credentials: 'include',
                mode: 'cors'
            });

            if (apiResp.status !== 200) {
                alert('فشل في الحصول على معلومات الوسائط!');
                return;
            }

            let apiJson = await apiResp.json();
            let downloadUrl = null;
            let item = apiJson.items[0];

            if (item.video_versions && item.video_versions.length > 0) {
                downloadUrl = item.video_versions[0].url;
            } else if (item.image_versions2 && item.image_versions2.candidates) {
                downloadUrl = item.image_versions2.candidates[0].url;
            }

            if (downloadUrl) {
                downloadResource(downloadUrl, `instagram_${mediaId}_${Date.now()}`);
            } else {
                alert('لم يتم العثور على رابط التحميل!');
            }

        } catch (error) {
            console.error('Error:', error);
            alert('حدث خطأ: ' + error.message);
        }
    }

    // ================================
    // ==== دوال مساعدة ====
    // ================================
    function queryHas(root, selector, has) {
        let nodes = root.querySelectorAll(selector);
        for (let i = 0; i < nodes.length; ++i) {
            let currentNode = nodes[i];
            if (currentNode.querySelector(has)) {
                return currentNode;
            }
        }
        return null;
    }

    function findAppId() {
        const appIdPattern = /"X-IG-App-ID":"([\d]+)"/;
        let bodyScripts = document.querySelectorAll("body > script");
        for (let i = 0; i < bodyScripts.length; ++i) {
            let match = bodyScripts[i].text.match(appIdPattern);
            if (match) return match[1];
        }
        return '936619743392459';
    }

// ================================
// ==== دوال البروفايل (1080p) ====
// ================================
async function getProfilePicHD() {
    const username = window.location.pathname.split('/')[1];
    if (!username) return null;

    const appId = findAppId();
    console.log('🔍 Fetching profile for:', username, '| AppId:', appId);

    try {
        // ── الخطوة 1: جلب user_id ──
        const response1 = await fetch(
            `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
            {
                headers: {
                    'X-IG-App-ID': appId,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': '*/*'
                },
                credentials: 'include'
            }
        );

        console.log('📡 Step1 status:', response1.status);
        if (!response1.ok) {
            console.warn('❌ web_profile_info failed');
            return await getProfilePicFallback(username);
        }

        const data1 = await response1.json();
        const userBasic = data1?.data?.user;
        const userId = userBasic?.id;
        console.log('👤 userId:', userId);

        if (!userId) return await getProfilePicFallback(username);

        // ── الخطوة 2: جلب معلومات المستخدم ──
        // نجرب www.instagram.com أولاً
        let user = null;

        try {
            const response2 = await fetch(
                `https://www.instagram.com/api/v1/users/${userId}/info/`,
                {
                    headers: {
                        'X-IG-App-ID': appId,
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': '*/*'
                    },
                    credentials: 'include'
                }
            );
            console.log('📡 Step2 (www) status:', response2.status);
            if (response2.ok) {
                const data2 = await response2.json();
                user = data2?.user;
                console.log('📦 User keys:', user ? Object.keys(user).join(', ') : 'null');
            }
        } catch (err) {
            console.warn('⚠️ www users/info failed:', err.message);
        }

        // إذا فشل www، نجرب i.instagram.com
        if (!user) {
            try {
                const response2b = await fetch(
                    `https://i.instagram.com/api/v1/users/${userId}/info/`,
                    {
                        headers: {
                            'X-IG-App-ID': appId,
                            'X-Requested-With': 'XMLHttpRequest',
                            'Accept': '*/*'
                        },
                        credentials: 'include'
                    }
                );
                console.log('📡 Step2 (i.ig) status:', response2b.status);
                if (response2b.ok) {
                    const data2b = await response2b.json();
                    user = data2b?.user;
                }
            } catch (err) {
                console.warn('⚠️ i.instagram users/info failed:', err.message);
            }
        }

        // ── استخراج أعلى جودة ──
        if (user) {
            if (user.hd_profile_pic_url_info?.url) {
                console.log('✅ hd_profile_pic_url_info');
                return user.hd_profile_pic_url_info.url;
            }
            if (user.hd_profile_pic_versions?.length > 0) {
                const largest = user.hd_profile_pic_versions.reduce(
                    (a, b) => (a.width >= b.width ? a : b)
                );
                console.log('✅ hd_profile_pic_versions:', largest.width + 'x' + largest.height);
                return largest.url;
            }
            if (user.profile_pic_url_hd) {
                console.log('⚠️ profile_pic_url_hd');
                return user.profile_pic_url_hd;
            }
            if (user.profile_pic_url) {
                console.log('⚠️ profile_pic_url');
                return user.profile_pic_url;
            }
        }

        // Fallback من الـ response الأول
        if (userBasic?.profile_pic_url_hd) return userBasic.profile_pic_url_hd;
        if (userBasic?.profile_pic_url) return userBasic.profile_pic_url;

    } catch (e) {
        console.error('❌ getProfilePicHD error:', e);
    }

    return await getProfilePicFallback(username);
}

// ── Fallback methods ──
async function getProfilePicFallback(username) {
    console.log('🔄 Trying fallback methods...');

    // Fallback 1: GraphQL
    try {
        const r = await fetch(
            `https://www.instagram.com/${username}/?__a=1&__d=dis`,
            {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                credentials: 'include'
            }
        );
        if (r.ok) {
            const d = await r.json();
            const u = d?.graphql?.user || d?.data?.user;
            if (u?.profile_pic_url_hd) {
                console.log('✅ Fallback GraphQL: profile_pic_url_hd');
                return u.profile_pic_url_hd;
            }
            if (u?.profile_pic_url) {
                console.log('✅ Fallback GraphQL: profile_pic_url');
                return u.profile_pic_url;
            }
        }
    } catch (e) {
        console.warn('⚠️ GraphQL fallback failed');
    }

    // Fallback 2: من الـ DOM
    try {
        const headerImgs = document.querySelectorAll('header img, [data-testid="user-avatar"] img');
        for (const img of headerImgs) {
            if (img.src && (img.src.includes('cdninstagram') || img.src.includes('fbcdn'))) {
                console.log('✅ Fallback DOM img');
                return img.src;
            }
        }

        const scripts = document.querySelectorAll('script[type="application/json"]');
        for (const script of scripts) {
            const match = script.text.match(/"profile_pic_url_hd":"([^"]+)"/);
            if (match) {
                console.log('✅ Fallback script tag');
                return match[1].replace(/\\u0026/g, '&');
            }
        }
    } catch (e) {
        console.warn('⚠️ DOM fallback failed:', e.message);
    }

    console.error('❌ All fallbacks failed');
    return null;
}

async function profileOnClicked(target) {
    try {
        target.style.opacity = '0.5';
        target.style.cursor = 'wait';

        let url = await getProfilePicHD();

        if (url && url.length > 0) {
            let filename = window.location.pathname.split('/')[1] || 'profile';
            filename = filename.replace(/[^a-zA-Z0-9_]/g, '_');
            downloadResource(url, filename + '_HD_1080');
        } else {
            alert('لم يتم العثور على صورة البروفايل!');
        }
    } catch (e) {
        console.error('Error:', e);
        alert('حدث خطأ: ' + e.message);
    } finally {
        target.style.opacity = '1';
        target.style.cursor = 'pointer';
    }
}
    // ================================
    // ==== دوال المنشورات ====
    // ================================
    async function postOnClicked(target) {
        try {
            let articleNode = postGetArticleNode(target);
            let { url, mediaIndex } = await postGetUrl(target, articleNode);

            if (url && url.length > 0) {
                let mediaName = url
                    .split('?')[0]
                    .split('\\')
                    .pop()
                    .split('/')
                    .pop();
                mediaName = mediaName.substring(0, mediaName.lastIndexOf('.'));
                let datetime = new Date(articleNode.querySelector('time')?.getAttribute('datetime') || Date.now());
                let posterName = articleNode.querySelector('header a') || findPostName(articleNode);
                posterName = posterName.getAttribute ? posterName.getAttribute('href').replace(/\//g, '') : posterName;
                let postId = findPostId(articleNode);
                let filename = filenameFormat(postFilenameTemplate, posterName, datetime, mediaName, postId, mediaIndex);
                downloadResource(url, filename);
            }
        } catch (e) {
            console.log(`Error in postOnClicked(): ${e}\n${e.stack}`);
        }
    }

    function postGetArticleNode(target) {
        let articleNode = target;
        while (articleNode && articleNode.tagName !== 'ARTICLE' && articleNode.tagName !== 'MAIN') {
            articleNode = articleNode.parentNode;
        }
        return articleNode;
    }

    async function postGetUrl(target, articleNode) {
        let list = articleNode.querySelectorAll('li[style][class]');
        let url = null;
        let mediaIndex = 0;

        if (list.length === 0) {
            if (!disableNewUrlFetchMethod) url = await getUrlFromInfoApi(articleNode);
            if (url === null) {
                let videoElem = articleNode.querySelector('video');
                if (videoElem) {
                    url = videoElem.getAttribute('src');
                    if (videoElem.hasAttribute('videoURL')) {
                        url = videoElem.getAttribute('videoURL');
                    } else if (url === null || url.includes('blob')) {
                        url = await fetchVideoURL(articleNode, videoElem);
                    }
                } else if (articleNode.querySelector('article div[role] div > img')) {
                    url = articleNode.querySelector('article div[role] div > img').getAttribute('src');
                }
            }
        } else {
            const postView = location.pathname.startsWith('/p/');
            let dotsElements = [...articleNode.querySelectorAll(`div._acnb`)];
            mediaIndex = [...dotsElements].reduce((result, element, index) => (element.classList.length === 2 ? index : result), null);
            if (mediaIndex === null) mediaIndex = 0;

            if (!disableNewUrlFetchMethod) url = await getUrlFromInfoApi(articleNode, mediaIndex);
            if (url === null) {
                const listElements = [...articleNode.querySelectorAll(`:scope > div > div:nth-child(${postView ? 1 : 2}) > div > div:nth-child(1) ul li[style*="translateX"]`)];
                const listElementWidth = Math.max(...listElements.map(element => element.clientWidth));

                const positionsMap = listElements.reduce((result, element) => {
                    const position = Math.round(Number(element.style.transform.match(/-?(\d+)/)[1]) / listElementWidth);
                    return { ...result, [position]: element };
                }, {});

                const node = positionsMap[mediaIndex];
                if (node) {
                    if (node.querySelector('video')) {
                        let videoElem = node.querySelector('video');
                        url = videoElem.getAttribute('src');
                        if (videoElem.hasAttribute('videoURL')) {
                            url = videoElem.getAttribute('videoURL');
                        } else if (url === null || url.includes('blob')) {
                            url = await fetchVideoURL(articleNode, videoElem);
                        }
                    } else if (node.querySelector('img')) {
                        url = node.querySelector('img').getAttribute('src');
                    }
                }
            }
        }
        return { url, mediaIndex };
    }

    // ================================
    // ==== دوال القصص ====
    // ================================
    async function storyOnClicked(target) {
        let sectionNode = storyGetSectionNode(target);
        let url = await storyGetUrl(target, sectionNode);

        if (url) {
            const posterUrlPat = /\/stories\/(.*)\/.*\//;
            let mediaName = url.split('?')[0].split('\\').pop().split('/').pop();
            mediaName = mediaName.substring(0, mediaName.lastIndexOf('.'));
            let datetime = new Date(sectionNode.querySelector('time')?.getAttribute('datetime') || Date.now());
            let posterName = "unknown";
            const posterNameHeader = sectionNode.querySelector('header a');
            if (posterNameHeader) {
                posterName = posterNameHeader.getAttribute('href').replace(/\//g, '');
            }

            if (posterName === "unknown") {
                const match = window.location.pathname.match(posterUrlPat);
                if (match) posterName = match[1];
            }
            let filename = filenameFormat(storyFilenameTemplate, posterName, datetime, mediaName);
            downloadResource(url, filename);
        }
    }

    function storyGetSectionNode(target) {
        let sectionNode = target;
        while (sectionNode && sectionNode.tagName !== 'SECTION') {
            sectionNode = sectionNode.parentNode;
        }
        return sectionNode;
    }

    async function storyGetUrl(target, sectionNode) {
        let url = null;
        if (!disableNewUrlFetchMethod) url = await getUrlFromInfoApi(target);

        if (!url) {
            if (sectionNode.querySelector('video > source')) {
                url = sectionNode.querySelector('video > source').getAttribute('src');
            } else if (sectionNode.querySelector('img[decoding="sync"]')) {
                let img = sectionNode.querySelector('img[decoding="sync"]');
                url = img.srcset.split(/ \d+w/g)[0].trim();
                if (!url || url.length === 0) {
                    url = img.getAttribute('src');
                }
            } else if (sectionNode.querySelector('video')) {
                url = sectionNode.querySelector('video').getAttribute('src');
            }
        }
        return url;
    }

    // ================================
    // ==== دوال API ====
    // ================================
    function findHighlightsIndex() {
        let currentDivProgressbarDiv = document.querySelector('div[style^="transform"]')?.parentElement;
        if (!currentDivProgressbarDiv) return 0;
        let progressbarRootDiv = currentDivProgressbarDiv.parentElement;
        let progressbarDivs = progressbarRootDiv.children;
        return Array.from(progressbarDivs).indexOf(currentDivProgressbarDiv);
    }

    let infoCache = {};
    let mediaIdCache = {};

    async function getUrlFromInfoApi(articleNode, mediaIdx = 0) {
        try {
            const mediaIdPattern = /instagram:\/\/media\?id=(\d+)|["' ]media_id["' ]:["' ](\d+)["' ]/;

            async function findMediaId() {
                function method1() {
                    let href = window.location.href;
                    let match = href.match(/www.instagram.com\/stories\/[^\/]+\/(\d+)/);
                    if (!href.includes('highlights') && match) return match[1];
                }

                async function method3() {
                    let postId = await findPostId(articleNode);
                    if (!postId) {
                        let reelsMatch = window.location.href.match(/\/reels?\/([^\/\?]+)/);
                        if (reelsMatch) postId = reelsMatch[1];
                    }
                    if (!postId) return null;

                    if (!(postId in mediaIdCache)) {
                        let postUrl = `https://www.instagram.com/p/${postId}/`;
                        let resp = await fetch(postUrl);
                        let text = await resp.text();
                        let idMatch = text ? text.match(mediaIdPattern) : [];
                        let mediaId = null;
                        for (let i = 0; i < idMatch.length; ++i) {
                            if (idMatch[i] && /^\d+$/.test(idMatch[i])) mediaId = idMatch[i];
                        }
                        if (!mediaId) {
                            let pkMatch = text.match(/"pk":"(\d+)"/);
                            if (pkMatch) mediaId = pkMatch[1];
                        }
                        if (!mediaId) return null;
                        mediaIdCache[postId] = mediaId;
                    }
                    return mediaIdCache[postId];
                }

                function method2() {
                    let scriptJson = document.querySelectorAll('script[type="application/json"]');
                    for (let i = 0; i < scriptJson.length; i++) {
                        let match = scriptJson[i].text.match(/"pk":"(\d+)","id":"[\d_]+"/);
                        if (match) {
                            if (!window.location.href.includes('highlights')) {
                                return match[1];
                            }
                            let matchs = Array.from(scriptJson[i].text.matchAll(/"pk":"(\d+)","id":"[\d_]+"/g), match => match[1]);
                            const matchIndex = findHighlightsIndex();
                            if (matchs.length > matchIndex) {
                                return matchs[matchIndex];
                            }
                        }
                    }
                }

                return method1() || await method3() || method2();
            }

            function getImgOrVedioUrl(item) {
                if ("video_versions" in item) {
                    return item.video_versions[0].url;
                } else {
                    return item.image_versions2.candidates[0].url;
                }
            }

            let appId = findAppId();
            if (!appId) return null;

            let headers = {
                method: 'GET',
                headers: {
                    Accept: '*/*',
                    'X-IG-App-ID': appId
                },
                credentials: 'include',
                mode: 'cors'
            };

            let mediaId = await findMediaId();
            if (!mediaId) return null;

            if (!(mediaId in infoCache)) {
                let url = 'https://i.instagram.com/api/v1/media/' + mediaId + '/info/';
                let resp = await fetch(url, headers);
                if (resp.status !== 200) return null;
                let respJson = await resp.json();
                infoCache[mediaId] = respJson;
            }

            let infoJson = infoCache[mediaId];
            if ('carousel_media' in infoJson.items[0]) {
                return getImgOrVedioUrl(infoJson.items[0].carousel_media[mediaIdx]);
            } else {
                return getImgOrVedioUrl(infoJson.items[0]);
            }
        } catch (e) {
            console.log(`Error in getUrlFromInfoApi(): ${e}`);
            return null;
        }
    }

    // ================================
    // ==== دوال مساعدة أخرى ====
    // ================================
    function findPostName(articleNode) {
        let imgNoCanvas = articleNode.querySelector('article section + * a[href^="/"][href$="/"]');
        if (imgNoCanvas) return imgNoCanvas;

        let imgAlt = articleNode.querySelector('canvas ~ * img');
        if (imgAlt) {
            imgAlt = imgAlt.getAttribute('alt');
            let links = articleNode.querySelectorAll('a');
            for (let i = 0; i < links.length; i++) {
                const posterName = links[i].getAttribute('href').replace(/\//g, '');
                if (imgAlt.includes(posterName)) return links[i];
            }
        } else {
            const el = document.querySelector('h2[dir]');
            if (el) return el.innerText;
        }
        return 'unknown';
    }

    function findPostId(articleNode) {
        let aNodes = articleNode.querySelectorAll('a');
        for (let i = 0; i < aNodes.length; ++i) {
            let link = aNodes[i].getAttribute('href');
            if (link) {
                let match = link.match(postIdPattern);
                if (match) return match[1];
            }
        }

        let currentUrl = window.location.href;
        let reelsMatch = currentUrl.match(/\/reels?\/([^\/\?]+)/);
        if (reelsMatch) return reelsMatch[1];

        let postMatch = currentUrl.match(/\/p\/([^\/\?]+)/);
        if (postMatch) return postMatch[1];

        return null;
    }

    async function fetchVideoURL(articleNode, videoElem) {
        let poster = videoElem.getAttribute('poster');
        let timeNodes = articleNode.querySelectorAll('time');
        let posterUrl = timeNodes[timeNodes.length - 1]?.parentNode?.parentNode?.href;
        if (!posterUrl) return null;

        const posterPattern = /\/([^\/?]*)\?/;
        let posterMatch = poster?.match(posterPattern);
        if (!posterMatch) return null;

        let postFileName = posterMatch[1];
        let resp = await fetch(posterUrl);
        let content = await resp.text();
        const pattern = new RegExp(`${postFileName}.*?video_versions.*?url":("[^"]*")`, 's');
        let match = content.match(pattern);
        if (!match) return null;

        let videoUrl = JSON.parse(match[1]);
        videoUrl = videoUrl.replace(/^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/?\n]+)/g, 'https://scontent.cdninstagram.com');
        videoElem.setAttribute('videoURL', videoUrl);
        return videoUrl;
    }

    // ================================
    // ==== دوال تنسيق الملفات ====
    // ================================
    function filenameFormat(template, id, datetime, medianame, postId = +new Date(), mediaIndex = '0') {
        let filename = template;
        filename = filename.replace(/%id%/g, id);
        filename = filename.replace(/%datetime%/g, datetimeFormat(datetimeTemplate, datetime));
        filename = filename.replace(/%medianame%/g, medianame);
        filename = filename.replace(/%postId%/g, postId);
        filename = filename.replace(/%mediaIndex%/g, mediaIndex);
        return filename;
    }

    function datetimeFormat(template, datetime) {
        let datetimeStr = template;
        datetimeStr = datetimeStr.replace(/%y%/g, datetime.getFullYear());
        datetimeStr = datetimeStr.replace(/%m%/g, fillZero((datetime.getMonth() + 1).toString()));
        datetimeStr = datetimeStr.replace(/%d%/g, fillZero(datetime.getDate().toString()));
        datetimeStr = datetimeStr.replace(/%H%/g, fillZero(datetime.getHours().toString()));
        datetimeStr = datetimeStr.replace(/%M%/g, fillZero(datetime.getMinutes().toString()));
        datetimeStr = datetimeStr.replace(/%S%/g, fillZero(datetime.getSeconds().toString()));
        return datetimeStr;
    }

    function fillZero(str) {
        return str.length === 1 ? '0' + str : str;
    }

    // ================================
    // ==== دوال التحميل ====
    // ================================
    function forceDownload(blob, filename, extension) {
        var a = document.createElement('a');
        if (replaceJpegWithJpg) extension = extension.replace('jpeg', 'jpg');
        a.download = filename + '.' + extension;
        a.href = blob;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function downloadResource(url, filename) {
        if (url.startsWith('blob:')) {
            forceDownload(url, filename, 'mp4');
            return;
        }
        console.log(`Downloading ${url}`);
        if (!filename) {
            filename = url.split('\\').pop().split('/').pop();
        }
        fetch(url, {
            headers: new Headers({
                'User-Agent': window.navigator.userAgent,
                Origin: location.origin,
            }),
            mode: 'cors',
        })
        .then(response => response.blob())
        .then(blob => {
            const extension = blob.type.split('/').pop();
            let blobUrl = window.URL.createObjectURL(blob);
            forceDownload(blobUrl, filename, extension);
            URL.revokeObjectURL(blobUrl);
        })
        .catch(e => console.error(e));
    }

    // ================================
    // ==== اختصارات لوحة المفاتيح ====
    // ================================
    document.addEventListener('keydown', (event) => {
        if (window.location.href === 'https://www.instagram.com/') return;

        // Alt + K للتحميل
        if (event.altKey && (event.code === 'KeyK' || event.key === 'k')) {
            let buttons = document.getElementsByClassName('download-btn');
            if (buttons.length > 0) {
                buttons[buttons.length - 1].click();
            }
        }

        // Alt + L للتنقل يمين
        if (event.altKey && (event.code === 'KeyL' || event.key === 'l')) {
            let buttons = document.getElementsByClassName('_9zm2');
            if (buttons.length > 0) buttons[0].click();
        }

        // Alt + J للتنقل يسار
        if (event.altKey && (event.code === 'KeyJ' || event.key === 'j')) {
            let buttons = document.getElementsByClassName('_9zm0');
            if (buttons.length > 0) buttons[0].click();
        }
    });

    // ================================
    // ==== MutationObserver ====
    // ================================
    function setupObserver() {
        const observer = new MutationObserver(() => {
            addDownloadButton();
            addStoryDownloadButton();
            addProfileDownloadButton();
            document.querySelectorAll('span').forEach(replaceEmbedButton);
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        return observer;
    }

    // ================================
    // ==== التشغيل ====
    // ================================
    function init() {
        addGlobalStyle();
        addDownloadButton();
        addStoryDownloadButton();
        addProfileDownloadButton();
        document.querySelectorAll('span').forEach(replaceEmbedButton);
    }

    if (document.documentElement) {
        setupObserver();
    } else {
        document.addEventListener('DOMContentLoaded', setupObserver);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // فحص دوري
    setInterval(() => {
        addDownloadButton();
        addStoryDownloadButton();
        addProfileDownloadButton();
    }, 500);

})();
