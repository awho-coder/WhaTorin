(function() {
    console.log('WhaTorin: Iniciando inyección de interfaz...');
    let clipboardFallbackInstalled = false;
    let lastClipboardAttemptAt = 0;
    let easterEnabled = false;
    let menuClickStreak = 0;
    let menuClickTimer = null;
    const EASTER_SOUND_SRC = window.__WHATORIN_EASTER_SOUND_SRC || null;
    let easterAudio = null;

    function getCurrentWindowSafe() {
        const tauri = window.__TAURI__;
        if (!tauri) return null;
        if (tauri.window && typeof tauri.window.getCurrentWindow === 'function') {
            return tauri.window.getCurrentWindow();
        }
        if (tauri.webviewWindow && typeof tauri.webviewWindow.getCurrentWebviewWindow === 'function') {
            return tauri.webviewWindow.getCurrentWebviewWindow();
        }
        return null;
    }

    async function runWindowAction(actionName, action) {
        const win = getCurrentWindowSafe();
        if (!win) {
            console.error(`WhaTorin: API de ventana no disponible (${actionName}).`);
            return;
        }
        try {
            await action(win);
        } catch (err) {
            console.error(`WhaTorin: fallo en ${actionName}:`, err);
        }
    }

    function ensureEasterStyle() {
        if (document.getElementById('whatorin-easter-style')) return;
        const style = document.createElement('style');
        style.id = 'whatorin-easter-style';
        style.textContent = `
            body.easter-mode #app,
            body.easter-mode #main,
            body.easter-mode #pane-side {
                filter: hue-rotate(132deg) saturate(1.3) contrast(1.05);
            }

            body.easter-mode #btn-open-menu {
                box-shadow: 0 0 0 1px rgba(102, 240, 176, 0.35), 0 0 20px rgba(102, 240, 176, 0.25);
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function showEasterToast(message) {
        let toast = document.getElementById('whatorin-easter-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'whatorin-easter-toast';
            toast.style.cssText = `
                position: fixed;
                left: 50%;
                bottom: 18px;
                transform: translateX(-50%) translateY(10px);
                background: rgba(8, 8, 12, 0.94);
                border: 1px solid rgba(255, 255, 255, 0.16);
                color: #fff;
                font-size: 12px;
                padding: 8px 12px;
                border-radius: 8px;
                opacity: 0;
                pointer-events: none;
                transition: opacity 180ms ease, transform 180ms ease;
                z-index: 2147483647;
                font-family: sans-serif;
            `;
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
        clearTimeout(toast._hideTimer);
        toast._hideTimer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(10px)';
        }, 1800);
    }

    function playEasterSound() {
        try {
            if (EASTER_SOUND_SRC) {
                if (!easterAudio) {
                    easterAudio = new Audio(EASTER_SOUND_SRC);
                    easterAudio.preload = 'auto';
                    easterAudio.volume = 0.85;
                }
                easterAudio.currentTime = 0;
                easterAudio.play().catch((err) => {
                    console.debug('WhaTorin: no se pudo reproducir torin-easter.ogg:', err);
                });
                return;
            }

            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(660, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1040, ctx.currentTime + 0.16);
            gain.gain.setValueAtTime(0.0001, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.21);
            setTimeout(() => ctx.close().catch(() => {}), 260);
        } catch (err) {
            console.debug('WhaTorin: no se pudo reproducir sonido easter egg:', err);
        }
    }

    function toggleEasterMode() {
        ensureEasterStyle();
        easterEnabled = !easterEnabled;
        document.body.classList.toggle('easter-mode', easterEnabled);
        playEasterSound();
        showEasterToast(easterEnabled ? '🥚 Modo Torin activado' : '🙈 Modo Torin desactivado');
    }

    function hasWebClipboardImage(event) {
        const items = event.clipboardData?.items;
        if (!items || !items.length) return false;
        return Array.from(items).some((item) => item.type && item.type.startsWith('image/'));
    }

    function findChatComposer(target) {
        if (target instanceof Element) {
            const fromTarget = target.closest('footer [contenteditable="true"][role="textbox"], footer [contenteditable="true"]');
            if (fromTarget) return fromTarget;
        }
        return document.querySelector('footer [contenteditable="true"][role="textbox"], footer [contenteditable="true"]');
    }

    async function readImageFileFromWebClipboard() {
        if (!navigator.clipboard || typeof navigator.clipboard.read !== 'function') {
            return null;
        }
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                const imageType = (item.types || []).find((type) => type.startsWith('image/'));
                if (!imageType) continue;
                const blob = await item.getType(imageType);
                const ext = imageType === 'image/jpeg' ? 'jpg' : 'png';
                return new File([blob], `clipboard-${Date.now()}.${ext}`, { type: imageType });
            }
        } catch (err) {
            console.debug('WhaTorin: navigator.clipboard.read falló:', err);
        }
        return null;
    }

    function findWhatsAppMediaInput() {
        const selectors = [
            '#main input[type="file"][accept*="image"]',
            'input[type="file"][accept*="image"]',
            '#main input[type="file"][accept*="video"]',
            'input[type="file"][accept*="video"]',
        ];
        for (const selector of selectors) {
            const inputs = document.querySelectorAll(selector);
            for (const input of inputs) {
                if (!input.disabled) return input;
            }
        }
        return null;
    }

    function dispatchImageToMediaInput(file) {
        const input = findWhatsAppMediaInput();
        if (!input) return false;
        try {
            const dt = new DataTransfer();
            dt.items.add(file);
            const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files');
            if (descriptor && typeof descriptor.set === 'function') {
                descriptor.set.call(input, dt.files);
            } else {
                input.files = dt.files;
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        } catch (err) {
            console.error('WhaTorin: no se pudo enviar imagen al input file:', err);
            return false;
        }
    }

    function dispatchImageDrop(target, file) {
        if (!target) return false;
        try {
            const dt = new DataTransfer();
            dt.items.add(file);
            const dropTarget = target.closest('#main') || target;
            const dragOver = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt });
            dropTarget.dispatchEvent(dragOver);
            const drop = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
            dropTarget.dispatchEvent(drop);
            return true;
        } catch (err) {
            console.error('WhaTorin: fallback drop falló:', err);
            return false;
        }
    }

    async function tryClipboardImageFallback(target, reason) {
        const now = Date.now();
        if (now - lastClipboardAttemptAt < 180) return false;
        lastClipboardAttemptAt = now;

        const file = await readImageFileFromWebClipboard();
        if (!file) return false;

        const handled = dispatchImageToMediaInput(file) || dispatchImageDrop(target, file);
        if (handled) {
            console.log(`WhaTorin: imagen pegada vía fallback (${reason}).`);
            return true;
        }

        console.warn(`WhaTorin: no se pudo adjuntar imagen (${reason}).`);
        return false;
    }

    function installClipboardImageFallback() {
        if (clipboardFallbackInstalled) return;
        clipboardFallbackInstalled = true;

        document.addEventListener('paste', async (event) => {
            const composer = findChatComposer(event.target);
            if (!composer) return;

            const hasFiles = Boolean(event.clipboardData?.files?.length);
            if (hasFiles) return;

            if (hasWebClipboardImage(event)) {
                setTimeout(() => {
                    void tryClipboardImageFallback(composer, 'paste-with-image-item');
                }, 0);
                return;
            }

            void tryClipboardImageFallback(composer, 'paste');
        }, true);

        document.addEventListener('keydown', (event) => {
            const key = String(event.key || '').toLowerCase();
            const isPasteShortcut = (event.ctrlKey || event.metaKey) && !event.altKey && key === 'v';
            if (!isPasteShortcut) return;
            const composer = findChatComposer(event.target);
            if (!composer) return;
            setTimeout(() => {
                void tryClipboardImageFallback(composer, 'keydown');
            }, 0);
        }, true);
    }

    function injectUI() {
        if (document.getElementById('floating-menu')) return;

        // Crear Barra de Título ultra-slim y draggeable
        const titleBar = document.createElement('div');
        titleBar.id = 'tauri-titlebar';
        titleBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 16px;
            background: #000;
            border-bottom: 1px solid #111;
            z-index: 2147483647;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 10px;
            user-select: none;
            cursor: move;
        `;
        titleBar.innerHTML = `
            <span style="color: #888; font-size: 9px; font-family: monospace; pointer-events: none;">WhaTorin :: DESARROLLO</span>
            <div id="window-controls" style="display: flex; gap: 10px; cursor: default;">
                <span id="window-min" style="color: #fff; font-size: 10px; cursor: pointer;">─</span>
                <span id="window-close" style="color: #fff; font-size: 10px; cursor: pointer;">✕</span>
            </div>
        `;
        document.body.appendChild(titleBar);

        // Arrastre manual para mayor compatibilidad (Wayland/AppImage/remote webview).
        titleBar.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (e.target.closest('#window-controls')) return;
            runWindowAction('startDragging', (win) => win.startDragging());
        });

        // Ajustar el menú flotante para que no choque con la barra
        const menuHtml = `
            <div id="floating-menu" style="position: fixed; top: 40px; right: 14px; z-index: 9999; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                <button id="btn-open-menu" style="width: 36px; height: 36px; border-radius: 50%; background: rgba(0, 0, 0, 0.8); border: 1px solid rgba(255, 255, 255, 0.15); color: white; cursor: pointer; backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; font-size: 16px;">⚙</button>
                <div id="menu-panel" style="display: none; min-width: 220px; padding: 10px; border-radius: 10px; background: rgba(10, 10, 16, 0.98); border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 10px 24px rgba(0, 0, 0, 0.5); flex-direction: column; gap: 8px;">
                    <p style="font-size: 11px; color: #b7b7b7; margin: 0 0 2px 2px; font-family: sans-serif; border-bottom: 1px solid #222; padding-bottom: 5px;">WhaTorin WSP (Tauri)</p>
                    <button id="btn-refresh" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: white; padding: 6px; border-radius: 6px; cursor: pointer; font-size: 11px;">🔄 Recargar</button>
                    <button id="btn-toggle-theme" style="background: #4facfe; color: #000; padding: 6px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: bold;">✨ Tema: ON</button>
                </div>
            </div>
        `;

        const container = document.createElement('div');
        container.innerHTML = menuHtml;
        document.body.appendChild(container);

        // Lógica de los botones de ventana (vía Tauri v2)
        document.getElementById('window-min').onclick = (e) => {
            e.stopPropagation();
            runWindowAction('minimize', (win) => win.minimize());
        };
        document.getElementById('window-close').onclick = (e) => {
            e.stopPropagation();
            runWindowAction('close', (win) => win.close());
        };

        const btnOpen = document.getElementById('btn-open-menu');
        const menuPanel = document.getElementById('menu-panel');
        const btnRefresh = document.getElementById('btn-refresh');
        const btnToggle = document.getElementById('btn-toggle-theme');

        let isThemeActive = true;

        btnOpen.onclick = (e) => {
            e.stopPropagation();
            menuPanel.style.display = menuPanel.style.display === 'none' ? 'flex' : 'none';

            // Easter egg: 5 clicks rapidos en el boton de opciones
            menuClickStreak += 1;
            clearTimeout(menuClickTimer);
            menuClickTimer = setTimeout(() => {
                menuClickStreak = 0;
            }, 1200);
            if (menuClickStreak >= 5) {
                menuClickStreak = 0;
                toggleEasterMode();
            }
        };

        btnRefresh.onclick = () => window.location.reload();

        btnToggle.onclick = () => {
            isThemeActive = !isThemeActive;
            const styleTag = document.getElementById('whatorin-theme');
            if (styleTag) styleTag.disabled = !isThemeActive;
            btnToggle.style.background = isThemeActive ? '#4facfe' : 'rgba(255, 255, 255, 0.1)';
            btnToggle.style.color = isThemeActive ? '#000' : 'white';
            btnToggle.innerText = isThemeActive ? '✨ Tema: ON' : '✨ Tema: OFF';
        };

        document.addEventListener('click', () => {
            menuPanel.style.display = 'none';
        });

        menuPanel.onclick = (e) => e.stopPropagation();
    }

    // Intentar inyectar inmediatamente y también cuando el body esté listo
    if (document.body) {
        injectUI();
        installClipboardImageFallback();
    } else {
        const observer = new MutationObserver(() => {
            if (document.body) {
                injectUI();
                installClipboardImageFallback();
                observer.disconnect();
            }
        });
        observer.observe(document.documentElement, { childList: true });
    }
})();
