import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import { X, Search } from 'lucide-react'
import type { Conversation, Message } from '../../types'

interface Props {
  message: Message
  currentUserId: string
  onForward: (message: Message, targetConvId: string) => Promise<void>
  onClose: () => void
}

export function ForwardModal({ message, currentUserId, onForward, onClose }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [search, setSearch] = useState('')
  const [forwarding, setForwarding] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('conversation_members')
      .select('conversation:conversations(*)')
      .eq('user_id', currentUserId)
      .then(({ data }) => {
        const convs = data?.map((d: any) => d.conversation).filter(Boolean) || []
        setConversations(convs)
      })
  }, [currentUserId])

  const filtered = conversations.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleForward = async (convId: string) => {
    setForwarding(convId)
    await onForward(message, convId)
    setForwarding(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-lg">転送</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-3 border-b">
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-2">
            <Search size={16} className="text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="トークを検索..."
              className="bg-transparent flex-1 text-sm focus:outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(conv => (
            <button
              key={conv.id}
              onClick={() => handleForward(conv.id)}
              disabled={forwarding === conv.id}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left disabled:opacity-50"
            >
              <div className="w-10 h-10 bg-line-green rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                {(conv.name || 'G')[0]}
              </div>
              <span className="text-sm font-medium">{conv.name || 'グループ'}</span>
              {forwarding === conv.id && (
                <span className="ml-auto text-xs text-gray-400">送信中...</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
