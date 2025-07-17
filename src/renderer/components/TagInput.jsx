import React, { useState, useRef, useEffect } from 'react'
import './TagInput.css'

const TagInput = ({ tags = [], onChange }) => {
  const [inputValue, setInputValue] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  const handleAddTag = () => {
    const trimmedValue = inputValue.trim()
    if (trimmedValue && !tags.includes(trimmedValue)) {
      onChange([...tags, trimmedValue])
      setInputValue('')
      setIsEditing(false)
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    onChange(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    } else if (e.key === 'Escape') {
      setInputValue('')
      setIsEditing(false)
    }
  }

  const handleInputBlur = () => {
    if (inputValue.trim()) {
      handleAddTag()
    } else {
      setIsEditing(false)
    }
  }

  return (
    <div className="tag-input">
      <div className="tags-container">
        {tags.map((tag, index) => (
          <span key={index} className="tag">
            {tag}
            <button
              className="tag-remove"
              onClick={() => handleRemoveTag(tag)}
              title="删除标签"
            >
              ×
            </button>
          </span>
        ))}
        
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="tag-input-field"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={handleInputBlur}
            placeholder="输入标签"
            maxLength={20}
          />
        ) : (
          <button
            className="add-tag-btn"
            onClick={() => setIsEditing(true)}
            title="添加标签"
          >
            + 标签
          </button>
        )}
      </div>
    </div>
  )
}

export default TagInput