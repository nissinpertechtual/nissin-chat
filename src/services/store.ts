import { create } from 'zustand'
import type { Profile, Conversation, Message, TypingUser } from '../types'

interface AppState {
  // Auth
  currentUser: Profile | null
  setCurrentUser: (user: Profile | null) => void

  // Conversations
  conversations: Conversation[]
  setConversations: (convs: Conversation[]) => void
  updateConversation: (conv: Partial<Conversation> & { id: string }) => void
  activeConversationId: string | null
  setActiveConversationId: (id: string | null) => void

  // Messages
  messages: Record<string, Message[]>
  setMessages: (conversationId: string, messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessage: (message: Partial<Message> & { id: string }) => void

  // Typing
  typingUsers: TypingUser[]
  setTypingUsers: (users: TypingUser[]) => void

  // UI State
  isMobileSidebarOpen: boolean
  setMobileSidebarOpen: (open: boolean) => void
  isRightPanelOpen: boolean
  setRightPanelOpen: (open: boolean) => void
  searchQuery: string
  setSearchQuery: (query: string) => void

  // Unread
  totalUnread: number
  setTotalUnread: (count: number) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  // Conversations
  conversations: [],
  setConversations: (conversations) => {
    const total = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)
    set({ conversations, totalUnread: total })
  },
  updateConversation: (conv) => set((state) => ({
    conversations: state.conversations.map((c) =>
      c.id === conv.id ? { ...c, ...conv } : c
    ),
  })),
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),

  // Messages
  messages: {},
  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
    })),
  addMessage: (message) =>
    set((state) => {
      const existing = state.messages[message.conversation_id] || []
      const alreadyExists = existing.some((m) => m.id === message.id)
      if (alreadyExists) return state
      return {
        messages: {
          ...state.messages,
          [message.conversation_id]: [...existing, message],
        },
      }
    }),
  updateMessage: (message) =>
    set((state) => {
      const msgs = state.messages[message.conversation_id || ''] || []
      return {
        messages: {
          ...state.messages,
          ...(message.conversation_id && {
            [message.conversation_id]: msgs.map((m) =>
              m.id === message.id ? { ...m, ...message } : m
            ),
          }),
        },
      }
    }),

  // Typing
  typingUsers: [],
  setTypingUsers: (typingUsers) => set({ typingUsers }),

  // UI
  isMobileSidebarOpen: false,
  setMobileSidebarOpen: (isMobileSidebarOpen) => set({ isMobileSidebarOpen }),
  isRightPanelOpen: false,
  setRightPanelOpen: (isRightPanelOpen) => set({ isRightPanelOpen }),
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  // Unread
  totalUnread: 0,
  setTotalUnread: (totalUnread) => set({ totalUnread }),
}))
