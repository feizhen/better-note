import React, { useState, useEffect } from 'react'
import SingleNoteApp from './SingleNoteApp'
import MarkdownEditor from './components/MarkdownEditor'
import TagInput from './components/TagInput'
import storageService from './utils/storage'
import './App.css'

function App() {
  // 检查是否是单便签模式
  const isSingleNoteMode = new URLSearchParams(window.location.search).has('single')
  
  if (isSingleNoteMode) {
    return <SingleNoteApp />
  }
  const [notes, setNotes] = useState([])
  const [activeNote, setActiveNote] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // 从本地存储加载便签数据
    const loadNotes = async () => {
      try {
        const savedNotes = await storageService.getNotes()
        
        if (savedNotes.length === 0) {
          // 如果没有保存的便签，创建欢迎便签
          const welcomeNote = {
            id: '1',
            title: '欢迎使用 Better Note',
            content: '# 欢迎使用 Better Note\n\n这是一个支持 Markdown 语法的桌面便签应用。\n\n## 功能特性\n\n- 📝 Markdown 语法支持\n- 🔍 快速搜索\n- 🏷️ 标签管理\n- 🎨 主题切换\n\n开始创建你的第一个便签吧！',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: ['welcome']
          }
          await storageService.saveNote(welcomeNote)
          setNotes([welcomeNote])
          setActiveNote(welcomeNote)
        } else {
          setNotes(savedNotes)
          setActiveNote(savedNotes[0])
        }
      } catch (error) {
        console.error('加载便签失败:', error)
      }
    }
    
    loadNotes()
  }, [])

  const handleNoteChange = async (updatedNote) => {
    setActiveNote(updatedNote)
    setNotes(prevNotes => 
      prevNotes.map(note => 
        note.id === updatedNote.id ? updatedNote : note
      )
    )
    // 保存到本地存储
    await storageService.saveNote(updatedNote)
  }

  const handleNewNote = async () => {
    const newNote = {
      id: Date.now().toString(),
      title: '新便签',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: []
    }
    setNotes(prevNotes => [newNote, ...prevNotes])
    setActiveNote(newNote)
    // 保存到本地存储
    await storageService.saveNote(newNote)
  }

  const handleDeleteNote = async (noteId) => {
    if (window.confirm('确定要删除这个便签吗？')) {
      setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId))
      if (activeNote?.id === noteId) {
        const remainingNotes = notes.filter(note => note.id !== noteId)
        setActiveNote(remainingNotes.length > 0 ? remainingNotes[0] : null)
      }
      // 从本地存储删除
      await storageService.deleteNote(noteId)
    }
  }

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>Better Note</h1>
          <button className="btn-new" onClick={handleNewNote}>+ 新建</button>
        </div>
        
        <div className="search-bar">
          <input
            type="text"
            placeholder="搜索便签..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="notes-list">
          {filteredNotes.map(note => (
            <div
              key={note.id}
              className={`note-item ${activeNote?.id === note.id ? 'active' : ''}`}
              onClick={() => setActiveNote(note)}
            >
              <div className="note-content">
                <h3>{note.title}</h3>
                <p>{note.content.substring(0, 100)}...</p>
                <div className="note-meta">
                  <small>{new Date(note.updatedAt).toLocaleDateString()}</small>
                  {note.tags && note.tags.length > 0 && (
                    <div className="note-tags">
                      {note.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="note-tag">
                          {tag}
                        </span>
                      ))}
                      {note.tags.length > 3 && (
                        <span className="note-tag-more">+{note.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button 
                className="btn-delete"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteNote(note.id)
                }}
                title="删除便签"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="main-content">
        {activeNote ? (
          <div className="editor-container">
            <div className="editor-header">
              <input
                type="text"
                className="title-input"
                value={activeNote.title}
                onChange={(e) => handleNoteChange({ ...activeNote, title: e.target.value })}
                placeholder="便签标题"
              />
              <TagInput 
                tags={activeNote.tags || []}
                onChange={(tags) => handleNoteChange({ ...activeNote, tags })}
              />
            </div>
            <div className="editor-body">
              <MarkdownEditor 
                note={activeNote}
                onChange={handleNoteChange}
              />
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p>选择一个便签开始编辑</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App