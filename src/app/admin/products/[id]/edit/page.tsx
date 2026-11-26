'use client'

import { ButtonLink, Notice, PageHeader } from '@/components/admin/ui'
import { use, useEffect, useState } from 'react'
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
      <div className="space-y-6 text-sm">
        <PageHeader title="상품 수정" />
        <Notice tone="error">{error}</Notice>
        <ButtonLink href="/admin/products" variant="ghost">
          상품 목록으로 돌아가기
        </ButtonLink>
      </div>
    )

  if (!product) {
    return (
      <div className="space-y-6 text-sm">
        <PageHeader title="상품 수정" />
        <Notice>상품을 불러오는 중입니다.</Notice>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 text-sm">
      <PageHeader
        title={product.name}
        actions={<ButtonLink href="/admin/products">상품 목록으로</ButtonLink>}
      />
      <ProductForm initial={product} />
    </div>
  )
}
