import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../services/supabase'
import { useMessages } from '../../hooks/useMessages'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { AlbumPanel } from '../phase1/AlbumPanel'
import { FileListPanel } from '../phase1/FileListPanel'
import { GroupNotePanel } from '../phase1/GroupNotePanel'
import { InviteLinkModal } from '../phase1/InviteLinkModal'
import { ForwardModal } from '../phase1/ForwardModal'
import {
  Image, Paperclip, FileText, Megaphone, Link, Bell, BellOff, Pin, X, ChevronDown
} from 'lucide-react'
import type { Conversation, Message, User } from '../../types'

interface Props {
  conversation: Conversation
  currentUser: User
  members: User[]
  onBack?: () => void
}

type Panel = 'album' | 'files' | 'note' | null

export function ChatWindow({ conversation, currentUser, members, onBack }: Props) {
  const { messages, sendMessage, editMessage, deleteMessage, pinMessage, addKeep, forwardMessage } =
    useMessages(conversation.id, currentUser.id)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [activePanel, setActivePanel] = useState<Panel>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [announcement, setAnnouncement] = useState(conversation.announcement || '')
  const [showAnnouncementEdit, setShowAnnouncementEdit] = useState(false)
  const [announcementDraft, setAnnouncementDraft] = useState('')
  const [showAnnouncementBanner, setShowAnnouncementBanner] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const memberMap = new Map(members.map(m => [m.id, m]))
  const pinnedMessage = [...messages].reverse().find(m => m.is_pinned)
  const isAdmin = conversation.members?.find(m => m.user_id === currentUser.id)?.role === 'admin'

  useEffect(() => {
    supabase
      .from('conversation_members')
      .select('is_muted')
      .eq('conversation_id', conversation.id)
      .eq('user_id', currentUser.id)
      .single()
      .then(({ data }) => setIsMuted(data?.is_muted ?? false))
  }, [conversation.id, currentUser.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const toggleMute = async () => {
    const newMuted = !isMuted
    await supabase
      .from('conversation_members')
      .update({ is_muted: newMuted })
      .eq('conversation_id', conversation.id)
      .eq('user_id', currentUser.id)
    setIsMuted(newMuted)
  }

  const togglePanel = (panel: Panel) => {
    setActivePanel(prev => prev === panel ? null : panel)
  }

  const saveAnnouncement = async () => {
    await supabase
      .from('conversations')
      .update({ announcement: announcementDraft })
      .eq('id', conversation.id)
    setAnnouncement(announcementDraft)
    setShowAnnouncementEdit(false)
  }

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('bg-yellow-50')
      setTimeout(() => el.classList.remove('bg-yellow-50'), 2000)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 flex-shrink-0">
        {onBack && (
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700 mr-1">
            <ChevronDown size={20} className="rotate-90" />
          </button>
        )}
        <div className="flex-1">
          <h2 className="font-bold text-base">{conversation.name || 'トーク'}</h2>
          <p className="text-xs text-gray-400">{members.length}人</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => togglePanel('album')}
            className={`p-2 rounded-full transition-colors ${activePanel === 'album' ? 'bg-line-green text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            title="アルバム"
          >
            <Image size={18} />
          </button>
          <button
            onClick={() => togglePanel('files')}
            className={`p-2 rounded-full transition-colors ${activePanel === 'files' ? 'bg-line-green text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            title="ファイル"
          >
            <Paperclip size={18} />
          </button>
          <button
            onClick={() => togglePanel('note')}
            className={`p-2 rounded-full transition-colors ${activePanel === 'note' ? 'bg-line-green text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            title="ノート"
          >
            <FileText size={18} />
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => { setAnnouncementDraft(announcement); setShowAnnouncementEdit(true) }}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
                title="アナウンス"
              >
                <Megaphone size={18} />
              </button>
              <button
                onClick={() => setShowInviteModal(true)}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
                title="招待リンク"
              >
                <Link size={18} />
              </button>
            </>
          )}
          <button
            onClick={toggleMute}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
            title={isMuted ? 'ミュート解除' : 'ミュート'}
          >
            {isMuted ? <BellOff size={18} className="text-gray-400" /> : <Bell size={18} />}
          </button>
        </div>
      </div>

      {/* Announcement banner */}
      {announcement && showAnnouncementBanner && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center gap-2">
          <Megaphone size={14} className="text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800 flex-1">{announcement}</p>
          <button onClick={() => setShowAnnouncementBanner(false)} className="text-yellow-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Pinned message banner */}
      {pinnedMessage && (
        <div
          className="bg-white border-b px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-50"
          onClick={() => scrollToMessage(pinnedMessage.id)}
        >
          <Pin size={12} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />
          <p className="text-xs text-gray-600 truncate flex-1">
            <span className="font-semibold">{pinnedMessage.sender?.display_name}: </span>
            {pinnedMessage.content}
          </p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Messages area */}
        <div className={`flex flex-col flex-1 overflow-hidden ${activePanel ? 'hidden md:flex' : ''}`}>
          <div className="flex-1 overflow-y-auto py-2">
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.sender_id === currentUser.id}
                currentUserId={currentUser.id}
                memberMap={memberMap}
                onEdit={editMessage}
                onDelete={deleteMessage}
                onForward={setForwardMsg}
                onPin={(id, pinned) => pinMessage(id, pinned)}
                onKeep={addKeep}
                onReply={setReplyTo}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
          <MessageInput
            conversationId={conversation.id}
            members={members}
            replyTo={replyTo}
            onClearReply={() => setReplyTo(null)}
            onSend={sendMessage}
          />
        </div>

        {/* Side panel */}
        {activePanel && (
          <div className="w-full md:w-80 border-l bg-white flex-shrink-0 overflow-hidden">
            {activePanel === 'album' && (
              <AlbumPanel conversationId={conversation.id} onClose={() => setActivePanel(null)} />
            )}
            {activePanel === 'files' && (
              <FileListPanel conversationId={conversation.id} onClose={() => setActivePanel(null)} />
            )}
            {activePanel === 'note' && (
              <GroupNotePanel
                conversationId={conversation.id}
                currentUserId={currentUser.id}
                onClose={() => setActivePanel(null)}
              />
            )}
          </div>
        )}
      </div>

      {/* Announcement edit modal */}
      {showAnnouncementEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">アナウンス編集</h3>
              <button onClick={() => setShowAnnouncementEdit(false)}><X size={20} /></button>
            </div>
            <textarea
              value={announcementDraft}
              onChange={e => setAnnouncementDraft(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-line-green"
              rows={4}
              placeholder="アナウンスメッセージを入力..."
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowAnnouncementEdit(false)}
                className="flex-1 py-2 border rounded-full text-gray-600 font-semibold"
              >
                キャンセル
              </button>
              <button
                onClick={saveAnnouncement}
                className="flex-1 py-2 bg-line-green text-white rounded-full font-semibold"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite link modal */}
      {showInviteModal && (
        <InviteLinkModal
          conversationId={conversation.id}
          currentUserId={currentUser.id}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* Forward modal */}
      {forwardMsg && (
        <ForwardModal
          message={forwardMsg}
          currentUserId={currentUser.id}
          onForward={forwardMessage}
          onClose={() => setForwardMsg(null)}
        />
      )}
    </div>
  )
}
