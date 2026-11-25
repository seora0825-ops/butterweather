'use client'

import { createClient } from '@/lib/supabase/browser'
import type { OrderDetail } from '@/types/order'

const ORDER_WITH_ITEMS = '*, items:order_items(*)'

// 전체 주문을 읽을 수 있는 범위는 Supabase RLS가 정한다.
export async function listOrders(): Promise<OrderDetail[]> {
  const { data, error } = await createClient()
    .from('orders')
    .select(ORDER_WITH_ITEMS)
    .order('created_at', { ascending: false })
    .order('order_no', { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)
  return data ?? []
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
