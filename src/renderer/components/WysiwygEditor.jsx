import React, { useState, useRef, useEffect, useCallback } from 'react'
import './WysiwygEditor.css'

const WysiwygEditor = ({ note, onChange }) => {
  const [content, setContent] = useState(note?.content || '')
  const [blocks, setBlocks] = useState([{ id: 'block-0', content: '', type: 'paragraph', displayContent: '' }])
  const editorRef = useRef(null)
  const ignoreNextUpdate = useRef(false)

  useEffect(() => {
    if (ignoreNextUpdate.current) {
      ignoreNextUpdate.current = false
      return
    }
    
    const newContent = note?.content || ''
    setContent(newContent)
    parseContentToBlocks(newContent)
  }, [note])

  // 解析内容为块结构
  const parseContentToBlocks = useCallback((text) => {
    if (!text) {
      setBlocks([{ id: 'block-0', content: '', type: 'paragraph', displayContent: '' }])
      return
    }

    const lines = text.split('\n')
    const newBlocks = lines.map((line, index) => {
      const block = {
        id: `block-${index}`,
        content: line,
        type: 'paragraph',
        displayContent: line
      }

      // 检测标题
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
      if (headingMatch) {
        const level = headingMatch[1].length
        block.type = `heading${level}`
        block.displayContent = headingMatch[2]
      }
      // 检测待办事项
      else if (line.match(/^(\s*)- \[([ x])\]\s+(.*)$/)) {
        const todoMatch = line.match(/^(\s*)- \[([ x])\]\s+(.*)$/)
        block.type = 'todo'
        block.indent = todoMatch[1].length
        block.checked = todoMatch[2] === 'x'
        block.displayContent = todoMatch[3]
      }
      // 检测列表
      else if (line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/)) {
        const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/)
        block.type = listMatch[2].match(/\d+\./) ? 'ordered-list' : 'unordered-list'
        block.indent = listMatch[1].length
        block.marker = listMatch[2]
        block.displayContent = listMatch[3]
      }
      // 检测引用
      else if (line.match(/^>\s+(.*)$/)) {
        const quoteMatch = line.match(/^>\s+(.*)$/)
        block.type = 'quote'
        block.displayContent = quoteMatch[1]
      }
      // 检测代码块
      else if (line.match(/^```(.*)$/)) {
        const codeMatch = line.match(/^```(.*)$/)
        block.type = 'code-block'
        block.language = codeMatch[1]
        block.displayContent = codeMatch[1] ? `代码块 (${codeMatch[1]})` : '代码块'
      }

      return block
    })
    setBlocks(newBlocks)
  }, [])

  const updateContent = useCallback((updatedBlocks) => {
    const newFullContent = updatedBlocks.map(b => b.content).join('\n')
    setContent(newFullContent)
    
    // 防止无限循环更新
    ignoreNextUpdate.current = true
    
    if (onChange) {
      onChange({
        ...note,
        content: newFullContent,
        updatedAt: new Date().toISOString()
      })
    }
  }, [note, onChange])

  const handleBlockChange = useCallback((blockId, newContent, newType = null) => {
    setBlocks(prevBlocks => {
      const blockIndex = prevBlocks.findIndex(b => b.id === blockId)
      if (blockIndex === -1) return prevBlocks

      const updatedBlocks = [...prevBlocks]
      const block = updatedBlocks[blockIndex]

      // 如果指定了新类型，更新类型
      if (newType) {
        block.type = newType
      }

      // 更新显示内容和实际内容
      block.displayContent = newContent

      // 根据类型生成 Markdown 内容
      switch (block.type) {
        case 'heading1':
          block.content = newContent ? `# ${newContent}` : ''
          break
        case 'heading2':
          block.content = newContent ? `## ${newContent}` : ''
          break
        case 'heading3':
          block.content = newContent ? `### ${newContent}` : ''
          break
        case 'heading4':
          block.content = newContent ? `#### ${newContent}` : ''
          break
        case 'heading5':
          block.content = newContent ? `##### ${newContent}` : ''
          break
        case 'heading6':
          block.content = newContent ? `###### ${newContent}` : ''
          break
        case 'unordered-list':
          block.content = newContent ? `- ${newContent}` : ''
          break
        case 'ordered-list':
          const num = blockIndex + 1
          block.content = newContent ? `${num}. ${newContent}` : ''
          break
        case 'quote':
          block.content = newContent ? `> ${newContent}` : ''
          break
        case 'todo':
          const checkMark = block.checked ? 'x' : ' '
          block.content = newContent ? `- [${checkMark}] ${newContent}` : `- [${checkMark}] `
          break
        case 'code-block':
          block.content = newContent ? `\`\`\`${newContent}\n\n\`\`\`` : '```\n\n```'
          break
        default:
          block.content = newContent
      }

      // 异步更新内容，避免阻塞输入
      setTimeout(() => updateContent(updatedBlocks), 0)
      
      return updatedBlocks
    })
  }, [updateContent])

  const handleKeyDown = useCallback((e, blockId) => {
    const blockIndex = blocks.findIndex(b => b.id === blockId)
    const block = blocks[blockIndex]
    const input = e.target
    const value = input.value

    // Cmd/Ctrl + K - 插入链接
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      insertLink(blockId, input)
      return
    }

    // Cmd/Ctrl + Shift + X - 切换待办事项状态
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'X') {
      e.preventDefault()
      if (block.type === 'todo') {
        toggleTodo(blockId)
      }
      return
    }

    // 检测快捷语法
    if (e.key === ' ') {
      // 标题快捷语法
      const headingShortcuts = {
        '#': 'heading1',
        '##': 'heading2',
        '###': 'heading3',
        '####': 'heading4',
        '#####': 'heading5',
        '######': 'heading6'
      }

      if (headingShortcuts[value]) {
        e.preventDefault()
        handleBlockChange(blockId, '', headingShortcuts[value])
        requestAnimationFrame(() => {
          input.focus()
          input.setSelectionRange(0, 0)
        })
        return
      }

      // 待办事项快捷语法
      if (value === '[]' || value === '[ ]') {
        e.preventDefault()
        setBlocks(prevBlocks => {
          const updatedBlocks = [...prevBlocks]
          const targetBlock = updatedBlocks[blockIndex]
          targetBlock.type = 'todo'
          targetBlock.checked = false
          targetBlock.displayContent = ''
          targetBlock.content = '- [ ] '
          setTimeout(() => updateContent(updatedBlocks), 0)
          return updatedBlocks
        })
        requestAnimationFrame(() => {
          input.focus()
          input.setSelectionRange(0, 0)
        })
        return
      }

      // 已完成待办事项快捷语法
      if (value === '[x]' || value === '[X]') {
        e.preventDefault()
        setBlocks(prevBlocks => {
          const updatedBlocks = [...prevBlocks]
          const targetBlock = updatedBlocks[blockIndex]
          targetBlock.type = 'todo'
          targetBlock.checked = true
          targetBlock.displayContent = ''
          targetBlock.content = '- [x] '
          setTimeout(() => updateContent(updatedBlocks), 0)
          return updatedBlocks
        })
        requestAnimationFrame(() => {
          input.focus()
          input.setSelectionRange(0, 0)
        })
        return
      }

      // 列表快捷语法
      if (value === '-' || value === '*' || value === '+') {
        e.preventDefault()
        handleBlockChange(blockId, '', 'unordered-list')
        requestAnimationFrame(() => {
          input.focus()
          input.setSelectionRange(0, 0)
        })
        return
      }

      // 引用快捷语法
      if (value === '>') {
        e.preventDefault()
        handleBlockChange(blockId, '', 'quote')
        requestAnimationFrame(() => {
          input.focus()
          input.setSelectionRange(0, 0)
        })
        return
      }

      // 代码块快捷语法
      if (value === '```') {
        e.preventDefault()
        handleBlockChange(blockId, '', 'code-block')
        requestAnimationFrame(() => {
          input.focus()
          input.setSelectionRange(0, 0)
        })
        return
      }
    }

    // 回车键处理
    if (e.key === 'Enter') {
      e.preventDefault()
      addNewBlock(blockIndex)
    }

    // 退格键处理
    if (e.key === 'Backspace') {
      if (value === '' && block.type !== 'paragraph') {
        // 转换为普通段落
        e.preventDefault()
        handleBlockChange(blockId, '', 'paragraph')
        requestAnimationFrame(() => {
          input.focus()
        })
      } else if (value === '' && blockIndex > 0) {
        // 删除当前块，聚焦到上一个块
        e.preventDefault()
        deleteBlock(blockIndex)
      }
    }
  }, [blocks, handleBlockChange])

  const addNewBlock = useCallback((afterIndex) => {
    const newBlockId = `block-${Date.now()}`
    const newBlock = {
      id: newBlockId,
      content: '',
      type: 'paragraph',
      displayContent: ''
    }

    setBlocks(prevBlocks => {
      const updatedBlocks = [...prevBlocks]
      updatedBlocks.splice(afterIndex + 1, 0, newBlock)
      
      // 异步聚焦新块
      requestAnimationFrame(() => {
        const newInput = document.querySelector(`[data-block-id="${newBlockId}"]`)
        if (newInput) {
          newInput.focus()
        }
      })
      
      return updatedBlocks
    })
  }, [])

  const deleteBlock = useCallback((blockIndex) => {
    if (blocks.length <= 1) return

    setBlocks(prevBlocks => {
      const updatedBlocks = prevBlocks.filter((_, index) => index !== blockIndex)
      
      // 聚焦到前一个块
      requestAnimationFrame(() => {
        const targetIndex = Math.max(0, blockIndex - 1)
        const prevInput = document.querySelector(`[data-block-id="${updatedBlocks[targetIndex]?.id}"]`)
        if (prevInput) {
          prevInput.focus()
          prevInput.setSelectionRange(prevInput.value.length, prevInput.value.length)
        }
      })
      
      // 异步更新内容
      setTimeout(() => updateContent(updatedBlocks), 0)
      
      return updatedBlocks
    })
  }, [blocks.length, updateContent])

  // 插入链接
  const insertLink = useCallback((blockId, input) => {
    const selection = {
      start: input.selectionStart,
      end: input.selectionEnd,
      text: input.value.substring(input.selectionStart, input.selectionEnd)
    }

    const url = prompt('请输入链接地址:', 'https://')
    if (!url) return

    const linkText = selection.text || prompt('请输入链接文本:', '链接') || '链接'
    const linkMarkdown = `[${linkText}](${url})`
    
    const newValue = input.value.substring(0, selection.start) + 
                    linkMarkdown + 
                    input.value.substring(selection.end)
    
    handleBlockChange(blockId, newValue)
    
    // 重新设置光标位置到链接后面
    requestAnimationFrame(() => {
      input.focus()
      const newPosition = selection.start + linkMarkdown.length
      input.setSelectionRange(newPosition, newPosition)
    })
  }, [handleBlockChange])

  // 切换待办事项状态
  const toggleTodo = useCallback((blockId) => {
    setBlocks(prevBlocks => {
      const updatedBlocks = [...prevBlocks]
      const blockIndex = updatedBlocks.findIndex(b => b.id === blockId)
      const block = updatedBlocks[blockIndex]
      
      if (block.type === 'todo') {
        block.checked = !block.checked
        const checkMark = block.checked ? 'x' : ' '
        block.content = block.displayContent ? 
          `- [${checkMark}] ${block.displayContent}` : 
          `- [${checkMark}] `
        
        setTimeout(() => updateContent(updatedBlocks), 0)
      }
      
      return updatedBlocks
    })
  }, [updateContent])

  // 处理待办事项点击
  const handleTodoClick = useCallback((blockId, e) => {
    if (e.target.classList.contains('todo-checkbox')) {
      e.preventDefault()
      toggleTodo(blockId)
    }
  }, [toggleTodo])

  // 处理粘贴事件
  const handlePaste = useCallback((e, blockId) => {
    e.preventDefault()
    
    const clipboardData = e.clipboardData || window.clipboardData
    const pastedText = clipboardData.getData('text')
    
    if (!pastedText) return
    
    const blockIndex = blocks.findIndex(b => b.id === blockId)
    if (blockIndex === -1) return
    
    // 检查是否包含换行符
    if (pastedText.includes('\n')) {
      const lines = pastedText.split('\n')
      const currentBlock = blocks[blockIndex]
      
      // 更新当前块为第一行
      const updatedBlocks = [...blocks]
      updatedBlocks[blockIndex] = {
        ...currentBlock,
        content: lines[0],
        displayContent: lines[0],
        type: 'paragraph'
      }
      
      // 为剩余的行创建新块
      for (let i = 1; i < lines.length; i++) {
        const newBlock = {
          id: `block-${Date.now()}-${i}`,
          content: lines[i],
          type: 'paragraph',
          displayContent: lines[i]
        }
        updatedBlocks.splice(blockIndex + i, 0, newBlock)
      }
      
      setBlocks(updatedBlocks)
      
      // 重新解析所有块以应用 Markdown 格式
      setTimeout(() => {
        const fullContent = updatedBlocks.map(b => b.content).join('\n')
        parseContentToBlocks(fullContent)
      }, 0)
      
      // 异步更新内容
      setTimeout(() => updateContent(updatedBlocks), 10)
    } else {
      // 单行粘贴，正常处理
      const input = e.target
      const start = input.selectionStart
      const end = input.selectionEnd
      const currentValue = input.value
      
      const newValue = currentValue.substring(0, start) + pastedText + currentValue.substring(end)
      handleBlockChange(blockId, newValue)
      
      // 设置光标位置
      setTimeout(() => {
        input.focus()
        input.setSelectionRange(start + pastedText.length, start + pastedText.length)
      }, 0)
    }
  }, [blocks, handleBlockChange, parseContentToBlocks, updateContent])

  const getBlockClassName = (type) => {
    const baseClass = 'wysiwyg-block'
    switch (type) {
      case 'heading1': return `${baseClass} heading-1`
      case 'heading2': return `${baseClass} heading-2`
      case 'heading3': return `${baseClass} heading-3`
      case 'heading4': return `${baseClass} heading-4`
      case 'heading5': return `${baseClass} heading-5`
      case 'heading6': return `${baseClass} heading-6`
      case 'unordered-list': return `${baseClass} list-item`
      case 'ordered-list': return `${baseClass} list-item`
      case 'quote': return `${baseClass} quote-block`
      case 'code-block': return `${baseClass} code-block`
      default: return `${baseClass} paragraph`
    }
  }

  // 检查是否为空状态（只有一个空的段落块）
  const isEmpty = blocks.length === 1 && 
                  blocks[0].type === 'paragraph' && 
                  !blocks[0].content && 
                  !blocks[0].displayContent

  return (
    <div className={`wysiwyg-editor ${isEmpty ? 'empty-state' : ''}`} ref={editorRef}>
      {blocks.map((block, index) => (
        <div key={block.id} className="wysiwyg-block-container">
          {block.type === 'todo' ? (
            <div className="todo-block" onClick={(e) => handleTodoClick(block.id, e)}>
              <input
                type="checkbox"
                className="todo-checkbox"
                checked={block.checked || false}
                onChange={() => toggleTodo(block.id)}
              />
              <input
                type="text"
                className={getBlockClassName(block.type)}
                value={block.displayContent || ''}
                onChange={(e) => handleBlockChange(block.id, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, block.id)}
                onPaste={(e) => handlePaste(e, block.id)}
                data-block-id={block.id}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          ) : (
            <input
              type="text"
              className={getBlockClassName(block.type)}
              value={block.displayContent || ''}
              onChange={(e) => handleBlockChange(block.id, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, block.id)}
              onPaste={(e) => handlePaste(e, block.id)}
              data-block-id={block.id}
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default WysiwygEditor