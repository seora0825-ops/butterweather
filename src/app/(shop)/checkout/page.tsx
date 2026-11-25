import { redirect } from 'next/navigation'
import { canOrder } from '@/lib/orderingAccess'
import { createClient } from '@/lib/supabase/server'
import type { ShippingInfo } from '@/types/order'
import CheckoutForm from './CheckoutForm'

export const metadata = { title: '주문서 — 버터웨더' }
export const dynamic = 'force-dynamic'

/**
 * 주문서. **로그인한 사람만 들어온다** (회원 필수, schema.md 7-3절). 배송지를
 * 다 채운 뒤에 「로그인이 필요합니다」가 뜨는 헛걸음을 없애려는 것이고, 진짜로
 * 막는 것은 server action 이다.
 *
 * **지난 배송지를 미리 채운다.** 표를 따로 만들지 않고 가장 최근 주문의 것을
 * 가져온다. 동의는 가져오지 않는다 — 주소는 편의이고 동의는 의사표시다.
 */
export default async function CheckoutPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=${encodeURIComponent('/checkout')}`)
  if (!(await canOrder(supabase))) redirect('/cart')

  const { data: last } = await supabase
    .from('orders')
    .select('shipping_info')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <main id="main" className="mx-auto max-w-2xl px-4 py-8 text-base">
      <h1 className="text-2xl font-extrabold tracking-tight">주문서</h1>
      <CheckoutForm
        lastShipping={(last?.shipping_info as ShippingInfo | undefined) ?? null}
      />
    </main>
  )
}
