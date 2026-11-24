'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 현장 계산기. **이 기기의 브라우저에만 남는다** — DB 에 쓰지 않는다.
 *
 * 온라인 주문(`orders`)에 섞지 않는 이유는 둘이다. `orders.user_id` 가 회원을
 * 요구하는데 현장 손님은 회원이 아니고, 배송지도 없다. 현장 판매를 DB 에
 * 남기려면 표를 새로 만들어야 하고 그것은 마이그레이션이다.
 *
 * ⚠️ 그래서 **휴대폰 두 대로 나눠 쓰면 기록도 둘로 나뉜다.** 브라우저의
 * 사이트 데이터를 지우면 사라진다. 하루가 끝나면 표로 복사해 둔다.
 *
 * ⚠️ **재고를 깎지 않는다.** 가져가는 수량을 온라인에서 먼저 빼 두는 전제다.
 */

export type CounterLine = {
  /** 옵션 id. 금액을 직접 넣은 줄은 `custom-…` */
  key: string
  name: string
  priceKrw: number
  quantity: number
}

export const METHODS = [
  { id: 'transfer', label: '계좌이체' },
  { id: 'cash', label: '현금' },
  { id: 'QR', label: '카드·페이 QR' },
  { id: 'KAKAO_PAY', label: '카카오페이' },
  { id: 'NAVER_PAY', label: '네이버페이' },
  { id: 'WECHAT_PAY', label: '위챗페이' },
] as const

export type Method = (typeof METHODS)[number]['id']

export type Sale = {
  id: string
  at: string
  method: Method
  lines: CounterLine[]
  totalKrw: number
}

export type CounterSettings = {
  /** 계좌이체 때 손님에게 보여줄 글. **저장소에 두지 않는다** — 기기에만 */
  account: string
  giftAmountKrw: number | null
  giftCount: number | null
  giftName: string
}

type CounterState = {
  lines: CounterLine[]
  /** 결제를 기다리는 건. 페이앱에 다녀와도 남아 있어야 한다 */
  pending: { id: string; method: Method } | null
  sales: Sale[]
  settings: CounterSettings
  add: (line: Omit<CounterLine, 'quantity'>) => void
  setQuantity: (key: string, quantity: number) => void
  clear: () => void
  start: (method: Method) => void
  back: () => void
  record: (pendingId: string) => void
  removeSale: (id: string) => void
  setSettings: (patch: Partial<CounterSettings>) => void
}

export function totalKrw(lines: CounterLine[]): number {
  return lines.reduce((sum, l) => sum + l.priceKrw * l.quantity, 0)
}

export function itemCount(lines: CounterLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0)
}

/** 둘 중 하나만 넘어도 드린다. 기준을 비워두면 그 기준은 없는 것이다 */
export function earnsGift(lines: CounterLine[], s: CounterSettings): boolean {
  return (
    (s.giftAmountKrw !== null && totalKrw(lines) >= s.giftAmountKrw) ||
    (s.giftCount !== null && itemCount(lines) >= s.giftCount)
  )
}

export const useCounter = create<CounterState>()(
  persist(
    (set) => ({
      lines: [],
      pending: null,
      sales: [],
      settings: {
        account: '',
        giftAmountKrw: null,
        giftCount: null,
        giftName: '',
      },

      add: (line) =>
        set((s) => {
          // 결제를 기다리는 동안 금액이 바뀌면 보여준 QR 과 어긋난다
          if (s.pending) return s
          const found = s.lines.some((l) => l.key === line.key)
          return {
            lines: found
              ? s.lines.map((l) =>
                  l.key === line.key ? { ...l, quantity: l.quantity + 1 } : l
                )
              : [...s.lines, { ...line, quantity: 1 }],
          }
        }),

      setQuantity: (key, quantity) =>
        set((s) => {
          if (s.pending) return s
          return {
            lines:
              quantity <= 0
                ? s.lines.filter((l) => l.key !== key)
                : s.lines.map((l) => (l.key === key ? { ...l, quantity } : l)),
          }
        }),

      clear: () => set((s) => (s.pending ? s : { lines: [] })),

      start: (method) =>
        set((s) =>
          s.lines.length === 0 || s.pending
            ? s
            : { pending: { id: crypto.randomUUID(), method } }
        ),

      back: () => set({ pending: null }),

      // 두 번 눌러도 한 번만 남는다 — 기다리던 건이 맞을 때만 기록한다
      record: (pendingId) =>
        set((s) => {
          if (!s.pending || s.pending.id !== pendingId) return s
          const sale: Sale = {
            id: s.pending.id,
            at: new Date().toISOString(),
            method: s.pending.method,
            lines: s.lines,
            totalKrw: totalKrw(s.lines),
          }
          return { sales: [sale, ...s.sales], lines: [], pending: null }
        }),

      removeSale: (id) =>
        set((s) => ({ sales: s.sales.filter((x) => x.id !== id) })),

      setSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    { name: 'butter-weather-counter', version: 1 }
  )
)
