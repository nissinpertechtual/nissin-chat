import { useRef, useState } from 'react'
import { Send, Paperclip, BarChart2, Clock } from 'lucide-react'
import { MentionInput } from '../phase1/MentionInput'
import { VoiceRecordButton } from '../phase1/VoiceMessage'
import { PollCreateModal } from '../phase1/PollMessage'
import { ScheduledMessageModal } from '../phase1/ScheduledMessageModal'
import { uploadFile } from '../../services/fileUpload'
import type { User, Message } from '../../types'

interface Props {
  conversationId: string
  members: User[]
  replyTo?: Message | null
  onClearReply?: () => void
  onSend: (
    content: string,
    options?: {
      replyToId?: string
      fileUrl?: string
      fileName?: string
      fileSize?: number
      messageType?: 'text' | 'image' | 'file' | 'voice' | 'poll'
      pollData?: { question: string; options: string[] }
      mentionedUserIds?: string[]
      scheduledAt?: string
    }
  ) => Promise<void>
}

export function MessageInput({ conversationId, members, replyTo, onClearReply, onSend }: Props) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [showPollModal, setShowPollModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sendHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const extractMentions = (text: string): string[] => {
    const matches = text.match(/@(\S+)/g) || []
    const names = matches.map(m => m.slice(1))
    return members.filter(m => names.includes(m.display_name)).map(m => m.id)
  }

  const handleSend = async (scheduledAt?: string) => {
    if (!content.trim() && !scheduledAt) return
    setSending(true)
    const mentionedUserIds = extractMentions(content)
    await onSend(content.trim(), {
      replyToId: replyTo?.id,
      mentionedUserIds,
      scheduledAt,
    })
    setContent('')
    onClearReply?.()
    setSending(false)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSending(true)
    const result = await uploadFile(file, conversationId)
    if (result) {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp']
      const msgType = imageExts.includes(ext) ? 'image' : 'file'
      await onSend('', {
        fileUrl: result.url,
        fileName: result.name,
        fileSize: result.size,
        messageType: msgType,
        replyToId: replyTo?.id,
      })
      onClearReply?.()
    }
    setSending(false)
    e.target.value = ''
  }

  const handleVoiceRecorded = async (blob: Blob) => {
    setSending(true)
    const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
    const result = await uploadFile(file, conversationId, 'voice')
    if (result) {
      await onSend('🎤 音声メッセージ', {
        fileUrl: result.url,
        fileName: result.name,
        fileSize: result.size,
        messageType: 'voice',
        replyToId: replyTo?.id,
      })
      onClearReply?.()
    }
    setSending(false)
  }

  const handlePollCreate = async (question: string, options: string[]) => {
    await onSend(`📊 ${question}`, {
      messageType: 'poll',
      pollData: { question, options },
      replyToId: replyTo?.id,
    })
    onClearReply?.()
  }

  const handleSendMouseDown = () => {
    sendHoldRef.current = setTimeout(() => {
      setShowScheduleModal(true)
    }, 600)
  }

  const handleSendMouseUp = () => {
    if (sendHoldRef.current) clearTimeout(sendHoldRef.current)
  }

  const handleSendClick = () => {
    if (!showScheduleModal) handleSend()
  }

  return (
    <div className="border-t bg-white">
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50">
          <div className="flex-1 text-xs text-gray-500 border-l-2 border-line-green pl-2">
            <span className="font-semibold">{replyTo.sender?.display_name}</span>
            <p className="truncate">{replyTo.content}</p>
          </div>
          <button onClick={onClearReply} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}
      <div className="flex items-end gap-2 px-3 py-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full flex-shrink-0"
        >
          <Paperclip size={20} />
        </button>
        <button
          onClick={() => setShowPollModal(true)}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full flex-shrink-0"
        >
          <BarChart2 size={20} />
        </button>
        <VoiceRecordButton onRecorded={handleVoiceRecorded} />
        <MentionInput
          value={content}
          onChange={setContent}
          members={members}
          placeholder="メッセージを入力..."
          onSubmit={handleSend}
          className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-line-green"
        />
        <button
          onMouseDown={handleSendMouseDown}
          onMouseUp={handleSendMouseUp}
          onClick={handleSendClick}
          disabled={!content.trim() || sending}
          className="p-2 bg-line-green text-white rounded-full flex-shrink-0 disabled:opacity-40 transition-opacity"
          title="クリック:送信 / 長押し:予約送信"
        >
          <Send size={20} />
        </button>
      </div>
      {showPollModal && (
        <PollCreateModal
          onCreate={handlePollCreate}
          onClose={() => setShowPollModal(false)}
        />
      )}
      {showScheduleModal && (
        <ScheduledMessageModal
          onSchedule={at => handleSend(at)}
          onClose={() => setShowScheduleModal(false)}
        />
      )}
    </div>
  )
}
