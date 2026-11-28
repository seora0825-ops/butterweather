'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 현장 계산기. **먼저 이 기기에 적고, 뒤에서 DB 로 보낸다**(`0012`).
 *
 * 매대는 통신이 끊긴다. 판매를 눌렀는데 「저장하지 못했습니다」가 뜨면 손님
 * 앞에서 멈춘다. 그래서 `outbox` 에 먼저 넣고, 보내진 것만 뺀다
 * (`useCounterSync`). 두 번 보내도 같은 id 라 하나다.
 *
 * 온라인 주문(`orders`)에 섞지 않는다 — 그 표는 회원과 배송지를 요구한다.
 *
 * **재고는 DB 가 깎는다**(`0013`). 판매가 저장되면 줄고, 지우면 되돌아온다.
 */

export type CounterLine = {
  /** 옵션 id. 금액을 직접 넣은 줄은 `custom-…` */
  key: string
  name: string
  priceKrw: number
  quantity: number
  /** 상품 번호(`no-07` 의 07). 페이앱 상품명에 싣는다. 금액만 넣은 줄은 없다 */
  code?: string
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

/** waiting 기다림 · dropped 돌아감 · done 팔았음 · voided 지움 (`0012`) */
export type SaleStatus = 'waiting' | 'dropped' | 'done' | 'voided'

export type Sale = {
  id: string
  at: string
  /** `PAYAPP` 은 계산기를 거치지 않고 앱에서 바로 받은 것 */
  method: Method | 'PAYAPP'
  lines: CounterLine[]
  totalKrw: number
  status: SaleStatus
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
  /** 아직 DB 로 보내지 못한 것 */
  outbox: Sale[]
  settings: CounterSettings
  add: (line: Omit<CounterLine, 'quantity'>) => void
  setQuantity: (key: string, quantity: number) => void
  clear: () => void
  start: (method: Method) => void
  back: () => void
  /** 돈을 받았다. 사람이 누르거나, 페이앱 통보로 확정되면 부른다 */
  record: (pendingId: string) => void
  voidSale: (sale: Sale) => void
  sent: (sales: Sale[]) => void
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

/** 같은 판매는 마지막 상태 하나만 보낸다 */
function queue(outbox: Sale[], sale: Sale): Sale[] {
  return [sale, ...outbox.filter((s) => s.id !== sale.id)]
}

export const useCounter = create<CounterState>()(
  persist(
    (set) => ({
      lines: [],
      pending: null,
      outbox: [],
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
        set((s) => {
          if (s.lines.length === 0 || s.pending) return s
          const id = crypto.randomUUID()
          return {
            pending: { id, method },
            // 통보가 올 곳을 미리 만들어 둔다. 이체·현금은 올 통보가 없다
            outbox:
              method === 'transfer' || method === 'cash'
                ? s.outbox
                : queue(s.outbox, {
                    id,
                    at: new Date().toISOString(),
                    method,
                    lines: s.lines,
                    totalKrw: totalKrw(s.lines),
                    status: 'waiting',
                  }),
          }
        }),

      back: () =>
        set((s) => {
          const { pending } = s
          if (!pending) return s
          if (pending.method === 'transfer' || pending.method === 'cash') {
            return { pending: null }
          }
          return {
            pending: null,
            outbox: queue(s.outbox, {
              id: pending.id,
              at: new Date().toISOString(),
              method: pending.method,
              lines: s.lines,
              totalKrw: totalKrw(s.lines),
              status: 'dropped',
            }),
          }
        }),

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
            status: 'done',
          }
          return {
            outbox: queue(s.outbox, sale),
            lines: [],
            pending: null,
          }
        }),

      voidSale: (sale) =>
        set((s) => ({
          outbox: queue(s.outbox, { ...sale, status: 'voided' }),
        })),

      // 보내는 사이에 상태가 바뀌었으면 남긴다. 바뀐 것을 다시 보내야 한다
      sent: (sales) =>
        set((s) => ({
          outbox: s.outbox.filter(
            (o) => !sales.some((x) => x.id === o.id && x.status === o.status)
          ),
        })),

      setSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      name: 'butter-weather-counter',
      version: 2,
      // 1 은 기록을 `sales` 에 쌓아 두기만 했다. 그대로 보낼 것으로 옮긴다
      migrate: (old) => {
        const { sales = [], ...rest } = old as {
          sales?: Omit<Sale, 'status'>[]
        }
        return {
          ...rest,
          outbox: sales.map((s) => ({ ...s, status: 'done' as const })),
        } as CounterState
      },
    }
  )
)
