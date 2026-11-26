'use client'

import { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import DeleteProductButton from '@/components/admin/DeleteProductButton'
import { useListFilters } from '@/components/admin/useListFilters'
import { imageUrl } from '@/lib/images'
import { listProductDetails } from '@/lib/queries/adminProducts'
import type { ProductCategory, ProductDetail } from '@/types/product'

import { krw } from '@/lib/orders'

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  bracelet: '팔찌',
  necklace: '목걸이',
  ring: '반지',
  keyring: '키링',
}

const COLUMNS = [
  '사진',
  '이름',
  '카테고리',
  '가격',
  '재고',
  '상태',
  '노출',
  '관리',
]
const FILTER_OPTIONS = {
  category: { '': '전체', ...CATEGORY_LABELS },
  visibility: { '': '전체', shown: '보임', hidden: '감춤' },
  stock: { '': '전체', available: '남음', sold_out: '품절' },
  sort: { '': '최신순', name: '이름순', stock: '재고 적은 순' },
}
const FILTER_FIELDS = [
  ['category', '카테고리'],
  ['visibility', '노출'],
  ['stock', '재고'],
  ['sort', '정렬'],
] as const
const FIELD = 'w-full min-w-0 border border-gray-300 px-3 py-2'

type ProductRow = ProductDetail & { stock: number; minPrice: number | null }
type ProductList =
  | { state: 'loading' | 'error' }
  | { state: 'ready'; products: ProductRow[] }

function toRow(product: ProductDetail): ProductRow {
  return {
    ...product,
    stock: product.variants.reduce((sum, variant) => sum + variant.stock, 0),
    minPrice: product.variants.length
      ? Math.min(...product.variants.map((variant) => variant.price_krw))
      : null,
  }
}

/** 브라우저가 세션을 갱신하고, 감춘 상품의 조회 범위는 RLS가 정한다. */
export default function AdminProductsPage() {
  return (
    <Suspense fallback={<p role="status">상품을 불러오는 중입니다.</p>}>
      <ProductList />
    </Suspense>
  )
}

function ProductList() {
  const [list, setList] = useState<ProductList>({ state: 'loading' })
  const [revision, setRevision] = useState(0)
  const [deleteRefreshFailed, setDeleteRefreshFailed] = useState(false)

  useEffect(() => {
    let alive = true
    listProductDetails().then(
      (products) => {
        if (alive) setList({ state: 'ready', products: products.map(toRow) })
      },
      () => {
        if (alive) setList({ state: 'error' })
      }
    )
    return () => {
      alive = false
    }
  }, [revision])

  function reload() {
    setList({ state: 'loading' })
    setRevision((value) => value + 1)
  }

  const { params, search, setFilters } = useListFilters()
  const category = params.get('category')
  const visibility = params.get('visibility')
  const stock = params.get('stock')
  const sort = params.get('sort')
  const nameQuery = search.trim().normalize().toLowerCase()
  const visible =
    list.state === 'ready'
      ? list.products
          .filter((product) => {
            const soldOut = product.stock === 0 || product.status === 'sold_out'
            return (
              product.name.normalize().toLowerCase().includes(nameQuery) &&
              (!category ||
                !Object.hasOwn(CATEGORY_LABELS, category) ||
                product.category === category) &&
              (visibility !== 'shown' || product.is_active) &&
              (visibility !== 'hidden' || !product.is_active) &&
              (stock !== 'available' || !soldOut) &&
              (stock !== 'sold_out' || soldOut)
            )
          })
          .sort((a, b) => {
            const latest = Date.parse(b.created_at) - Date.parse(a.created_at)
            if (sort === 'name')
              return a.name.localeCompare(b.name, 'ko') || latest
            if (sort === 'stock') return a.stock - b.stock || latest
            return latest
          })
      : []

  return (
    <div className="flex flex-col gap-6 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold">상품 목록</h1>
          {list.state === 'ready' && <p>{visible.length}개</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/products/bulk"
            className="border border-gray-300 px-3 py-2"
          >
            한 번에 등록
          </Link>
          <Link
            href="/admin/products/new"
            className="border border-gray-300 px-3 py-2"
          >
            새 상품
          </Link>
        </div>
      </div>

      <div
        role="group"
        aria-label="상품 검색과 필터"
        className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]"
      >
        <label className="col-span-2 space-y-1 lg:col-span-1">
          <span>이름 검색</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setFilters({ q: event.target.value })}
            className={FIELD}
          />
        </label>
        {FILTER_FIELDS.map(([key, label]) => {
          const options = FILTER_OPTIONS[key]
          const value = params.get(key) ?? ''
          return (
            <label key={key} className="space-y-1">
              <span>{label}</span>
              <select
                className={FIELD}
                value={Object.hasOwn(options, value) ? value : ''}
                onChange={(event) => setFilters({ [key]: event.target.value })}
              >
                {Object.entries(options).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          )
        })}
      </div>

      <SaveNotice />
      {deleteRefreshFailed && (
        <p role="status">
          상품을 지웠습니다. 가게에 반영되기까지 잠시 기다려 주세요.
        </p>
      )}
      {list.state === 'loading' && (
        <p role="status">상품을 불러오는 중입니다.</p>
      )}
      {list.state === 'error' && (
        <div>
          <p role="alert">상품을 불러오지 못했습니다. 다시 불러와 주세요.</p>
          <button type="button" onClick={reload} className="underline">
            다시 불러오기
          </button>
        </div>
      )}
      {list.state === 'ready' &&
        (visible.length === 0 ? (
          <div className="space-y-2">
            <p>조건에 맞는 상품이 없습니다</p>
            <button
              type="button"
              className="underline"
              onClick={() =>
                setFilters({
                  q: '',
                  category: '',
                  visibility: '',
                  stock: '',
                  sort: '',
                })
              }
            >
              필터 초기화
            </button>
          </div>
        ) : (
          <table
            role="table"
            aria-label="상품 목록"
            className="block w-full text-left lg:table"
          >
            <thead
              role="rowgroup"
              className="sr-only lg:not-sr-only lg:table-header-group"
            >
              <tr role="row" className="border-y border-gray-300">
                {COLUMNS.map((column) => (
                  <th
                    key={column}
                    role="columnheader"
                    scope="col"
                    className="px-2 py-3 font-medium"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody role="rowgroup" className="grid gap-3 lg:table-row-group">
              {visible.map((product) => {
                const cells = [
                  <div
                    key="photo"
                    className="relative size-14 overflow-hidden border border-gray-300"
                  >
                    {product.images[0] && (
                      <Image
                        src={imageUrl(product.images[0])}
                        alt=""
                        unoptimized
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    )}
                  </div>,
                  product.name,
                  CATEGORY_LABELS[product.category],
                  product.minPrice === null
                    ? '—'
                    : `${krw(product.minPrice)}원${product.variants.length > 1 ? '부터' : ''}`,
                  `${product.stock}개`,
                  product.status === 'sold_out' ? '품절' : '판매 중',
                  product.is_active ? '보임' : '감춤',
                  <div key="actions" className="space-y-2">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="underline"
                    >
                      수정하기
                    </Link>
                    <DeleteProductButton
                      id={product.id}
                      name={product.name}
                      onDeleted={(refreshFailed) => {
                        if (refreshFailed) setDeleteRefreshFailed(true)
                        reload()
                      }}
                    />
                  </div>,
                ]
                return (
                  <tr
                    key={product.id}
                    role="row"
                    className="grid grid-cols-2 items-start gap-3 border border-gray-300 p-3 lg:table-row lg:border-x-0 lg:border-t-0"
                  >
                    {cells.map((cell, index) => (
                      <td
                        key={COLUMNS[index]}
                        role="cell"
                        className="min-w-0 wrap-anywhere first:row-span-2 first:self-center first:justify-self-start last:col-span-2 last:border-t last:border-gray-300 last:pt-3 lg:px-2 lg:py-3 lg:align-middle lg:last:border-t-0"
                      >
                        {index > 1 && index < cells.length - 1 && (
                          <span
                            aria-hidden="true"
                            className="block text-gray-600 lg:hidden"
                          >
                            {COLUMNS[index]}
                          </span>
                        )}
                        {cell}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        ))}
    </div>
  )
}

function SaveNotice() {
  const params = useSearchParams()
  if (params.get('shop-refresh') !== 'failed') return null
  return (
    <p role="status">
      상품을 저장했습니다. 가게에 반영되기까지 잠시 기다려 주세요.
    </p>
  )
}
