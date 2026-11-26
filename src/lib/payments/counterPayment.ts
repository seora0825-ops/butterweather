import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 홈페이지 주문이 아닌 페이앱 결제를 적어 둔다 (`0012`). 어느 판매인지 잇는
 * 것은 DB 가 한다(`counter_match`).
 *
 * **돈을 움직이지 않는다.** 금액이 다르거나 짝이 없어도 돌려주지 않는다 —
 * 매대에서는 사람이 앞에 있다.
 *
 * 손님의 휴대폰 번호는 통보에 있어도 저장하지 않는다.
 */
/**
 * 앱 결제는 `var1` 을 돌려주지 않는다. 상품명 끝의 판매 번호(`#A1B2`,
 * `lib/payapp.ts`)로 판매를 찾는다. **번호·금액이 맞는 판매가 딱 하나일 때만.**
 * 못 찾으면 DB 의 짝짓기(`0012`)가 시각과 금액으로 다시 해본다.
 */
async function refFromGoods(
  admin: SupabaseClient,
  form: URLSearchParams
): Promise<string | null> {
  const code = (form.get('goodname') ?? '').match(/#([0-9A-F]{4})\s*$/i)?.[1]
  const price = Number((form.get('price') ?? '').replaceAll(',', ''))
  if (!code || !Number.isInteger(price)) return null

  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  const { data } = await admin
    .from('counter_sales')
    .select('id')
    // uuid 에는 like 를 걸 수 없다. 앞 네 글자로 시작하는 범위로 찾는다
    .gte('id', `${code.toLowerCase()}0000-0000-0000-0000-000000000000`)
    .lte('id', `${code.toLowerCase()}ffff-ffff-ffff-ffff-ffffffffffff`)
    .eq('total_krw', price)
    .gte('at', since)
    .limit(2)
  return data?.length === 1 ? (data[0].id as string) : null
}

export async function recordCounterPayment(
  admin: SupabaseClient,
  form: URLSearchParams
): Promise<string | null> {
  const mulNo = form.get('mul_no') ?? ''
  const state = form.get('pay_state') ?? ''
  const price = (form.get('price') ?? '').replaceAll(',', '')
  if (!mulNo) return null

  const row = {
    mul_no: mulNo,
    ref: form.get('var1')?.trim() || (await refFromGoods(admin, form)),
    goods: (form.get('goodname') ?? '').slice(0, 100),
    price_krw: /^\d+$/.test(price) ? Number(price) : 0,
    pay_type: (form.get('pay_type') ?? '').slice(0, 10),
  }

  if (state === '4') {
    if (!/^\d+$/.test(price)) return `금액을 읽지 못함 (${mulNo})`
    // 취소가 먼저 왔으면 그대로 둔다
    const { error } = await admin
      .from('counter_payments')
      .upsert(
        { ...row, state: 'paid' },
        { onConflict: 'mul_no', ignoreDuplicates: true }
      )
    return error ? error.message : null
  }

  if (state === '9' || state === '64') {
    const { data, error } = await admin
      .from('counter_payments')
      .update({ state: 'cancelled' })
      .eq('mul_no', mulNo)
      .select('mul_no')
    if (error) return error.message
    if (data.length > 0) return null
    const { error: insertError } = await admin
      .from('counter_payments')
      .upsert({ ...row, state: 'cancelled' }, { onConflict: 'mul_no' })
    return insertError ? insertError.message : null
  }

  return null
}
