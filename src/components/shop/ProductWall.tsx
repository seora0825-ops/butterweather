'use client'

import { useId, useState } from 'react'
import Image from 'next/image'
import type { ProductListItem } from '@/types/product'
import { ChevronIcon } from './icons'
import ProductTile from './ProductTile'

/**
 * 상품 벽. 물건 사이에 **일러스트 한 장이 칸으로 끼어든다**
 * (foundation.md 5-15절 — 룩북을 따로 두면 뎁스가 된다).
 *
 * 처음 세 개 뒤에 한 장, 그 뒤로 아홉 개마다 한 장. 그림보다 물건이 늘
 * 먼저 보여야 하고, 물건이 넷보다 적으면 끼우지 않는다.
 */
const FIRST = 3
const EVERY = 9

const SORTS = [
  { id: 'new', label: '신상품순' },
  { id: 'low', label: '낮은 가격순' },
  { id: 'high', label: '높은 가격순' },
] as const

type Sort = (typeof SORTS)[number]['id']

function sortProducts(products: ProductListItem[], sort: Sort) {
  if (sort === 'new') return products
  const dir = sort === 'low' ? 1 : -1
  return [...products].sort((a, b) => dir * (a.min_price_krw - b.min_price_krw))
}

export default function ProductWall({
  title,
  products,
  art,
}: {
  title: string
  products: ProductListItem[]
  /** 사이에 끼울 그림. 다 쓰면 더 끼우지 않는다 */
  art: string[]
}) {
  const [sort, setSort] = useState<Sort>('new')
  const selectId = useId()
  const sorted = sortProducts(products, sort)

  const cells: React.ReactNode[] = []
  sorted.forEach((product, i) => {
    const slot = i - FIRST
    const artIndex = slot / EVERY
    if (slot >= 0 && slot % EVERY === 0 && art[artIndex]) {
      cells.push(
        <li
          key={`art-${art[artIndex]}`}
          aria-hidden
          className="relative min-h-full overflow-hidden"
        >
          <Image
            src={art[artIndex]}
            alt=""
            fill
            unoptimized
            className="scale-[1.03] object-cover"
          />
        </li>
      )
    }
    cells.push(
      <li key={product.id}>
        <ProductTile product={product} priority={i < 4} />
      </li>
    )
  })

  return (
    <section aria-labelledby={`${selectId}-title`}>
      <div className="flex min-h-16 items-center justify-between gap-4 px-3 md:px-4">
        <h2
          id={`${selectId}-title`}
          className="text-xl font-extrabold tracking-tight md:text-2xl"
        >
          {title}{' '}
          <span className="text-ink-muted font-medium tabular-nums">
            {products.length}
          </span>
        </h2>
        {products.length > 1 && (
          <div className="relative">
            <label htmlFor={selectId} className="sr-only">
              정렬
            </label>
            <select
              id={selectId}
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="border-ink bg-cloud h-11 appearance-none rounded-full border-2 pr-10 pl-4 text-[15px] font-semibold"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <ChevronIcon />
            </span>
          </div>
        )}
      </div>

      {products.length === 0 ? (
        <p className="text-ink-muted px-3 py-16 text-center text-base">
          아직 상품이 없습니다.
        </p>
      ) : (
        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {cells}
        </ul>
      )}
    </section>
  )
}
