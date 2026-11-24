import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { findCarrier } from '@/lib/carriers'
import { ORDER_STATUS_LABEL } from '@/lib/orders'
import { formatKRW } from '@/lib/queries/products'
import { createClient } from '@/lib/supabase/server'
import type { OrderDetail } from '@/types/order'

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

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderNo: string }>
}) {
  const { orderNo } = await params
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
      <main className="mx-auto max-w-3xl space-y-4 p-4 text-sm">
        <h1 className="text-xl font-semibold">주문 상세</h1>
        <p role="alert">
          주문을 불러오지 못했습니다. 페이지를 새로고침해 주세요.
        </p>
        <Link href="/orders" className="underline">
          주문 내역
        </Link>
      </main>
    )
  }
  if (!order) notFound()

  const data = order as OrderDetail
  const shipping = data.shipping_info
  const items = data.items ?? []

  const carrier = findCarrier(data.carrier)

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 text-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">주문 상세</h1>
        <p>{ORDER_STATUS_LABEL[data.status]}</p>
      </header>

      <section
        aria-label="주문번호 및 배송 조회"
        className="space-y-3 border-y border-gray-300 py-3 wrap-anywhere"
      >
        <dl>
          <dt>주문번호</dt>
          <dd className="font-semibold">{data.order_no}</dd>
        </dl>
        {data.status === 'pending' ? (
          <>
            <p>주문서가 만들어졌습니다. 아직 결제가 완료되지 않았습니다.</p>
            {/* 결제 대기 상태에서 결제 button을 연결할 자리다. */}
          </>
        ) : data.status === 'shipped' || data.status === 'done' ? (
          // 보낸 뒤에는 송장번호가 이 화면에서 제일 필요한 정보다.
          <>
            <p>
              {data.status === 'done'
                ? '배송이 끝났습니다.'
                : '보내드렸습니다.'}
            </p>
            {data.tracking_no && (
              <>
                <dl>
                  <dt>송장번호</dt>
                  <dd>
                    {carrier?.name ?? data.carrier} {data.tracking_no}
                  </dd>
                </dl>
                {carrier && (
                  <a
                    href={carrier.trackUrl(data.tracking_no)}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    배송 조회
                  </a>
                )}
                {carrier?.needsManualInput && (
                  <p>조회 화면에서 위 번호를 넣어 주세요.</p>
                )}
              </>
            )}
          </>
        ) : data.status === 'paid' ? (
          <p>주문이 확정되었습니다. 준비되는 대로 보내드립니다.</p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">주문 상품</h2>
        <ul className="divide-y divide-gray-300 border-y border-gray-300">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-baseline justify-between gap-2 py-2"
            >
              <div className="min-w-0 wrap-anywhere">
                <p>{item.product_name}</p>
                <p>
                  {item.variant_name} · {item.quantity}개
                </p>
              </div>
              <p className="shrink-0">
                {formatKRW(item.price_krw * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
        <dl className="space-y-2">
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
          <div className="flex justify-between gap-2 font-semibold">
            <dt>합계</dt>
            <dd>{formatKRW(data.total_krw)}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">배송지</h2>
        <dl className="divide-y divide-gray-300 border-y border-gray-300">
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
        <Link href="/orders" className="underline">
          주문 내역
        </Link>
        <Link href="/" className="underline">
          계속 둘러보기
        </Link>
      </div>
    </main>
  )
}
