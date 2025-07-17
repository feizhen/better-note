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
        // 立即重新聚焦
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

  const getPlaceholder = (type) => {
    switch (type) {
      case 'heading1': return '标题 1'
      case 'heading2': return '标题 2'
      case 'heading3': return '标题 3'
      case 'heading4': return '标题 4'
      case 'heading5': return '标题 5'
      case 'heading6': return '标题 6'
      case 'unordered-list': return '列表项'
      case 'ordered-list': return '列表项'
      case 'quote': return '引用'
      default: return '输入 # 创建标题，输入 - 创建列表...'
    }
  }

  return (
    <div className="wysiwyg-editor" ref={editorRef}>
      {blocks.map((block, index) => (
        <div key={block.id} className="wysiwyg-block-container">
          <input
            type="text"
            className={getBlockClassName(block.type)}
            value={block.displayContent || ''}
            onChange={(e) => handleBlockChange(block.id, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, block.id)}
            placeholder={getPlaceholder(block.type)}
            data-block-id={block.id}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      ))}
    </div>
  )
}

export default WysiwygEditor