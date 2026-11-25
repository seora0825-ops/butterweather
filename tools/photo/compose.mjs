// 오려낸 사진을 나래의 보드 색 위에 놓는다. **상품 화소를 다시 그리지 않는다** —
// 색 낌을 빼고(종이가 흰색이 되게), 크기를 맞추고, 그림자를 따로 깔 뿐이다.
//
//   swiftc -O tools/photo/cut.swift -o /tmp/bw-cut
//   /tmp/bw-cut 원본.jpeg 작업폴더 이름            → 이름-cut.png
//   node tools/photo/compose.mjs 작업폴더 '{"이름":["원본.jpeg","orange",0]}'
//
// 결과: 작업폴더/out/이름-1.jpg(보드 색) · 이름-2.jpg(밝은 바탕). 세 번째 값은 돌릴 각도
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
const require = createRequire(import.meta.url)
const sharp = require('sharp')
const DIR = path.resolve(process.argv[2])
const PICK = JSON.parse(process.argv[3] ?? '{}')
// 나래 피그마의 단색 보드
const BOARD = {
  orange: '#ff4f00',
  ink: '#101416',
  blue: '#0088ff',
  pink: '#ff0085',
  purple: '#8800ff',
  green: '#1dd860',
  yellow: '#ffe100',
  cream: '#fcefd0',
}
const W = 1200
const H = 1431 // 234:279

/** 종이의 색. 오려낸 바깥 화소의 평균 → 흰색이 되게 하는 배율 */
async function gains(name, source) {
  const w = 400
  const a = await sharp(source)
    .rotate()
    .resize(w, w, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer()
  const m = await sharp(path.join(DIR, `${name}-cut.png`))
    .resize(w, w, { fit: 'fill' })
    .ensureAlpha()
    .extractChannel(3)
    .blur(6)
    .raw()
    .toBuffer()
  const s = [0, 0, 0]
  let n = 0
  for (let i = 0; i < w * w; i++) {
    if (m[i] > 4) continue
    const y = (i / w) | 0
    const x = i % w
    if (x < 60 || x > 340 || y < 60 || y > 340) continue
    for (let k = 0; k < 3; k++) s[k] += a[i * 3 + k]
    n++
  }
  const avg = s.map((v) => v / n)
  // 색 낌은 없애고, 밝기는 종이가 236 이 되게. 과하게 밝히지 않는다
  return avg.map((v) => Math.min(236 / v, 1.75))
}

async function product(name, source, rotate) {
  const g = await gains(name, source)
  let img = sharp(path.join(DIR, `${name}-cut.png`))
    .ensureAlpha()
    .linear([...g, 1], [0, 0, 0, 0])
  let buf = await img.png().toBuffer()
  if (rotate) buf = await sharp(buf).rotate(rotate).png().toBuffer()
  buf = await sharp(buf)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .png()
    .toBuffer()
  const fit = await sharp(buf)
    .resize(Math.round(W * 0.8), Math.round(H * 0.8), { fit: 'inside' })
    .png()
    .toBuffer({ resolveWithObject: true })
  return { data: fit.data, w: fit.info.width, h: fit.info.height, g }
}

async function shadow(p, blur, opacity) {
  const pad = blur * 3
  const alpha = await sharp(p.data).extractChannel(3).raw().toBuffer()
  const rgba = Buffer.alloc(p.w * p.h * 4)
  for (let i = 0; i < p.w * p.h; i++) rgba[i * 4 + 3] = alpha[i] * opacity
  return sharp(
    await sharp(rgba, { raw: { width: p.w, height: p.h, channels: 4 } })
      .extend({
        top: pad,
        bottom: pad,
        left: pad,
        right: pad,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer()
  )
    .blur(blur)
    .png()
    .toBuffer()
}

async function onColor(name, source, bg, rotate, out) {
  const p = await product(name, source, rotate)
  const left = Math.round((W - p.w) / 2)
  const top = Math.round((H - p.h) / 2)
  const near = await shadow(p, 5, 0.42)
  const far = await shadow(p, 18, 0.3)
  await sharp({ create: { width: W, height: H, channels: 3, background: bg } })
    .composite([
      { input: far, left: left - 54 + 14, top: top - 54 + 24 },
      { input: near, left: left - 15 + 4, top: top - 15 + 7 },
      { input: p.data, left, top },
    ])
    .jpeg({ quality: 88 })
    .toFile(out)
  return p.g
}

fs.mkdirSync(path.join(DIR, 'out'), { recursive: true })
for (const [name, [source, color, rotate = 0]] of Object.entries(PICK)) {
  const to = (n) => path.join(DIR, 'out', `${name}-${n}.jpg`)
  await onColor(name, source, BOARD[color], rotate, to(1))
  await onColor(name, source, '#f4f4f2', rotate, to(2))
  console.log(name, color)
}
