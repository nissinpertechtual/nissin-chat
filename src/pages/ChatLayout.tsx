import { useState, useEffect } from 'react'
import { Sidebar } from '../components/sidebar/Sidebar'
import { ChatWindow } from '../components/chat/ChatWindow'
import { useAppStore } from '../services/store'
import { useConversations } from '../hooks/useConversations'
import { supabase } from '../services/supabase'
import { MessageCircle } from 'lucide-react'
import type { Conversation, User } from '../types'

export const ChatLayout = () => {
  const { currentUser, activeConversationId, setActiveConversationId, conversations, totalUnread } = useAppStore()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [members, setMembers] = useState<User[]>([])

  useConversations()

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) NissinChat` : 'NissinChat'
  }, [totalUnread])

  useEffect(() => {
    if (activeConversationId) {
      const conv = conversations.find(c => c.id === activeConversationId) || null
      setSelectedConv(conv)

      // Fetch members
      if (conv) {
        supabase
          .from('conversation_members')
          .select('user_id, profiles(*)')
          .eq('conversation_id', conv.id)
          .then(({ data }) => {
            const users = (data || []).map((d: any) => d.users).filter(Boolean) as User[]
            setMembers(users)
          })
      }
    } else {
      setSelectedConv(null)
      setMembers([])
    }
  }, [activeConversationId, conversations])

  const handleSelect = (conv: Conversation) => {
    setActiveConversationId(conv.id)
  }

  const handleBack = () => {
    setActiveConversationId(null)
  }

  const user = currentUser as unknown as User | null
  if (!user) return null

  if (isMobile) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-white">
        <div className={`absolute inset-0 z-10 transition-transform duration-300 ${
          activeConversationId ? '-translate-x-full' : 'translate-x-0'
        }`}>
          <Sidebar
            conversations={conversations}
            currentUser={user}
            selectedId={activeConversationId}
            onSelect={handleSelect}
          />
        </div>
        {activeConversationId && selectedConv && (
          <div className="absolute inset-0 z-20">
            <ChatWindow
              key={activeConversationId}
              conversation={selectedConv}
              currentUser={user}
              members={members}
              onBack={handleBack}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-gray-100">
      <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white shadow-sm">
        <Sidebar
          conversations={conversations}
          currentUser={user}
          selectedId={activeConversationId}
          onSelect={handleSelect}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        {activeConversationId && selectedConv ? (
          <ChatWindow
            key={activeConversationId}
            conversation={selectedConv}
            currentUser={user}
            members={members}
            onBack={handleBack}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-lg flex items-center justify-center mb-4">
              <MessageCircle className="w-12 h-12 text-line-green" fill="currentColor" />
            </div>
            <h2 className="text-xl font-semibold text-gray-600 mb-2">NissinChat</h2>
            <p className="text-sm text-gray-400">左のトーク一覧からチャットを選択</p>
          </div>
        )}
      </div>
    </div>
  )
}
