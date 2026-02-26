const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Aquí puedes exponer funciones seguras al proceso de renderizado
});
