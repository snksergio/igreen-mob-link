// Comprime os vídeos para a web (H.264, sem áudio, faststart).
// Uso: node scripts/compress-videos.mjs <entrada> <saída> <largura> [crf] [filtro-extra]
// filtro-extra: filtro do ffmpeg aplicado antes da escala (ex.: "colorlevels=romin=0.064:gomin=0.064:bomin=0.064")
import ffmpeg from 'ffmpeg-static'
import { execFileSync } from 'node:child_process'
import { statSync } from 'node:fs'

const [input, output, width = '1920', crf = '26', extra = ''] = process.argv.slice(2)
if (!input || !output) {
  console.error('uso: node scripts/compress-videos.mjs <entrada> <saída> <largura> [crf] [filtro-extra]')
  process.exit(1)
}
execFileSync(ffmpeg, [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-i', input,
  '-an',
  '-vf', `${extra ? extra + ',' : ''}scale=${width}:-2:flags=lanczos,format=yuv420p`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-profile:v', 'high',
  '-movflags', '+faststart',
  output,
])
console.log(`${output}: ${Math.round(statSync(output).size / 1024)} KB`)
