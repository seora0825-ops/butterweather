import Image from 'next/image'
import Link from 'next/link'
import { findCategory } from '@/lib/categories'
import { imageUrl } from '@/lib/images'
import { numberOf } from '@/lib/productTags'
import { formatKRW } from '@/lib/queries/products'
import type { ProductListItem } from '@/types/product'

/**
 * 첫 장면 「오늘의 날씨」 — **물건 하나와 착용 사진 하나.**
 *
 * 상품 이름이 날씨라서 첫 화면을 일기예보처럼 짠다. 매주 하나를 골라
 * (`today` tag) 그 카테고리의 보드색 위에 크게 놓는다. 피그마 그림을 바탕에
 * 깔지 않는다 — 그림을 옮기는 것이 아니라 그림의 규칙(단색 면, 선명한 경계,
 * 손글씨는 작게)을 옮긴다. 근거는 2026-11-26 홈 컨셉.
 *
 * 보드 위 흰 글자는 크게만 쓴다(globals.css 의 board 주석).
 */
export default function TodayWeather({
  product,
  wear,
}: {
  product: ProductListItem
  /** 착용 사진. 하루의 장면 안에서 찍은 것 */
  wear: { src: string; alt: string }
}) {
  const category = findCategory(product.category)
  const no = numberOf(product.tags)
  const soldOut = product.status === 'sold_out' || product.total_stock <= 0

  return (
    <section
      aria-label="오늘의 날씨"
      className="border-ink grid border-b-2 md:grid-cols-3"
    >
      {/* 사진 위에 글자를 얹지 않는다 — 사진마다 바탕이 달라 글자가 묻힌다.
          글자는 카테고리 보드 한 면에 따로 둔다(선명한 경계) */}
      <Link
        href={`/products/${product.slug}`}
        className="group relative block aspect-[4/5] overflow-hidden bg-white focus-visible:z-10"
      >
        {product.images[0] && (
          <Image
            src={imageUrl(product.images[0])}
            alt=""
            fill
            priority
            sizes="(min-width: 768px) 34vw, 100vw"
            className="ease-out-expo object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        )}
      </Link>
      <Link
        href={`/products/${product.slug}`}
        className={`${category?.board ?? 'bg-board-ink'} group border-ink flex flex-col justify-between gap-10 border-t-2 p-5 text-white focus-visible:z-10 md:order-first md:border-t-0 md:border-r-2 md:p-7`}
      >
        <span className="font-hand block -rotate-3 text-4xl leading-none">
          오늘의 날씨
        </span>
        <span className="block">
          {no && (
            <span className="font-hand block text-6xl leading-none">{no}</span>
          )}
          <span className="mt-2 block text-4xl leading-[1.04] font-extrabold tracking-tight text-balance group-hover:underline group-hover:decoration-4 group-hover:underline-offset-8 lg:text-5xl">
            {product.name}
          </span>
          <span className="mt-4 block text-xl font-bold tabular-nums">
            {category?.label} ·{' '}
            {soldOut ? 'Sold out' : formatKRW(product.min_price_krw)}
          </span>
        </span>
      </Link>
      <div className="border-ink relative aspect-[4/5] border-t-2 md:border-t-0 md:border-l-2">
        <Image
          src={wear.src}
          alt={wear.alt}
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          className="object-cover"
        />
      </div>
    </section>
  )
}
