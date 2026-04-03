import { useEffect, useState } from 'react'
import { supabase } from './services/supabase'
import { AuthPage } from './pages/AuthPage'
import { ChatLayout } from './pages/ChatLayout'
import { JoinPage } from './pages/JoinPage'
import type { User } from './types'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const path = window.location.pathname
  const joinMatch = path.match(/^\/join\/([a-f0-9-]+)$/)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setUser(data)
            setLoading(false)
          })
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setUser(data))
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-line-green"></div>
      </div>
    )
  }

  if (joinMatch) {
    return <JoinPage token={joinMatch[1]} user={user} />
  }

  if (!user) {
    return <AuthPage onLogin={setUser} />
  }

  return <ChatLayout user={user} />
}
