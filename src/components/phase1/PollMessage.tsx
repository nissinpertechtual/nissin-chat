import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import { X } from 'lucide-react'

interface Poll {
  id: string
  question: string
  options: string[]
}

interface PollVote {
  user_id: string
  option_index: number
}

interface PollMessageProps {
  messageId: string
  currentUserId: string
}

export function PollMessage({ messageId, currentUserId }: PollMessageProps) {
  const [poll, setPoll] = useState<Poll | null>(null)
  const [votes, setVotes] = useState<PollVote[]>([])
  const [myVote, setMyVote] = useState<number | null>(null)
  const [voting, setVoting] = useState(false)

  useEffect(() => {
    supabase
      .from('polls')
      .select('*')
      .eq('message_id', messageId)
      .single()
      .then(({ data }) => setPoll(data))

    supabase
      .from('poll_votes')
      .select('user_id, option_index')
      .then(({ data }) => {
        if (data) {
          setVotes(data)
          const mine = data.find((v: PollVote) => v.user_id === currentUserId)
          if (mine) setMyVote(mine.option_index)
        }
      })
  }, [messageId, currentUserId])

  const handleVote = async (optionIndex: number) => {
    if (!poll || voting) return
    setVoting(true)

    if (myVote === optionIndex) {
      await supabase.from('poll_votes').delete().eq('poll_id', poll.id).eq('user_id', currentUserId)
      setMyVote(null)
      setVotes(prev => prev.filter(v => v.user_id !== currentUserId))
    } else {
      await supabase.from('poll_votes').upsert({
        poll_id: poll.id,
        user_id: currentUserId,
        option_index: optionIndex,
      }, { onConflict: 'poll_id,user_id' })
      setMyVote(optionIndex)
      setVotes(prev => {
        const filtered = prev.filter(v => v.user_id !== currentUserId)
        return [...filtered, { user_id: currentUserId, option_index: optionIndex }]
      })
    }

    setVoting(false)
  }

  if (!poll) return <div className="text-sm text-gray-400">投票を読み込み中...</div>

  const totalVotes = votes.length

  return (
    <div className="min-w-[200px] max-w-[280px]">
      <p className="font-semibold text-sm mb-3">{poll.question}</p>
      <div className="flex flex-col gap-2">
        {poll.options.map((option, idx) => {
          const count = votes.filter(v => v.option_index === idx).length
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
          const isSelected = myVote === idx

          return (
            <button
              key={idx}
              onClick={() => handleVote(idx)}
              disabled={voting}
              className={`relative text-left rounded-xl overflow-hidden border-2 px-3 py-2 transition-all ${
                isSelected ? 'border-white' : 'border-white border-opacity-40'
              }`}
            >
              <div
                className="absolute inset-0 bg-white bg-opacity-25 transition-all"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between">
                <span className="text-sm">{option}</span>
                <span className="text-xs opacity-75">{pct}%</span>
              </div>
            </button>
          )
        })}
      </div>
      <p className="text-xs opacity-60 mt-2">{totalVotes}票</p>
    </div>
  )
}

interface PollCreateModalProps {
  onCreate: (question: string, options: string[]) => void
  onClose: () => void
}

export function PollCreateModal({ onCreate, onClose }: PollCreateModalProps) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])

  const addOption = () => {
    if (options.length < 6) setOptions(prev => [...prev, ''])
  }

  const removeOption = (idx: number) => {
    if (options.length <= 2) return
    setOptions(prev => prev.filter((_, i) => i !== idx))
  }

  const updateOption = (idx: number, val: string) => {
    setOptions(prev => prev.map((o, i) => i === idx ? val : o))
  }

  const handleCreate = () => {
    if (!question.trim()) return
    const validOptions = options.filter(o => o.trim())
    if (validOptions.length < 2) return
    onCreate(question.trim(), validOptions)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">投票を作成</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="質問を入力..."
          className="w-full border rounded-xl px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-line-green text-sm"
        />
        <p className="text-xs text-gray-500 font-semibold mb-2">選択肢</p>
        <div className="flex flex-col gap-2 mb-3">
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                value={opt}
                onChange={e => updateOption(idx, e.target.value)}
                placeholder={`選択肢 ${idx + 1}`}
                className="flex-1 border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-line-green text-sm"
              />
              {options.length > 2 && (
                <button onClick={() => removeOption(idx)} className="text-gray-400 hover:text-red-500">
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 6 && (
          <button
            onClick={addOption}
            className="text-line-green text-sm font-semibold mb-4"
          >
            + 選択肢を追加
          </button>
        )}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 border rounded-full text-gray-600 font-semibold"
          >
            キャンセル
          </button>
          <button
            onClick={handleCreate}
            disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
            className="flex-1 py-2 bg-line-green text-white rounded-full font-semibold disabled:opacity-50"
          >
            作成
          </button>
        </div>
      </div>
    </div>
  )
}
