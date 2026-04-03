import { useState } from 'react'
import { X, Clock } from 'lucide-react'

interface Props {
  onSchedule: (scheduledAt: string) => void
  onClose: () => void
}

export function ScheduledMessageModal({ onSchedule, onClose }: Props) {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 5)
  const defaultDate = now.toISOString().slice(0, 16)

  const [scheduledAt, setScheduledAt] = useState(defaultDate)
  const [error, setError] = useState('')

  const handleConfirm = () => {
    const selected = new Date(scheduledAt)
    if (selected <= new Date()) {
      setError('未来の日時を選択してください')
      return
    }
    onSchedule(selected.toISOString())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-line-green" />
            <h3 className="font-bold text-lg">送信予約</h3>
          </div>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">送信する日時を選択してください</p>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={e => {
            setScheduledAt(e.target.value)
            setError('')
          }}
          className="w-full border rounded-xl px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-line-green"
        />
        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-full text-gray-600 font-semibold"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 bg-line-green text-white rounded-full font-semibold"
          >
            予約する
          </button>
        </div>
      </div>
    </div>
  )
}
