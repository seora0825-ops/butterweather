'use client'

import { useEffect, useId, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import EmptyState from '@/components/shop/EmptyState'
import PostcodeButton from '@/components/shop/PostcodeButton'
import { button } from '@/components/shop/button'
import { imageUrl } from '@/lib/images'
import { hasVariantName } from '@/lib/orders'
import { formatKRW } from '@/lib/queries/products'
import { shippingFee } from '@/lib/shipping'
import { cartTotalKrw, useCart, useCartLines } from '@/lib/store/cart'
import type { ShippingInfo } from '@/types/order'
import { createOrder } from './actions'
import { startPayment } from './payapp'

/**
 * 주문서. **여기 보이는 합계는 보여주기 위한 것이다** — 실제 금액은 서버가
 * DB 에서 다시 읽어 센다 (`actions.ts`).
 */
const EMPTY: ShippingInfo = {
  name: '',
  phone: '',
  zipcode: '',
  address: '',
  addressDetail: '',
  memo: '',
}

const INPUT =
  'h-12 w-full rounded-xl border-2 border-ink bg-white px-4 text-base'

function Field({
  label,
  optional = false,
  ...props
}: {
  label: string
  optional?: boolean
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-bold">
        {label}
        {optional && (
          <span className="text-ink-muted font-medium"> (선택)</span>
        )}
      </label>
      <input id={id} required={!optional} className={INPUT} {...props} />
    </div>
  )
}

export default function CheckoutForm({
  lastShipping,
}: {
  lastShipping: ShippingInfo | null
}) {
  const lines = useCartLines()
  const remove = useCart((s) => s.remove)

  // 옛 주문에 빠진 칸이 있을 수 있어 EMPTY 를 바닥에 깐다
  const [shipping, setShipping] = useState<ShippingInfo>({
    ...EMPTY,
    ...lastShipping,
    memo: '',
  })
  const [prefilled, setPrefilled] = useState(lastShipping !== null)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeMarketing, setAgreeMarketing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gone, setGone] = useState<string[]>([])
  /** 주문은 만들어졌는데 결제창을 못 연 것. 여기서 또 누르면 주문이 둘이 된다 */
  const [madeOrder, setMadeOrder] = useState<string | null>(null)

  // 결제창에서 「뒤로」 오면 떠날 때의 화면이 되살아난다(bfcache).
  // 주문은 이미 만들어져 있으므로 그리로 보낸다
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) setBusy(false)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  const itemsKrw = cartTotalKrw(lines)
  const feeKrw = shippingFee(itemsKrw)

  function set(patch: Partial<ShippingInfo>) {
    setShipping((s) => ({ ...s, ...patch }))
    // 한 글자라도 고치면 더 이상 「지난 주문의 배송지」가 아니다
    if (!('memo' in patch)) setPrefilled(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setGone([])
    setBusy(true)
    try {
      // **가격을 보내지 않는다.** 어느 옵션을 몇 개인지만 보낸다
      const order = await createOrder(
        lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        shipping,
        agreeMarketing
      )
      if (!order.ok) {
        // 서버는 조회되지 않는 줄의 이름을 모른다. 장바구니가 안다
        const ids = order.goneVariantIds ?? []
        const names = lines
          .filter((l) => ids.includes(l.variantId))
          .map((l) => l.productName)
        setError(
          names.length > 0
            ? `${order.reason} (${names.join(', ')})`
            : order.reason
        )
        setGone(ids)
        setBusy(false)
        return
      }

      setMadeOrder(order.orderNo)
      const payment = await startPayment(order.orderNo)
      if (payment.ok) {
        // 장바구니는 **결제가 확정된 뒤에** 비운다 (PaymentReturn)
        window.location.assign(payment.payUrl)
        return
      }
      setError(payment.reason)
    } catch {
      setError(
        '주문하지 못했습니다. 주문 내역을 먼저 확인해 주세요. 담아둔 것은 그대로 있습니다.'
      )
    }
    setBusy(false)
  }

  if (lines.length === 0) {
    return <EmptyState motif="watering-can" message="담긴 것이 없습니다." />
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-10">
      <section aria-labelledby="shipping" className="space-y-5">
        <div className="border-ink flex min-h-11 items-center justify-between gap-3 border-t-2 pt-4">
          <h2 id="shipping" className="text-xl font-extrabold tracking-tight">
            배송지
          </h2>
          {prefilled && (
            <button
              type="button"
              onClick={() => {
                setShipping(EMPTY)
                setPrefilled(false)
              }}
              className={button({ size: 'sm' })}
            >
              새로 입력
            </button>
          )}
        </div>
        {prefilled && <p>지난 주문의 배송지입니다.</p>}

        <Field
          label="받는 분"
          value={shipping.name}
          onChange={(e) => set({ name: e.target.value })}
          maxLength={40}
          autoComplete="name"
        />
        <Field
          label="휴대폰 번호"
          value={shipping.phone}
          onChange={(e) => set({ phone: e.target.value })}
          type="tel"
          inputMode="tel"
          maxLength={20}
          pattern="01[0-9][ \-]?[0-9]{3,4}[ \-]?[0-9]{4}"
          title="010으로 시작하는 휴대폰 번호"
          autoComplete="tel-national"
        />
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-36">
            <Field
              label="우편번호"
              value={shipping.zipcode}
              onChange={(e) => set({ zipcode: e.target.value })}
              inputMode="numeric"
              maxLength={10}
              autoComplete="postal-code"
            />
          </div>
          <PostcodeButton onSelect={set} />
        </div>
        <Field
          label="주소"
          value={shipping.address}
          onChange={(e) => set({ address: e.target.value })}
          maxLength={200}
          autoComplete="street-address"
        />
        <Field
          label="상세 주소"
          optional
          value={shipping.addressDetail}
          onChange={(e) => set({ addressDetail: e.target.value })}
          maxLength={100}
          autoComplete="address-line2"
        />
        <Field
          label="배송 메모"
          optional
          value={shipping.memo}
          onChange={(e) => set({ memo: e.target.value })}
          maxLength={100}
        />
      </section>

      <section aria-labelledby="items" className="space-y-4">
        <h2
          id="items"
          className="border-ink border-t-2 pt-4 text-xl font-extrabold tracking-tight"
        >
          주문 상품
        </h2>
        <ul className="divide-line divide-y">
          {lines.map((l) => (
            <li key={l.variantId} className="flex items-center gap-4 py-3">
              <span className="aspect-tile border-line relative w-14 shrink-0 overflow-hidden border bg-white">
                {l.image && (
                  <Image
                    src={imageUrl(l.image)}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{l.productName}</span>
                <span className="text-ink-muted block text-[15px]">
                  {hasVariantName(l.variantName) && `${l.variantName} · `}
                  {l.quantity}개
                </span>
              </span>
              <span className="shrink-0 tabular-nums">
                {formatKRW(l.priceKrw * l.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="border-line space-y-1 border-t pt-4 tabular-nums">
          <div className="flex justify-between gap-2">
            <dt>상품</dt>
            <dd>{formatKRW(itemsKrw)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>배송비</dt>
            <dd>{feeKrw === 0 ? '무료' : formatKRW(feeKrw)}</dd>
          </div>
        </dl>
      </section>

      <section
        aria-label="동의"
        className="border-ink space-y-2 border-t-2 pt-4"
      >
        <label className="flex min-h-11 items-start gap-3 py-2">
          <input
            type="checkbox"
            required
            checked={agreePrivacy}
            onChange={(e) => setAgreePrivacy(e.target.checked)}
            className="mt-0.5 size-5 shrink-0"
          />
          <span>
            <strong>[필수]</strong> 개인정보 수집·이용에 동의합니다.
            <span className="text-ink-muted mt-1 block text-[15px]">
              배송을 위해 받는 분·연락처·주소를 수집하며, 배송 완료 후 관련
              법령에 따라 보관합니다.
            </span>
          </span>
        </label>
        <label className="flex min-h-11 items-start gap-3 py-2">
          <input
            type="checkbox"
            checked={agreeMarketing}
            onChange={(e) => setAgreeMarketing(e.target.checked)}
            className="mt-0.5 size-5 shrink-0"
          />
          <span>[선택] 새 상품 소식을 받아보겠습니다.</span>
        </label>
      </section>

      <div className="border-ink bg-cloud sticky bottom-0 -mx-4 border-t-2 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:px-0">
        {error && (
          <div role="alert" className="space-y-3 pb-3">
            <p>{error}</p>
            {gone.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  gone.forEach(remove)
                  setGone([])
                  setError(null)
                }}
                className={button({ size: 'sm' })}
              >
                살 수 없는 것 빼기
              </button>
            )}
          </div>
        )}
        <p className="mb-3 flex justify-between gap-2 text-xl font-extrabold tabular-nums">
          합계 <span>{formatKRW(itemsKrw + feeKrw)}</span>
        </p>
        {madeOrder && !busy ? (
          <Link
            href={`/orders/${madeOrder}`}
            className={button({ tone: 'primary', size: 'full' })}
          >
            주문 내역에서 결제하기
          </Link>
        ) : (
          <button
            type="submit"
            disabled={busy}
            className={button({ tone: 'primary', size: 'full' })}
          >
            {busy ? '결제를 여는 중…' : '결제하기'}
          </button>
        )}
      </div>
    </form>
  )
}
