import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  conversationId: string
  onClose: () => void
}

interface ImageMessage {
  id: string
  file_url: string
  created_at: string
  sender?: { display_name: string }
}

export function AlbumPanel({ conversationId, onClose }: Props) {
  const [images, setImages] = useState<ImageMessage[]>([])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    supabase
      .from('messages')
      .select('id, file_url, created_at, sender:users(display_name)')
      .eq('conversation_id', conversationId)
      .eq('message_type', 'image')
      .order('created_at', { ascending: false })
      .then(({ data }) => setImages((data as unknown as ImageMessage[]) || []))
  }, [conversationId])

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-bold text-lg">アルバム</h3>
        <button onClick={onClose}><X size={20} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-3 gap-1">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className="aspect-square cursor-pointer overflow-hidden rounded"
              onClick={() => setLightboxIndex(idx)}
            >
              <img src={img.file_url} alt="" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
            </div>
          ))}
        </div>
        {images.length === 0 && (
          <div className="flex items-center justify-center h-40 text-gray-400">
            画像がありません
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
          <button
            className="absolute top-4 right-4 text-white"
            onClick={() => setLightboxIndex(null)}
          >
            <X size={28} />
          </button>
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 text-white"
              onClick={() => setLightboxIndex(i => i! - 1)}
            >
              <ChevronLeft size={36} />
            </button>
          )}
          <img
            src={images[lightboxIndex]?.file_url}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
          {lightboxIndex < images.length - 1 && (
            <button
              className="absolute right-4 text-white"
              onClick={() => setLightboxIndex(i => i! + 1)}
            >
              <ChevronRight size={36} />
            </button>
          )}
          <div className="absolute bottom-4 text-white text-sm">
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  )
}
