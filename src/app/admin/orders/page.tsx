'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { hasVariantName, krw, ORDER_STATUS_LABEL } from '@/lib/orders'
import { formatOrderTime, listOrders } from '@/lib/queries/adminOrders'
import type { OrderDetail, OrderStatus } from '@/types/order'

const FILTERS = [
  'all',
  'pending',
  'paid',
  'shipped',
  'done',
  'cancelled',
] as const
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
  const [filter, setFilter] = useState<OrderStatus | 'all'>('paid')
  const [orders, setOrders] = useState<OrderList>('loading')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let alive = true
    listOrders().then(
      (data) => {
        if (alive) setOrders(data)
      },
      () => {
        if (alive) setOrders('error')
      }
    )
    return () => {
      alive = false
    }
  }, [revision])

  const counts = {
    all: 0,
    pending: 0,
    paid: 0,
    shipped: 0,
    done: 0,
    cancelled: 0,
  }
  if (Array.isArray(orders)) {
    counts.all = orders.length
    for (const order of orders) counts[order.status]++
  }
  const visibleOrders = Array.isArray(orders)
    ? orders.filter((order) => filter === 'all' || order.status === filter)
    : []

  return (
    <div className="space-y-6 text-sm">
      <h1 className="font-semibold">주문</h1>
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
            <p>최근 주문 최대 100건 · 한국 시각</p>
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
                  onClick={() => setFilter(status)}
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
                : '해당 상태의 주문이 없습니다.'}
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
