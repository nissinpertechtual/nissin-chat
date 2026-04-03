import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Mic, Square } from 'lucide-react'

interface VoiceMessageProps {
  url: string
  duration?: number
}

export function VoiceMessage({ url }: VoiceMessageProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration)
    }
    const onEnded = () => { setPlaying(false); setProgress(0) }
    const onLoadedMetadata = () => setDuration(audio.duration)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play()
      setPlaying(true)
    }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-2 bg-white bg-opacity-20 rounded-xl px-3 py-2 min-w-[180px]">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-white bg-opacity-30 flex items-center justify-center flex-shrink-0"
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div className="flex-1">
        <div className="h-1.5 bg-white bg-opacity-30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
      <span className="text-xs opacity-80 flex-shrink-0">
        {duration ? formatTime(duration) : '0:00'}
      </span>
    </div>
  )
}

interface VoiceRecordButtonProps {
  onRecorded: (blob: Blob) => void
}

export function VoiceRecordButton({ onRecorded }: VoiceRecordButtonProps) {
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onRecorded(blob)
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      mediaRecorderRef.current = mr
      setRecording(true)
    } catch {
      alert('マイクへのアクセスを許可してください')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  const handleMouseDown = () => {
    holdTimerRef.current = setTimeout(() => {
      startRecording()
    }, 300)
  }

  const handleMouseUp = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    if (recording) stopRecording()
  }

  return (
    <button
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      className={`p-2 rounded-full transition-colors ${recording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 hover:bg-gray-100'}`}
      title="長押しで録音"
    >
      {recording ? <Square size={20} /> : <Mic size={20} />}
    </button>
  )
}
