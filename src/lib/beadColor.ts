'use client'

import { useEffect, useState } from 'react'

/**
 * 사진에서 **물건의 색** 하나를 뽑는다 — 장바구니 비즈 줄의 구슬 색.
 *
 * 색을 새로 고르지 않으려고 사진에서 가져온다(CLAUDE.md 8절). 상품 사진은 보드색
 * 바탕 위에 물건을 올린 것이라 그냥 평균을 내면 바탕색이 나온다. 그래서 테두리
 * 색을 바탕으로 보고, 바탕과 먼 픽셀만 평균한다.
 */
const cache = new Map<string, string>()
const FALLBACK = 'var(--color-ink)'

function extract(img: HTMLImageElement): string {
  const n = 40
  const canvas = document.createElement('canvas')
  canvas.width = n
  canvas.height = n
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return FALLBACK
  ctx.drawImage(img, 0, 0, n, n)
  const d = ctx.getImageData(0, 0, n, n).data

  // 테두리 한 줄의 평균 = 바탕
  const bg = [0, 0, 0]
  let k = 0
  for (let i = 0; i < n * n; i++) {
    const x = i % n
    const y = (i / n) | 0
    if (x > 0 && y > 0 && x < n - 1 && y < n - 1) continue
    for (let c = 0; c < 3; c++) bg[c] += d[i * 4 + c]
    k++
  }
  for (let c = 0; c < 3; c++) bg[c] /= k

  // 바탕과 먼 픽셀을 거친 칸(채널당 8단계)으로 나눠 **가장 많은 칸**을 고른다.
  // 평균을 내면 구슬·실·빛이 섞여 탁해진다 — 가장 흔한 색이 그 물건의 색이다
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>()
  for (let i = 0; i < n * n; i++) {
    const r = d[i * 4]
    const g = d[i * 4 + 1]
    const b = d[i * 4 + 2]
    const dist = Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2])
    if (dist < 120) continue
    // 하이라이트(거의 흰색)는 구슬 색이 아니다
    if (r > 235 && g > 235 && b > 235) continue
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5)
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
    bin.n++
    bin.r += r
    bin.g += g
    bin.b += b
    bins.set(key, bin)
  }
  let best: { n: number; r: number; g: number; b: number } | null = null
  for (const bin of bins.values()) if (!best || bin.n > best.n) best = bin
  if (!best) return FALLBACK
  const r = Math.round(best.r / best.n)
  const g = Math.round(best.g / best.n)
  const b = Math.round(best.b / best.n)
  return `rgb(${r} ${g} ${b})`
}

export function useBeadColor(src: string | null): string {
  // 다 읽은 것은 cache 에서 바로 꺼낸다. 처음 보는 사진만 effect 에서 읽는다
  const [, setLoaded] = useState(0)

  useEffect(() => {
    if (!src || cache.has(src)) return
    let alive = true
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      let c = FALLBACK
      try {
        c = extract(img)
      } catch {
        // 캔버스가 막히면 먹색 구슬로 둔다
      }
      cache.set(src, c)
      if (alive) setLoaded((n) => n + 1)
    }
    img.src = src
    return () => {
      alive = false
    }
  }, [src])

  return (src && cache.get(src)) || FALLBACK
}
