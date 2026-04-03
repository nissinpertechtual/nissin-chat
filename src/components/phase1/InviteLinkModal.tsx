import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import { X, Copy, Check } from 'lucide-react'

interface Props {
  conversationId: string
  currentUserId: string
  onClose: () => void
}

export function InviteLinkModal({ conversationId, currentUserId, onClose }: Props) {
  const [inviteUrl, setInviteUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchOrCreateInvite = async () => {
      let { data } = await supabase
        .from('conversation_invites')
        .select('token')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!data) {
        const token = crypto.randomUUID().replace(/-/g, '')
        const { data: newInvite } = await supabase
          .from('conversation_invites')
          .insert({
            conversation_id: conversationId,
            token,
            created_by: currentUserId,
          })
          .select('token')
          .single()
        data = newInvite
      }

      if (data?.token) {
        setInviteUrl(`${window.location.origin}/join/${data.token}`)
      }
      setLoading(false)
    }

    fetchOrCreateInvite()
  }, [conversationId, currentUserId])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">招待リンク</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        {loading ? (
          <div className="text-center py-4 text-gray-400">生成中...</div>
        ) : (
          <>
            <div className="bg-gray-100 rounded-xl p-3 mb-4">
              <p className="text-xs text-gray-500 break-all">{inviteUrl}</p>
            </div>
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 bg-line-green text-white py-2 rounded-full font-semibold"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'コピーしました！' : 'リンクをコピー'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">
              このリンクを共有するとグループに参加できます
            </p>
          </>
        )}
      </div>
    </div>
  )
}
