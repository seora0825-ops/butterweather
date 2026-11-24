'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import ProductForm from '@/components/admin/ProductForm'
import { getProduct } from '@/lib/queries/adminProducts'
import type { ProductDetail } from '@/types/product'

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <EditProduct key={id} id={id} />
}

/**
 * 상품 수정은 등록과 같은 폼을 쓴다. 값을 받기 전에 빈 폼을 그리면
 * 그 사이에 저장을 눌러 상품을 빈 값으로 덮어쓸 수 있다.
 */
function EditProduct({ id }: { id: string }) {
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    getProduct(id).then(
      (loaded) => {
        if (!alive) return
        if (loaded) setProduct(loaded)
        else setError('상품을 찾지 못했습니다. 목록에서 상품을 확인해 주세요.')
      },
      () => {
        if (alive) setError('상품을 불러오지 못했습니다. 새로고침해 주세요.')
      }
    )
    return () => {
      alive = false
    }
  }, [id])

  if (error)
    return (
      <div className="space-y-2 text-sm">
        <p role="alert">{error}</p>
        <Link href="/admin/products" className="underline">
          상품 목록으로 돌아가기
        </Link>
      </div>
    )

  if (!product)
    return (
      <p role="status" className="text-sm">
        상품을 불러오는 중입니다.
      </p>
    )

  return (
    <div className="flex flex-col gap-6 text-sm">
      <h1 className="font-semibold wrap-anywhere">{product.name}</h1>
      <ProductForm initial={product} />
    </div>
  )
}
