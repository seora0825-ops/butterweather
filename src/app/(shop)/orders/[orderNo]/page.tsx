import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { findCarrier } from '@/lib/carriers'
import PayButton from '@/components/shop/PayButton'
import { PaymentDone, PaymentWaiting } from '@/components/shop/PaymentReturn'
import { button } from '@/components/shop/button'
import { canOrder } from '@/lib/orderingAccess'
import { ORDER_STATUS_LABEL, hasVariantName } from '@/lib/orders'
import { formatKRW } from '@/lib/queries/products'
import { createClient } from '@/lib/supabase/server'
import type { OrderDetail, OrderStatus } from '@/types/order'

/**
 * 주문 하나. 주문서를 만들고 나면 여기로 온다.
 *
 * **남의 주문은 보이지 않는다.** RLS의 `orders_own` 정책에 더해
 * 조회를 현재 사용자로 좁힌다. 관리자도 손님 화면에서는 남의 주문번호로
 * 접근하면 404가 된다 (`0005_orders.sql`).
 *
 * 다만 **로그인 안 한 사람은 404 가 아니라 로그인으로 보낸다.** 404 는
 * 「없는 주문」과 구분이 안 돼서, 자기 주문을 보러 온 사람도 주문이
 * 사라진 줄 안다.
 *
 * 주소가 주문번호(`260919-0007`)인 것은 손님이 부를 수 있는 값이기
 * 때문이다. uuid 는 전화로 불러줄 수 없다 (schema.md 7-3절).
 */
export const dynamic = 'force-dynamic'

/** 진행의 이름은 **주문 상태 이름을 그대로 쓴다** (writing.md 5절) */
function progressSteps(status: OrderStatus): string[] {
  return [status === 'pending' ? 'pending' : 'paid', 'shipped', 'done'].map(
    (s) => ORDER_STATUS_LABEL[s as OrderStatus]
  )
}

const statusDetails: Record<
  Exclude<OrderStatus, 'cancelled'>,
  { step: number; title: string; next?: string }
> = {
  pending: {
    step: 0,
    title: '아직 결제가 완료되지 않았습니다.',
    next: '결제가 완료되면 상품을 준비합니다.',
  },
  paid: {
    step: 0,
    title: '결제가 완료되었습니다.',
    next: '상품이 준비되는 대로 보내드립니다.',
  },
  shipped: {
    step: 1,
    title: '상품을 보내드렸습니다.',
    next: '상품이 배송지에 도착하면 배송이 끝납니다.',
  },
  done: { step: 2, title: '배송이 끝났습니다.' },
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNo: string }>
  searchParams: Promise<{ paid?: string }>
}) {
  const { orderNo } = await params
  // 결제창에서 돌아왔다는 표시일 뿐, 결제됐다는 뜻이 아니다 (PaymentReturn)
  const returned = (await searchParams).paid === '1'
  const supabase = await createClient()

  // **로그인 안 했으면 404 가 아니라 로그인으로 보낸다.** 404 는 「없는
  // 주문」과 구분이 안 돼서, 자기 주문을 보러 온 사람도 없어진 줄 안다.
  // 로그인한 사람에게 404 를 주는 것은 그대로다 — 남의 주문이 있는지
  // 없는지 알려줄 이유가 없다.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(`/orders/${encodeURIComponent(orderNo)}`)}`
    )
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('user_id', user.id)
    .eq('order_no', orderNo)
    .maybeSingle()

  if (error) {
    return (
      <main
        id="main"
        className="mx-auto max-w-2xl space-y-4 px-4 py-8 text-base"
      >
        <h1 className="text-2xl font-extrabold tracking-tight">주문 상세</h1>
        <p role="alert">
          주문을 불러오지 못했습니다. 페이지를 새로고침해 주세요.
        </p>
        <Link href="/orders" className={button()}>
          주문 내역
        </Link>
      </main>
    )
  }
  if (!order) notFound()

  const data = order as OrderDetail
  const shipping = data.shipping_info
  const items = data.items ?? []

  const payable = data.status === 'pending' && (await canOrder(supabase))
  const carrier = findCarrier(data.carrier)

  const status = data.status === 'cancelled' ? null : statusDetails[data.status]

  return (
    <main id="main" className="mx-auto max-w-2xl space-y-8 px-4 py-8 text-base">
      <h1 className="text-2xl font-extrabold tracking-tight">주문 상세</h1>

      <section aria-label="주문 상태" className="space-y-4 wrap-anywhere">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold tracking-tight">
            {status?.title ?? '주문이 취소되었습니다.'}
          </h2>
          {status?.next && <p>{status.next}</p>}
          {data.status === 'cancelled' && data.cancel_reason && (
            <p>취소 사유: {data.cancel_reason}</p>
          )}
        </div>
        {status && (
          <ol
            aria-label="주문 진행"
            className="divide-line border-line grid grid-cols-3 divide-x border-y text-center"
          >
            {progressSteps(data.status).map((step, index) => (
              <li
                key={step}
                aria-current={index === status.step ? 'step' : undefined}
                className={
                  index === status.step
                    ? 'py-3 font-extrabold'
                    : 'text-ink-muted py-3'
                }
              >
                {step}
              </li>
            ))}
          </ol>
        )}
        <p className="text-ink-muted text-[15px] tabular-nums">
          주문번호 {data.order_no}
        </p>
        {data.status === 'pending' &&
          (returned ? (
            <PaymentWaiting orderNo={data.order_no} />
          ) : payable ? (
            <PayButton orderNo={data.order_no} />
          ) : null)}
        {data.status === 'paid' && returned && (
          <PaymentDone
            orderNo={data.order_no}
            variantIds={items.flatMap((i) => i.variant_id ?? [])}
          />
        )}
        {data.tracking_no && (
          <div className="space-y-2">
            <dl>
              <dt className="font-bold">송장번호</dt>
              <dd className="tabular-nums">
                {carrier?.name ?? data.carrier} {data.tracking_no}
              </dd>
            </dl>
            {carrier?.needsManualInput && (
              <p>조회 화면에서 위 번호를 넣어 주세요.</p>
            )}
            {carrier && (
              <a
                href={carrier.trackUrl(data.tracking_no)}
                target="_blank"
                rel="noreferrer"
                className={button({ tone: 'primary' })}
              >
                배송 조회
              </a>
            )}
          </div>
        )}
      </section>

      <section className="border-ink space-y-3 border-t-2 pt-4">
        <h2 className="text-xl font-extrabold tracking-tight">주문 상품</h2>
        <ul className="divide-line divide-y">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-baseline justify-between gap-2 py-2"
            >
              <div className="min-w-0 wrap-anywhere">
                <p>{item.product_name}</p>
                <p>
                  {hasVariantName(item.variant_name) &&
                    `${item.variant_name} · `}
                  {item.quantity}개
                </p>
              </div>
              <p className="shrink-0 tabular-nums">
                {formatKRW(item.price_krw * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
        <dl className="border-line space-y-2 border-t pt-3 tabular-nums">
          <div className="flex justify-between gap-2">
            <dt>상품</dt>
            <dd>{formatKRW(data.items_krw)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>배송비</dt>
            <dd>
              {data.shipping_fee_krw === 0
                ? '무료'
                : formatKRW(data.shipping_fee_krw)}
            </dd>
          </div>
          <div className="flex justify-between gap-2 text-xl font-extrabold">
            <dt>합계</dt>
            <dd>{formatKRW(data.total_krw)}</dd>
          </div>
        </dl>
      </section>

      <section className="border-ink space-y-3 border-t-2 pt-4">
        <h2 className="text-xl font-extrabold tracking-tight">배송지</h2>
        <dl className="divide-line divide-y">
          {[
            ['받는 분', shipping.name],
            ['연락처', shipping.phone],
            [
              '주소',
              `(${shipping.zipcode}) ${shipping.address} ${shipping.addressDetail}`.trim(),
            ],
            ['배송 메모', shipping.memo || '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-3 py-2">
              <dt className="w-16 shrink-0">{label}</dt>
              <dd className="min-w-0 wrap-anywhere">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="flex flex-wrap gap-4">
        <Link href="/orders" className={button()}>
          주문 내역
        </Link>
        <Link href="/" className={button()}>
          계속 둘러보기
        </Link>
      </div>
    </main>
  )
}
