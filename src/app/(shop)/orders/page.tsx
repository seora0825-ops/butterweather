import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ORDER_STATUS_LABEL } from '@/lib/orders'
import { formatKRW } from '@/lib/queries/products'
import { createClient } from '@/lib/supabase/server'
import type { OrderDetail, OrderItem } from '@/types/order'

/**
 * 주문 내역. **내 주문만 보인다.**
 *
 * RLS의 `orders_own` 정책은 `user_id = auth.uid()`인 주문을 허용한다
 * (`0005_orders.sql`). 관리자도 손님 화면에서는 자기 주문만 보도록 조회를 좁힌다.
 *
 * 주문번호를 잃어버려도 여기서 찾을 수 있다. 그것이 이 화면의 이유다.
 */
export const dynamic = 'force-dynamic'

/** 「그린가든 외 2건」 처럼 한 줄로 줄인다 */
function summarize(items: OrderItem[]): string {
  if (items.length === 0) return '상품 없음'
  const first = `${items[0].product_name} ${items[0].variant_name}`
  return items.length === 1 ? first : `${first} 외 ${items.length - 1}건`
}

export default async function OrdersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent('/orders')}`)
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const orders = (data ?? []) as OrderDetail[]

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 text-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">주문 내역</h1>
        {!error && <p>{orders.length}건</p>}
      </header>

      {error ? (
        <p role="alert">
          주문 내역을 불러오지 못했습니다. 페이지를 새로고침해 주세요.
        </p>
      ) : orders.length === 0 ? (
        <section aria-label="빈 주문 내역" className="space-y-3">
          <p>아직 주문이 없습니다.</p>
          <Link href="/" className="underline">
            상품 보러 가기
          </Link>
        </section>
      ) : (
        <ul className="divide-y divide-gray-300 border-y border-gray-300">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.order_no}`}
                className="block space-y-2 py-3 wrap-anywhere"
              >
                <time dateTime={order.created_at}>
                  {new Date(order.created_at).toLocaleDateString('ko-KR', {
                    timeZone: 'Asia/Seoul',
                  })}
                </time>
                <p className="underline">{order.order_no}</p>
                <p>{summarize(order.items)}</p>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span>{ORDER_STATUS_LABEL[order.status]}</span>
                  <span>{formatKRW(order.total_krw)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
