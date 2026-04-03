import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { useAppStore } from '../services/store'

const db = supabase as any

export const useAuth = () => {
  const [loading, setLoading] = useState(true)
  const { currentUser, setCurrentUser } = useAppStore()

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          await fetchOrCreateProfile(session.user)
        }
      } catch (err) {
        console.error('Auth init error:', err)
      } finally {
        setLoading(false)
      }
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchOrCreateProfile(session.user)
          setLoading(false)
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null)
          setLoading(false)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const fetchOrCreateProfile = async (user: any) => {
    try {
      const { data, error } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (data) {
        setCurrentUser(data)
      } else {
        const email = user.email || ''
        const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || ('user' + Date.now())
        const displayName = user.user_metadata?.display_name || email.split('@')[0] || 'ユーザー'
        const { data: newProfile } = await db.from('profiles').insert({
          id: user.id,
          email,
          username,
          display_name: displayName,
          status: 'online',
          last_seen: new Date().toISOString(),
        }).select().single()
        if (newProfile) setCurrentUser(newProfile)
      }
    } catch (err) {
      console.error('fetchOrCreateProfile error:', err)
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
