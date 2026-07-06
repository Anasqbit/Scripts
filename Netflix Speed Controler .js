// ==UserScript==
// @name         Netflix Speed Controller (+/-) Auto-Rebind
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  التحكم في سرعة نتفليكس مع تفعيل تلقائي عند التنقل بين الصفحات دون الحاجة للتحديث
// @icon         https://images.ctfassets.net/y2ske730sjqp/4aEQ1zAUZF5pLSDtfviWjb/ba04f8d5bd01428f6e3803cc6effaf30/Netflix_N.png?w=300
// @author       Anasqbit
// @match        https://www.netflix.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    let currentVideo = null;
    let speedDisplay = null;
    let timeoutId = null;

    // دالة إنشاء مؤشر السرعة على الشاشة
    function createSpeedDisplay(video) {
        // إزالة المؤشر القديم إن وجد لمنع التكرار
        const oldDisplay = document.getElementById('netflix-speed-indicator');
        if (oldDisplay) oldDisplay.remove();

        speedDisplay = document.createElement('div');
        speedDisplay.id = 'netflix-speed-indicator';
        Object.assign(speedDisplay.style, {
            position: 'absolute',
            top: '10%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '24px',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
            zIndex: '99999',
            transition: 'opacity 0.3s ease',
            opacity: '0',
            pointerEvents: 'none'
        });
        (video.parentElement || document.body).appendChild(speedDisplay);
    }

    // دالة تحديث السرعة
    function updateSpeed(delta) {
        if (!currentVideo) return;

        let currentSpeed = currentVideo.playbackRate;
        let newSpeed = currentSpeed + delta;

        if (newSpeed > 10) newSpeed = 10;
        if (newSpeed < 0.50) newSpeed = 0.50;

        currentVideo.playbackRate = newSpeed;

        if (speedDisplay) {
            speedDisplay.innerText = `${newSpeed.toFixed(2)}x`;
            speedDisplay.style.opacity = '1';

            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                speedDisplay.style.opacity = '0';
            }, 1000);
        }
        console.log(`%c [Netflix Speed]: ${newSpeed.toFixed(2)}x`, 'color: #e50914; font-weight: bold;');
    }

    // دالة تهيئة التحكم بالفيديو الجديد
    function bindVideoControls(video) {
        if (currentVideo === video) return; // معالج بالفعل

        currentVideo = video;
        createSpeedDisplay(video);
        console.log("%c 🎥 تم اكتشاف مشغل فيديو جديد وتفعيل التحكم بالسرعة تلقائياً!", "color: #2ecc71; font-weight: bold;");
    }

    // مراقبة الصفحة باستمرار لاكتشاف ظهور عنصر فيديو جديد عند التنقل
    const observer = new MutationObserver(() => {
        const video = document.querySelector('video');
        if (video) {
            bindVideoControls(video);
        } else {
            currentVideo = null; // تصفير المتغير عند الخروج من المشغل
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // الاستماع لضغطات الأزرار واعتراضها لحماية واجهة المشاهدة (Passive View)
    window.addEventListener('keydown', (e) => {
        if (e.key === '+' || e.key === '=' || e.key === 'NumLock' || e.key === '-') {
            if (!currentVideo) return; // تجاهل الأزرار إذا لم نكن داخل مشغل الفيديو

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            if (e.key === '+' || e.key === '=') {
                updateSpeed(0.50);
            } else if (e.key === '-') {
                updateSpeed(-0.50);
            }
        }
    }, true);
})();