'use client'

import { useState } from 'react'
import { formatKRW } from '@/lib/queries/products'
import { METHODS, useCounter, type Sale } from '@/lib/store/counter'

function labelOf(method: Sale['method']): string {
  return METHODS.find((m) => m.id === method)?.label ?? method
}

function timeOf(sale: Sale): string {
  return new Date(sale.at).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
          timeOf(s),
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

export default function SalesLog() {
  const sales = useCounter((s) => s.sales)
  const removeSale = useCounter((s) => s.removeSale)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [copied, setCopied] = useState<'done' | 'failed' | null>(null)

  if (sales.length === 0) return null

  const sum = sales.reduce((n, s) => n + s.totalKrw, 0)
  const byMethod = METHODS.map((m) => ({
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

  return (
    <details className="border-t border-gray-300 pt-4">
      <summary className="cursor-pointer">
        {`판매 기록 ${sales.length}건 · ${formatKRW(sum)}`}
      </summary>
      <div className="mt-4 flex flex-col gap-4">
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
            className="cursor-pointer border border-gray-300 px-3 py-2"
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
                <span>{`${timeOf(s)} · ${labelOf(s.method)}`}</span>
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
                      removeSale(s.id)
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
  )
}
