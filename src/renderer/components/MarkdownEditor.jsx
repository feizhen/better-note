import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './MarkdownEditor.css'

const MarkdownEditor = ({ note, onChange }) => {
  const [content, setContent] = useState(note?.content || '')
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  useEffect(() => {
    setContent(note?.content || '')
  }, [note])

  const handleContentChange = (value) => {
    setContent(value)
    if (onChange) {
      onChange({
        ...note,
        content: value,
        updatedAt: new Date().toISOString()
      })
    }
  }

  return (
    <div className="markdown-editor">
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <button
            className={`toolbar-btn ${!isPreviewMode ? 'active' : ''}`}
            onClick={() => setIsPreviewMode(false)}
          >
            编辑
          </button>
          <button
            className={`toolbar-btn ${isPreviewMode ? 'active' : ''}`}
            onClick={() => setIsPreviewMode(true)}
          >
            预览
          </button>
        </div>
        <div className="toolbar-right">
          <button className="toolbar-btn" title="加粗">
            <strong>B</strong>
          </button>
          <button className="toolbar-btn" title="斜体">
            <em>I</em>
          </button>
          <button className="toolbar-btn" title="代码">
            &lt;/&gt;
          </button>
          <button className="toolbar-btn" title="链接">
            🔗
          </button>
          <button className="toolbar-btn" title="图片">
            🖼️
          </button>
        </div>
      </div>

      <div className="editor-content">
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
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            className="markdown-textarea"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="开始编写你的便签..."
            spellCheck={false}
          />
        )}
      </div>
    </div>
  )
}

export default MarkdownEditor