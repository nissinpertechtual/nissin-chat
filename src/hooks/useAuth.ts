import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { useAppStore } from '../services/store'

export const useAuth = () => {
  const [loading, setLoading] = useState(true)
  const setCurrentUser = useAppStore(state => state.setCurrentUser)
  const currentUser = useAppStore(state => state.currentUser)

  useEffect(() => {
    let mounted = true

    const fetchProfile = async (userId: string, email: string, meta: any) => {
      try {
        const { data } = await (supabase as any)
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()

        if (!mounted) return

        if (data) {
          setCurrentUser(data)
          return
        }

        // プロフィールがなければ作成
        const username = (email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || ('user' + Date.now())
        const displayName = meta?.display_name || (email || '').split('@')[0] || 'ユーザー'
        const { data: np } = await (supabase as any)
          .from('profiles')
          .insert({ id: userId, username, display_name: displayName, status: 'online', last_seen: new Date().toISOString() })
          .select()
          .single()
        if (mounted && np) setCurrentUser(np)
      } catch (err) {
        console.error('[useAuth] fetchProfile error:', err)
      }
    }

    // まず現在のセッションを取得
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      const session = data?.session
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email || '', session.user.user_metadata)
      }
      if (mounted) setLoading(false)
    }).catch((err) => {
      console.error('[useAuth] getSession error:', err)
      if (mounted) setLoading(false)
    })

    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      console.log('[useAuth] auth event:', event)
      if (event === 'SIGNED_IN' && session?.user) {
        await fetchProfile(session.user.id, session.user.email || '', session.user.user_metadata)
        if (mounted) setLoading(false)
      } else if (event === 'SIGNED_OUT') {
        if (mounted) { setCurrentUser(null); setLoading(false) }
      }
    })

    // 5秒タイムアウト保険
    const timeout = setTimeout(() => {
      console.warn('[useAuth] 5s timeout - forcing loading=false')
      if (mounted) setLoading(false)
    }, 5000)

    return () => {
      mounted = false
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
