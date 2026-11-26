'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Button,
  EmptyState,
  FilterBar,
  Notice,
  PageHeader,
  Select,
  Table,
  TextField,
  numericCell,
} from '@/components/admin/ui'
import { OrderBadge } from '@/components/admin/ui/OrderBadge'
import { useListFilters } from '@/components/admin/useListFilters'
import { hasVariantName, krw, ORDER_STATUS_LABEL } from '@/lib/orders'
import { formatOrderTime, listOrders } from '@/lib/queries/adminOrders'
import type { OrderDetail } from '@/types/order'

const FILTERS = [
  'all',
  'pending',
  'paid',
  'shipped',
  'done',
  'cancelled',
] as const
const PERIODS: Record<string, string> = {
  all: '전체',
  '1': '오늘',
  '7': '7일',
  '30': '30일',
}
const DAY_MS = 24 * 60 * 60 * 1000
const SEOUL_OFFSET = 9 * 60 * 60 * 1000
type OrderList = OrderDetail[] | 'loading' | 'error'

function summarize(items: OrderDetail['items']): string {
  const [first] = items
  if (!first) return '상품 없음'
  const name = hasVariantName(first.variant_name)
    ? `${first.product_name} ${first.variant_name}`
    : first.product_name
  return items.length > 1 ? `${name} 외 ${items.length - 1}건` : name
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<Notice>주문을 불러오는 중입니다.</Notice>}>
      <OrderList />
    </Suspense>
  )
}

function OrderList() {
  const { params, search, setFilters } = useListFilters()
  const filter =
    FILTERS.find((status) => status === params.get('status')) ?? 'paid'
  const [orders, setOrders] = useState<OrderList>('loading')
  const [revision, setRevision] = useState(0)
  const [referenceTime, setReferenceTime] = useState(() => Date.now())

  useEffect(() => {
    let alive = true
    listOrders().then(
      (data) => {
        if (alive) {
          setReferenceTime(Date.now())
          setOrders(data)
        }
      },
      () => {
        if (alive) setOrders('error')
      }
    )
    return () => {
      alive = false
    }
  }, [revision])

  const query = search.trim().normalize().toLowerCase()
  const requestedPeriod = params.get('period') ?? 'all'
  const period = Object.hasOwn(PERIODS, requestedPeriod)
    ? requestedPeriod
    : 'all'
  const days = period === 'all' ? 0 : Number(period)
  const today =
    Math.floor((referenceTime + SEOUL_OFFSET) / DAY_MS) * DAY_MS - SEOUL_OFFSET
  const from = today - (days - 1) * DAY_MS
  const matchingOrders = Array.isArray(orders)
    ? orders.filter((order) => {
        const created = Date.parse(order.created_at)
        if (days && (created < from || created >= today + DAY_MS)) return false
        if (!query) return true
        const { name, phone } = order.shipping_info
        return (
          order.order_no.toLowerCase().includes(query) ||
          name?.normalize().toLowerCase().includes(query) ||
          (/^\d{4}$/.test(query) && phone?.replace(/\D/g, '').endsWith(query))
        )
      })
    : []

  const counts = {
    all: 0,
    pending: 0,
    paid: 0,
    shipped: 0,
    done: 0,
    cancelled: 0,
  }
  counts.all = matchingOrders.length
  for (const order of matchingOrders) counts[order.status]++
  const visibleOrders = matchingOrders.filter(
    (order) => filter === 'all' || order.status === filter
  )

  return (
    <div className="space-y-6 text-sm">
      <PageHeader
        title="주문"
        count={Array.isArray(orders) ? `${visibleOrders.length}건` : undefined}
      />

      <FilterBar
        label="주문 검색과 기간"
        className="sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)]"
      >
        <label className="space-y-1">
          <span>주문 검색</span>
          <TextField
            type="search"
            value={search}
            onChange={(event) => setFilters({ q: event.target.value })}
            placeholder="주문번호·받는 분·휴대폰 끝 4자리"
          />
        </label>
        <label className="space-y-1">
          <span>기간</span>
          <Select
            value={period}
            onChange={(event) => {
              setReferenceTime(Date.now())
              setFilters({ period: event.target.value })
            }}
          >
            {Object.entries(PERIODS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </Select>
        </label>
      </FilterBar>

      {orders === 'loading' && <Notice>주문을 불러오는 중입니다.</Notice>}
      {orders === 'error' && (
        <div className="space-y-2">
          <Notice tone="error">
            주문을 불러오지 못했습니다. 다시 불러와 주세요.
          </Notice>
          <Button
            type="button"
            onClick={() => {
              setOrders('loading')
              setRevision((value) => value + 1)
            }}
          >
            다시 불러오기
          </Button>
        </div>
      )}
      {Array.isArray(orders) && (
        <>
          <div className="space-y-2">
            <p className="text-ink-muted">
              결제 완료·배송 중은 전부, 나머지는 최근 100건입니다. 시각은 한국
              시각입니다.
            </p>
            <div
              role="group"
              aria-label="주문 상태"
              className="flex flex-wrap gap-2"
            >
              {FILTERS.map((status) => (
                <Button
                  key={status}
                  type="button"
                  aria-pressed={filter === status}
                  className="aria-pressed:border-ink aria-pressed:bg-butter-light tabular-nums aria-pressed:font-semibold"
                  onClick={() => setFilters({ status })}
                >
                  {status === 'all' ? '전체' : ORDER_STATUS_LABEL[status]} (
                  {counts[status]})
                </Button>
              ))}
            </div>
          </div>
          {visibleOrders.length === 0 ? (
            <EmptyState>
              {orders.length === 0
                ? '주문이 없습니다.'
                : '조건에 맞는 주문이 없습니다.'}
            </EmptyState>
          ) : (
            <Table
              label="주문 목록"
              columns={[
                '주문번호',
                '상태',
                '받는 분',
                '상품',
                { label: '총액', numeric: true },
                '주문 시각',
              ]}
              responsive
            >
              {visibleOrders.map((order) => (
                <tr
                  key={order.id}
                  role="row"
                  className="border-line grid grid-cols-2 gap-3 rounded-md border bg-white p-3 wrap-anywhere lg:table-row lg:rounded-none lg:border-x-0 lg:border-t-0 lg:last:border-b-0"
                >
                  <td role="cell" className="self-center lg:px-3 lg:py-2">
                    <Link
                      href={`/admin/orders/${encodeURIComponent(order.order_no)}`}
                      className="decoration-line hover:decoration-ink inline-flex min-h-11 items-center font-semibold tabular-nums underline underline-offset-4"
                    >
                      {order.order_no}
                    </Link>
                  </td>
                  <td
                    role="cell"
                    className="self-center justify-self-end lg:px-3 lg:py-2"
                  >
                    <OrderBadge status={order.status} />
                  </td>
                  <td role="cell" className="lg:px-3 lg:py-2">
                    <span
                      aria-hidden="true"
                      className="text-ink-muted block text-xs lg:hidden"
                    >
                      받는 분
                    </span>
                    {order.shipping_info.name || '받는 분 없음'}
                  </td>
                  <td role="cell" className="lg:px-3 lg:py-2">
                    <span
                      aria-hidden="true"
                      className="text-ink-muted block text-xs lg:hidden"
                    >
                      상품
                    </span>
                    {summarize(order.items)}
                  </td>
                  <td role="cell" className={`lg:px-3 lg:py-2 ${numericCell}`}>
                    <span
                      aria-hidden="true"
                      className="text-ink-muted block text-xs lg:hidden"
                    >
                      총액
                    </span>
                    {krw(order.total_krw)}원
                  </td>
                  <td
                    role="cell"
                    className="text-ink-muted tabular-nums lg:px-3 lg:py-2"
                  >
                    <time dateTime={order.created_at}>
                      {formatOrderTime(order.created_at)}
                    </time>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </>
      )}
    </div>
  )
}
