import { redirect } from 'next/navigation'
import { canOrder } from '@/lib/orderingAccess'
import { createClient } from '@/lib/supabase/server'
import type { CartLine } from '@/lib/store/cart'
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
 *
 * **바로 구매는 `?buy=<옵션 id>&qty=<개수>` 로 온다.** 장바구니를 보지 않고 그 한
 * 줄만 주문한다. 이름·가격은 여기서 DB 에서 읽고, 그것도 **보여주기 위한 것**이다 —
 * 영수증의 숫자는 `createOrder` 가 다시 읽는다. 옛 저장소의 바로구매를 옮겼다.
 */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ buy?: string; qty?: string }>
}) {
  const { buy, qty } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 로그인하고 돌아올 때 바로 구매가 풀리지 않게 주소를 그대로 넘긴다
  const here = buy
    ? `/checkout?buy=${encodeURIComponent(buy)}&qty=${encodeURIComponent(qty ?? '1')}`
    : '/checkout'
  if (!user) redirect(`/login?next=${encodeURIComponent(here)}`)
  if (!(await canOrder(supabase))) redirect('/cart')

  const { data: last } = await supabase
    .from('orders')
    .select('shipping_info')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let directLine: CartLine | null = null
  if (buy) {
    const { data: v } = await supabase
      .from('product_variants')
      .select(
        'id, name, price_krw, stock, is_active, product:products(id, slug, name, images, is_active, status)'
      )
      .eq('id', buy)
      .maybeSingle()
    const product = v?.product as
      | {
          id: string
          slug: string
          name: string
          images: string[]
          is_active: boolean
          status: string
        }
      | undefined

    // 감췄거나 내렸거나 다 팔린 것은 주소를 알아도 살 수 없다
    if (
      !v ||
      !v.is_active ||
      !product?.is_active ||
      product.status === 'sold_out' ||
      v.stock <= 0
    ) {
      redirect(product ? `/products/${product.slug}` : '/')
    }

    // 개수는 손으로 고칠 수 있다. 재고 안으로 가둔다 — 진짜 확인은 결제 때다
    const asked = Number.parseInt(qty ?? '1', 10)
    directLine = {
      variantId: v.id,
      productId: product.id,
      slug: product.slug,
      productName: product.name,
      variantName: v.name,
      priceKrw: v.price_krw,
      image: product.images[0] ?? null,
      quantity: Math.min(
        Math.max(Number.isFinite(asked) ? asked : 1, 1),
        v.stock
      ),
      stock: v.stock,
    }
  }

  return (
    <main id="main" className="mx-auto max-w-2xl px-4 py-8 text-base">
      <h1 className="text-2xl font-extrabold tracking-tight">주문서</h1>
      <CheckoutForm
        lastShipping={(last?.shipping_info as ShippingInfo | undefined) ?? null}
        directLine={directLine}
      />
    </main>
  )
}
