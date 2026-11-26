'use client'

import {
  Button,
  Checkbox,
  Notice,
  Select,
  TextArea,
  TextField,
} from '@/components/admin/ui'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ImageField from '@/components/admin/ImageField'
import { LIMITS, validateProduct } from '@/lib/productLimits'
import {
  createProduct,
  updateProduct,
  type ProductInput,
  type VariantInput,
} from '@/lib/queries/adminProducts'
import { revalidateShop } from '@/app/admin/actions'
import type {
  ProductCategory,
  ProductDetail,
  ProductStatus,
} from '@/types/product'

/**
 * 상품 등록·수정 폼. **한 벌로 둘 다 한다** — 옛 레포와 같다. 화면을
 * 나누면 칸이 하나 늘 때마다 두 군데를 고쳐야 한다.
 *
 * 옛 것과 크게 다른 곳이 하나 있다. **옵션(variant)** 이다. 옛 쪽은 가격·
 * 재고가 상품에 붙어 있어 칸 두 개면 됐는데, 여기서는 옵션마다 값이 달라
 * 줄을 여러 개 다룬다 (schema.md 1절).
 *
 * ⚠️ **사진은 slug 를 채워야 올릴 수 있다.** 버킷 폴더 이름이 slug 이기
 * 때문이다 (schema.md 7절). 먼저 올리게 두면 사진이 어디로 갈지 정할 수
 * 없다.
 */

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'keyring', label: '키링' },
  { value: 'ring', label: '반지' },
  { value: 'bracelet', label: '팔찌' },
  { value: 'necklace', label: '목걸이' },
]

type VariantDraft = Omit<VariantInput, 'price_krw' | 'stock'> & {
  price_krw: number | ''
  stock: number | ''
}

/** 옵션이 없는 상품은 화면에 안 나온다. 새 상품은 빈 줄 하나로 시작한다 */
const EMPTY_VARIANT: VariantDraft = {
  name: '',
  name_en: null,
  price_krw: '',
  stock: '',
  position: 0,
}

/** 손으로 만들어 같은 것이 없다. 새 상품은 **하나뿐인 것**으로 시작한다 */
const ONE_OF_A_KIND: VariantDraft = { ...EMPTY_VARIANT, name: '기본', stock: 1 }

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-ink-muted mt-1 text-xs">{hint}</p> : null}
    </div>
  )
}

/** DB 가 돌려준 말은 영문이라 그대로 보이지 않는다. 고칠 수 있는 것만 짚는다 */
function saveError(err: unknown): string {
  const message = err instanceof Error ? err.message : ''
  if (message.startsWith('그사이 옵션이나 재고가 바뀌었습니다.')) return message
  if (message.includes('products_slug_key')) {
    return '같은 slug 를 쓰는 상품이 이미 있습니다. 다른 slug 를 넣어 주세요.'
  }
  return '상품 저장을 완료하지 못했습니다. 입력값과 관리자 계정을 확인한 뒤 다시 시도해 주세요.'
}

export default function ProductForm({
  initial,
}: {
  /** 없으면 등록, 있으면 수정 */
  initial?: ProductDetail
}) {
  const router = useRouter()
  const editing = Boolean(initial)

  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [nameEn, setNameEn] = useState(initial?.name_en ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState<ProductCategory>(
    initial?.category ?? 'bracelet'
  )
  const [images, setImages] = useState<string[]>(initial?.images ?? [])
  const [isActive, setIsActive] = useState(initial?.is_active ?? false)
  const [status, setStatus] = useState<ProductStatus>(
    initial?.status ?? 'active'
  )
  const [variants, setVariants] = useState<VariantDraft[]>(
    (initial?.variants.length ? initial.variants : undefined)?.map((v) => ({
      id: v.id,
      name: v.name,
      name_en: v.name_en,
      price_krw: v.price_krw,
      stock: v.stock,
      position: v.position,
    })) ?? [{ ...ONE_OF_A_KIND }]
  )

  const [uploadNote, setUploadNote] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const savingRef = useRef(false)
  const uploadingRef = useRef(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)

  function updateUploading(value: boolean) {
    uploadingRef.current = value
    setUploading(value)
    if (value) {
      setUploadError(null)
      setUploadNote(null)
    }
  }

  function setVariant(i: number, patch: Partial<VariantDraft>) {
    setVariants((vs) => vs.map((v, j) => (i === j ? { ...v, ...patch } : v)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (savingRef.current || uploadingRef.current) return
    setError(null)

    const values: VariantInput[] = variants.map((variant) => ({
      ...variant,
      price_krw: variant.price_krw === '' ? NaN : variant.price_krw,
      stock: variant.stock === '' ? NaN : variant.stock,
    }))

    // DB 의 CHECK 제약과 같은 값을 미리 본다. 저장을 눌렀다가 DB 에서
    // 튕기면 어느 칸이 문제인지 알 수 없다 (schema.md 7-2절).
    const problems = validateProduct({
      slug,
      name,
      nameEn,
      description,
      images,
      variants: values,
    })
    if (problems.length > 0) {
      setError(problems.join('\n'))
      return
    }

    const input: ProductInput = {
      slug: initial?.slug ?? slug.trim(),
      name: name.trim(),
      name_en: nameEn.trim() || null,
      description: description.trim() || null,
      description_en: initial?.description_en ?? null,
      category,
      tags: initial?.tags ?? [],
      images,
      detail_images: initial?.detail_images ?? [],
      status,
      is_active: isActive,
    }

    savingRef.current = true
    setSaving(true)
    try {
      if (initial) {
        // syncVariants는 폼을 열 때 읽은 옵션을 기준으로 재고 변경을 확인한다.
        await updateProduct(initial.id, input, values, initial.variants)
      } else {
        await createProduct(input, values)
      }
    } catch (err) {
      setError(saveError(err))
      savingRef.current = false
      setSaving(false)
      return
    }

    // 가게 화면은 60초 주기로 굽는다. 바꾼 즉시 보이도록 깨운다.
    let destination = '/admin/products?shop-refresh=saved'
    try {
      await revalidateShop()
    } catch {
      destination = '/admin/products?shop-refresh=failed'
    }
    router.push(destination)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <fieldset
        disabled={saving}
        className="border-line flex min-w-0 flex-col gap-6 rounded-md border bg-white p-4 sm:p-6"
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field id="product-name" label="이름 (국문) *">
            <TextField
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={LIMITS.name.max}
              required
            />
          </Field>
          <Field id="product-name-en" label="이름 (영문)">
            <TextField
              id="product-name-en"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              maxLength={LIMITS.nameEn.max}
            />
          </Field>
        </div>

        <Field
          id="product-slug"
          label="slug *"
          hint={
            editing
              ? '주소와 사진 폴더 이름으로 쓰여 수정할 수 없습니다.'
              : '주소와 사진 폴더 이름이 됩니다. 영문 소문자·숫자·하이픈을 입력해 주세요.'
          }
        >
          <TextField
            id="product-slug"
            value={slug}
            readOnly={editing || uploading}
            onChange={(e) => setSlug(e.target.value)}
            minLength={LIMITS.slug.min}
            maxLength={LIMITS.slug.max}
            required
          />
        </Field>

        <Field
          id="product-category"
          label="카테고리 *"
          hint="소재가 아니라 형태로 나눕니다."
        >
          <Select
            id="product-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="product-description" label="설명">
          <TextArea
            id="product-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={LIMITS.description.max}
          />
        </Field>

        {/* ───── 사진 ───── */}
        <ImageField
          slug={slug.trim()}
          images={images}
          onChange={setImages}
          onNotice={setUploadNote}
          onError={setUploadError}
          uploading={uploading}
          onUploadingChange={updateUploading}
          disabled={saving}
        />
        {uploadNote ? <Notice tone="success">{uploadNote}</Notice> : null}

        {uploadError && <Notice tone="error">{uploadError}</Notice>}

        {/* ───── 옵션 ───── */}
        <fieldset className="min-w-0">
          <legend className="mb-2 text-base font-semibold">옵션</legend>
          <p className="text-ink-muted mb-3">
            옵션마다 가격과 재고를 입력해 주세요. 옵션은 한 개 이상 필요합니다.
          </p>
          <div className="flex flex-col gap-3">
            {variants.map((v, i) => (
              <fieldset
                key={v.id ?? `new-${i}`}
                className="border-line bg-cloud grid min-w-0 grid-cols-1 items-end gap-2 rounded-md border p-3 min-[360px]:grid-cols-2 sm:grid-cols-4"
              >
                <legend>옵션 {i + 1}</legend>
                <label className="grid min-w-0 gap-1">
                  이름 *
                  <TextField
                    maxLength={LIMITS.variantName.max}
                    value={v.name}
                    onChange={(e) => setVariant(i, { name: e.target.value })}
                  />
                </label>
                <label className="grid min-w-0 gap-1">
                  영문 이름
                  <TextField
                    maxLength={LIMITS.variantNameEn.max}
                    value={v.name_en ?? ''}
                    onChange={(e) => setVariant(i, { name_en: e.target.value })}
                  />
                </label>
                <label className="grid min-w-0 gap-1">
                  가격 (원)
                  <TextField
                    type="number"
                    min={LIMITS.priceKrw.min}
                    max={LIMITS.priceKrw.max}
                    value={v.price_krw}
                    onChange={(e) =>
                      setVariant(i, {
                        price_krw:
                          e.target.value === '' ? '' : e.target.valueAsNumber,
                      })
                    }
                  />
                </label>
                <label className="grid min-w-0 gap-1">
                  재고
                  <TextField
                    type="number"
                    min={LIMITS.stock.min}
                    max={LIMITS.stock.max}
                    value={v.stock}
                    onChange={(e) =>
                      setVariant(i, {
                        stock:
                          e.target.value === '' ? '' : e.target.valueAsNumber,
                      })
                    }
                  />
                </label>
                <Button
                  type="button"
                  onClick={() =>
                    setVariants((vs) => vs.filter((_, j) => j !== i))
                  }
                  disabled={variants.length === 1}
                  variant="danger"
                  className="w-fit"
                >
                  빼기
                </Button>
              </fieldset>
            ))}
            <Button
              type="button"
              onClick={() =>
                setVariants((vs) => [
                  ...vs,
                  { ...EMPTY_VARIANT, position: vs.length },
                ])
              }
              disabled={variants.length >= LIMITS.variants.max}
              className="w-fit"
            >
              옵션 추가하기
            </Button>
          </div>
        </fieldset>

        <Field id="product-status" label="판매 상태">
          <Select
            id="product-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProductStatus)}
          >
            <option value="active">판매 중</option>
            <option value="sold_out">품절</option>
          </Select>
        </Field>

        <div>
          <label className="flex min-h-11 items-center gap-2 font-medium">
            <Checkbox
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            가게에 보이기
          </label>
          <p className="text-ink-muted mt-1 text-xs">
            끄면 상품 주소로 들어와도 가게에서 볼 수 없습니다.
          </p>
        </div>
      </fieldset>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {saving && <Notice>상품을 저장하는 중입니다.</Notice>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="primary" disabled={saving || uploading}>
          {saving ? '저장 중…' : editing ? '변경사항 저장' : '상품 등록'}
        </Button>
        <Button
          type="button"
          onClick={() => router.push('/admin/products')}
          disabled={saving || uploading}
        >
          취소하기
        </Button>
      </div>
    </form>
  )
}
