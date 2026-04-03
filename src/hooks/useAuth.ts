import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { useAppStore } from '../services/store'

const db = supabase as any

export const useAuth = () => {
  const [loading, setLoading] = useState(true)
  const { currentUser, setCurrentUser } = useAppStore()

  useEffect(() => {
    // Always stop loading after 3 seconds max
    const timeout = setTimeout(() => setLoading(false), 3000)

    supabase.auth.getSession().then(async ({ data: { session } }: any) => {
      if (session?.user) {
        try {
          const { data } = await db.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
          if (data) {
            setCurrentUser(data)
          } else {
            const email = session.user.email || ''
            const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || ('user' + Date.now())
            const displayName = session.user.user_metadata?.display_name || email.split('@')[0] || 'ユーザー'
            const { data: np } = await db.from('profiles').insert({
              id: session.user.id,
              username,
              display_name: displayName,
              status: 'online',
              last_seen: new Date().toISOString(),
            }).select().single()
            if (np) setCurrentUser(np)
          }
        } catch (e) {
          console.error('profile error:', e)
        }
      }
      clearTimeout(timeout)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const { data } = await db.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
          if (data) {
            setCurrentUser(data)
          } else {
            const email = session.user.email || ''
            const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || ('user' + Date.now())
            const displayName = session.user.user_metadata?.display_name || email.split('@')[0] || 'ユーザー'
            const { data: np } = await db.from('profiles').insert({
              id: session.user.id,
              username,
              display_name: displayName,
              status: 'online',
              last_seen: new Date().toISOString(),
            }).select().single()
            if (np) setCurrentUser(np)
          }
        } catch (e) {
          console.error('profile error:', e)
        }
        setLoading(false)
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
        setLoading(false)
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: displayName } }
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { loading, currentUser, signIn, signUp, signOut }
}
