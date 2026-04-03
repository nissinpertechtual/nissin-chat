import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import { X, Save } from 'lucide-react'

interface Props {
  conversationId: string
  currentUserId: string
  onClose: () => void
}

export function GroupNotePanel({ conversationId, currentUserId, onClose }: Props) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('group_notes')
      .select('*')
      .eq('conversation_id', conversationId)
      .single()
      .then(({ data }) => {
        if (data) {
          setContent(data.content || '')
          setLastUpdated(data.updated_at)
        }
      })

    const channel = supabase
      .channel(`group_notes:${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_notes',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        if (payload.new) {
          setContent((payload.new as any).content || '')
          setLastUpdated((payload.new as any).updated_at)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('group_notes').upsert({
      conversation_id: conversationId,
      content,
      updated_by: currentUserId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'conversation_id' })
    setSaving(false)
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-bold text-lg">ノート</h3>
        <button onClick={onClose}><X size={20} /></button>
      </div>
      <div className="flex-1 p-4 flex flex-col gap-3">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          className="flex-1 border rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-line-green text-sm"
          placeholder="グループノートを入力..."
        />
        {lastUpdated && (
          <p className="text-xs text-gray-400">
            最終更新: {new Date(lastUpdated).toLocaleString('ja-JP')}
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-line-green text-white py-2 rounded-full font-semibold disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}
