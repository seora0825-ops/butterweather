'use client'

import {
  Button,
  ButtonLink,
  EmptyState,
  Notice,
  PageHeader,
} from '@/components/admin/ui'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { markDone, type CancelOrderResult } from '@/app/admin/orders/actions'
import CancelOrderButton from '@/components/admin/CancelOrderButton'
import ShipOrderForm from '@/components/admin/ShipOrderForm'
import { OrderBadge } from '@/components/admin/ui/OrderBadge'
import { findCarrier } from '@/lib/carriers'
import { hasVariantName, krw } from '@/lib/orders'
import { formatOrderTime, getOrder } from '@/lib/queries/adminOrders'
import type { OrderDetail, ShippingInfo } from '@/types/order'

type OrderView = OrderDetail | null | 'loading' | 'error'

export default function AdminOrderPage() {
  const { orderNo } = useParams<{ orderNo: string }>()
  return <OrderView key={orderNo} orderNo={orderNo} />
}

function OrderView({ orderNo }: { orderNo: string }) {
  const [order, setOrder] = useState<OrderView>('loading')
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSucceeded, setActionSucceeded] = useState(false)
  const actionInProgress = useRef(false)

  useEffect(() => {
    let alive = true
    getOrder(orderNo).then(
      (data) => {
        if (alive) setOrder(data)
      },
      () => {
        if (alive) setOrder('error')
      }
    )
    return () => {
      alive = false
    }
  }, [orderNo, revision])

  function reload() {
    setOrder('loading')
    setRevision((value) => value + 1)
  }

  async function runAction(action: () => Promise<CancelOrderResult>) {
    if (actionInProgress.current) return
    actionInProgress.current = true
    setBusy(true)
    setActionError(null)
    setActionSucceeded(false)
    try {
      const result = await action()
      if (result.ok) {
        setActionSucceeded(true)
        reload()
      } else setActionError(result.reason)
    } catch {
      setActionError(
        '처리 결과를 확인하지 못했습니다. 새로고침해서 주문 상태를 확인해 주세요.'
      )
    } finally {
      actionInProgress.current = false
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 text-sm wrap-anywhere">
      <PageHeader
        title={`주문 ${orderNo}`}
        actions={<ButtonLink href="/admin/orders">주문 목록으로</ButtonLink>}
      />
      {actionSucceeded && (
        <Notice tone="success">주문 상태를 변경했습니다.</Notice>
      )}
      {order === 'loading' && <Notice>주문을 불러오는 중입니다.</Notice>}
      {order === 'error' && (
        <div>
          <Notice tone="error">
            주문을 불러오지 못했습니다. 다시 불러와 주세요.
          </Notice>
          <Button type="button" onClick={reload} variant="ghost">
            다시 불러오기
          </Button>
        </div>
      )}
      {order === null && <EmptyState>해당 주문이 없습니다.</EmptyState>}
      {order && typeof order !== 'string' && (
        <>
          <section className="border-line space-y-1 rounded-md border bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">주문 상태</h2>
              <OrderBadge status={order.status} />
            </div>
            <p>
              주문 시각{' '}
              <time dateTime={order.created_at}>
                {formatOrderTime(order.created_at)}
              </time>
            </p>
            {order.status === 'cancelled' && (
              <p className="whitespace-pre-wrap">
                취소 사유 · {order.cancel_reason || '기록 없음'}
              </p>
            )}
          </section>

          <section className="border-line space-y-2 rounded-md border bg-white p-4 sm:p-5">
            <h2 className="text-base font-semibold">상품</h2>
            {order.items.length ? (
              <ul className="space-y-2">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span className="min-w-0">
                      {item.product_name}
                      {hasVariantName(item.variant_name) &&
                        ` · ${item.variant_name}`}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {krw(item.price_krw)}원 × {item.quantity}개
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>상품이 없습니다.</p>
            )}
            <dl className="border-line grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t pt-2 tabular-nums">
              <dt>상품 합계</dt>
              <dd className="text-right">{krw(order.items_krw)}원</dd>
              <dt>배송비</dt>
              <dd className="text-right">{krw(order.shipping_fee_krw)}원</dd>
              <dt className="font-medium">총액</dt>
              <dd className="text-right font-medium">
                {krw(order.total_krw)}원
              </dd>
            </dl>
          </section>

          <section className="border-line space-y-2 rounded-md border bg-white p-4 sm:p-5">
            <h2 className="text-base font-semibold">결제</h2>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
              <dt>결제사</dt>
              <dd>{order.payment_provider || '기록 없음'}</dd>
              <dt>결제 번호</dt>
              <dd>{order.payment_id || '기록 없음'}</dd>
              <dt>결제 시각</dt>
              <dd>
                {order.paid_at ? (
                  <time dateTime={order.paid_at}>
                    {formatOrderTime(order.paid_at)}
                  </time>
                ) : (
                  '기록 없음'
                )}
              </dd>
            </dl>
          </section>

          <ShippingAddress info={order.shipping_info} busy={busy} />

          <section className="border-line space-y-2 rounded-md border bg-white p-4 sm:p-5">
            <h2 className="text-base font-semibold">송장</h2>
            <p>
              {findCarrier(order.carrier)?.name ??
                (order.carrier || '택배사 미등록')}
            </p>
            <p className="tabular-nums">
              {order.tracking_no || '송장번호 미등록'}
            </p>
            {order.shipped_at && (
              <p>
                발송 시각{' '}
                <time dateTime={order.shipped_at}>
                  {formatOrderTime(order.shipped_at)}
                </time>
              </p>
            )}
            {order.status === 'paid' && (
              <ShipOrderForm
                orderNo={orderNo}
                busy={busy}
                runAction={runAction}
              />
            )}
            {order.status === 'shipped' && (
              <Button
                type="button"
                disabled={busy}
                onClick={() => runAction(() => markDone(orderNo))}
              >
                배송 완료로 바꾸기
              </Button>
            )}
          </section>

          {(order.status === 'pending' || order.status === 'paid') && (
            <CancelOrderButton
              orderNo={orderNo}
              status={order.status}
              total={order.total_krw}
              busy={busy}
              runAction={runAction}
            />
          )}
          {busy && <Notice>주문을 처리하는 중입니다.</Notice>}
          {actionError && <Notice tone="error">{actionError}</Notice>}
        </>
      )}
    </div>
  )
}

function ShippingAddress({
  info,
  busy,
}: {
  info: ShippingInfo
  busy: boolean
}) {
  const address = [
    info.zipcode ? `(${info.zipcode})` : '',
    info.address,
    info.addressDetail,
  ]
    .filter(Boolean)
    .join(' ')
  const [copyState, setCopyState] = useState<'copied' | 'error' | null>(null)

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(
        [info.name, info.phone, address].filter(Boolean).join('\n')
      )
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
  }

  return (
    <section className="border-line space-y-2 rounded-md border bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">배송지</h2>
        <Button
          type="button"
          disabled={busy || !(info.name || info.phone || address)}
          onClick={copyAddress}
          variant="ghost"
        >
          배송지 복사하기
        </Button>
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
        <dt>받는 분</dt>
        <dd>{info.name || '기록 없음'}</dd>
        <dt>휴대폰</dt>
        <dd>{info.phone || '기록 없음'}</dd>
        <dt>주소</dt>
        <dd>{address || '기록 없음'}</dd>
        <dt>배송 메모</dt>
        <dd className="whitespace-pre-wrap">{info.memo || '없음'}</dd>
      </dl>
      {copyState === 'copied' && <Notice>배송지를 복사했습니다</Notice>}
      {copyState === 'error' && (
        <Notice tone="error">
          배송지를 복사하지 못했습니다. 화면에서 이름, 휴대폰, 주소를 선택해
          복사해 주세요.
        </Notice>
      )}
    </section>
  )
}
