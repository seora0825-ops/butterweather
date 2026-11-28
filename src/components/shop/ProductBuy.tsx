'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ORDERING_OPEN } from '@/lib/shopStatus'
import { cn } from '@/lib/cn'
import { formatKRW } from '@/lib/queries/products'
import { useCart, useCartLines } from '@/lib/store/cart'
import type { ProductDetail } from '@/types/product'
import { button } from './button'
import QuantityStepper from './QuantityStepper'

/** 이보다 적게 남으면 몇 개인지 말한다 */
const LOW_STOCK = 3

/**
 * 옵션 · 수량 · 담기. **담기 줄은 화면 아래에 붙어 있다** — 사진과 설명이
 * 길어도 손이 닿는다. 상세가 끝나면(Footer 앞) 같이 올라간다.
 */
export default function ProductBuy({ product }: { product: ProductDetail }) {
  const add = useCart((s) => s.add)
  const router = useRouter()
  const lines = useCartLines()
  const variants = product.variants
  const single = variants.length === 1

  const [picked, setPicked] = useState<string | null>(
    single ? variants[0].id : null
  )
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const options = useRef<HTMLFieldSetElement>(null)

  const stopped = product.status === 'sold_out'
  const available = (stock: number) => !stopped && stock > 0
  const soldOut = !variants.some((v) => available(v.stock))
  const variant = variants.find((v) => v.id === picked) ?? null

  // 이미 담아 둔 것까지 합쳐 재고를 넘지 못하게 한다. 넘겨도 장바구니가
  // 조용히 줄이는데, 그러면 「담았습니다」가 틀린 말이 된다
  const inCart = lines.find((l) => l.variantId === variant?.id)?.quantity ?? 0
  const room = variant ? Math.max(0, variant.stock - inCart) : 0
  /** 옵션도 재고도 하나. 수량을 고를 것이 없다 */
  const onlyOne = single && variants[0].stock === 1
  const full = variant !== null && available(variant.stock) && room === 0

  function pick(id: string) {
    setPicked(id)
    setQuantity(1)
    setAdded(false)
  }

  function addToCart() {
    if (!variant || room === 0) return
    add(
      {
        variantId: variant.id,
        productId: product.id,
        slug: product.slug,
        productName: product.name,
        variantName: variant.name,
        priceKrw: variant.price_krw,
        image: product.images[0] ?? null,
        stock: variant.stock,
      },
      Math.min(quantity, room)
    )
    setQuantity(1)
    setAdded(true)
  }

  /**
   * 장바구니를 거치지 않고 이 한 줄만 주문한다. **장바구니는 건드리지 않는다** —
   * 담아 둔 것까지 같이 결제되면 「바로 구매」가 거짓이 된다.
   */
  function buyNow() {
    if (!variant) return showOptions()
    const qty = Math.max(1, Math.min(quantity, variant.stock))
    router.push(`/checkout?buy=${variant.id}&qty=${qty}`)
  }

  /** 옵션이 화면 밖에 있을 수 있다. 잠긴 button 대신 그리로 데려간다 */
  function showOptions() {
    options.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    options.current
      ?.querySelector<HTMLInputElement>('input:not(:disabled)')
      ?.focus({ preventScroll: true })
  }

  const label = soldOut
    ? 'Sold out'
    : !variant
      ? '옵션 고르기'
      : full
        ? onlyOne
          ? '장바구니에 있습니다'
          : '재고를 모두 담았습니다'
        : '장바구니 담기'

  return (
    <>
      {!single && (
        <fieldset ref={options} className="mt-8">
          <legend className="mb-3 text-base font-bold">옵션</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const off = !available(v.stock)
              return (
                <label
                  key={v.id}
                  className={cn(
                    'relative inline-flex min-h-11 items-center rounded-full border-2 px-4 text-[15px] font-semibold has-focus-visible:outline-3 has-focus-visible:outline-offset-3',
                    off
                      ? 'border-line text-ink-muted line-through'
                      : 'border-ink has-checked:bg-ink has-checked:text-cloud cursor-pointer'
                  )}
                >
                  <input
                    type="radio"
                    name="variant"
                    value={v.id}
                    checked={picked === v.id}
                    disabled={off}
                    onChange={() => pick(v.id)}
                    className="absolute inset-0 cursor-[inherit] opacity-0"
                  />
                  {v.name}
                  {v.price_krw !== variants[0].price_krw &&
                    ` ${formatKRW(v.price_krw)}`}
                </label>
              )
            })}
          </div>
        </fieldset>
      )}

      {onlyOne && available(1) && (
        <p className="mt-6 text-[15px] font-semibold">하나뿐입니다.</p>
      )}

      {variant && !onlyOne && available(variant.stock) && (
        <div className="mt-6 flex items-center gap-4">
          <QuantityStepper
            value={quantity}
            max={Math.max(1, room)}
            onChange={(n) => {
              setQuantity(n)
              setAdded(false)
            }}
            label={product.name}
          />
          {variant.stock <= LOW_STOCK && (
            <p className="text-[15px] font-semibold">
              {variant.stock}개 남았습니다
            </p>
          )}
        </div>
      )}

      <div className="border-ink bg-cloud sticky bottom-0 z-20 -mx-4 mt-8 border-t-2 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:mx-0 lg:border-0 lg:px-0 lg:pt-0">
        <div role="status">
          {added && (
            <p className="flex items-center justify-between gap-3 pb-3 text-[15px] font-semibold">
              장바구니에 담았습니다
              <Link
                href="/cart"
                className="inline-flex min-h-11 items-center underline decoration-2 underline-offset-4"
              >
                장바구니 보기
              </Link>
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={variant ? addToCart : showOptions}
            disabled={soldOut || full}
            className={button({ tone: 'outline', size: 'full' })}
          >
            {label}
          </button>
          {/* 온라인 주문을 열기 전에는 잠근다(lib/shopStatus.ts). 관리자는 주소로 시험한다 */}
          <button
            type="button"
            onClick={buyNow}
            disabled={soldOut || !ORDERING_OPEN}
            className={button({
              tone: variant ? 'primary' : 'outline',
              size: 'full',
            })}
          >
            바로 구매
            {variant && !soldOut && ORDERING_OPEN && (
              <span className="ml-2 tabular-nums">
                {formatKRW(variant.price_krw * quantity)}
              </span>
            )}
          </button>
        </div>
        {!ORDERING_OPEN && !soldOut && (
          <p className="text-ink-muted pt-2 text-center text-sm">
            온라인 주문은 준비 중입니다. 매대에서 만나요.
          </p>
        )}
      </div>
    </>
  )
}
