'use client'

import { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import DeleteProductButton from '@/components/admin/DeleteProductButton'
import { imageUrl } from '@/lib/images'
import { listProducts } from '@/lib/queries/adminProducts'
import type { Product, ProductCategory } from '@/types/product'

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  keyring: '키링',
  ring: '반지',
  bracelet: '팔찌',
  necklace: '목걸이',
}

type ProductList =
  | { state: 'loading' | 'error' }
  | { state: 'ready'; products: Product[] }

/** 브라우저가 세션을 갱신하고, 감춘 상품의 조회 범위는 RLS가 정한다. */
export default function AdminProductsPage() {
  const [list, setList] = useState<ProductList>({ state: 'loading' })
  const [revision, setRevision] = useState(0)
  const [deleteRefreshFailed, setDeleteRefreshFailed] = useState(false)

  useEffect(() => {
    let alive = true
    listProducts().then(
      (products) => {
        if (alive) setList({ state: 'ready', products })
      },
      () => {
        if (alive) setList({ state: 'error' })
      }
    )
    return () => {
      alive = false
    }
  }, [revision])

  function reload() {
    setList({ state: 'loading' })
    setRevision((value) => value + 1)
  }

  return (
    <div className="flex flex-col gap-6 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold">상품</h1>
          {list.state === 'ready' && <p>{list.products.length}개</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/products/bulk"
            className="border border-gray-300 px-3 py-2"
          >
            사진으로 한 번에 등록
          </Link>
          <Link
            href="/admin/products/new"
            className="border border-gray-300 px-3 py-2"
          >
            상품 등록하기
          </Link>
        </div>
      </div>

      <Suspense>
        <SaveNotice />
      </Suspense>
      {deleteRefreshFailed && (
        <p role="status">
          상품을 지웠습니다. 가게에 반영되기까지 잠시 기다려 주세요.
        </p>
      )}
      {list.state === 'loading' && (
        <p role="status">상품을 불러오는 중입니다.</p>
      )}
      {list.state === 'error' && (
        <div>
          <p role="alert">상품을 불러오지 못했습니다. 다시 불러와 주세요.</p>
          <button type="button" onClick={reload} className="underline">
            다시 불러오기
          </button>
        </div>
      )}
      {list.state === 'ready' &&
        (list.products.length === 0 ? (
          <p>등록된 상품이 없습니다.</p>
        ) : (
          <ul className="border-t border-gray-300">
            {list.products.map((product) => (
              <li
                key={product.id}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-gray-300 py-3"
              >
                <div className="relative size-16 overflow-hidden border border-gray-300">
                  {product.images[0] && (
                    <Image
                      src={imageUrl(product.images[0])}
                      alt=""
                      unoptimized
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="wrap-anywhere">
                  <p>{CATEGORY_LABELS[product.category]}</p>
                  <p>{product.name}</p>
                  <p>{product.slug}</p>
                  <p>
                    {product.status === 'sold_out' ? '품절' : '판매 중'} ·{' '}
                    {product.is_active ? '보임' : '감춤'}
                  </p>
                </div>
                <div className="col-span-2 space-y-2">
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="underline"
                  >
                    수정하기
                  </Link>
                  <DeleteProductButton
                    id={product.id}
                    name={product.name}
                    onDeleted={(refreshFailed) => {
                      if (refreshFailed) setDeleteRefreshFailed(true)
                      reload()
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ))}
    </div>
  )
}

function SaveNotice() {
  const params = useSearchParams()
  if (params.get('shop-refresh') !== 'failed') return null
  return (
    <p role="status">
      상품을 저장했습니다. 가게에 반영되기까지 잠시 기다려 주세요.
    </p>
  )
}
