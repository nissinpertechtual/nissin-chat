import { format, isToday, isYesterday, formatDistanceToNow, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

export const formatMessageTime = (dateStr: string): string => {
  const date = parseISO(dateStr)
  return format(date, 'HH:mm')
}

export const formatConversationTime = (dateStr: string): string => {
  const date = parseISO(dateStr)
  if (isToday(date)) return format(date, 'HH:mm')
  if (isYesterday(date)) return '昨日'
  return format(date, 'M/d', { locale: ja })
}

export const formatDateDivider = (dateStr: string): string => {
  const date = parseISO(dateStr)
  if (isToday(date)) return '今日'
  if (isYesterday(date)) return '昨日'
  return format(date, 'yyyy年M月d日 (EEE)', { locale: ja })
}

export const formatLastSeen = (dateStr: string): string => {
  const date = parseISO(dateStr)
  if (isToday(date)) return `今日 ${format(date, 'HH:mm')}`
  return formatDistanceToNow(date, { addSuffix: true, locale: ja })
}

export const getConversationName = (
  conv: { name: string | null; is_group: boolean; members?: { id: string; display_name: string }[] },
  currentUserId: string
): string => {
  if (conv.name) return conv.name
  if (!conv.is_group && conv.members) {
    const other = conv.members.find((m) => m.id !== currentUserId)
    return other?.display_name || 'Unknown'
  }
  return 'グループ'
}

export const getConversationAvatar = (
  conv: { avatar_url: string | null; is_group: boolean; members?: { id: string; avatar_url: string | null; display_name: string }[] },
  currentUserId: string
): string | null => {
  if (conv.avatar_url) return conv.avatar_url
  if (!conv.is_group && conv.members) {
    const other = conv.members.find((m) => m.id !== currentUserId)
    return other?.avatar_url || null
  }
  return null
}

export const generateAvatarColor = (name: string): string => {
  const colors = [
    '#FF6B6B', '#FF8E53', '#FFA726', '#66BB6A',
    '#26C6DA', '#42A5F5', '#7E57C2', '#EC407A',
    '#06C755', '#FF5252', '#536DFE', '#FF6D00',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export const getInitials = (name: string): string => {
  const parts = name.split(/[\s_-]/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export const isSameDay = (date1: string, date2: string): boolean => {
  return format(parseISO(date1), 'yyyy-MM-dd') === format(parseISO(date2), 'yyyy-MM-dd')
}

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

export const sanitizeText = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export const linkifyText = (text: string): string => {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline text-blue-500">${url}</a>`)
}

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
