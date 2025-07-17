import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 便签操作
  saveNote: (note) => ipcRenderer.invoke('save-note', note),
  loadNotes: () => ipcRenderer.invoke('load-notes'),
  deleteNote: (id) => ipcRenderer.invoke('delete-note', id),
  
  // 事件监听 - 旧版本兼容
  onNewNote: (callback) => ipcRenderer.on('new-note', callback),
  onSaveNote: (callback) => ipcRenderer.on('save-note', callback),
  
  // 新的单便签模式事件监听
  onLoadNote: (callback) => ipcRenderer.on('load-note', callback),
  onTogglePreview: (callback) => ipcRenderer.on('toggle-preview', callback),
  onFormatBold: (callback) => ipcRenderer.on('format-bold', callback),
  onFormatItalic: (callback) => ipcRenderer.on('format-italic', callback),
  onFormatCode: (callback) => ipcRenderer.on('format-code', callback),
  onDeleteNote: (callback) => ipcRenderer.on('delete-note', callback),
  onBeforeQuit: (callback) => ipcRenderer.on('before-quit', callback),
  
  // 移除监听器
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
})