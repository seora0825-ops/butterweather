'use client'

import { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import SalesLog from '@/components/admin/SalesLog'
import { useCounterSync } from '@/components/admin/useCounterSync'
import { imageUrl } from '@/lib/images'
import { PAYAPP_MIN_KRW, payappUrl, usesPayapp } from '@/lib/payapp'
import { listProductDetails } from '@/lib/queries/adminProducts'
import { saleStatus } from '@/lib/queries/counterSales'
import { formatKRW } from '@/lib/queries/products'
import {
  METHODS,
  earnsGift,
  itemCount,
  totalKrw,
  useCounter,
} from '@/lib/store/counter'
import type { ProductCategory, ProductDetail } from '@/types/product'

const CATEGORIES: { id: ProductCategory; label: string }[] = [
  { id: 'keyring', label: '키링' },
  { id: 'bracelet', label: '팔찌' },
  { id: 'necklace', label: '목걸이' },
]

const BUTTON =
  'cursor-pointer border border-gray-300 px-3 py-3 disabled:cursor-not-allowed disabled:opacity-40'

type Catalog =
  | { state: 'loading' | 'error' }
  | { state: 'ready'; products: ProductDetail[] }

/**
 * 현장 계산기. 손님 앞에서 **합계 → 결제 → 기록**을 한 손으로 한다.
 *
 * 결제를 시작하면 담기를 닫는다. 손님이 금액을 본 뒤에 바뀌면 안 된다.
 */
export default function CounterPage() {
  const lines = useCounter((s) => s.lines)
  const pending = useCounter((s) => s.pending)
  const settings = useCounter((s) => s.settings)
  const total = totalKrw(lines)
  const sync = useCounterSync()
  /** 페이앱 통보로 저절로 기록된 금액. 다음 손님을 시작하면 지운다 */
  const [confirmed, setConfirmed] = useState<number | null>(null)

  // 페이앱이 **새 탭으로** 돌아올 수 있다. 탭마다 기억이 따로라, 다시 읽지
  // 않으면 옛 탭이 낡은 상태로 판매 기록을 덮어쓰거나 같은 건을 두 번 남긴다
  useEffect(() => {
    const reread = () => {
      if (document.visibilityState === 'visible')
        void useCounter.persist.rehydrate()
    }
    window.addEventListener('storage', reread)
    window.addEventListener('pageshow', reread)
    document.addEventListener('visibilitychange', reread)
    return () => {
      window.removeEventListener('storage', reread)
      window.removeEventListener('pageshow', reread)
      document.removeEventListener('visibilitychange', reread)
    }
  }, [])

  return (
    <div className="flex flex-col gap-8 text-sm">
      <h1 className="text-xl">현장 계산기</h1>

      {sync.failed && sync.waiting > 0 ? (
        <p role="status" className="border border-gray-300 p-3">
          {`아직 저장되지 않은 기록이 ${sync.waiting}건 있습니다. 이 휴대폰에 남아 있고, 연결되면 저절로 저장합니다.`}
        </p>
      ) : null}
      {confirmed !== null && lines.length === 0 ? (
        <p role="status" className="border border-black p-3">
          {`결제가 확인되어 기록했습니다. ${formatKRW(confirmed)}`}
        </p>
      ) : null}

      {pending ? null : <Picker />}

      <section aria-label="합계" className="border-t border-gray-300 pt-6">
        <Lines locked={pending !== null} />
        <div className="mt-4 flex items-baseline justify-between">
          <span>{`합계 ${itemCount(lines)}개`}</span>
          <strong className="text-4xl tabular-nums">{formatKRW(total)}</strong>
        </div>
        {earnsGift(lines, settings) ? (
          <p role="status" className="mt-3 border border-gray-300 p-3">
            {settings.giftName
              ? `사은품을 드립니다. ${settings.giftName}`
              : '사은품을 드립니다.'}
          </p>
        ) : null}
      </section>

      {pending ? (
        <Suspense>
          <Pending key={pending.id} onConfirmed={setConfirmed} />
        </Suspense>
      ) : (
        <Methods onStart={() => setConfirmed(null)} />
      )}

      <SalesLog />
      <Settings />
    </div>
  )
}

function Picker() {
  const add = useCounter((s) => s.add)
  const lines = useCounter((s) => s.lines)
  const [catalog, setCatalog] = useState<Catalog>({ state: 'loading' })
  const [revision, setRevision] = useState(0)
  const [amount, setAmount] = useState('')

  useEffect(() => {
    let alive = true
    listProductDetails().then(
      (products) => alive && setCatalog({ state: 'ready', products }),
      () => alive && setCatalog({ state: 'error' })
    )
    return () => {
      alive = false
    }
  }, [revision])

  const won = Number(amount)
  const validAmount = Number.isInteger(won) && won > 0

  return (
    <section aria-label="담기" className="flex flex-col gap-5">
      {catalog.state === 'loading' ? (
        <p role="status">상품을 불러오는 중입니다.</p>
      ) : null}
      {catalog.state === 'error' ? (
        <div>
          <p role="alert">
            상품을 불러오지 못했습니다. 아래에 금액을 넣어 계산하실 수 있습니다.
          </p>
          <button
            type="button"
            className="cursor-pointer underline"
            onClick={() => {
              setCatalog({ state: 'loading' })
              setRevision((n) => n + 1)
            }}
          >
            다시 불러오기
          </button>
        </div>
      ) : null}
      {catalog.state === 'ready'
        ? CATEGORIES.map((c) => {
            const products = catalog.products.filter((p) => p.category === c.id)
            if (products.length === 0) return null
            return (
              <div key={c.id}>
                <h2 className="mb-2">{c.label}</h2>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {products.flatMap((p) =>
                    p.variants.map((v) => {
                      const name =
                        p.variants.length === 1
                          ? p.name
                          : `${p.name} · ${v.name}`
                      return (
                        <li key={v.id}>
                          <button
                            type="button"
                            onClick={() =>
                              add({ key: v.id, name, priceKrw: v.price_krw })
                            }
                            // 하나뿐인 것을 두 번 담지 않는다
                            disabled={
                              v.stock <= 1 && lines.some((l) => l.key === v.id)
                            }
                            className={`${BUTTON} flex h-full w-full flex-col justify-between gap-2 text-left`}
                          >
                            {p.images[0] ? (
                              <span className="aspect-tile relative block w-full overflow-hidden">
                                <Image
                                  src={imageUrl(p.images[0])}
                                  alt=""
                                  fill
                                  sizes="(min-width: 640px) 33vw, 50vw"
                                  className="object-cover"
                                />
                              </span>
                            ) : null}
                            <span className="wrap-anywhere">{name}</span>
                            <span className="tabular-nums">
                              {formatKRW(v.price_krw)}
                            </span>
                          </button>
                        </li>
                      )
                    })
                  )}
                </ul>
              </div>
            )
          })
        : null}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!validAmount) return
          add({ key: `custom-${won}`, name: '금액 입력', priceKrw: won })
          setAmount('')
        }}
      >
        <label className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0">금액</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full min-w-0 border border-gray-300 px-3 py-3"
          />
        </label>
        <button type="submit" disabled={!validAmount} className={BUTTON}>
          담기
        </button>
      </form>
    </section>
  )
}

function Lines({ locked }: { locked: boolean }) {
  const lines = useCounter((s) => s.lines)
  const setQuantity = useCounter((s) => s.setQuantity)
  const clear = useCounter((s) => s.clear)

  if (lines.length === 0) return <p>담긴 것이 없습니다.</p>

  return (
    <>
      <ul className="flex flex-col gap-3">
        {lines.map((l) => (
          <li key={l.key} className="flex items-center gap-3">
            <span className="min-w-0 flex-1 wrap-anywhere">{l.name}</span>
            {locked ? (
              <span className="tabular-nums">{`${l.quantity}개`}</span>
            ) : (
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`${l.name} 하나 빼기`}
                  className="h-11 w-11 cursor-pointer border border-gray-300"
                  onClick={() => setQuantity(l.key, l.quantity - 1)}
                >
                  −
                </button>
                <span className="w-6 text-center tabular-nums">
                  {l.quantity}
                </span>
                <button
                  type="button"
                  aria-label={`${l.name} 하나 더하기`}
                  className="h-11 w-11 cursor-pointer border border-gray-300"
                  onClick={() => setQuantity(l.key, l.quantity + 1)}
                >
                  +
                </button>
              </span>
            )}
            <span className="w-20 text-right tabular-nums">
              {formatKRW(l.priceKrw * l.quantity)}
            </span>
          </li>
        ))}
      </ul>
      {locked ? null : (
        <button
          type="button"
          onClick={clear}
          className="mt-3 cursor-pointer underline"
        >
          모두 빼기
        </button>
      )}
    </>
  )
}

function Methods({ onStart }: { onStart: () => void }) {
  const start = useCounter((s) => s.start)
  const total = useCounter((s) => totalKrw(s.lines))

  return (
    <section aria-label="결제 수단">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={
              total <= 0 || (usesPayapp(m.id) && total < PAYAPP_MIN_KRW)
            }
            onClick={() => {
              onStart()
              start(m.id)
            }}
            className={BUTTON}
          >
            {m.label}
          </button>
        ))}
      </div>
      {total > 0 && total < PAYAPP_MIN_KRW ? (
        <p className="mt-2">페이앱은 1,000원부터 받을 수 있습니다.</p>
      ) : null}
    </section>
  )
}

/** 페이앱 통보가 왔는지 이만큼마다 본다 */
const POLL_MS = 2500

function Pending({ onConfirmed }: { onConfirmed: (krw: number) => void }) {
  const pending = useCounter((s) => s.pending)
  const lines = useCounter((s) => s.lines)
  const account = useCounter((s) => s.settings.account)
  const back = useCounter((s) => s.back)
  const record = useCounter((s) => s.record)
  const params = useSearchParams()

  const pendingId = pending?.id
  const auto = pending !== null && usesPayapp(pending.method)

  // 통보가 판매를 확정하면 저절로 넘어간다. 안 와도 사람이 누르면 된다
  useEffect(() => {
    if (!pendingId || !auto) return
    let alive = true
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      saleStatus(pendingId).then(
        (status) => {
          const now = useCounter.getState()
          if (!alive || status !== 'done' || now.pending?.id !== pendingId) {
            return
          }
          onConfirmed(totalKrw(now.lines))
          now.record(pendingId)
        },
        () => {
          // 못 물어봤다. 다음에 다시 본다
        }
      )
    }, POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [pendingId, auto, onConfirmed])

  if (!pending) return null

  const label = METHODS.find((m) => m.id === pending.method)?.label
  const payapp = usesPayapp(pending.method)
  // 지난 건의 주소가 남아 있을 수 있어 **지금 기다리는 건의 것만** 보여준다
  const returned =
    params.get('var1') === pending.id ? params.get('state') : null

  return (
    <section aria-label="결제 확인" className="flex flex-col gap-3">
      <h2>{label}</h2>

      {pending.method === 'transfer' ? (
        <p className="text-xl whitespace-pre-line select-all">
          {account || '아래 설정에 계좌를 넣어 두시면 여기에 보입니다.'}
        </p>
      ) : null}

      {payapp ? (
        <a
          href={payappUrl(
            pending.method,
            lines,
            pending.id,
            `${window.location.origin}/admin/counter`
          )}
          className={`${BUTTON} text-center`}
        >
          페이앱 열기
        </a>
      ) : null}

      {returned === '1' ? (
        <p role="status">페이앱에서 돌아왔습니다. 결제를 확인하고 있습니다.</p>
      ) : null}
      {returned === '0' ? (
        <p role="alert">
          페이앱에서 결제가 완료되지 않았습니다. 다시 열거나 다른 수단을 골라
          주세요.
        </p>
      ) : null}

      <p>
        {payapp
          ? '결제가 확인되면 저절로 기록합니다. 넘어가지 않으면 페이앱에서 결제 완료를 확인한 뒤 눌러 주세요.'
          : pending.method === 'transfer'
            ? '입금 알림을 확인한 뒤 눌러 주세요.'
            : '돈을 받은 뒤 눌러 주세요.'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={back} className={BUTTON}>
          돌아가기
        </button>
        <button
          type="button"
          onClick={() => record(pending.id)}
          className={`${BUTTON} border-black`}
        >
          판매 기록하기
        </button>
      </div>
    </section>
  )
}

function Settings() {
  const settings = useCounter((s) => s.settings)
  const setSettings = useCounter((s) => s.setSettings)
  const input = 'w-full min-w-0 border border-gray-300 px-3 py-2'
  const toNumber = (v: string) => {
    const n = Number(v)
    return v !== '' && Number.isInteger(n) && n > 0 ? n : null
  }

  return (
    <details className="border-t border-gray-300 pt-4">
      <summary className="cursor-pointer">설정</summary>
      <div className="mt-4 flex flex-col gap-4">
        <p>이 기기에만 저장됩니다.</p>
        <label className="flex flex-col gap-1">
          손님에게 보여줄 계좌
          <textarea
            rows={2}
            value={settings.account}
            onChange={(e) => setSettings({ account: e.target.value })}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1">
          사은품 기준 금액 (원)
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={settings.giftAmountKrw ?? ''}
            onChange={(e) =>
              setSettings({ giftAmountKrw: toNumber(e.target.value) })
            }
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1">
          사은품 기준 개수
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={settings.giftCount ?? ''}
            onChange={(e) =>
              setSettings({ giftCount: toNumber(e.target.value) })
            }
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1">
          사은품 이름
          <input
            value={settings.giftName}
            onChange={(e) => setSettings({ giftName: e.target.value })}
            className={input}
          />
        </label>
      </div>
    </details>
  )
}
