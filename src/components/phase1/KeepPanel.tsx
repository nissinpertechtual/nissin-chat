import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import { Bookmark, ExternalLink } from 'lucide-react'

interface Props {
  currentUserId: string
  onJumpToConversation?: (convId: string, msgId: string) => void
}

interface KeepItem {
  id: string
  message_id: string
  created_at: string
  message?: {
    id: string
    content: string
    message_type: string
    conversation_id: string
    created_at: string
    sender?: { display_name: string }
  }
}

export function KeepPanel({ currentUserId, onJumpToConversation }: Props) {
  const [keeps, setKeeps] = useState<KeepItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('keeps')
      .select('*, message:messages(id, content, message_type, conversation_id, created_at, sender:profiles(display_name))')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setKeeps((data as unknown as KeepItem[]) || [])
        setLoading(false)
      })
  }, [currentUserId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400">
        読み込み中...
      </div>
    )
  }

  if (keeps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-60 text-gray-400 gap-3">
        <Bookmark size={40} className="opacity-30" />
        <p className="text-sm">保存したメッセージはありません</p>
        <p className="text-xs text-gray-300">メッセージを長押しして「Keep」を選択</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {keeps.map(keep => (
        <div key={keep.id} className="bg-white rounded-xl border p-3 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-gray-600">
                  {keep.message?.sender?.display_name || '不明'}
                </span>
                <span className="text-xs text-gray-400">
                  {keep.message?.created_at
                    ? new Date(keep.message.created_at).toLocaleDateString('ja-JP')
                    : ''}
                </span>
              </div>
              <p className="text-sm text-gray-700 line-clamp-2">
                {keep.message?.message_type === 'image' ? '📷 画像' :
                 keep.message?.message_type === 'file' ? '📎 ファイル' :
                 keep.message?.message_type === 'voice' ? '🎤 音声メッセージ' :
                 keep.message?.content || ''}
              </p>
            </div>
            {onJumpToConversation && keep.message && (
              <button
                onClick={() => onJumpToConversation(keep.message!.conversation_id, keep.message!.id)}
                className="text-gray-400 hover:text-line-green flex-shrink-0"
              >
                <ExternalLink size={16} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
