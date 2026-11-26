'use client'

import { useEffect, useState } from 'react'
import { Button, Checkbox, Notice, PageHeader } from '@/components/admin/ui'
import { numberOf } from '@/lib/productTags'
import { listProductDetails } from '@/lib/queries/adminProducts'
import { formatKRW } from '@/lib/queries/products'
import type { ProductDetail } from '@/types/product'
import styles from './print.module.css'

type ProductList =
  | { state: 'loading' | 'error' }
  | { state: 'ready'; products: ProductDetail[] }

type Card = { product: ProductDetail; number: string }

function paginate(cards: Card[], perSheet: number) {
  return Array.from(
    { length: Math.ceil(cards.length / perSheet) },
    (_, index) => cards.slice(index * perSheet, (index + 1) * perSheet)
  )
}

function PrintCard({ product, number }: Card) {
  const price = product.variants.length
    ? Math.min(...product.variants.map((variant) => variant.price_krw))
    : null

  return (
    <article className={styles.card}>
      <p className={`font-hand ${styles.number}`}>{number}</p>
      <div>
        <p
          lang={product.name_en ? 'en' : undefined}
          className={`font-sans font-extrabold text-balance ${styles.name}`}
        >
          {product.name_en || product.name}
        </p>
        <p className={`tabular-nums ${styles.price}`}>
          {price === null ? '—' : formatKRW(price)}
        </p>
      </div>
    </article>
  )
}

export default function AdminPrintPage() {
  const [list, setList] = useState<ProductList>({ state: 'loading' })
  const [includeHidden, setIncludeHidden] = useState(true)

  useEffect(() => {
    let alive = true
    listProductDetails().then(
      (products) => {
        if (alive) setList({ state: 'ready', products })
      },
      () => {
        if (alive) setList({ state: 'error' })
      }
    )
    return () => {
      alive = false
    }
  }, [])

  const products =
    list.state === 'ready'
      ? list.products.filter((product) => includeHidden || product.is_active)
      : []
  const cards = products
    .flatMap((product) => {
      const number = numberOf(product.tags)
      return number === null ? [] : [{ product, number }]
    })
    .sort((a, b) => Number(a.number) - Number(b.number))
  const bracelets = cards.filter(
    ({ product }) => product.category === 'bracelet'
  )
  const labels = cards.filter(({ product }) => product.category !== 'bracelet')
  const missingNumbers = products.length - cards.length

  const sheets = [
    ...paginate(bracelets, 2).map((cards) => ({
      cards,
      type: 'bracelet' as const,
    })),
    ...paginate(labels, 10).map((cards) => ({ cards, type: 'label' as const })),
  ]

  return (
    <>
      <div className="space-y-4 print:hidden">
        <PageHeader
          title="칸 카드 인쇄"
          actions={
            <Button
              variant="primary"
              disabled={sheets.length === 0}
              onClick={async () => {
                await document.fonts.ready
                window.print()
              }}
            >
              인쇄하기
            </Button>
          }
        />
        <label className="flex min-h-11 w-fit items-center gap-2 text-sm font-medium">
          <Checkbox
            checked={includeHidden}
            onChange={(event) => setIncludeHidden(event.target.checked)}
          />
          감춘 상품도 넣기
        </label>
        {list.state === 'loading' && <Notice>상품을 불러오는 중입니다.</Notice>}
        {list.state === 'error' && (
          <Notice tone="error">
            상품을 불러오지 못했습니다. 새로고침해 주세요.
          </Notice>
        )}
        {list.state === 'ready' && (
          <p role="status" className="text-ink-muted text-sm tabular-nums">
            팔찌 카드 {bracelets.length}장 · 이름표 {labels.length}장 · A4{' '}
            {sheets.length}쪽
          </p>
        )}
        {missingNumbers > 0 && (
          <Notice>번호가 없는 상품 {missingNumbers}개는 빠졌습니다.</Notice>
        )}
      </div>
      {sheets.length > 0 && (
        <div className={styles.preview}>
          {sheets.map(({ cards, type }) => (
            <div
              key={cards[0].product.id}
              className={`${styles.sheet} ${styles[type]}`}
            >
              {cards.map((card) => (
                <PrintCard key={card.product.id} {...card} />
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
