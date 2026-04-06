$base = "C:\Users\k.morita\nissin-chat\chat-app\src"

# useAuth.ts
Set-Content -Path "$base\hooks\useAuth.ts" -Encoding UTF8 -Value @'
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { useAppStore } from '../services/store'

export const useAuth = () => {
  const [loading, setLoading] = useState(true)
  const setCurrentUser = useAppStore(state => state.setCurrentUser)
  const currentUser = useAppStore(state => state.currentUser)

  useEffect(() => {
    let mounted = true

    const makeMinimalUser = (userId: string, email: string, meta: any) => ({
      id: userId,
      display_name: meta?.display_name || (email || '').split('@')[0] || 'ユーザー',
      username: (email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'user',
      email,
      status: 'online',
      created_at: new Date().toISOString(),
    } as any)

    const fetchProfile = async (userId: string, email: string, meta: any) => {
      try {
        const { data, error } = await (supabase as any)
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()
        if (!mounted) return
        if (error) { console.error('[useAuth] profiles error:', error.message); setCurrentUser(makeMinimalUser(userId, email, meta)); return }
        if (data) { setCurrentUser(data); return }
        const username = (email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || ('user' + Date.now())
        const displayName = meta?.display_name || (email || '').split('@')[0] || 'ユーザー'
        const { data: np, error: ie } = await (supabase as any)
          .from('profiles')
          .insert({ id: userId, username, display_name: displayName, status: 'online', last_seen: new Date().toISOString() })
          .select().single()
        if (!mounted) return
        if (np) setCurrentUser(np)
        else { console.error('[useAuth] insert error:', ie?.message); setCurrentUser(makeMinimalUser(userId, email, meta)) }
      } catch (err: any) {
        console.error('[useAuth] threw:', err?.message)
        if (mounted) setCurrentUser(makeMinimalUser(userId, email, meta))
      }
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      const session = data?.session
      if (session?.user) await fetchProfile(session.user.id, session.user.email || '', session.user.user_metadata)
      if (mounted) setLoading(false)
    }).catch((err) => { console.error('[useAuth] getSession error:', err); if (mounted) setLoading(false) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      if (event === 'SIGNED_IN' && session?.user) {
        await fetchProfile(session.user.id, session.user.email || '', session.user.user_metadata)
        if (mounted) setLoading(false)
      } else if (event === 'SIGNED_OUT') {
        if (mounted) { setCurrentUser(null); setLoading(false) }
      }
    })

    const timeout = setTimeout(() => { if (mounted) setLoading(false) }, 8000)
    return () => { mounted = false; clearTimeout(timeout); subscription.unsubscribe() }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }
  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } })
    if (error) throw error
    return data
  }
  const signOut = async () => { setCurrentUser(null); await supabase.auth.signOut() }
  return { loading, currentUser, signIn, signUp, signOut }
}
'@

# useConversations.ts
Set-Content -Path "$base\hooks\useConversations.ts" -Encoding UTF8 -Value @'
import { useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { useAppStore } from '../services/store'
import type { Conversation, Message, Profile } from '../types'

const db = supabase as any

export const useConversations = () => {
  const { currentUser, setConversations, updateConversation, conversations } = useAppStore()

  const fetchConversations = useCallback(async () => {
    if (!currentUser) return
    try {
      const { data: memberData } = await db
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', currentUser.id)

      if (!memberData?.length) { setConversations([]); return }
      const convIds = memberData.map((m: any) => m.conversation_id)

      const { data: convData } = await db
        .from('conversations').select('*').in('id', convIds).order('updated_at', { ascending: false })

      if (!convData) return

      const enrichedConvs: Conversation[] = await Promise.all(
        convData.map(async (conv: any) => {
          const { data: members } = await db
            .from('conversation_members').select('*, profile:profiles(*)').eq('conversation_id', conv.id)
          const profiles = (members || []).map((m: any) => m.profile as Profile).filter(Boolean)
          const { data: lastMsgData } = await db
            .from('messages').select('*, sender:profiles(*)').eq('conversation_id', conv.id)
            .order('created_at', { ascending: false }).limit(1)
          const lastMessage = lastMsgData?.[0] as Message | undefined
          return { ...conv, members: profiles, last_message: lastMessage || null, unread_count: 0 } as Conversation
        })
      )

      enrichedConvs.sort((a, b) => {
        const aTime = a.last_message?.created_at || a.updated_at
        const bTime = b.last_message?.created_at || b.updated_at
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })
      setConversations(enrichedConvs)
    } catch (err) { console.error('fetchConversations error:', err) }
  }, [currentUser, setConversations])

  const createDirectMessage = async (targetUserId: string): Promise<string | null> => {
    if (!currentUser) return null
    const { data: myConvs } = await db.from('conversation_members').select('conversation_id').eq('user_id', currentUser.id)
    const { data: theirConvs } = await db.from('conversation_members').select('conversation_id').eq('user_id', targetUserId)
    const myIds = new Set((myConvs || []).map((c: any) => c.conversation_id))
    const sharedId = (theirConvs || []).find((c: any) => myIds.has(c.conversation_id))?.conversation_id
    if (sharedId) {
      const { data: conv } = await db.from('conversations').select('*').eq('id', sharedId).eq('is_group', false).single()
      if (conv) return conv.id
    }
    const { data: newConv, error } = await db.from('conversations').insert({ is_group: false, created_by: currentUser.id }).select().single()
    if (error || !newConv) return null
    await db.from('conversation_members').insert([
      { conversation_id: newConv.id, user_id: currentUser.id },
      { conversation_id: newConv.id, user_id: targetUserId },
    ])
    await fetchConversations()
    return newConv.id
  }

  const createGroupConversation = async (name: string, memberIds: string[]): Promise<string | null> => {
    if (!currentUser) return null
    const { data: newConv, error } = await db.from('conversations').insert({ name, is_group: true, created_by: currentUser.id }).select().single()
    if (error || !newConv) return null
    const allMembers = [...new Set([currentUser.id, ...memberIds])]
    await db.from('conversation_members').insert(allMembers.map((uid) => ({ conversation_id: newConv.id, user_id: uid })))
    await fetchConversations()
    return newConv.id
  }

  const markAsRead = async (conversationId: string) => {
    if (!currentUser) return
    updateConversation({ id: conversationId, unread_count: 0 })
  }

  useEffect(() => { fetchConversations() }, [fetchConversations])

  useEffect(() => {
    if (!currentUser) return
    const channel = supabase.channel('conversations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchConversations())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_members', filter: `user_id=eq.${currentUser.id}` }, () => fetchConversations())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentUser, fetchConversations])

  return { conversations, fetchConversations, createDirectMessage, createGroupConversation, markAsRead }
}
'@

# KeepPanel.tsx
Set-Content -Path "$base\components\phase1\KeepPanel.tsx" -Encoding UTF8 -Value @'
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
    ;(supabase as any)
      .from('keeps')
      .select('*, message:messages(id, content, message_type, conversation_id, created_at, sender:profiles(display_name))')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false })
      .then(({ data }: any) => { setKeeps(data || []); setLoading(false) })
  }, [currentUserId])

  if (loading) return <div className="flex items-center justify-center h-40 text-gray-400">読み込み中...</div>
  if (keeps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-60 text-gray-400 gap-3">
        <Bookmark size={40} className="opacity-30" />
        <p className="text-sm">保存したメッセージはありません</p>
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
                <span className="text-xs font-semibold text-gray-600">{keep.message?.sender?.display_name || '不明'}</span>
                <span className="text-xs text-gray-400">{keep.message?.created_at ? new Date(keep.message.created_at).toLocaleDateString('ja-JP') : ''}</span>
              </div>
              <p className="text-sm text-gray-700 line-clamp-2">
                {keep.message?.message_type === 'image' ? '📷 画像' :
                 keep.message?.message_type === 'file' ? '📎 ファイル' :
                 keep.message?.message_type === 'voice' ? '🎤 音声' :
                 keep.message?.content || ''}
              </p>
            </div>
            {onJumpToConversation && keep.message && (
              <button onClick={() => onJumpToConversation(keep.message!.conversation_id, keep.message!.id)} className="text-gray-400 hover:text-line-green flex-shrink-0">
                <ExternalLink size={16} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
'@

Write-Host "完了しました" -ForegroundColor Green
