'use client'

import { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import DeleteProductButton from '@/components/admin/DeleteProductButton'
import {
  Badge,
  Button,
  ButtonLink,
  EmptyState,
  FilterBar,
  Notice,
  PageHeader,
  Select,
  Table,
  TextField,
  numericCell,
} from '@/components/admin/ui'
import { useListFilters } from '@/components/admin/useListFilters'
import { imageUrl } from '@/lib/images'
import { numberOf, TODAY_TAG } from '@/lib/productTags'
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
  { label: '가격', numeric: true },
  { label: '재고', numeric: true },
  '상태',
  '노출',
  '관리',
] as const
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
    <Suspense fallback={<Notice>상품을 불러오는 중입니다.</Notice>}>
      <ProductList />
    </Suspense>
  )
}

function ProductList() {
  const [list, setList] = useState<ProductList>({ state: 'loading' })
  const [revision, setRevision] = useState(0)
  const [deleteResult, setDeleteResult] = useState<
    'success' | 'refresh-failed' | null
  >(null)

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
      <PageHeader
        title="상품 목록"
        count={list.state === 'ready' ? `${visible.length}개` : undefined}
        actions={
          <>
            <ButtonLink href="/admin/products/bulk">한 번에 등록</ButtonLink>
            <ButtonLink href="/admin/products/new" variant="primary">
              상품 추가
            </ButtonLink>
          </>
        }
      />
      <FilterBar
        label="상품 검색과 필터"
        className="grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]"
      >
        <label className="col-span-2 space-y-1 lg:col-span-1">
          <span>이름 검색</span>
          <TextField
            type="search"
            value={search}
            onChange={(event) => setFilters({ q: event.target.value })}
          />
        </label>
        {FILTER_FIELDS.map(([key, label]) => {
          const options = FILTER_OPTIONS[key]
          const value = params.get(key) ?? ''
          return (
            <label key={key} className="space-y-1">
              <span>{label}</span>
              <Select
                value={Object.hasOwn(options, value) ? value : ''}
                onChange={(event) => setFilters({ [key]: event.target.value })}
              >
                {Object.entries(options).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </Select>
            </label>
          )
        })}
      </FilterBar>

      <SaveNotice />
      {deleteResult && (
        <Notice tone="success">
          상품을 지웠습니다.
          {deleteResult === 'refresh-failed' &&
            ' 가게에 반영되기까지 잠시 기다려 주세요.'}
        </Notice>
      )}
      {list.state === 'loading' && <Notice>상품을 불러오는 중입니다.</Notice>}
      {list.state === 'error' && (
        <div className="space-y-2">
          <Notice tone="error">
            상품을 불러오지 못했습니다. 다시 불러와 주세요.
          </Notice>
          <Button onClick={reload}>다시 불러오기</Button>
        </div>
      )}
      {list.state === 'ready' &&
        (visible.length === 0 ? (
          <EmptyState
            action={
              list.products.length > 0 && (
                <Button
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
                </Button>
              )
            }
          >
            {list.products.length
              ? '조건에 맞는 상품이 없습니다.'
              : '등록된 상품이 없습니다.'}
          </EmptyState>
        ) : (
          <Table label="상품 목록" columns={COLUMNS} responsive>
            {visible.map((product) => {
              const number = numberOf(product.tags)
              const soldOut =
                product.stock === 0 || product.status === 'sold_out'
              const cells = [
                <div
                  key="photo"
                  className="border-line bg-cloud relative size-12 overflow-hidden rounded-sm border"
                >
                  {product.images[0] && (
                    <Image
                      src={imageUrl(product.images[0])}
                      alt=""
                      unoptimized
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  )}
                </div>,
                <div key="name" className="min-w-0">
                  <p className="font-semibold">{product.name}</p>
                  <div className="text-ink-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span>{product.slug}</span>
                    {number && <span>No.{number}</span>}
                    {product.tags?.includes(TODAY_TAG) && (
                      <Badge>오늘의 날씨</Badge>
                    )}
                  </div>
                </div>,
                CATEGORY_LABELS[product.category],
                product.minPrice === null
                  ? '—'
                  : `${krw(product.minPrice)}원${product.variants.length > 1 ? '부터' : ''}`,
                `${product.stock}개`,
                <Badge key="stock" tone={soldOut ? 'emphasis' : 'neutral'}>
                  {soldOut ? '품절' : '판매 중'}
                </Badge>,
                <Badge
                  key="visibility"
                  tone={product.is_active ? 'neutral' : 'strong'}
                >
                  {product.is_active ? '보임' : '감춤'}
                </Badge>,
                <div
                  key="actions"
                  className="flex flex-wrap items-center gap-1"
                >
                  <ButtonLink
                    href={`/admin/products/${product.id}/edit`}
                    variant="ghost"
                  >
                    수정
                  </ButtonLink>
                  <DeleteProductButton
                    id={product.id}
                    name={product.name}
                    onDeleted={(refreshFailed) => {
                      setDeleteResult(
                        refreshFailed ? 'refresh-failed' : 'success'
                      )
                      reload()
                    }}
                  />
                </div>,
              ]
              return (
                <tr
                  key={product.id}
                  role="row"
                  className={`border-line grid grid-cols-6 items-start gap-3 rounded-md border p-3 lg:table-row lg:rounded-none lg:border-x-0 lg:border-t-0 lg:last:border-b-0 ${product.is_active ? 'bg-white' : 'bg-cloud'}`}
                >
                  {cells.map((cell, index) => {
                    const column = COLUMNS[index]
                    const label =
                      typeof column === 'string' ? column : column.label
                    return (
                      <td
                        key={label}
                        role="cell"
                        className={`last:border-line col-span-2 min-w-0 wrap-anywhere first:col-span-1 last:col-span-6 last:border-t last:pt-2 lg:px-3 lg:py-2 lg:align-middle lg:last:border-t-0 [&:nth-child(2)]:col-span-5 [&:nth-child(2)]:self-center [&:nth-child(6)]:col-span-3 [&:nth-child(7)]:col-span-3 ${typeof column === 'string' ? '' : numericCell}`}
                      >
                        {index > 1 && index < cells.length - 1 && (
                          <span
                            aria-hidden="true"
                            className="text-ink-muted block text-xs lg:hidden"
                          >
                            {label}
                          </span>
                        )}
                        {cell}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </Table>
        ))}
    </div>
  )
}

function SaveNotice() {
  const params = useSearchParams()
  const refresh = params.get('shop-refresh')
  if (refresh !== 'failed' && refresh !== 'saved') return null
  return (
    <>
      <Notice tone="success">
        상품을 저장했습니다.
        {refresh === 'failed' && ' 가게에 반영되기까지 잠시 기다려 주세요.'}
      </Notice>
      {params.get('today-cleanup') === 'failed' && (
        <Notice tone="error">
          다른 상품의 ‘오늘의 날씨’ 표시를 모두 지우지 못했습니다. 오늘의 날씨로
          고른 상품을 다시 저장해 주세요.
        </Notice>
      )}
    </>
  )
}
