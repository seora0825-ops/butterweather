'use client'

import Link from 'next/link'
import { imageUrl } from '@/lib/images'
import { useBeadColor } from '@/lib/beadColor'
import { cartCount, useCartLines, type CartLine } from '@/lib/store/cart'
import { BagIcon } from './icons'

/** 줄에 꿰는 구슬은 여섯 알까지. 넘으면 끝에 숫자 */
const MAX = 6
const W = 64
const H = 28

/** 줄 위의 자리. 양 끝을 매단 끈이 처진 모양(2차 곡선) */
function at(t: number) {
  const x = 4 + (W - 8) * t
  const y = 6 + 4 * (H - 16) * t * (1 - t)
  return { x, y }
}

function Bead({ line, t, last }: { line: CartLine; t: number; last: boolean }) {
  const color = useBeadColor(line.image ? imageUrl(line.image) : null)
  const { x, y } = at(t)
  return (
    <circle
      cx={x}
      cy={y}
      r={5}
      fill={color}
      stroke="currentColor"
      strokeWidth={2}
      className={
        last
          ? 'motion-safe:animate-[bead-in_420ms_cubic-bezier(0.16,1,0.3,1)]'
          : undefined
      }
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    />
  )
}

/**
 * header 의 장바구니 — **담을 때마다 비즈 한 알이 줄에 꿰어진다.**
 *
 * 2026-11-26 홈 컨셉의 「놀이」 자리다. 한 화면에 장난은 이것 하나. 구슬 색은 담은
 * 물건의 사진에서 뽑는다(`lib/beadColor.ts`). 비어 있으면 가방만 보인다.
 * 줄의 선 굵기는 아이콘과 같은 2.
 */
export default function CartLink() {
  const lines = useCartLines()
  const count = cartCount(lines)

  // 개수만큼 구슬을 펼친다. 같은 물건 두 개면 같은 색 두 알
  const beads: CartLine[] = []
  for (const line of lines) {
    for (let i = 0; i < line.quantity && beads.length < MAX; i++)
      beads.push(line)
  }
  const more = count - beads.length

  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `장바구니, ${count}개` : '장바구니'}
      className="flex h-12 min-w-12 items-center justify-center gap-0.5 px-1"
    >
      <BagIcon />
      {count > 0 && (
        <svg
          aria-hidden
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          fill="none"
          className="overflow-visible"
        >
          <path
            d={`M4 6 Q${W / 2} ${6 + 2 * (H - 16)} ${W - 4} 6`}
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          />
          {beads.map((line, i) => (
            <Bead
              key={`${line.variantId}-${i}`}
              line={line}
              t={(i + 1) / (MAX + 1)}
              last={i === beads.length - 1}
            />
          ))}
          {more > 0 && (
            <text
              x={W - 2}
              y={H - 1}
              textAnchor="end"
              fill="currentColor"
              className="text-[11px] font-bold tabular-nums"
            >
              +{more}
            </text>
          )}
        </svg>
      )}
    </Link>
  )
}
