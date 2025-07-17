import { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, shell } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import NoteWindow from './note-window.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = process.env.NODE_ENV === 'development'

let noteWindows = new Map() // 存储所有便签窗口
let tray = null

// 创建托盘
function createTray() {
  if (tray) return

  // 创建托盘图标（这里使用系统默认图标，实际项目中应该使用自定义图标）
  const icon = nativeImage.createFromNamedImage('NSImageNameTextDocument')
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '新便签',
      click: () => {
        createNewNote()
      }
    },
    {
      label: '显示所有便签',
      click: () => {
        showAllNotes()
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit()
      }
    }
  ])
  
  tray.setContextMenu(contextMenu)
  tray.setToolTip('Better Note')
  
  // 点击托盘图标创建新便签
  tray.on('click', () => {
    createNewNote()
  })
}

// 创建新便签
function createNewNote(noteData = null) {
  const noteWindow = new NoteWindow(noteData)
  noteWindows.set(noteWindow.noteData.id, noteWindow)
  
  // 监听窗口关闭事件
  noteWindow.window.on('closed', () => {
    noteWindows.delete(noteWindow.noteData.id)
  })
  
  return noteWindow
}

// 显示所有便签
function showAllNotes() {
  noteWindows.forEach(noteWindow => {
    if (noteWindow.window) {
      noteWindow.window.show()
      noteWindow.window.focus()
    }
  })
}

// 设置全局菜单（当没有窗口时显示）
function createGlobalMenu() {
  const menuTemplate = [
    {
      label: '文件',
      submenu: [
        {
          label: '新便签',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            createNewNote()
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectall', label: '全选' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        {
          label: '显示所有便签',
          click: showAllNotes
        },
        { type: 'separator' },
        { role: 'minimize', label: '最小化' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 Better Note',
          click: () => {
            shell.openExternal('https://github.com/your-repo/better-note')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)
}

// IPC 事件处理
ipcMain.handle('save-note', async (event, noteData) => {
  // 这里实现保存逻辑
  const windowId = BrowserWindow.fromWebContents(event.sender).id
  const noteWindow = Array.from(noteWindows.values()).find(
    nw => nw.window && nw.window.id === windowId
  )
  
  if (noteWindow) {
    noteWindow.updateNoteData(noteData)
  }
  
  return { success: true }
})

ipcMain.handle('load-notes', async () => {
  // 这里实现加载逻辑，返回所有便签
  return Array.from(noteWindows.values()).map(nw => nw.getNoteData())
})

ipcMain.handle('delete-note', async (event, noteId) => {
  const noteWindow = noteWindows.get(noteId)
  if (noteWindow) {
    noteWindow.close()
    noteWindows.delete(noteId)
  }
  return { success: true }
})

// 应用事件处理
app.whenReady().then(() => {
  createGlobalMenu()
  createTray()
  
  // 如果没有传入便签数据，创建一个新便签
  if (process.argv.includes('--new-note')) {
    createNewNote()
  } else {
    // 启动时创建欢迎便签
    const welcomeNote = {
      id: 'welcome',
      title: '欢迎使用 Better Note',
      content: `# 欢迎使用 Better Note

这是一个类似 macOS 便签的 Markdown 编辑器。

## 特性

- 🖊️ **简洁设计** - 每个便签都是独立的简约窗口
- 📝 **Markdown 支持** - 完整的 Markdown 语法支持
- 👀 **实时预览** - 按 Cmd+Shift+P 切换预览模式
- 🔍 **快速操作** - 通过快捷键快速格式化文本

## 快捷键

- \`Cmd+N\` - 新建便签
- \`Cmd+S\` - 保存便签
- \`Cmd+B\` - 加粗文本
- \`Cmd+I\` - 斜体文本
- \`Cmd+\`\` - 代码格式

开始创建你的便签吧！`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['welcome']
    }
    createNewNote(welcomeNote)
  }
})

app.on('window-all-closed', () => {
  // 在 macOS 上，保持应用运行但不显示窗口
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // 在 macOS 上，点击 dock 图标时创建新便签
  if (noteWindows.size === 0) {
    createNewNote()
  } else {
    showAllNotes()
  }
})

app.on('before-quit', () => {
  // 保存所有便签数据
  noteWindows.forEach(noteWindow => {
    if (noteWindow.window) {
      noteWindow.window.webContents.send('before-quit')
    }
  })
})