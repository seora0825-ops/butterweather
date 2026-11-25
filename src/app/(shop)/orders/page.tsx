import Link from 'next/link'
import { redirect } from 'next/navigation'
import EmptyState from '@/components/shop/EmptyState'
import { ChevronIcon } from '@/components/shop/icons'
import { ORDER_STATUS_LABEL, hasVariantName } from '@/lib/orders'
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
  const { product_name, variant_name } = items[0]
  const first = hasVariantName(variant_name)
    ? `${product_name} ${variant_name}`
    : product_name
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
    <main id="main" className="mx-auto max-w-2xl space-y-6 px-4 py-8 text-base">
      <h1 className="text-2xl font-extrabold tracking-tight">주문 내역</h1>

      {error ? (
        <p role="alert">
          주문 내역을 불러오지 못했습니다. 페이지를 새로고침해 주세요.
        </p>
      ) : orders.length === 0 ? (
        <EmptyState motif="blue-flower" message="아직 주문이 없습니다." />
      ) : (
        <ul className="divide-line border-ink divide-y border-t-2">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.order_no}`}
                className="flex items-center justify-between gap-3 py-4 hover:underline"
              >
                <div className="min-w-0 space-y-1 wrap-anywhere">
                  <p className="text-xl font-extrabold tracking-tight">
                    {ORDER_STATUS_LABEL[order.status]}
                  </p>
                  <p>{summarize(order.items)}</p>
                  <p className="text-ink-muted text-[15px] tabular-nums">
                    <time dateTime={order.created_at}>
                      {new Date(order.created_at).toLocaleDateString('ko-KR', {
                        timeZone: 'Asia/Seoul',
                      })}
                    </time>
                    {' · '}
                    {order.order_no}
                  </p>
                  <p className="font-bold tabular-nums">
                    {formatKRW(order.total_krw)}
                  </p>
                </div>
                <span className="-rotate-90">
                  <ChevronIcon />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
