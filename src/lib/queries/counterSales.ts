'use client'

import type { CounterLine, Sale, SaleStatus } from '@/lib/store/counter'
import { createClient } from '@/lib/supabase/browser'

/** 현장 판매(`0012`). **RLS 가 관리자에게만 연다.** */

export interface CounterPayment {
  mul_no: string
  goods: string
  price_krw: number
  pay_type: string
  state: 'paid' | 'cancelled'
  received_at: string
}

type Row = {
  id: string
  at: string
  method: Sale['method']
  lines: CounterLine[]
  total_krw: number
  status: SaleStatus
}

function toSale(row: Row): Sale {
  return {
    id: row.id,
    at: row.at,
    method: row.method,
    lines: row.lines,
    totalKrw: row.total_krw,
    status: row.status,
  }
}

/** 같은 id 로 여러 번 보내도 된다. 상태는 DB 가 뒤로 돌리지 않는다 */
export async function saveSales(sales: Sale[]): Promise<void> {
  const { error } = await createClient()
    .from('counter_sales')
    .upsert(
      sales.map((s) => ({
        id: s.id,
        at: s.at,
        method: s.method,
        lines: s.lines,
        total_krw: s.totalKrw,
        status: s.status,
      })),
      { onConflict: 'id' }
    )
  if (error) throw new Error(error.message)
}

/** 판 것만. 많아야 이틀치라 나눠 읽지 않는다 */
export async function listSales(since: string | null): Promise<Sale[]> {
  let query = createClient()
    .from('counter_sales')
    .select('id, at, method, lines, total_krw, status')
    .eq('status', 'done')
    .order('at', { ascending: false })
    .limit(1000)
  if (since) query = query.gte('at', since)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return ((data ?? []) as Row[]).map(toSale)
}

export async function saleStatus(id: string): Promise<SaleStatus | null> {
  const { data, error } = await createClient()
    .from('counter_sales')
    .select('status')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data?.status as SaleStatus | undefined) ?? null
}

/** 돈은 들어왔는데 어느 판매인지 모르는 것 */
export async function listUnmatchedPayments(): Promise<CounterPayment[]> {
  const { data, error } = await createClient()
    .from('counter_payments')
    .select('mul_no, goods, price_krw, pay_type, state, received_at')
    .is('sale_id', null)
    .is('dismissed_at', null)
    .eq('state', 'paid')
    .order('received_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as CounterPayment[]
}

/** 계산기에 없던 판매로 넣는다. 결제 번호로 id 를 정해 두 번 눌러도 하나다 */
export async function adoptPayment(
  payment: CounterPayment,
  saleId: string
): Promise<void> {
  await saveSales([
    {
      id: saleId,
      at: payment.received_at,
      method: 'PAYAPP',
      lines: [
        {
          key: `payapp-${payment.mul_no}`,
          name: payment.goods || '페이앱에서 받은 결제',
          priceKrw: payment.price_krw,
          quantity: 1,
        },
      ],
      totalKrw: payment.price_krw,
      status: 'done',
    },
  ])
  const { error } = await createClient()
    .from('counter_payments')
    .update({ sale_id: saleId })
    .eq('mul_no', payment.mul_no)
    .is('sale_id', null)
  if (error) throw new Error(error.message)
}

/** 이미 기록한 판매다 */
export async function dismissPayment(mulNo: string): Promise<void> {
  const { error } = await createClient()
    .from('counter_payments')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('mul_no', mulNo)
  if (error) throw new Error(error.message)
}
