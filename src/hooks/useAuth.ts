import { useEffect, useRef, useState } from 'react'
import { supabase } from '../services/supabase'
import { useAppStore } from '../services/store'

export const useAuth = () => {
  const [loading, setLoading] = useState(true)
  const setCurrentUser = useAppStore(state => state.setCurrentUser)
  const currentUser = useAppStore(state => state.currentUser)
  const initialized = useRef(false)

  const fetchOrCreateProfile = async (user: any) => {
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.error('[useAuth] fetchProfile error:', error)
        return null
      }

      if (data) {
        setCurrentUser(data)
        return data
      }

      // Profile not found, create one
      const email = user.email || ''
      const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || ('user' + Date.now())
      const displayName = user.user_metadata?.display_name || email.split('@')[0] || 'ユーザー'

      const { data: np, error: insertError } = await (supabase as any)
        .from('profiles')
        .insert({
          id: user.id,
          username,
          display_name: displayName,
          status: 'online',
          last_seen: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) {
        console.error('[useAuth] insertProfile error:', insertError)
        return null
      }

      if (np) setCurrentUser(np)
      return np
    } catch (err) {
      console.error('[useAuth] fetchOrCreateProfile threw:', err)
      return null
    }
  }

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Set a hard timeout so spinner never hangs forever
    const timeout = setTimeout(() => {
      console.warn('[useAuth] timeout - forcing loading=false')
      setLoading(false)
    }, 5000)

    // onAuthStateChange fires INITIAL_SESSION first, which replaces getSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[useAuth] event:', event, 'user:', session?.user?.email)

      if (event === 'INITIAL_SESSION') {
        try {
          if (session?.user) {
            await fetchOrCreateProfile(session.user)
          } else {
            setCurrentUser(null)
          }
        } catch (err) {
          console.error('[useAuth] INITIAL_SESSION handler error:', err)
        } finally {
          clearTimeout(timeout)
          setLoading(false)
        }
      } else if (event === 'SIGNED_IN') {
        try {
          if (session?.user) {
            await fetchOrCreateProfile(session.user)
          }
        } catch (err) {
          console.error('[useAuth] SIGNED_IN handler error:', err)
        } finally {
          setLoading(false)
        }
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
      email,
      password,
      options: { data: { display_name: displayName } },
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
