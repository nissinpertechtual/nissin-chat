import { useState, useEffect } from 'react'
import { Sidebar } from '../components/sidebar/Sidebar'
import { ChatWindow } from '../components/chat/ChatWindow'
import { useAppStore } from '../services/store'
import { useConversations } from '../hooks/useConversations'
import { supabase } from '../services/supabase'
import { MessageCircle, Plus, X, Search } from 'lucide-react'
import type { Conversation, User, Profile } from '../types'

const db = supabase as any

export const ChatLayout = () => {
  const { currentUser, activeConversationId, setActiveConversationId, conversations, totalUnread } = useAppStore()
  const { createDirectMessage, createGroupConversation, markAsRead } = useConversations()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const [showNewChat, setShowNewChat] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

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
      if (conv) {
        markAsRead(activeConversationId)
        db.from('conversation_members')
          .select('user_id, profiles(*)')
          .eq('conversation_id', conv.id)
          .then(({ data }: any) => {
            const users = (data || []).map((d: any) => d.profiles).filter(Boolean) as User[]
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

  const handleNewChat = async () => {
    setLoadingUsers(true)
    setShowNewChat(true)
    const { data } = await db.from('profiles').select('*').neq('id', currentUser?.id).order('display_name')
    setAllUsers(data || [])
    setLoadingUsers(false)
  }

  const handleStartDM = async (targetUser: Profile) => {
    setShowNewChat(false)
    const convId = await createDirectMessage(targetUser.id)
    if (convId) setActiveConversationId(convId)
  }

  const filteredUsers = allUsers.filter(u =>
    u.display_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(userSearch.toLowerCase())
  )

  const user = currentUser as unknown as User | null
  if (!user) return null

  const sidebarEl = (
    <Sidebar
      conversations={conversations}
      currentUser={user}
      selectedId={activeConversationId}
      onSelect={handleSelect}
      onNewChat={handleNewChat}
    />
  )

  const emptyState = (
    <div className="h-full flex flex-col items-center justify-center text-gray-400">
      <div className="w-24 h-24 bg-white rounded-3xl shadow-lg flex items-center justify-center mb-4">
        <MessageCircle className="w-12 h-12 text-line-green" fill="currentColor" />
      </div>
      <h2 className="text-xl font-semibold text-gray-600 mb-2">NissinChat</h2>
      <p className="text-sm text-gray-400 mb-6">左のトーク一覧からチャットを選択</p>
      <button
        onClick={handleNewChat}
        className="flex items-center gap-2 px-5 py-2.5 bg-line-green text-white rounded-full text-sm font-semibold hover:bg-green-600 transition-colors shadow"
      >
        <Plus size={16} /> 新しいトークを開始
      </button>
    </div>
  )

  return (
    <>
      {isMobile ? (
        <div className="h-screen w-screen overflow-hidden bg-white">
          <div className={`absolute inset-0 z-10 transition-transform duration-300 ${
            activeConversationId ? '-translate-x-full' : 'translate-x-0'
          }`}>
            {sidebarEl}
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
      ) : (
        <div className="h-screen w-screen overflow-hidden flex bg-gray-100">
          <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white shadow-sm">
            {sidebarEl}
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
            ) : emptyState}
          </div>
        </div>
      )}

      {/* 新規チャットモーダル */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="font-bold text-base">新しいトーク</h2>
              <button onClick={() => setShowNewChat(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-3 border-b">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
                <Search size={16} className="text-gray-400" />
                <input
                  autoFocus
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="名前で検索"
                  className="bg-transparent text-sm flex-1 outline-none"
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-72">
              {loadingUsers ? (
                <div className="text-center py-8 text-gray-400 text-sm">読み込み中...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">ユーザーが見つかりません</div>
              ) : filteredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => handleStartDM(u)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-line-green flex items-center justify-center text-white font-bold flex-shrink-0">
                    {u.display_name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{u.display_name}</p>
                    {u.username && <p className="text-xs text-gray-400">@{u.username}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
