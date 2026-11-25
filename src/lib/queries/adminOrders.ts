'use client'

import { createClient } from '@/lib/supabase/browser'
import type { OrderDetail } from '@/types/order'

const ORDER_WITH_ITEMS = '*, items:order_items(*)'

/** 끝난 주문과 결제하지 않은 주문은 이만큼만 읽는다 */
const RECENT = 100

/**
 * 전체 주문을 읽을 수 있는 범위는 Supabase RLS가 정한다.
 *
 * **결제 완료·배송 중은 세지 않고 전부 읽는다.** 최근 몇 건으로 자르면 결제하지
 * 않고 나간 주문에 밀려 **보내야 할 주문이 목록에서 사라진다.**
 */
export async function listOrders(): Promise<OrderDetail[]> {
  const read = () =>
    createClient()
      .from('orders')
      .select(ORDER_WITH_ITEMS)
      .order('created_at', { ascending: false })
      .order('order_no', { ascending: false })

  const [active, rest] = await Promise.all([
    read().in('status', ['paid', 'shipped']),
    read().in('status', ['pending', 'done', 'cancelled']).limit(RECENT),
  ])
  const error = active.error ?? rest.error
  if (error) throw new Error(error.message)

  return [...(active.data ?? []), ...(rest.data ?? [])].sort(
    (a, b) =>
      b.created_at.localeCompare(a.created_at) ||
      b.order_no.localeCompare(a.order_no)
  )
}

export async function getOrder(orderNo: string): Promise<OrderDetail | null> {
  const { data, error } = await createClient()
    .from('orders')
    .select(ORDER_WITH_ITEMS)
    .eq('order_no', orderNo)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

const orderTime = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Seoul',
})

export function formatOrderTime(value: string): string {
  return orderTime.format(new Date(value))
}
