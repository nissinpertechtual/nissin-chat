import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import type { Message } from '../types'

export function useMessages(conversationId: string | null, currentUserId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return
    setLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles(*), reply_to:messages(*, sender:profiles(*))')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setLoading(false)
  }, [conversationId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    if (!conversationId) return

    const msgChannel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          supabase
            .from('messages')
            .select('*, sender:profiles(*), reply_to:messages(*, sender:profiles(*))')
            .eq('id', payload.new.id)
            .single()
            .then(({ data }) => {
              if (data) setMessages(prev => [...prev, data])
            })
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m =>
            m.id === payload.new.id ? { ...m, ...payload.new } : m
          ))
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id))
        }
      })
      .subscribe()

    const voteChannel = supabase
      .channel(`poll_votes:${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'poll_votes',
      }, () => {
        fetchMessages()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(voteChannel)
    }
  }, [conversationId, fetchMessages])

  const sendMessage = useCallback(async (
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
  ) => {
    if (!conversationId) return

    if (options?.scheduledAt) {
      await supabase.from('scheduled_messages').insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content,
        scheduled_at: options.scheduledAt,
        sent: false,
      })
      return
    }

    const { data: msg } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content,
      message_type: options?.messageType || 'text',
      file_url: options?.fileUrl,
      file_name: options?.fileName,
      file_size: options?.fileSize,
      reply_to_id: options?.replyToId,
    }).select().single()

    if (msg && options?.messageType === 'poll' && options.pollData) {
      await supabase.from('polls').insert({
        message_id: msg.id,
        question: options.pollData.question,
        options: options.pollData.options,
      })
    }

    if (msg && options?.mentionedUserIds?.length) {
      await supabase.from('mentions').insert(
        options.mentionedUserIds.map(uid => ({
          message_id: msg.id,
          mentioned_user_id: uid,
        }))
      )
    }
  }, [conversationId, currentUserId])

  const editMessage = useCallback(async (message: Message) => {
    await supabase
      .from('messages')
      .update({ content: message.content, updated_at: new Date().toISOString() })
      .eq('id', message.id)
      .eq('sender_id', currentUserId)
  }, [currentUserId])

  const deleteMessage = useCallback(async (messageId: string) => {
    await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', currentUserId)
  }, [currentUserId])

  const pinMessage = useCallback(async (messageId: string, isPinned: boolean) => {
    await supabase
      .from('messages')
      .update({ is_pinned: isPinned })
      .eq('id', messageId)
  }, [])

  const addKeep = useCallback(async (messageId: string) => {
    await supabase.from('keeps').upsert({
      user_id: currentUserId,
      message_id: messageId,
    }, { onConflict: 'user_id,message_id', ignoreDuplicates: true })
  }, [currentUserId])

  const forwardMessage = useCallback(async (message: Message, targetConvId: string) => {
    await supabase.from('messages').insert({
      conversation_id: targetConvId,
      sender_id: currentUserId,
      content: message.content,
      message_type: message.message_type,
      file_url: message.file_url,
      file_name: message.file_name,
      file_size: message.file_size,
    })
  }, [currentUserId])

  return { messages, loading, sendMessage, editMessage, deleteMessage, pinMessage, addKeep, forwardMessage, refetch: fetchMessages }
}
