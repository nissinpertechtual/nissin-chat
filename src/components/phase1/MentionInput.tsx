import { useEffect, useRef, useState } from 'react'
import type { User } from '../../types'

interface Props {
  value: string
  onChange: (value: string) => void
  members: User[]
  placeholder?: string
  onSubmit?: () => void
  className?: string
}

export function MentionInput({ value, onChange, members, placeholder, onSubmit, className }: Props) {
  const [mentionQuery, setMentionQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [mentionStart, setMentionStart] = useState(-1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const filtered = members.filter(m =>
    m.display_name.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 5)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    const cursor = e.target.selectionStart

    onChange(val)

    // Detect @ mention
    const textBeforeCursor = val.slice(0, cursor)
    const atIdx = textBeforeCursor.lastIndexOf('@')
    if (atIdx >= 0) {
      const afterAt = textBeforeCursor.slice(atIdx + 1)
      if (!afterAt.includes(' ')) {
        setMentionQuery(afterAt)
        setMentionStart(atIdx)
        setShowDropdown(true)
        return
      }
    }
    setShowDropdown(false)
  }

  const selectMention = (user: User) => {
    if (mentionStart < 0) return
    const before = value.slice(0, mentionStart)
    const after = value.slice(textareaRef.current?.selectionStart || 0)
    const newVal = `${before}@${user.display_name} ${after}`
    onChange(newVal)
    setShowDropdown(false)
    setMentionStart(-1)
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!showDropdown) onSubmit?.()
    }
    if (e.key === 'Escape') setShowDropdown(false)
  }

  return (
    <div className="relative flex-1">
      {showDropdown && filtered.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1 bg-white border rounded-xl shadow-lg overflow-hidden z-20 w-48">
          {filtered.map(user => (
            <button
              key={user.id}
              onMouseDown={e => { e.preventDefault(); selectMention(user) }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"
            >
              <div className="w-6 h-6 bg-line-green rounded-full flex items-center justify-center text-white text-xs font-bold">
                {user.display_name[0]}
              </div>
              <span className="text-sm">{user.display_name}</span>
            </button>
          ))}
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className={className}
        style={{ resize: 'none', overflowY: 'auto', maxHeight: '120px' }}
      />
    </div>
  )
}

export function renderMentionContent(content: string, members: User[]): React.ReactNode {
  const parts = content.split(/(@\S+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const name = part.slice(1)
      const found = members.find(m => m.display_name === name)
      if (found) {
        return (
          <span key={i} className="text-blue-500 font-semibold bg-blue-50 rounded px-0.5">
            {part}
          </span>
        )
      }
    }
    return <span key={i}>{part}</span>
  })
}
