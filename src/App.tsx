import { useAuth } from './hooks/useAuth'
import { AuthPage } from './pages/AuthPage'
import { ChatLayout } from './pages/ChatLayout'
import { JoinPage } from './pages/JoinPage'
import { Loader2 } from 'lucide-react'

export default function App() {
  const { loading, currentUser } = useAuth()

  const path = window.location.pathname
  const joinMatch = path.match(/^\/join\/([a-f0-9-]+)$/)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <Loader2 className="animate-spin w-10 h-10 text-line-green" />
      </div>
    )
  }

  if (joinMatch) {
    return <JoinPage token={joinMatch[1]} user={currentUser as any} />
  }

  if (!currentUser) {
    return <AuthPage />
  }

  return <ChatLayout />
}
