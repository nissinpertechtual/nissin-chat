import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import { X, FileText, Download } from 'lucide-react'

interface Props {
  conversationId: string
  onClose: () => void
}

interface FileMessage {
  id: string
  file_url: string
  file_name: string
  file_size: number
  created_at: string
  sender?: { display_name: string }
}

function formatSize(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

export function FileListPanel({ conversationId, onClose }: Props) {
  const [files, setFiles] = useState<FileMessage[]>([])

  useEffect(() => {
    supabase
      .from('messages')
      .select('id, file_url, file_name, file_size, created_at, sender:users(display_name)')
      .eq('conversation_id', conversationId)
      .eq('message_type', 'file')
      .order('created_at', { ascending: false })
      .then(({ data }) => setFiles((data as unknown as FileMessage[]) || []))
  }, [conversationId])

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-bold text-lg">ファイル</h3>
        <button onClick={onClose}><X size={20} /></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {files.map(file => (
          <div key={file.id} className="flex items-center gap-3 p-3 border-b hover:bg-gray-50">
            <div className="flex-shrink-0 bg-blue-100 rounded-lg p-2">
              <FileText size={20} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.file_name || 'ファイル'}</p>
              <p className="text-xs text-gray-400">
                {file.sender?.display_name} · {formatSize(file.file_size)} · {new Date(file.created_at).toLocaleDateString('ja-JP')}
              </p>
            </div>
            <a
              href={file.file_url}
              download={file.file_name}
              target="_blank"
              rel="noreferrer"
              className="text-gray-400 hover:text-gray-600"
            >
              <Download size={18} />
            </a>
          </div>
        ))}
        {files.length === 0 && (
          <div className="flex items-center justify-center h-40 text-gray-400">
            ファイルがありません
          </div>
        )}
      </div>
    </div>
  )
}
