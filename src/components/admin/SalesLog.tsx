'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  adoptPayment,
  dismissPayment,
  listSales,
  listUnmatchedPayments,
  type CounterPayment,
} from '@/lib/queries/counterSales'
import { formatKRW } from '@/lib/queries/products'
import { METHODS, useCounter, type Sale } from '@/lib/store/counter'

/** 다른 휴대폰의 판매와 페이앱 통보를 이만큼마다 다시 읽는다 */
const REFRESH_MS = 5000

const ALL_METHODS: { id: Sale['method']; label: string }[] = [
  ...METHODS,
  { id: 'PAYAPP', label: '페이앱 직접' },
]

function labelOf(method: Sale['method']): string {
  return ALL_METHODS.find((m) => m.id === method)?.label ?? method
}

function timeOf(at: string): string {
  return new Date(at).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 한국 시각 오늘 0시 */
function today(): string {
  const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
  return new Date(`${day}T00:00:00+09:00`).toISOString()
}

/** 스프레드시트에 그대로 붙는 꼴. 한 줄이 상품 하나다 */
function toTable(sales: Sale[]): string {
  // 이름에 탭·줄바꿈이 있으면 칸이 밀린다. `=` 로 시작하면 수식이 된다
  const cell = (v: string) =>
    v.replace(/[\t\r\n]+/g, ' ').replace(/^[=+@-]/, "'$&")
  const rows = [...sales]
    .reverse()
    .flatMap((s) =>
      s.lines.map((l) =>
        [
          timeOf(s.at),
          s.id.slice(0, 8),
          labelOf(s.method),
          cell(l.name),
          l.priceKrw,
          l.quantity,
          l.priceKrw * l.quantity,
        ].join('\t')
      )
    )
  return [
    ['시각', '건', '수단', '상품', '단가', '수량', '금액'].join('\t'),
    ...rows,
  ].join('\n')
}

/** 결제 번호에서 판매 id 를 정한다. 두 사람이 눌러도 같은 판매다 */
async function saleIdOf(mulNo: string): Promise<string> {
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(mulNo))
  ).slice(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return hex.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5')
}

export default function SalesLog() {
  const outbox = useCounter((s) => s.outbox)
  const voidSale = useCounter((s) => s.voidSale)
  const [range, setRange] = useState<'today' | 'all'>('today')
  const [saved, setSaved] = useState<Sale[]>([])
  const [unmatched, setUnmatched] = useState<CounterPayment[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [confirming, setConfirming] = useState<string | null>(null)
  const [copied, setCopied] = useState<'done' | 'failed' | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [sales, payments] = await Promise.all([
        listSales(range === 'today' ? today() : null),
        listUnmatchedPayments(),
      ])
      setSaved(sales)
      setUnmatched(payments)
      setState('ready')
    } catch {
      setState('error')
    }
  }, [range])

  // `outbox` 가 바뀌면 곧바로 다시 읽는다 — 방금 보낸 것이 목록에 보여야 한다
  useEffect(() => {
    let alive = true
    const tick = () => {
      if (alive && document.visibilityState === 'visible') void refresh()
    }
    void Promise.resolve().then(tick)
    const timer = setInterval(tick, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [refresh, outbox])

  // 아직 못 보낸 것을 얹는다. 보낼 상태가 더 새것이다
  const since = range === 'today' ? today() : ''
  const local = outbox.filter((s) => s.at >= since)
  const sales = [
    ...local.filter((s) => s.status === 'done'),
    ...saved.filter(
      (s) =>
        !outbox.some(
          (o) => o.id === s.id && (o.status === 'done' || o.status === 'voided')
        )
    ),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))

  const sum = sales.reduce((n, s) => n + s.totalKrw, 0)
  const byMethod = ALL_METHODS.map((m) => ({
    label: m.label,
    sum: sales
      .filter((s) => s.method === m.id)
      .reduce((n, s) => n + s.totalKrw, 0),
  })).filter((m) => m.sum > 0)

  async function copy() {
    try {
      await navigator.clipboard.writeText(toTable(sales))
      setCopied('done')
    } catch {
      setCopied('failed')
    }
  }

  async function settle(mulNo: string, action: () => Promise<void>) {
    setBusy(mulNo)
    setActionError(null)
    try {
      await action()
    } catch {
      setActionError('저장하지 못했습니다. 다시 눌러 주세요.')
    }
    await refresh()
    setBusy(null)
  }

  return (
    <>
      {unmatched.length > 0 ? (
        <section
          aria-labelledby="unmatched"
          className="border-t border-gray-300 pt-4"
        >
          <h2 id="unmatched">
            {`어느 판매인지 모르는 결제 ${unmatched.length}건`}
          </h2>
          <p className="mt-1">
            돈은 들어왔습니다. 아래 합계에는 아직 넣지 않았습니다.
          </p>
          {actionError ? <p role="alert">{actionError}</p> : null}
          <ul className="mt-3 border-t border-gray-300">
            {unmatched.map((p) => (
              <li
                key={p.mul_no}
                className="flex flex-col gap-2 border-b border-gray-300 py-3"
              >
                <div className="flex justify-between gap-3">
                  <span className="wrap-anywhere">
                    {`${timeOf(p.received_at)} · ${p.goods || '이름 없음'}`}
                  </span>
                  <span className="tabular-nums">{formatKRW(p.price_krw)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    className="cursor-pointer border border-gray-300 px-3 py-2 disabled:opacity-40"
                    onClick={() =>
                      settle(p.mul_no, async () =>
                        adoptPayment(p, await saleIdOf(p.mul_no))
                      )
                    }
                  >
                    판매에 넣기
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    className="cursor-pointer border border-gray-300 px-3 py-2 disabled:opacity-40"
                    onClick={() =>
                      settle(p.mul_no, () => dismissPayment(p.mul_no))
                    }
                  >
                    이미 기록한 판매입니다
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <details className="border-t border-gray-300 pt-4">
        <summary className="cursor-pointer">
          {`판매 기록 ${sales.length}건 · ${formatKRW(sum)}`}
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          {state === 'error' ? (
            <p role="alert">
              다른 휴대폰의 기록을 읽지 못했습니다. 연결되면 다시 읽습니다.
            </p>
          ) : null}
          <div role="group" aria-label="기간" className="flex gap-2">
            {(
              [
                ['today', '오늘'],
                ['all', '전체'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={range === id}
                onClick={() => setRange(id)}
                className="cursor-pointer border border-gray-300 px-3 py-2 aria-pressed:font-semibold aria-pressed:underline"
              >
                {label}
              </button>
            ))}
          </div>
          <dl className="flex flex-wrap gap-x-6 gap-y-1">
            {byMethod.map((m) => (
              <div key={m.label} className="flex gap-2">
                <dt>{m.label}</dt>
                <dd className="tabular-nums">{formatKRW(m.sum)}</dd>
              </div>
            ))}
          </dl>
          <div>
            <button
              type="button"
              onClick={copy}
              disabled={sales.length === 0}
              className="cursor-pointer border border-gray-300 px-3 py-2 disabled:opacity-40"
            >
              표로 복사하기
            </button>
            {copied === 'done' ? (
              <span role="status" className="ml-3">
                복사했습니다.
              </span>
            ) : null}
            {copied === 'failed' ? (
              <textarea
                readOnly
                rows={6}
                aria-label="판매 기록 표"
                value={toTable(sales)}
                className="mt-3 w-full border border-gray-300 p-2"
              />
            ) : null}
          </div>
          <ul className="border-t border-gray-300">
            {sales.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-1 border-b border-gray-300 py-3"
              >
                <div className="flex justify-between gap-3">
                  <span>{`${timeOf(s.at)} · ${labelOf(s.method)}`}</span>
                  <span className="tabular-nums">{formatKRW(s.totalKrw)}</span>
                </div>
                <p className="wrap-anywhere">
                  {s.lines.map((l) => `${l.name} ${l.quantity}개`).join(', ')}
                </p>
                {confirming === s.id ? (
                  <div className="flex flex-wrap gap-4">
                    <span>
                      기록만 지웁니다. 받은 돈은 따로 돌려드려야 합니다.
                    </span>
                    <button
                      type="button"
                      className="cursor-pointer underline"
                      onClick={() => {
                        voidSale(s)
                        setConfirming(null)
                        setCopied(null)
                      }}
                    >
                      확정하고 지우기
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer underline"
                      onClick={() => setConfirming(null)}
                    >
                      취소하기
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="w-fit cursor-pointer underline"
                    onClick={() => setConfirming(s.id)}
                  >
                    기록 지우기
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </details>
    </>
  )
}
