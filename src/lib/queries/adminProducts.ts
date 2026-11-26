'use client'

import { createClient } from '@/lib/supabase/browser'
import { numberOf, TODAY_TAG, withToday } from '@/lib/productTags'
import type { Product, ProductDetail, ProductVariant } from '@/types/product'

/**
 * 어드민이 쓰는 읽기·쓰기.
 *
 * 손님용 `products.ts` 와 나눠 둔 이유는 **보는 범위가 다르기** 때문이다.
 * 여기서는 감춘 상품(`is_active = false`)까지 보여야 관리가 된다.
 *
 * **거르는 코드가 없는데 어떻게 나뉘는가** — RLS 가 나눈다. 로그인하지
 * 않은 사람에게는 같은 쿼리가 공개된 것만 돌려준다 (`0003`,
 * docs/dev/schema.md 4절). 화면이 권한을 판단하지 않는다.
 *
 * ⚠️ 그래서 **이 파일의 함수가 조용히 빈 결과를 줄 수 있다.** 쓰기도
 * 마찬가지다 — 관리자가 아니면 에러가 아니라 「0행 변경」으로 끝난다.
 * 그래서 아래 쓰기 함수들은 전부 결과를 돌려받아 확인한다.
 */

/** 폼이 채우는 값. id·시각은 DB 가 만든다 */
export type ProductInput = Omit<
  Product,
  'id' | 'created_at' | 'updated_at' | 'detail_images' | 'tags'
> & {
  tags: string[]
  detail_images: string[]
}

/** 폼이 채우는 옵션 한 줄. 기존 것은 id 가 있고 새 것은 없다 */
export type VariantInput = {
  id?: string
  name: string
  name_en: string | null
  price_krw: number
  stock: number
  position: number
}

/** 목록 — 감춘 것 포함, 최신순 */
export async function listProducts(): Promise<Product[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export function numberConflict(
  products: Product[],
  no: number,
  id?: string
): string | null {
  const owner = products.find(
    (product) => product.id !== id && Number(numberOf(product.tags)) === no
  )
  return owner
    ? `${String(no).padStart(2, '0')}번은 ‘${owner.name}’이 쓰고 있습니다.`
    : null
}

export async function clearOtherTodayProducts(id: string): Promise<void> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .select('id, tags, updated_at')
    .contains('tags', [TODAY_TAG])
    .neq('id', id)
  if (error) throw new Error(error.message)

  const results = await Promise.allSettled(
    (data ?? []).map(async (product) => {
      const { data: updated, error } = await supabase
        .from('products')
        .update({ tags: withToday(product.tags, false) })
        .eq('id', product.id)
        .eq('updated_at', product.updated_at)
        .select('id')
      if (error || !updated?.length) {
        throw new Error(
          error?.message ?? 'Today tag cleanup did not update a row'
        )
      }
    })
  )
  if (results.some((result) => result.status === 'rejected')) {
    throw new Error('Today tag cleanup failed')
  }
}

/** 옵션까지 전부 — 현장 계산기가 쓴다. 감춘 상품도 현장에서는 판다 */
export async function listProductDetails(): Promise<ProductDetail[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*, variants:product_variants(*)')
    .order('category')
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []).map((p) => ({
    ...p,
    variants: (p.variants ?? []).sort(
      (a: ProductVariant, b: ProductVariant) => a.position - b.position
    ),
  }))
}

/** 하나 — 수정 폼을 채울 때. 옵션까지 같이 가져온다 */
export async function getProduct(id: string): Promise<ProductDetail | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*, variants:product_variants(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null

  const variants = (data.variants ?? []).sort(
    (a: ProductVariant, b: ProductVariant) => a.position - b.position
  )
  return { ...data, variants }
}

/**
 * 등록. **상품과 옵션을 같이 넣는다.**
 *
 * 옵션 없는 상품은 화면에 안 나온다 — 가격이 옵션에 붙어 있어 목록 뷰가
 * `join` 으로 걸러낸다 (schema.md 5절). 그래서 여기서 둘을 따로 저장하게
 * 두지 않는다.
 */
export async function createProduct(
  input: ProductInput,
  variants: VariantInput[]
): Promise<string> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('products')
    .insert(input)
    .select('id')
    .single()

  // 관리자가 아니면 여기서 42501 이 온다. 조용히 넘기면 폼만 초기화되고
  // 아무것도 저장되지 않은 것을 알 수 없다.
  if (error) throw new Error(error.message)

  const productId = data.id as string
  try {
    await insertVariants(
      productId,
      variants.map((v, i) => ({ ...v, position: i }))
    )
  } catch (e) {
    // 옵션이 안 들어갔으면 상품도 거둔다. 남겨두면 다시 저장할 때
    // 「slug 가 이미 있다」로 막힌다
    await supabase.from('products').delete().eq('id', productId)
    throw e
  }
  return productId
}

/**
 * 수정.
 *
 * `loaded` 는 **폼을 열 때 읽은 옵션**이다(`getProduct().variants`). 무엇이
 * 지워졌고 무엇이 바뀌었는지를 이것과 비교해 안다.
 */
export async function updateProduct(
  id: string,
  input: ProductInput,
  variants: VariantInput[],
  loaded: ProductVariant[]
): Promise<void> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .update(input)
    .eq('id', id)
    .select('id')

  if (error) throw new Error(error.message)
  // RLS 가 막으면 에러 없이 0행이 돌아온다. 이 확인이 없으면 「저장됐다」고
  // 말해 놓고 아무것도 안 바뀌는 일이 생긴다.
  if (!data || data.length === 0) {
    throw new Error('저장되지 않았습니다. 관리자로 로그인했는지 확인해 주세요.')
  }

  await syncVariants(id, variants, loaded)
}

/** 새 옵션 줄들. position 은 폼에 보이는 순서다 */
async function insertVariants(
  productId: string,
  rows: (VariantInput & { position: number })[]
): Promise<void> {
  if (rows.length === 0) return
  const { error } = await createClient()
    .from('product_variants')
    .insert(
      rows.map((v) => ({
        product_id: productId,
        name: v.name,
        name_en: v.name_en || null,
        price_krw: v.price_krw,
        stock: v.stock,
        position: v.position,
      }))
    )
  if (error) throw new Error(error.message)
}

/**
 * 옵션을 맞춘다. **있던 옵션의 id 를 지킨다 ★**
 *
 * 처음에는 통째로 지우고 다시 넣었다. 주문이 붙은 뒤로는 그러면 안 된다 —
 * `order_items.variant_id` 가 `null` 이 되어 **결제 중이던 주문이
 * `VARIANT_GONE` 으로 취소되고**(`0005`), 손님 장바구니도 끊어진다. 옵션 이름의
 * 오타 하나만 고쳐도 그렇다. 폼에 없는 값(`price_usd`·`is_active`)도 사라진다.
 *
 * **바뀐 칸만 쓴다 ★** 재고는 결제가 끝날 때마다 DB 가 깎는다. 폼을 열어둔
 * 사이 팔린 것을 열 때의 숫자로 덮으면 **없는 물건이 되살아난다.** 재고를
 * 고쳤을 때는 열 때의 값 그대로인지 확인하고 쓴다.
 */
async function syncVariants(
  productId: string,
  variants: VariantInput[],
  loaded: ProductVariant[]
): Promise<void> {
  const supabase = createClient()
  const ordered = variants.map((v, i) => ({ ...v, position: i }))
  const kept = new Set(ordered.map((v) => v.id).filter(Boolean))

  // 지우는 것이 먼저다. 지운 옵션의 이름을 새 옵션이 쓸 수 있다 —
  // (product_id, name) 이 unique 다
  const removed = loaded.filter((v) => !kept.has(v.id)).map((v) => v.id)
  if (removed.length > 0) {
    const { data, error } = await supabase
      .from('product_variants')
      .delete()
      .eq('product_id', productId)
      .in('id', removed)
      .select('id')
    if (error) throw new Error(error.message)
    if (!data || data.length !== removed.length) throw new Error(STALE)
  }

  for (const v of ordered) {
    if (!v.id) continue
    const before = loaded.find((l) => l.id === v.id)
    if (!before) throw new Error(STALE)

    const next = {
      name: v.name,
      name_en: v.name_en || null,
      price_krw: v.price_krw,
      stock: v.stock,
      position: v.position,
    }
    const patch = Object.fromEntries(
      Object.entries(next).filter(
        ([k, value]) => before[k as keyof typeof next] !== value
      )
    )
    if (Object.keys(patch).length === 0) continue

    let query = supabase
      .from('product_variants')
      .update(patch)
      .eq('id', v.id)
      .eq('product_id', productId)
    if ('stock' in patch) query = query.eq('stock', before.stock)

    const { data, error } = await query.select('id')
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) throw new Error(STALE)
  }

  await insertVariants(
    productId,
    ordered.filter((v) => !v.id)
  )
}

const STALE =
  '그사이 옵션이나 재고가 바뀌었습니다. 새로고침해서 지금 값을 확인한 뒤 다시 저장해 주세요.'

/** 삭제. 옵션은 `on delete cascade` 로 같이 지워진다 */
export async function deleteProduct(id: string): Promise<void> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    throw new Error('삭제되지 않았습니다. 관리자로 로그인했는지 확인해 주세요.')
  }
}

/**
 * 사진 업로드. **`<slug>/01.jpg` 규칙을 코드가 지킨다** (schema.md 7절).
 *
 * 옛 레포는 버킷 루트에 난수 이름으로 올리고 **전체 주소**를 DB 에 넣었다.
 * 그 부분만 계승하지 않는다 — 전체 주소를 넣으면 프로젝트가 바뀔 때 모든
 * 행을 고쳐야 한다. 여기서는 **경로만** 돌려준다.
 *
 * **여러 장을 한 번에 받는다.** 한 장씩 부르면 폴더 목록을 장마다 다시
 * 읽게 되어 왕복이 두 배가 된다. 처음에 그렇게 짰다가 느려서 고쳤다
 * (2026-09-19).
 *
 * **번호를 먼저 다 정하고 동시에 올린다.** 순서대로 기다릴 이유가 없다 —
 * 번호가 이미 정해져 있어 겹치지 않기 때문이다. 다섯 장이면 다섯 배 가깝게
 * 빨라진다.
 *
 * 줄이고 형식을 맞추는 것은 `compressImage` 가 한다. 여기서는 받은 파일을
 * 그대로 올린다.
 */
export async function uploadProductImages(
  slug: string,
  files: File[]
): Promise<string[]> {
  if (!slug) throw new Error('slug 를 먼저 입력해 주세요. 폴더 이름이 됩니다.')

  const supabase = createClient()

  // 폴더 목록은 **한 번만** 읽는다. 다음 번호는 여기서 세어 나간다
  const { data: existing } = await supabase.storage
    .from('product-images')
    .list(slug, { limit: 1000 })

  const start =
    (existing ?? []).reduce((max, f) => {
      const n = Number(f.name.split('.')[0])
      return Number.isFinite(n) && n > max ? n : max
    }, 0) + 1

  // 번호를 먼저 배정한다. 이래야 동시에 올려도 겹치지 않는다
  const planned = files.map((file, i) => ({
    file,
    path: `${slug}/${String(start + i).padStart(2, '0')}.${extensionOf(file)}`,
  }))

  await Promise.all(
    planned.map(async ({ file, path }) => {
      const { error } = await supabase.storage
        .from('product-images')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined,
        })
      if (error) throw new Error(`${file.name} — ${error.message}`)
    })
  )

  return planned.map((p) => p.path)
}

/**
 * 확장자는 **파일 이름이 아니라 실제 형식에서** 뽑는다.
 *
 * 이름만 믿으면 두 가지가 깨진다 — 이름에 점이 없는 파일(`photo`)은
 * 확장자가 `photo` 가 되고, 이름만 `.jpg` 인 HEIC 는 엉뚱한 이름으로
 * 저장된다. 둘 다 화면에서 엑스박스로 끝난다.
 */
function extensionOf(file: File): string {
  const byType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
  }
  if (byType[file.type]) return byType[file.type]

  const fromName = file.name.includes('.')
    ? (file.name.split('.').pop() ?? '').toLowerCase()
    : ''
  return /^[a-z0-9]{2,5}$/.test(fromName) ? fromName : 'jpg'
}
