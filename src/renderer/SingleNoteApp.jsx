import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './SingleNoteApp.css'

const SingleNoteApp = () => {
  const [note, setNote] = useState({
    id: '',
    title: '',
    content: '',
    tags: [],
    createdAt: '',
    updatedAt: ''
  })
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef(null)
  const titleRef = useRef(null)

  useEffect(() => {
    // 监听来自主进程的事件
    if (window.electronAPI) {
      window.electronAPI.onLoadNote((event, noteData) => {
        setNote(noteData)
        document.title = noteData.title || '新便签'
      })

      window.electronAPI.onSaveNote(() => {
        handleSave()
      })

      window.electronAPI.onTogglePreview(() => {
        setIsPreviewMode(prev => !prev)
      })

      window.electronAPI.onFormatBold(() => {
        insertFormat('**', '**')
      })

      window.electronAPI.onFormatItalic(() => {
        insertFormat('*', '*')
      })

      window.electronAPI.onFormatCode(() => {
        insertFormat('`', '`')
      })

      window.electronAPI.onDeleteNote(() => {
        if (confirm('确定要删除这个便签吗？')) {
          window.electronAPI.deleteNote(note.id)
          window.close()
        }
      })
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('load-note')
        window.electronAPI.removeAllListeners('save-note')
        window.electronAPI.removeAllListeners('toggle-preview')
        window.electronAPI.removeAllListeners('format-bold')
        window.electronAPI.removeAllListeners('format-italic')
        window.electronAPI.removeAllListeners('format-code')
        window.electronAPI.removeAllListeners('delete-note')
      }
    }
  }, [])

  const handleTitleChange = (newTitle) => {
    const updatedNote = {
      ...note,
      title: newTitle,
      updatedAt: new Date().toISOString()
    }
    setNote(updatedNote)
    document.title = newTitle || '新便签'
    debouncedSave(updatedNote)
  }

  const handleContentChange = (newContent) => {
    const updatedNote = {
      ...note,
      content: newContent,
      updatedAt: new Date().toISOString()
    }
    setNote(updatedNote)
    debouncedSave(updatedNote)
  }

  // 防抖保存
  const debouncedSave = (() => {
    let timeout
    return (noteData) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        handleSave(noteData)
      }, 1000)
    }
  })()

  const handleSave = async (noteData = note) => {
    setIsSaving(true)
    try {
      if (window.electronAPI) {
        await window.electronAPI.saveNote(noteData)
      }
    } catch (error) {
      console.error('保存失败:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const insertFormat = (before, after) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)
    const newText = textarea.value.substring(0, start) + 
                   before + selectedText + after + 
                   textarea.value.substring(end)
    
    handleContentChange(newText)
    
    // 重新设置光标位置
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(
        start + before.length,
        end + before.length
      )
    }, 0)
  }

  const handleKeyDown = (e) => {
    // 处理快捷键
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault()
          insertFormat('**', '**')
          break
        case 'i':
          e.preventDefault()
          insertFormat('*', '*')
          break
        case '`':
          e.preventDefault()
          insertFormat('`', '`')
          break
        case 's':
          e.preventDefault()
          handleSave()
          break
      }
      return
    }

    // 处理 Markdown 快捷语法
    const textarea = textareaRef.current
    if (!textarea) return

    const { selectionStart, selectionEnd, value } = textarea
    const currentLine = getCurrentLine(value, selectionStart)
    const lineStart = getLineStart(value, selectionStart)

    // 空格键触发的快捷语法
    if (e.key === ' ') {
      const shortcuts = [
        { pattern: /^#{6}\s*$/, replacement: '###### ' },
        { pattern: /^#{5}\s*$/, replacement: '##### ' },
        { pattern: /^#{4}\s*$/, replacement: '#### ' },
        { pattern: /^#{3}\s*$/, replacement: '### ' },
        { pattern: /^#{2}\s*$/, replacement: '## ' },
        { pattern: /^#{1}\s*$/, replacement: '# ' },
        { pattern: /^>\s*$/, replacement: '> ' },
        { pattern: /^-\s*$/, replacement: '- ' },
        { pattern: /^\*\s*$/, replacement: '* ' },
        { pattern: /^\+\s*$/, replacement: '+ ' },
        { pattern: /^(\d+)\.\s*$/, replacement: (match) => `${match[1]}. ` },
        { pattern: /^```\s*$/, replacement: '```\n\n```' }
      ]

      for (const shortcut of shortcuts) {
        const match = currentLine.match(shortcut.pattern)
        if (match) {
          e.preventDefault()
          const replacement = typeof shortcut.replacement === 'function' 
            ? shortcut.replacement(match) 
            : shortcut.replacement
          
          if (shortcut.pattern.source === '^```\\s*$') {
            // 特殊处理代码块
            const newText = value.substring(0, lineStart) + 
                           replacement + 
                           value.substring(selectionStart)
            handleContentChange(newText)
            setTimeout(() => {
              textarea.focus()
              textarea.setSelectionRange(lineStart + 4, lineStart + 4)
            }, 0)
          } else {
            const newText = value.substring(0, lineStart) + 
                           replacement + 
                           value.substring(selectionStart)
            handleContentChange(newText)
            setTimeout(() => {
              textarea.focus()
              textarea.setSelectionRange(lineStart + replacement.length, lineStart + replacement.length)
            }, 0)
          }
          return
        }
      }
    }

    // 回车键处理
    if (e.key === 'Enter') {
      // 检查是否在列表项中
      const listMatch = currentLine.match(/^(\s*)([-*+]|\d+\.)\s/)
      if (listMatch) {
        e.preventDefault()
        const indent = listMatch[1]
        const listMarker = listMatch[2]
        
        // 如果当前行只有列表标记，删除它
        if (currentLine.trim() === listMarker) {
          const newText = value.substring(0, lineStart) + 
                         value.substring(selectionStart)
          handleContentChange(newText)
          setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(lineStart, lineStart)
          }, 0)
          return
        }
        
        // 继续列表
        let nextMarker = listMarker
        if (/^\d+\.$/.test(listMarker)) {
          const num = parseInt(listMarker) + 1
          nextMarker = `${num}.`
        }
        
        const newText = value.substring(0, selectionStart) + 
                       `\n${indent}${nextMarker} ` + 
                       value.substring(selectionEnd)
        handleContentChange(newText)
        setTimeout(() => {
          const newPos = selectionStart + 1 + indent.length + nextMarker.length + 1
          textarea.focus()
          textarea.setSelectionRange(newPos, newPos)
        }, 0)
        return
      }

      // 检查是否在引用块中
      const quoteMatch = currentLine.match(/^(\s*>)\s/)
      if (quoteMatch) {
        e.preventDefault()
        const quotePrefix = quoteMatch[1]
        
        // 如果当前行只有引用标记，删除它
        if (currentLine.trim() === '>') {
          const newText = value.substring(0, lineStart) + 
                         value.substring(selectionStart)
          handleContentChange(newText)
          setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(lineStart, lineStart)
          }, 0)
          return
        }
        
        // 继续引用
        const newText = value.substring(0, selectionStart) + 
                       `\n${quotePrefix} ` + 
                       value.substring(selectionEnd)
        handleContentChange(newText)
        setTimeout(() => {
          const newPos = selectionStart + 1 + quotePrefix.length + 1
          textarea.focus()
          textarea.setSelectionRange(newPos, newPos)
        }, 0)
        return
      }
    }

    // Tab 键处理列表缩进
    if (e.key === 'Tab') {
      const listMatch = currentLine.match(/^(\s*)([-*+]|\d+\.)\s/)
      if (listMatch) {
        e.preventDefault()
        const indent = listMatch[1]
        const newIndent = e.shiftKey ? indent.slice(2) : indent + '  '
        const newText = value.substring(0, lineStart) + 
                       newIndent + currentLine.substring(indent.length) + 
                       value.substring(getLineEnd(value, selectionStart))
        handleContentChange(newText)
        setTimeout(() => {
          const offset = e.shiftKey ? -2 : 2
          textarea.focus()
          textarea.setSelectionRange(selectionStart + offset, selectionStart + offset)
        }, 0)
        return
      }
    }
  }

  // 辅助函数
  const getCurrentLine = (text, pos) => {
    const lineStart = getLineStart(text, pos)
    const lineEnd = getLineEnd(text, pos)
    return text.substring(lineStart, lineEnd)
  }

  const getLineStart = (text, pos) => {
    const lineStart = text.lastIndexOf('\n', pos - 1)
    return lineStart === -1 ? 0 : lineStart + 1
  }

  const getLineEnd = (text, pos) => {
    const lineEnd = text.indexOf('\n', pos)
    return lineEnd === -1 ? text.length : lineEnd
  }

  return (
    <div className="single-note-app">
      {/* 简约的标题栏 */}
      <div className="note-header">
        <input
          ref={titleRef}
          type="text"
          className="note-title"
          value={note.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="便签标题"
          onKeyDown={handleKeyDown}
        />
        <div className="header-controls">
          <button
            className={`preview-toggle ${isPreviewMode ? 'active' : ''}`}
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            title="切换预览 (Cmd+Shift+P)"
          >
            {isPreviewMode ? '📝' : '👁️'}
          </button>
          {isSaving && (
            <div className="saving-indicator" title="保存中...">
              💾
            </div>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="note-content">
        {isPreviewMode ? (
          <div className="markdown-preview">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code({node, inline, className, children, ...props}) {
                  return inline ? (
                    <code className="inline-code" {...props}>
                      {children}
                    </code>
                  ) : (
                    <pre className="code-block">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  )
                },
                blockquote({children}) {
                  return <blockquote className="blockquote">{children}</blockquote>
                },
                table({children}) {
                  return <table className="markdown-table">{children}</table>
                }
              }}
            >
              {note.content || '开始编写你的便签...'}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            className="note-textarea"
            value={note.content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="开始编写你的便签..."
            onKeyDown={handleKeyDown}
            spellCheck={false}
          />
        )}
      </div>

      {/* 状态栏 */}
      <div className="status-bar">
        <span className="word-count">
          {note.content.length} 字符
        </span>
        <span className="last-modified">
          {note.updatedAt && `最后修改: ${new Date(note.updatedAt).toLocaleString()}`}
        </span>
      </div>
    </div>
  )
}

export default SingleNoteApp