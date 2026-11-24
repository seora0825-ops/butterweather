'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { imageUrl } from '@/lib/images'
import { formatKRW } from '@/lib/queries/products'
import { cartTotalKrw, useCart, useCartLines } from '@/lib/store/cart'
import { amountUntilFreeShipping, shippingFee } from '@/lib/shipping'
import { alreadyOrderedVariantIds } from './actions'

/**
 * 장바구니. 주소는 `/cart` 다.
 *
 * **서랍(drawer)이 아니라 화면이다.** 옛 레포는 `openCart` 같은 상태만
 * 만들어두고 화면을 끝내지 않았다 — 계승할 것이 없어 새로 정했다.
 * 서랍은 화면 위에 큰 면을 덮는데, 계승한 디자인은 **얇은 선으로 나뉜
 * 인쇄물**이라 그 위에 떠 있는 면이 어울리지 않는다 (foundation.md 5-6절
 * 「UI 는 면을 갖지 않고 틈에 산다」).
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

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 text-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">장바구니</h1>
        <p>{lines.length}개 품목</p>
      </header>

      {orderedInCart.length > 0 && (
        <section
          aria-label="이미 주문한 상품"
          className="space-y-3 border border-gray-300 p-3"
        >
          <p>최근에 주문하신 상품이 {orderedInCart.length}개 담겨 있습니다.</p>
          <button
            type="button"
            onClick={() => orderedInCart.forEach(remove)}
            className="border border-gray-300 px-3 py-2"
          >
            이미 주문한 것 빼기
          </button>
        </section>
      )}

      {lines.length === 0 ? (
        <section aria-label="빈 장바구니" className="space-y-3">
          <p>담긴 것이 없습니다.</p>
          <Link href="/" className="underline">
            상품 보러 가기
          </Link>
        </section>
      ) : (
        <>
          <ul className="divide-y divide-gray-300 border-y border-gray-300">
            {lines.map((line) => (
              <li key={line.variantId} className="space-y-3 py-3">
                <div className="flex items-start gap-3">
                  {line.image && (
                    <div className="relative size-20 shrink-0 overflow-hidden">
                      <Image
                        src={imageUrl(line.image)}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0 wrap-anywhere">
                    <Link href={`/products/${line.slug}`} className="underline">
                      {line.productName}
                    </Link>
                    <p>{line.variantName}</p>
                    <p>{formatKRW(line.priceKrw)}</p>
                  </div>
                </div>

                {/* 수량 — 상세와 같은 − 1 + 이다 */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity(line.variantId, line.quantity - 1)
                      }
                      aria-label="수량 줄이기"
                      className="size-8 border border-gray-300"
                    >
                      −
                    </button>
                    <span aria-live="polite">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity(line.variantId, line.quantity + 1)
                      }
                      disabled={line.quantity >= line.stock}
                      aria-label="수량 늘리기"
                      className="size-8 border border-gray-300 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  <p>{formatKRW(line.priceKrw * line.quantity)}</p>
                  <button
                    type="button"
                    onClick={() => remove(line.variantId)}
                    className="px-2 py-1 underline"
                  >
                    빼기
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <section aria-label="주문 금액" className="space-y-3">
            <dl className="space-y-2">
              <div className="flex justify-between gap-2">
                <dt>상품</dt>
                <dd>{formatKRW(itemsKrw)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>배송비</dt>
                <dd>{shippingKrw === 0 ? '무료' : formatKRW(shippingKrw)}</dd>
              </div>
              <div className="flex justify-between gap-2 border-t border-gray-300 pt-2 font-semibold">
                <dt>합계</dt>
                <dd>{formatKRW(total)}</dd>
              </div>
            </dl>
            {untilFree > 0 && (
              <p>{formatKRW(untilFree)} 더 담으면 배송비가 무료입니다.</p>
            )}
            <Link
              href="/checkout"
              className="block border border-gray-300 px-3 py-2 text-center"
            >
              주문하기
            </Link>
            <p>주문서에서 배송지를 입력받습니다.</p>
          </section>
        </>
      )}
    </main>
  )
}
