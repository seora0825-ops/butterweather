'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import EmptyState from '@/components/shop/EmptyState'
import QuantityStepper from '@/components/shop/QuantityStepper'
import { button } from '@/components/shop/button'
import { ORDERING_OPEN, ORDER_LABEL } from '@/lib/shopStatus'
import { hasVariantName } from '@/lib/orders'
import { imageUrl } from '@/lib/images'
import { formatKRW } from '@/lib/queries/products'
import {
  cartTotalKrw,
  useCart,
  useCartLines,
  type CartLine,
} from '@/lib/store/cart'
import { amountUntilFreeShipping, shippingFee } from '@/lib/shipping'
import { alreadyOrderedVariantIds } from './actions'

/**
 * 장바구니. 주소는 `/cart` 다.
 *
 * **담긴 것은 브라우저에만 있다.** 그래서 이 화면은 client 다.
 *
 * ---
 *
 * ## 이미 산 것이 남아 있을 수 있다 ★ (2026-09-27)
 *
 * 결제가 끝나는 길이 셋인데 그중 **결제하고 탭을 닫는 경우**는 브라우저가
 * 없을 때 끝난다(웹훅). 그때는 비울 방법이 없어서, 다시 왔을 때 **물어본다.**
 *
 * **조용히 지우지 않는다.** 같은 물건을 또 살 수 있고 — 선물이면 더 그렇다 —
 * 말없이 사라지면 담은 것이 없어진 것처럼 보인다. `actions.ts` 참고.
 *
 * ⚠️ **여기 보이는 가격은 담을 때의 값이다.** 그 뒤에 값이 바뀌었을 수
 * 있다. 영수증의 숫자는 주문할 때 서버가 DB 에서 다시 읽는다
 * (schema.md 7-3절). 이 화면이 계산한 합계를 주문에 쓰지 말 것.
 */
export default function CartPage() {
  // 서버와 첫 client render는 빈 snapshot을 공유한다 (useCartLines 참고).
  const lines = useCartLines()
  const setQuantity = useCart((s) => s.setQuantity)
  const remove = useCart((s) => s.remove)
  const add = useCart((s) => s.add)
  const [removed, setRemoved] = useState<CartLine[]>([])
  const [ordered, setOrdered] = useState<string[]>([])

  // 담긴 것이 바뀔 때마다 다시 묻는다. 로그인하지 않았으면 빈 배열이 온다.
  // **effect 안에서 곧바로 setState 하지 않는다** — 답이 온 뒤에만 고친다
  useEffect(() => {
    const ids = lines.map((l) => l.variantId)
    if (ids.length === 0) return
    let alive = true
    alreadyOrderedVariantIds(ids)
      .then((found) => {
        if (alive) setOrdered(found)
      })
      .catch(() => {
        // 못 물어봤다고 장바구니를 못 쓰게 할 이유는 없다
      })
    return () => {
      alive = false
    }
  }, [lines])

  // **담긴 것에서 지워진 id 는 빼고 센다.** 답을 받아둔 뒤에 손님이
  // 직접 지웠을 수 있다 — 그때 안내가 남아 있으면 틀린 말이 된다
  const orderedInCart = ordered.filter((id) =>
    lines.some((l) => l.variantId === id)
  )

  const itemsKrw = cartTotalKrw(lines)
  const shippingKrw = shippingFee(itemsKrw)
  const total = itemsKrw + shippingKrw
  const untilFree = amountUntilFreeShipping(itemsKrw)

  function removeLines(removedLines: CartLine[]) {
    removedLines.forEach((line) => remove(line.variantId))
    setRemoved(removedLines)
  }

  function restoreLines() {
    removed.forEach(({ quantity, ...line }) => add(line, quantity))
    setRemoved([])
  }

  // 뺀 직후의 되돌리기. **합계 바로 위에 둔다** — 목록이 길면 맨 위의 안내는
  // 화면 밖이라 못 본다
  const undo = (
    <div role="status">
      {removed.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 pb-3">
          <p className="wrap-anywhere">
            {removed.length === 1
              ? `${removed[0].productName} 을(를) 뺐습니다.`
              : `상품 ${removed.length}개를 뺐습니다.`}
          </p>
          <button
            type="button"
            onClick={restoreLines}
            className={button({ size: 'sm' })}
          >
            되돌리기
          </button>
        </div>
      )}
    </div>
  )

  return (
    <main id="main" className="mx-auto max-w-2xl space-y-6 px-4 pt-8 text-base">
      <h1 className="text-2xl font-extrabold tracking-tight">장바구니</h1>

      {orderedInCart.length > 0 && (
        <section
          aria-label="이미 주문한 상품"
          className="border-ink space-y-2 border-t-2 pt-4"
        >
          <p>최근에 주문하신 상품이 {orderedInCart.length}개 담겨 있습니다.</p>
          <button
            type="button"
            onClick={() =>
              removeLines(
                lines.filter((line) => orderedInCart.includes(line.variantId))
              )
            }
            className={button({ size: 'sm' })}
          >
            이미 주문한 것 빼기
          </button>
        </section>
      )}

      {lines.length === 0 ? (
        <>
          {undo}
          <EmptyState motif="watering-can" message="담긴 것이 없습니다." />
        </>
      ) : (
        <>
          <ul className="divide-line border-ink divide-y border-t-2">
            {lines.map((line) => (
              <li key={line.variantId} className="flex items-start gap-4 py-4">
                <Link
                  href={`/products/${line.slug}`}
                  aria-hidden
                  tabIndex={-1}
                  className="aspect-tile border-line relative w-22 shrink-0 overflow-hidden border"
                >
                  {line.image && (
                    <Image
                      src={imageUrl(line.image)}
                      alt=""
                      fill
                      sizes="88px"
                      className="object-cover"
                    />
                  )}
                </Link>
                <div className="min-w-0 flex-1 space-y-2 wrap-anywhere">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <div className="min-w-0">
                      <Link
                        href={`/products/${line.slug}`}
                        className="font-bold hover:underline"
                      >
                        {line.productName}
                      </Link>
                      {hasVariantName(line.variantName) && (
                        <p className="text-ink-muted text-[15px]">
                          {line.variantName}
                        </p>
                      )}
                    </div>
                    <p className="font-bold tabular-nums">
                      {formatKRW(line.priceKrw * line.quantity)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <QuantityStepper
                      value={line.quantity}
                      min={1}
                      max={line.stock}
                      label={line.productName}
                      onChange={(quantity) =>
                        setQuantity(line.variantId, quantity)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => removeLines([line])}
                      aria-label={`${line.productName} 빼기`}
                      className={button({ size: 'sm' })}
                    >
                      빼기
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <section aria-label="주문 금액" className="space-y-1">
            <dl className="space-y-1 tabular-nums">
              <div className="flex justify-between gap-2">
                <dt>상품</dt>
                <dd>{formatKRW(itemsKrw)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>배송비</dt>
                <dd>{shippingKrw === 0 ? '무료' : formatKRW(shippingKrw)}</dd>
              </div>
            </dl>
            {untilFree > 0 && (
              <p className="text-ink-muted text-[15px]">
                {formatKRW(untilFree)} 더 담으면 배송비가 무료입니다.
              </p>
            )}
          </section>

          {/* 합계와 button 만 붙여 둔다. 금액을 전부 붙이면 작은 화면의
              3분의 1을 가린다 */}
          <section
            aria-label="합계"
            className="border-ink bg-cloud sticky bottom-0 z-10 -mx-4 border-t-2 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:px-0"
          >
            {undo}
            <p className="mb-3 flex justify-between gap-2 text-xl font-extrabold tabular-nums">
              합계 <span>{formatKRW(total)}</span>
            </p>
            {ORDERING_OPEN ? (
              <Link
                href="/checkout"
                className={button({ tone: 'primary', size: 'full' })}
              >
                {ORDER_LABEL}
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className={button({ size: 'full' })}
              >
                {ORDER_LABEL}
              </button>
            )}
          </section>
        </>
      )}
    </main>
  )
}
