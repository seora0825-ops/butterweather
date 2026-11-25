'use server'

import { canOrder } from '@/lib/orderingAccess'
import { PAYAPP_MIN_KRW } from '@/lib/payapp'
import {
  goodName,
  isMobile,
  requestPayment,
  withdrawRequest,
} from '@/lib/payments/payapp'
import { shippingFee } from '@/lib/shipping'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { ShippingInfo } from '@/types/order'

/**
 * 결제창을 연다. 돌려주는 주소로 브라우저가 떠난다.
 *
 * **여기서는 아무것도 확정하지 않는다.** 확정은 페이앱 통보가 한다
 * (`api/payments/payapp`). 주문서에서도, 주문 내역의 「결제하기」에서도 부른다.
 */
export type StartPaymentResult =
  | { ok: true; payUrl: string }
  | { ok: false; reason: string }

const TRY_AGAIN = '결제를 열지 못했습니다. 주문 내역에서 다시 결제해 주세요.'

export async function startPayment(
  orderNo: string
): Promise<StartPaymentResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      ok: false,
      reason:
        '로그인이 풀렸습니다. 다시 로그인하시면 주문 내역에서 이어서 결제하실 수 있습니다.',
    }
  }
  if (!(await canOrder(supabase))) {
    return { ok: false, reason: '온라인 주문은 준비 중입니다.' }
  }

  // 관리자는 RLS 가 남의 주문도 보여준다. **자기 주문으로 좁힌다**
  const { data: order } = await supabase
    .from('orders')
    .select(
      'id, order_no, status, items_krw, shipping_fee_krw, total_krw, payment_id, payment_provider, shipping_info, items:order_items(variant_id, product_name, variant_name, price_krw, quantity)'
    )
    .eq('user_id', user.id)
    .eq('order_no', orderNo)
    .maybeSingle()

  if (!order) {
    return {
      ok: false,
      reason: '주문을 찾지 못했습니다. 주문 내역에서 확인해 주세요.',
    }
  }
  if (order.status !== 'pending') {
    return {
      ok: false,
      reason: '이미 끝난 주문입니다. 주문 내역에서 확인해 주세요.',
    }
  }

  // ── 값을 다시 센다 ★ ──────────────────────────────────────
  // 주문서를 만든 뒤 값이 바뀌었거나 품절됐을 수 있다. 그리고 **적혀 있는
  // 금액을 그대로 믿지 않는다** — 돈을 받는 자리라 한 번 더 본다.
  const ids = order.items.map((i) => i.variant_id)
  const { data: variants, error } = await supabase
    .from('product_variants')
    .select('id, price_krw, stock, is_active, products(is_active, status)')
    .in(
      'id',
      ids.filter((id) => id !== null)
    )
  if (error) return { ok: false, reason: TRY_AGAIN }

  type Row = {
    id: string
    price_krw: number
    stock: number
    is_active: boolean
    products: { is_active: boolean; status: string } | null
  }
  const byId = new Map(
    ((variants ?? []) as unknown as Row[]).map((v) => [v.id, v])
  )

  for (const item of order.items) {
    const v = item.variant_id ? byId.get(item.variant_id) : undefined
    if (
      !v ||
      !v.is_active ||
      !v.products?.is_active ||
      v.products.status === 'sold_out' ||
      v.stock < item.quantity
    ) {
      return {
        ok: false,
        reason: `${item.product_name} 이(가) 품절됐습니다. 장바구니에서 다시 주문해 주세요.`,
      }
    }
    if (v.price_krw !== item.price_krw) {
      return {
        ok: false,
        reason: `${item.product_name} 의 가격이 바뀌었습니다. 장바구니에서 다시 주문해 주세요.`,
      }
    }
  }

  const itemsKrw = order.items.reduce(
    (sum, i) => sum + i.price_krw * i.quantity,
    0
  )
  const feeKrw = shippingFee(itemsKrw)
  if (
    order.items.length === 0 ||
    order.items_krw !== itemsKrw ||
    order.shipping_fee_krw !== feeKrw ||
    order.total_krw !== itemsKrw + feeKrw ||
    order.total_krw < PAYAPP_MIN_KRW
  ) {
    return {
      ok: false,
      reason: '주문 금액이 바뀌었습니다. 장바구니에서 다시 주문해 주세요.',
    }
  }

  const { phone } = order.shipping_info as ShippingInfo
  if (!isMobile(phone)) {
    return {
      ok: false,
      reason: '휴대폰 번호가 맞지 않습니다. 장바구니에서 다시 주문해 주세요.',
    }
  }

  // ── 앞의 요청을 거둔다 ────────────────────────────────────
  // 거두지 못해도 이어간다. 이미 닫힌 요청일 수 있고, 그사이 결제됐다면
  // 통보가 중복을 돌려준다 (`api/payments/payapp`)
  if (order.payment_provider === 'payapp' && order.payment_id) {
    try {
      await withdrawRequest(order.payment_id)
    } catch (err) {
      console.error('[payapp] 앞의 요청을 거두지 못함', order.order_no, err)
    }
  }

  try {
    const { mulNo, payUrl } = await requestPayment({
      orderId: order.id,
      orderNo: order.order_no,
      goodName: goodName(order.items.map((i) => i.product_name)),
      totalKrw: order.total_krw,
      phone,
    })

    const { data: updated } = await createAdminClient()
      .from('orders')
      .update({ payment_id: mulNo, payment_provider: 'payapp' })
      .eq('id', order.id)
      .eq('status', 'pending')
      .select('id')

    if (!updated || updated.length === 0) {
      // 그사이 앞의 결제가 확정됐다. 방금 만든 것은 쓰지 않는다
      await withdrawRequest(mulNo).catch(() => {})
      return {
        ok: false,
        reason: '결제를 확인하고 있습니다. 주문 내역에서 확인해 주세요.',
      }
    }
    return { ok: true, payUrl }
  } catch (err) {
    console.error('[payapp] 결제 요청 실패', order.order_no, err)
    return { ok: false, reason: TRY_AGAIN }
  }
}
