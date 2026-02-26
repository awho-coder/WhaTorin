const webview = document.getElementById('wa-webview');
const btnOpenMenu = document.getElementById('btn-open-menu');
const menuPanel = document.getElementById('menu-panel');
const btnRefresh = document.getElementById('btn-refresh');
const btnToggleTheme = document.getElementById('btn-toggle-theme');
const btnDevTools = document.getElementById('btn-dev-tools');
const statusDot = document.getElementById('status-dot');

const selectProfile = document.getElementById('select-profile');

let isThemeActive = true;
let cssKey = null;
let easterEnabled = false;
let menuClickStreak = 0;
let menuClickTimer = null;
const EASTER_SOUND_SRC = 'assets/sounds/torin-easter.ogg';
let easterAudio = null;

function playEasterSound() {
    try {
        if (!easterAudio) {
            easterAudio = new Audio(EASTER_SOUND_SRC);
            easterAudio.preload = 'auto';
            easterAudio.volume = 0.85;
        }

        easterAudio.currentTime = 0;
        easterAudio.play().catch((err) => {
            console.debug('No se pudo reproducir el audio del easter egg:', err);
        });
    } catch (err) {
        console.debug('Error preparando audio del easter egg:', err);
    }
}

function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 1800);
}

function toggleEasterMode() {
    easterEnabled = !easterEnabled;
    document.body.classList.toggle('easter-mode', easterEnabled);
    playEasterSound();
    showToast(easterEnabled ? '🥚 Modo Torin activado' : '🙈 Modo Torin desactivado');
}

function setOnlineStatus(isOnline) {
    statusDot.classList.toggle('online', isOnline);
}

function toggleMenu(forceOpen) {
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !menuPanel.classList.contains('open');
    menuPanel.classList.toggle('open', shouldOpen);
}

btnOpenMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();

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
});

menuPanel.addEventListener('click', (e) => {
    e.stopPropagation();
});

window.addEventListener('click', () => {
    toggleMenu(false);
});

// Manejo de cambio de perfil
selectProfile.addEventListener('change', (e) => {
    const newPartition = e.target.value;
    webview.setAttribute('partition', newPartition);
    webview.reload();
    toggleMenu(false);
    console.log(`Cambiando a perfil: ${newPartition}`);
});

// Función para inyectar CSS desde el archivo local
async function injectCustomTheme() {
    if (!isThemeActive) return;

    try {
        // Leemos el archivo CSS (esto requiere que lo manejemos vía main o con fetch si lo permitimos)
        // Por simplicidad inicial, usaremos un fetch al archivo local
        const response = await fetch('theme.css');
        const cssContent = await response.text();
        
        // Removemos el CSS anterior si existe
        if (cssKey) {
            await webview.removeInsertedCSS(cssKey);
        }
        
        // Inyectamos el nuevo CSS
        cssKey = await webview.insertCSS(cssContent);
        console.log('Tema inyectado con éxito');
    } catch (err) {
        console.error('Error al inyectar el tema:', err);
    }
}

// Eventos del Webview
webview.addEventListener('did-finish-load', () => {
    setOnlineStatus(true);
    injectCustomTheme();
});

webview.addEventListener('did-fail-load', () => {
    setOnlineStatus(false);
});

// Botón de Recargar
btnRefresh.addEventListener('click', () => {
    webview.reload();
    toggleMenu(false);
});

// Toggle de Tema
btnToggleTheme.addEventListener('click', async () => {
    isThemeActive = !isThemeActive;
    
    if (isThemeActive) {
        btnToggleTheme.innerText = '✨ Tema: ON';
        btnToggleTheme.classList.add('active');
        await injectCustomTheme();
    } else {
        btnToggleTheme.innerText = '✨ Tema: OFF';
        btnToggleTheme.classList.remove('active');
        if (cssKey) {
            await webview.removeInsertedCSS(cssKey);
            cssKey = null;
        }
    }
});

// Botón de DevTools del Webview
btnDevTools.addEventListener('click', () => {
    webview.openDevTools();
});

// Hot-reload manual del CSS (útil para desarrollo)
window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'r') {
        injectCustomTheme();
        console.log('CSS Recargado');
    }
    if (e.key === 'Escape') {
        toggleMenu(false);
    }
});
