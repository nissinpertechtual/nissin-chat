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
          await fetchOrCreateUser(session.user)
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
        console.log('Auth event:', event)
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchOrCreateUser(session.user)
          setLoading(false)
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null)
          setLoading(false)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const fetchOrCreateUser = async (user: any) => {
    try {
      console.log('Fetching user:', user.id)
      const { data, error } = await db.from('users').select('*').eq('id', user.id).maybeSingle()
      console.log('User data:', data, 'Error:', error)
      if (data) {
        setCurrentUser(data)
      } else {
        const email = user.email || ''
        const displayName = user.user_metadata?.display_name || email.split('@')[0] || 'ユーザー'
        const { data: newUser, error: insertError } = await db.from('users').insert({
          id: user.id,
          email,
          display_name: displayName,
        }).select().single()
        console.log('New user:', newUser, 'Insert error:', insertError)
        if (newUser) setCurrentUser(newUser)
      }
    } catch (err) {
      console.error('fetchOrCreateUser error:', err)
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
