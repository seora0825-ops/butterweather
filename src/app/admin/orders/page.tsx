'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
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
const FIELD = 'w-full min-w-0 border border-gray-300 px-3 py-2'
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
    <Suspense fallback={<p role="status">주문을 불러오는 중입니다.</p>}>
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
      <h1 className="font-semibold">주문</h1>

      <div
        role="group"
        aria-label="주문 검색과 기간"
        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)]"
      >
        <label className="space-y-1">
          <span>주문 검색</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setFilters({ q: event.target.value })}
            placeholder="주문번호·받는 분·휴대폰 끝 4자리"
            className={FIELD}
          />
        </label>
        <label className="space-y-1">
          <span>기간</span>
          <select
            value={period}
            onChange={(event) => {
              setReferenceTime(Date.now())
              setFilters({ period: event.target.value })
            }}
            className={FIELD}
          >
            {Object.entries(PERIODS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {orders === 'loading' && <p role="status">주문을 불러오는 중입니다.</p>}
      {orders === 'error' && (
        <div>
          <p role="alert">주문을 불러오지 못했습니다. 다시 불러와 주세요.</p>
          <button
            type="button"
            className="underline"
            onClick={() => {
              setOrders('loading')
              setRevision((value) => value + 1)
            }}
          >
            다시 불러오기
          </button>
        </div>
      )}
      {Array.isArray(orders) && (
        <>
          <div className="space-y-2">
            <p>
              결제 완료·배송 중은 전부, 나머지는 최근 100건입니다. 시각은 한국
              시각입니다.
            </p>
            <div
              role="group"
              aria-label="주문 상태"
              className="flex flex-wrap gap-2"
            >
              {FILTERS.map((status) => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={filter === status}
                  className="border border-gray-300 px-3 py-2 aria-pressed:font-semibold aria-pressed:underline"
                  onClick={() => setFilters({ status })}
                >
                  {status === 'all' ? '전체' : ORDER_STATUS_LABEL[status]} (
                  {counts[status]})
                </button>
              ))}
            </div>
          </div>
          {visibleOrders.length === 0 ? (
            <p>
              {orders.length === 0
                ? '주문이 없습니다.'
                : '조건에 맞는 주문이 없습니다.'}
            </p>
          ) : (
            <ul className="border-t border-gray-300">
              {visibleOrders.map((order) => (
                <li key={order.id} className="border-b border-gray-300">
                  <Link
                    href={`/admin/orders/${encodeURIComponent(order.order_no)}`}
                    className="grid grid-cols-2 gap-x-3 gap-y-1 px-2 py-3 wrap-anywhere hover:bg-gray-100 sm:grid-cols-[auto_auto_minmax(0,1fr)_minmax(0,1.5fr)_auto_auto] sm:items-baseline"
                  >
                    <span className="font-medium">
                      {ORDER_STATUS_LABEL[order.status]}
                    </span>
                    <span className="tabular-nums">{order.order_no}</span>
                    <span>{order.shipping_info.name || '받는 분 없음'}</span>
                    <span>{summarize(order.items)}</span>
                    <span className="tabular-nums">
                      {krw(order.total_krw)}원
                    </span>
                    <time dateTime={order.created_at} className="tabular-nums">
                      {formatOrderTime(order.created_at)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
