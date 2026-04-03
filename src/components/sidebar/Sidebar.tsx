import { useState } from 'react'
import { Bell, BellOff, Bookmark, Settings, Plus } from 'lucide-react'
import { KeepPanel } from '../phase1/KeepPanel'
import type { Conversation, User } from '../../types'

interface Props {
  conversations: Conversation[]
  currentUser: User
  selectedId: string | null
  onSelect: (conv: Conversation) => void
  onNewChat?: () => void
  onJumpToConversation?: (convId: string, msgId: string) => void
}

type Tab = 'talks' | 'keep' | 'settings'

export function Sidebar({
  conversations,
  currentUser,
  selectedId,
  onSelect,
  onNewChat,
  onJumpToConversation,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('talks')
  const [mutedConvs, setMutedConvs] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{ convId: string; x: number; y: number } | null>(null)

  const handleContextMenu = (e: React.MouseEvent, convId: string) => {
    e.preventDefault()
    setContextMenu({ convId, x: e.clientX, y: e.clientY })
  }

  const toggleMuteFromContext = (convId: string) => {
    setMutedConvs(prev => {
      const next = new Set(prev)
      if (next.has(convId)) next.delete(convId)
      else next.add(convId)
      return next
    })
    setContextMenu(null)
  }

  const getLastMessage = (conv: Conversation) => {
    const msg = conv.last_message
    if (!msg) return ''
    if (msg.message_type === 'image') return '📷 画像'
    if (msg.message_type === 'file') return '📎 ファイル'
    if (msg.message_type === 'voice') return '🎤 音声'
    if (msg.message_type === 'poll') return '📊 投票'
    return msg.content || ''
  }

  const getTime = (conv: Conversation) => {
    const msg = conv.last_message
    if (!msg) return ''
    const d = new Date(msg.created_at)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
  }

  return (
    <div
      className="flex flex-col h-full bg-white border-r"
      onClick={() => setContextMenu(null)}
    >
      {/* Tabs */}
      <div className="flex border-b">
        {(['talks', 'keep', 'settings'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-line-green text-line-green'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab === 'talks' && 'トーク'}
            {tab === 'keep' && <span className="flex items-center justify-center gap-1"><Bookmark size={14} />Keep</span>}
            {tab === 'settings' && <Settings size={16} className="mx-auto" />}
          </button>
        ))}
      </div>

      {activeTab === 'talks' && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h1 className="font-bold text-lg">トーク</h1>
            {onNewChat && (
              <button
                onClick={onNewChat}
                className="p-2 rounded-full bg-line-green text-white hover:bg-green-600"
              >
                <Plus size={18} />
              </button>
            )}
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {conversations.map(conv => {
              const isMuted = mutedConvs.has(conv.id)
              const unread = !isMuted && (conv.unread_count || 0) > 0

              return (
                <div
                  key={conv.id}
                  onClick={() => onSelect(conv)}
                  onContextMenu={e => handleContextMenu(e, conv.id)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors relative ${
                    selectedId === conv.id ? 'bg-gray-100' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-line-green flex items-center justify-center text-white font-bold text-lg">
                      {(conv.name || 'G')[0]}
                    </div>
                    {isMuted && (
                      <div className="absolute -bottom-0.5 -right-0.5 bg-gray-400 rounded-full p-0.5">
                        <BellOff size={10} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm truncate">{conv.name || 'グループ'}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{getTime(conv)}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{getLastMessage(conv)}</p>
                  </div>

                  {/* Unread badge */}
                  {unread && (
                    <div className="flex-shrink-0 bg-line-green text-white rounded-full min-w-[20px] h-5 flex items-center justify-center text-xs font-bold px-1">
                      {conv.unread_count}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {activeTab === 'keep' && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 border-b">
            <h2 className="font-bold text-lg">Keep</h2>
          </div>
          <KeepPanel
            currentUserId={currentUser.id}
            onJumpToConversation={onJumpToConversation}
          />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="flex-1 p-4">
          <div className="flex flex-col items-center gap-4 pt-8">
            <div className="w-20 h-20 rounded-full bg-line-green flex items-center justify-center text-white text-3xl font-bold">
              {currentUser.display_name[0]}
            </div>
            <p className="font-bold text-lg">{currentUser.display_name}</p>
            <p className="text-sm text-gray-400">{currentUser.email}</p>
          </div>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-lg border py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => toggleMuteFromContext(contextMenu.convId)}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            {mutedConvs.has(contextMenu.convId)
              ? <><Bell size={14} /> ミュート解除</>
              : <><BellOff size={14} /> ミュート</>
            }
          </button>
        </div>
      )}
    </div>
  )
}
