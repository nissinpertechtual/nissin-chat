import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { useAppStore } from '../services/store'

const db = supabase as any

export const useAuth = () => {
  const [loading, setLoading] = useState(true)
  const setCurrentUser = useAppStore(state => state.setCurrentUser)
  const currentUser = useAppStore(state => state.currentUser)

  const fetchOrCreateProfile = async (user: any) => {
    const { data } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (data) {
      setCurrentUser(data)
      return data
    } else {
      const email = user.email || ''
      const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || ('user' + Date.now())
      const displayName = user.user_metadata?.display_name || email.split('@')[0] || 'ユーザー'
      const { data: np } = await db.from('profiles').insert({
        id: user.id,
        username,
        display_name: displayName,
        status: 'online',
        last_seen: new Date().toISOString(),
      }).select().single()
      if (np) setCurrentUser(np)
      return np
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }: any) => {
      try {
        if (session?.user) await fetchOrCreateProfile(session.user)
      } finally {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          await fetchOrCreateProfile(session.user)
        } finally {
          setLoading(false)
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
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
    setCurrentUser(null)
    await supabase.auth.signOut()
  }

  return { loading, currentUser, signIn, signUp, signOut }
}
