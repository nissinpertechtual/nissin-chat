import { useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { useAppStore } from '../services/store'
import type { Conversation, Message, Profile } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export const useConversations = () => {
  const { currentUser, setConversations, updateConversation, conversations } = useAppStore()

  const fetchConversations = useCallback(async () => {
    if (!currentUser) return
    try {
      const { data: memberData, error: memberError } = await db
        .from('conversation_members')
        .select('conversation_id, last_read_at')
        .eq('user_id', currentUser.id)

      if (memberError) {
        console.error('conversation_members fetch error:', memberError)
        // last_read_atが無い場合はカラムなしで再試行
        const { data: memberDataFallback } = await db
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', currentUser.id)
        if (!memberDataFallback?.length) { setConversations([]); return }
        await fetchConvsFromIds(memberDataFallback.map((m: any) => m.conversation_id), [])
        return
      }

      if (!memberData?.length) { setConversations([]); return }
      await fetchConvsFromIds(
        memberData.map((m: any) => m.conversation_id),
        memberData
      )
    } catch (err) { console.error('Error fetching conversations:', err) }
  }, [currentUser, setConversations])

  const fetchConvsFromIds = async (convIds: string[], memberData: any[]) => {
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

        // unread count: last_read_atがあれば使う、なければ0
        let unreadCount = 0
        try {
          const memberRecord = memberData.find((m: any) => m.conversation_id === conv.id)
          const lastReadAt = memberRecord?.last_read_at
          if (lastReadAt) {
            const { count } = await db.from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .neq('sender_id', currentUser!.id)
              .gt('created_at', lastReadAt)
            unreadCount = count || 0
          }
        } catch (_) { unreadCount = 0 }

        return { ...conv, members: profiles, last_message: lastMessage || null, unread_count: unreadCount } as Conversation
      })
    )

    enrichedConvs.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.updated_at
      const bTime = b.last_message?.created_at || b.updated_at
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })
    setConversations(enrichedConvs)
  }

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
    const now = new Date().toISOString()
    try {
      await db.from('conversation_members')
        .update({ last_read_at: now })
        .eq('conversation_id', conversationId)
        .eq('user_id', currentUser.id)
    } catch (_) { /* last_read_atカラムがない場合は無視 */ }
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
