import { useState, useEffect } from 'react'
import { Sidebar } from '../components/sidebar/Sidebar'
import { ChatWindow } from '../components/chat/ChatWindow'
import { useAppStore } from '../services/store'
import { MessageCircle } from 'lucide-react'

export const ChatLayout = () => {
  const { activeConversationId, setActiveConversationId, isMobileSidebarOpen, setMobileSidebarOpen, totalUnread } = useAppStore()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Update document title with unread count
  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) NissinChat` : 'NissinChat'
  }, [totalUnread])

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id)
    if (isMobile) setMobileSidebarOpen(false)
  }

  const handleBack = () => {
    setActiveConversationId(null)
    setMobileSidebarOpen(true)
  }

  // Mobile: show sidebar OR chat
  if (isMobile) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-white">
        {/* Sidebar (mobile) */}
        <div
          className={`absolute inset-0 z-10 transition-transform duration-300 ${
            activeConversationId ? '-translate-x-full' : 'translate-x-0'
          }`}
        >
          <Sidebar onSelectConversation={handleSelectConversation} />
        </div>

        {/* Chat window (mobile) */}
        {activeConversationId && (
          <div className="absolute inset-0 z-20 animate-slide-in-right">
            <ChatWindow
              key={activeConversationId}
              conversationId={activeConversationId}
              onBack={handleBack}
            />
          </div>
        )}
      </div>
    )
  }

  // Desktop: 2-column layout
  return (
    <div className="h-screen w-screen overflow-hidden flex bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 relative bg-white shadow-sm">
        <Sidebar onSelectConversation={handleSelectConversation} />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {activeConversationId ? (
          <ChatWindow
            key={activeConversationId}
            conversationId={activeConversationId}
            onBack={handleBack}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-line-chat-bg">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-lg flex items-center justify-center mb-4">
              <MessageCircle className="w-12 h-12 text-line-green" fill="currentColor" />
            </div>
            <h2 className="text-xl font-semibold text-gray-600 mb-2">NissinChat</h2>
            <p className="text-sm text-gray-400">左のトーク一覧からチャットを選択してください</p>
          </div>
        )}
      </div>
    </div>
  )
}
