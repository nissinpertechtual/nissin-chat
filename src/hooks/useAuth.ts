import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { useAppStore } from '../services/store'

const db = supabase as any

export const useAuth = () => {
  const [loading, setLoading] = useState(true)
  const { currentUser, setCurrentUser } = useAppStore()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }: any) => {
      if (session?.user) await fetchOrCreateUser(session.user)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        if (event === 'SIGNED_IN' && session?.user) await fetchOrCreateUser(session.user)
        else if (event === 'SIGNED_OUT') { setCurrentUser(null); setLoading(false) }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const fetchOrCreateUser = async (user: any) => {
    try {
      const { data } = await db.from('users').select('*').eq('id', user.id).maybeSingle()
      if (data) {
        setCurrentUser(data)
      } else {
        const email = user.email || ''
        const displayName = user.user_metadata?.display_name || email.split('@')[0] || 'ユーザー'
        const { data: newUser } = await db.from('users').insert({
          id: user.id,
          email,
          display_name: displayName,
        }).select().single()
        if (newUser) setCurrentUser(newUser)
      }
    } catch (err) {
      console.error('User fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
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
