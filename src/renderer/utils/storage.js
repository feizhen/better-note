// 本地存储服务
class StorageService {
  constructor() {
    this.storageKey = 'better_note_data'
  }

  // 获取所有便签
  async getNotes() {
    try {
      const data = localStorage.getItem(this.storageKey)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('读取便签数据失败:', error)
      return []
    }
  }

  // 保存所有便签
  async saveNotes(notes) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(notes))
      return true
    } catch (error) {
      console.error('保存便签数据失败:', error)
      return false
    }
  }

  // 保存单个便签
  async saveNote(note) {
    try {
      const notes = await this.getNotes()
      const existingIndex = notes.findIndex(n => n.id === note.id)
      
      if (existingIndex >= 0) {
        notes[existingIndex] = note
      } else {
        notes.unshift(note)
      }
      
      return await this.saveNotes(notes)
    } catch (error) {
      console.error('保存便签失败:', error)
      return false
    }
  }

  // 删除便签
  async deleteNote(noteId) {
    try {
      const notes = await this.getNotes()
      const filteredNotes = notes.filter(note => note.id !== noteId)
      return await this.saveNotes(filteredNotes)
    } catch (error) {
      console.error('删除便签失败:', error)
      return false
    }
  }

  // 导出数据
  async exportData() {
    try {
      const notes = await this.getNotes()
      const data = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        notes: notes
      }
      return JSON.stringify(data, null, 2)
    } catch (error) {
      console.error('导出数据失败:', error)
      return null
    }
  }

  // 导入数据
  async importData(jsonData) {
    try {
      const data = JSON.parse(jsonData)
      if (data.notes && Array.isArray(data.notes)) {
        return await this.saveNotes(data.notes)
      }
      return false
    } catch (error) {
      console.error('导入数据失败:', error)
      return false
    }
  }

  // 清空所有数据
  async clearAll() {
    try {
      localStorage.removeItem(this.storageKey)
      return true
    } catch (error) {
      console.error('清空数据失败:', error)
      return false
    }
  }
}

export default new StorageService()