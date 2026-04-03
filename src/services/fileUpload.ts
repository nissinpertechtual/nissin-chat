import { supabase } from './supabase'

export async function uploadFile(
  file: File,
  conversationId: string,
  messageType: 'image' | 'file' | 'voice' = 'file'
): Promise<{ url: string; name: string; size: number } | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
  const audioExts = ['webm', 'mp3', 'ogg', 'wav', 'm4a']

  let bucket = 'chat-files'
  if (imageExts.includes(ext)) {
    bucket = 'chat-images'
    messageType = 'image'
  } else if (audioExts.includes(ext)) {
    bucket = 'chat-files'
    messageType = 'voice'
  }

  const fileName = `${conversationId}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file)

  if (error) {
    console.error('Upload error:', error)
    return null
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName)

  return {
    url: urlData.publicUrl,
    name: file.name,
    size: file.size,
  }
}
