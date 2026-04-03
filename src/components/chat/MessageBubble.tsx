import { useState } from 'react'
import { Check, CheckCheck, Edit2, Trash2, Forward, Pin, Bookmark, MoreVertical, X } from 'lucide-react'
import { VoiceMessage } from '../phase1/VoiceMessage'
import { PollMessage } from '../phase1/PollMessage'
import { renderMentionContent } from '../phase1/MentionInput'
import type { Message, User } from '../../types'

interface Props {
  message: Message
  isOwn: boolean
  currentUserId: string
  memberMap: Map<string, User>
  onEdit?: (message: Message) => void
  onDelete?: (messageId: string) => void
  onForward?: (message: Message) => void
  onPin?: (messageId: string, isPinned: boolean) => void
  onKeep?: (messageId: string) => void
  onReply?: (message: Message) => void
}

export function MessageBubble({
  message,
  isOwn,
  currentUserId,
  memberMap,
  onEdit,
  onDelete,
  onForward,
  onPin,
  onKeep,
  onReply,
}: Props) {
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)

  const wasEdited = message.updated_at && message.updated_at !== message.created_at
  const members = Array.from(memberMap.values())

  const handleEditSave = () => {
    if (onEdit && editContent.trim()) {
      onEdit({ ...message, content: editContent.trim() })
    }
    setIsEditing(false)
  }

  const renderContent = () => {
    if (message.message_type === 'voice' && message.file_url) {
      return <VoiceMessage url={message.file_url} />
    }
    if (message.message_type === 'poll') {
      return <PollMessage messageId={message.id} currentUserId={currentUserId} />
    }
    if (message.message_type === 'image' && message.file_url) {
      return (
        <img
          src={message.file_url}
          alt={message.file_name || 'image'}
          className="max-w-[220px] rounded-xl cursor-pointer"
          onClick={() => window.open(message.file_url, '_blank')}
        />
      )
    }
    if (message.message_type === 'file' && message.file_url) {
      return (
        <a
          href={message.file_url}
          download={message.file_name}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 underline text-sm"
        >
          📎 {message.file_name}
        </a>
      )
    }
    return (
      <p className="text-sm whitespace-pre-wrap break-words">
        {renderMentionContent(message.content, members)}
      </p>
    )
  }

  return (
    <div
      id={`msg-${message.id}`}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-2 px-4 py-1 group`}
    >
      {!isOwn && (
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-auto">
          {message.sender?.display_name?.[0] || '?'}
        </div>
      )}
      <div className={`max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && (
          <span className="text-xs text-gray-500 mb-0.5 px-1">
            {message.sender?.display_name}
          </span>
        )}

        {message.reply_to && (
          <div className={`text-xs rounded-lg px-2 py-1 mb-1 border-l-2 border-gray-400 bg-gray-100 text-gray-500 max-w-full`}>
            <span className="font-semibold">{message.reply_to.sender?.display_name}</span>
            <p className="truncate">{message.reply_to.content}</p>
          </div>
        )}

        <div className="relative">
          {isEditing ? (
            <div className="flex flex-col gap-1">
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="text-sm border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-line-green"
                rows={2}
                autoFocus
              />
              <div className="flex gap-1 justify-end">
                <button onClick={() => setIsEditing(false)} className="p-1 text-gray-500 hover:text-red-500">
                  <X size={16} />
                </button>
                <button onClick={handleEditSave} className="p-1 text-line-green">
                  <Check size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`relative rounded-2xl px-3 py-2 ${
                isOwn
                  ? 'bg-line-green text-white rounded-br-sm'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
              }`}
            >
              {message.is_pinned && (
                <div className="absolute -top-2 -right-1">
                  <Pin size={10} className="text-yellow-500 fill-yellow-500" />
                </div>
              )}
              {renderContent()}
              {wasEdited && (
                <span className={`text-xs opacity-60 block mt-0.5 ${isOwn ? 'text-right' : 'text-left'}`}>
                  編集済み
                </span>
              )}
            </div>
          )}

          {/* Actions menu button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`absolute top-1 ${isOwn ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-100`}
          >
            <MoreVertical size={16} className="text-gray-500" />
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <div
              className={`absolute top-6 z-20 bg-white rounded-xl shadow-lg border py-1 min-w-[140px] ${
                isOwn ? 'right-0' : 'left-0'
              }`}
            >
              <button
                onClick={() => { onReply?.(message); setShowMenu(false) }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              >
                返信
              </button>
              <button
                onClick={() => { onForward?.(message); setShowMenu(false) }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Forward size={14} /> 転送
              </button>
              <button
                onClick={() => { onPin?.(message.id, !message.is_pinned); setShowMenu(false) }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Pin size={14} /> {message.is_pinned ? 'ピン解除' : 'ピン留め'}
              </button>
              <button
                onClick={() => { onKeep?.(message.id); setShowMenu(false) }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Bookmark size={14} /> Keep
              </button>
              {isOwn && (
                <>
                  <button
                    onClick={() => { setIsEditing(true); setShowMenu(false) }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit2 size={14} /> 編集
                  </button>
                  <button
                    onClick={() => { onDelete?.(message.id); setShowMenu(false) }}
                    className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Trash2 size={14} /> 削除
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className={`flex items-center gap-1 mt-0.5 px-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-xs text-gray-400">
            {new Date(message.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOwn && (
            <CheckCheck size={14} className="text-line-green" />
          )}
        </div>
      </div>
    </div>
  )
}
