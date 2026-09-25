import { useEffect, useRef } from 'react'

/**
 * Vídeo que toca uma única vez e fica parado no último quadro (sem loop, sem controles).
 * Se o autoplay for bloqueado (ex.: modo economia de energia), mostra direto o quadro final.
 */
export function PlayOnceVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    video.play().catch(() => {
      const showLastFrame = () => {
        video.currentTime = Math.max(0, video.duration - 0.05)
      }
      if (video.readyState >= 1) showLastFrame()
      else video.addEventListener('loadedmetadata', showLastFrame, { once: true })
    })
  }, [src])

  return <video ref={ref} className={className} src={src} muted playsInline preload="auto" disablePictureInPicture aria-hidden />
}
