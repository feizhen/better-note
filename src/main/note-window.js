import { BrowserWindow, Menu } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = process.env.NODE_ENV === 'development'

class NoteWindow {
  constructor(noteData = null) {
    this.noteData = noteData || {
      id: Date.now().toString(),
      title: '新便签',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: []
    }
    this.window = null
    this.createWindow()
  }

  createWindow() {
    this.window = new BrowserWindow({
      width: 600,
      height: 500,
      minWidth: 400,
      minHeight: 300,
      maxWidth: 1200,
      maxHeight: 1000,
      resizable: true, // 确保窗口可以调整大小
      movable: true,   // 确保窗口可以拖拽
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
        additionalArguments: [`--note-id=${this.noteData.id}`]
      },
      titleBarStyle: 'default',
      show: false,
      frame: true,
      backgroundColor: '#fafafa',
      vibrancy: 'under-window', // macOS 毛玻璃效果
      visualEffectState: 'active'
    })

    // 设置窗口标题
    this.window.setTitle(this.noteData.title || '新便签')

    if (isDev) {
      this.window.loadURL('http://localhost:3000?single=true')
      // this.window.webContents.openDevTools()
    } else {
      this.window.loadFile(path.join(__dirname, '../renderer/index.html'), {
        query: { single: 'true' }
      })
    }

    this.window.once('ready-to-show', () => {
      this.window.show()
      // 发送便签数据到渲染进程
      this.window.webContents.send('load-note', this.noteData)
    })

    // 创建简约菜单
    this.createMenu()

    // 监听窗口关闭事件
    this.window.on('close', (event) => {
      // 这里可以添加保存逻辑
      this.window = null
    })

    // 监听标题变化
    this.window.on('page-title-updated', (event, title) => {
      if (title && title !== 'Better Note') {
        this.noteData.title = title
      }
    })
  }

  createMenu() {
    const menuTemplate = [
      {
        label: '文件',
        submenu: [
          {
            label: '新便签',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              new NoteWindow()
            }
          },
          {
            label: '保存',
            accelerator: 'CmdOrCtrl+S',
            click: () => {
              this.window.webContents.send('save-note')
            }
          },
          { type: 'separator' },
          {
            label: '删除便签',
            accelerator: 'CmdOrCtrl+Delete',
            click: () => {
              this.window.webContents.send('delete-note')
            }
          },
          { type: 'separator' },
          {
            label: '关闭',
            accelerator: 'CmdOrCtrl+W',
            role: 'close'
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
        label: '格式',
        submenu: [
          {
            label: '加粗',
            accelerator: 'CmdOrCtrl+B',
            click: () => {
              this.window.webContents.send('format-bold')
            }
          },
          {
            label: '斜体',
            accelerator: 'CmdOrCtrl+I',
            click: () => {
              this.window.webContents.send('format-italic')
            }
          },
          {
            label: '代码',
            accelerator: 'CmdOrCtrl+`',
            click: () => {
              this.window.webContents.send('format-code')
            }
          }
        ]
      },
      {
        label: '视图',
        submenu: [
          {
            label: '切换预览',
            accelerator: 'CmdOrCtrl+Shift+P',
            click: () => {
              this.window.webContents.send('toggle-preview')
            }
          },
          { type: 'separator' },
          {
            label: '置顶',
            type: 'checkbox',
            checked: false,
            click: (menuItem) => {
              this.window.setAlwaysOnTop(menuItem.checked)
            }
          },
          { type: 'separator' },
          { role: 'resetzoom', label: '重置缩放' },
          { role: 'zoomin', label: '放大' },
          { role: 'zoomout', label: '缩小' }
        ]
      }
    ]

    const menu = Menu.buildFromTemplate(menuTemplate)
    Menu.setApplicationMenu(menu)
  }

  updateNoteData(data) {
    this.noteData = { ...this.noteData, ...data }
    if (data.title) {
      this.window.setTitle(data.title)
    }
  }

  getNoteData() {
    return this.noteData
  }

  close() {
    if (this.window) {
      this.window.close()
    }
  }
}

export default NoteWindow