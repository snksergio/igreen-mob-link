// Converte os PNGs exportados do Figma para WebP (bem mais leves) e gera o favicon.
// Uso: node scripts/optimize-images.mjs
import sharp from 'sharp'
import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const dir = join(import.meta.dirname, '..', 'public', 'assets', 'img')

const jobs = [
  { file: 'hero-bg.png', width: 3064, quality: 78 },
  { file: 'hero-mobile.png', width: 941, quality: 80 },
  { file: 'proposta-hero.png', width: 2880, quality: 80 },
  { file: 'battery-3d.png', width: 1024, quality: 85 },
  { file: 'card-green-bg.png', width: 1058, quality: 90 },
  { file: 'map-base.png', width: 1276, quality: 80 },
  { file: 'map-streets.png', width: 1503, quality: 80 },
]

for (const { file, width, quality } of jobs) {
  const src = join(dir, file)
  if (!existsSync(src)) continue
  const out = src.replace(/\.png$/, '.webp')
  const info = await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality }).toFile(out)
  rmSync(src)
  console.log(`${file} -> ${file.replace('.png', '.webp')} (${Math.round(info.size / 1024)} KB)`)
}

// Favicon: isotipo branco sobre o quadrado verde da marca (#00A859, raio 10/36)
const logo = join(dir, '..', 'icons', 'logo-isotipo.svg')
const size = 64
const radius = Math.round((10 / 36) * size)
const square = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#00A859"/></svg>`,
)
const logoPng = await sharp(logo).resize({ height: Math.round(size * 0.57) }).png().toBuffer()
await sharp(square)
  .composite([{ input: logoPng, gravity: 'center' }])
  .png()
  .toFile(join(dir, '..', '..', 'favicon.png'))
console.log('favicon.png gerado')
