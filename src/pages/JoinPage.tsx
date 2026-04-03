import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import type { User } from '../types'

interface Props {
  token: string
  user: User | null
}

export function JoinPage({ token, user }: Props) {
  const [status, setStatus] = useState<'loading' | 'joining' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [convId, setConvId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setStatus('error')
      setMessage('ログインが必要です。ログイン後に再度リンクにアクセスしてください。')
      return
    }

    const processInvite = async () => {
      setStatus('joining')

      const { data: invite, error: inviteError } = await supabase
        .from('conversation_invites')
        .select('*')
        .eq('token', token)
        .single()

      if (inviteError || !invite) {
        setStatus('error')
        setMessage('招待リンクが無効です。')
        return
      }

      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        setStatus('error')
        setMessage('招待リンクの有効期限が切れています。')
        return
      }

      const { error: memberError } = await supabase
        .from('conversation_members')
        .upsert({
          conversation_id: invite.conversation_id,
          user_id: user.id,
          role: 'member',
        }, { onConflict: 'conversation_id,user_id', ignoreDuplicates: true })

      if (memberError) {
        setStatus('error')
        setMessage('グループへの参加に失敗しました。')
        return
      }

      setConvId(invite.conversation_id)
      setStatus('success')
      setMessage('グループに参加しました！')

      setTimeout(() => {
        window.location.href = `/?conv=${invite.conversation_id}`
      }, 2000)
    }

    processInvite()
  }, [token, user])

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <div className="text-4xl mb-4">
          {status === 'loading' && '⏳'}
          {status === 'joining' && '🔄'}
          {status === 'success' && '✅'}
          {status === 'error' && '❌'}
        </div>
        <h2 className="text-xl font-bold mb-2">
          {status === 'loading' && '確認中...'}
          {status === 'joining' && '参加中...'}
          {status === 'success' && '参加完了'}
          {status === 'error' && 'エラー'}
        </h2>
        <p className="text-gray-500">{message}</p>
        {status === 'success' && (
          <p className="text-sm text-gray-400 mt-2">リダイレクト中...</p>
        )}
        {status === 'error' && !user && (
          <a
            href="/"
            className="mt-4 inline-block bg-line-green text-white px-6 py-2 rounded-full font-semibold"
          >
            ログインへ
          </a>
        )}
      </div>
    </div>
  )
}
