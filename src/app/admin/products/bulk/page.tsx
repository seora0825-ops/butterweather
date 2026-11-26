'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { revalidateShop } from '@/app/admin/actions'
import { compressImage } from '@/lib/compressImage'
import { nameFor, tonesOf, type Tone } from '@/lib/naming'
import { LIMITS } from '@/lib/productLimits'
import {
  createProduct,
  listProducts,
  uploadProductImages,
} from '@/lib/queries/adminProducts'
import type { ProductCategory } from '@/types/product'

const CATEGORIES: { id: ProductCategory; label: string; price: number }[] = [
  // 값은 임시다. 나래가 정하면 고친다
  { id: 'keyring', label: '키링', price: 15000 },
  { id: 'ring', label: '반지', price: 15000 },
  { id: 'bracelet', label: '팔찌', price: 18000 },
  { id: 'necklace', label: '목걸이', price: 28000 },
]

type Draft = {
  id: string
  file: File
  preview: string
  tones: Tone[]
  turn: number
  name: string
  price: string
  /** 같은 디자인으로 만든 개수 */
  stock: string
  state: 'ready' | 'saving' | 'done' | 'failed'
  /** 실패해서 다시 누를 때 같은 slug 를 쓴다 */
  slug: string
  reason?: string
}

const FIELD = 'w-full min-w-0 border border-gray-300 px-3 py-2 text-base'

/** 작게 줄여 색만 본다 */
async function readTones(file: File): Promise<Tone[]> {
  try {
    const bitmap = await createImageBitmap(file)
    const size = 160
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return []
    ctx.drawImage(bitmap, 0, 0, size, size)
    bitmap.close()
    return tonesOf(ctx.getImageData(0, 0, size, size).data, size, size)
  } catch {
    // 색을 못 읽어도 이름은 짓는다
    return []
  }
}

function newSlug(category: ProductCategory): string {
  const random = crypto.getRandomValues(new Uint8Array(5))
  const code = Array.from(random, (b) => (b % 36).toString(36)).join('')
  return `${category}-${code}`
}

/**
 * 사진 여러 장을 한 번에 등록한다. **사진 한 장이 디자인 하나다.**
 *
 * 처음에는 「하나뿐」이라 재고를 1로 박았다. 2026-11-26 홍설아: 디자인마다 다섯
 * 개쯤 만든다 — 그래서 개수를 받는다. 1이면 상세가 「하나뿐입니다」로 보인다.
 *
 * 하나가 실패해도 나머지는 계속 간다. 실패한 것만 남아 다시 누를 수 있다.
 */
export default function BulkPage() {
  const [category, setCategory] = useState<ProductCategory>('bracelet')
  const [price, setPrice] = useState('18000')
  const [stock, setStock] = useState('5')
  const [active, setActive] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [existing, setExisting] = useState<Set<string> | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(false)
  const previews = useRef<string[]>([])

  useEffect(() => {
    let alive = true
    listProducts().then(
      (products) => {
        if (alive) setExisting(new Set(products.map((p) => p.name)))
      },
      () => {
        if (alive) setLoadFailed(true)
      }
    )
    const urls = previews.current
    return () => {
      alive = false
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  function patch(id: string, next: Partial<Draft>) {
    setDrafts((list) => list.map((d) => (d.id === id ? { ...d, ...next } : d)))
  }

  async function accept(files: File[]) {
    const images = files.filter((f) => f.type.startsWith('image/') || !f.type)
    if (images.length === 0 || !existing) return
    setReading(true)
    const taken = new Set([...existing, ...drafts.map((d) => d.name)])
    const added: Draft[] = []
    for (const file of images) {
      const tones = await readTones(file)
      const seed = `${file.name}-${file.size}`
      const name = nameFor(tones, seed, taken)
      taken.add(name)
      const preview = URL.createObjectURL(file)
      previews.current.push(preview)
      added.push({
        id: crypto.randomUUID(),
        file,
        preview,
        tones,
        turn: 0,
        name,
        price,
        stock,
        state: 'ready',
        slug: newSlug(category),
      })
    }
    setDrafts((list) => [...list, ...added])
    setReading(false)
  }

  function rename(draft: Draft) {
    const taken = new Set([
      ...(existing ?? []),
      ...drafts.filter((d) => d.id !== draft.id).map((d) => d.name),
      draft.name,
    ])
    const turn = draft.turn + 1
    patch(draft.id, {
      turn,
      name: nameFor(
        draft.tones,
        `${draft.file.name}-${draft.file.size}-${turn}`,
        taken
      ),
    })
  }

  const waiting = drafts.filter((d) => d.state !== 'done')
  const names = drafts.map((d) => d.name.trim())
  const problem = (d: Draft): string | null => {
    const name = d.name.trim()
    const won = Number(d.price)
    if (!name || name.length > LIMITS.name.max) return '이름을 넣어 주세요.'
    if (names.filter((n) => n === name).length > 1 || existing?.has(name)) {
      return '같은 이름이 있습니다.'
    }
    if (d.price === '' || !Number.isInteger(won) || won < 0) {
      return '가격을 확인해 주세요.'
    }
    const count = Number(d.stock)
    if (d.stock === '' || !Number.isInteger(count) || count < 0) {
      return '개수를 확인해 주세요.'
    }
    return null
  }
  const ready = waiting.length > 0 && waiting.every((d) => problem(d) === null)

  async function saveAll() {
    if (busy || !ready) return
    setBusy(true)
    const saved: string[] = []
    for (const d of waiting) {
      patch(d.id, { state: 'saving', reason: undefined })
      try {
        const result = await compressImage(d.file)
        if (!result.ok) throw new Error(result.reason)
        const images = await uploadProductImages(d.slug, [result.file])
        await createProduct(
          {
            slug: d.slug,
            name: d.name.trim(),
            name_en: null,
            description: null,
            description_en: null,
            category,
            tags: [],
            images,
            detail_images: [],
            status: 'active',
            is_active: active,
          },
          [
            {
              name: '기본',
              name_en: null,
              price_krw: Number(d.price),
              stock: Number(d.stock),
              position: 0,
            },
          ]
        )
        saved.push(d.name.trim())
        patch(d.id, { state: 'done' })
      } catch {
        patch(d.id, {
          state: 'failed',
          reason:
            '등록하지 못했습니다. 연결을 확인하고 아래 버튼을 다시 눌러 주세요.',
        })
      }
    }
    if (saved.length > 0) {
      setExisting((set) => new Set([...(set ?? []), ...saved]))
      await revalidateShop().catch(() => {})
    }
    setBusy(false)
  }

  const done = drafts.filter((d) => d.state === 'done').length

  return (
    <div className="flex flex-col gap-6 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-semibold">사진으로 한 번에 등록</h1>
        <Link href="/admin/products" className="underline">
          상품 목록
        </Link>
      </div>
      <p>
        사진 한 장이 디자인 하나가 됩니다. 이름은 사진의 색을 보고 지어 드리고,
        등록하기 전에 이름·가격·개수를 고치실 수 있습니다.
      </p>
      {loadFailed ? (
        <p role="alert">
          이미 쓴 이름을 읽지 못했습니다. 페이지를 새로고침해 주세요.
        </p>
      ) : null}

      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-4">
        <label className="flex flex-col gap-1">
          카테고리
          <select
            value={category}
            disabled={drafts.length > 0}
            onChange={(e) => {
              const next = CATEGORIES.find((c) => c.id === e.target.value)
              if (!next) return
              setCategory(next.id)
              setPrice(String(next.price))
            }}
            className={FIELD}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          기본 가격 (원)
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={FIELD}
          />
        </label>
        <label className="flex flex-col gap-1">
          기본 개수
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className={FIELD}
          />
        </label>
        <label className="flex items-center gap-2 sm:mt-6">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="size-5"
          />
          등록하면서 가게에 보이기
        </label>
      </fieldset>

      <label className="flex min-h-24 cursor-pointer items-center justify-center border border-dashed border-gray-300 px-4 text-center has-disabled:cursor-not-allowed has-disabled:opacity-40">
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={busy || reading || !existing}
          onChange={(e) => {
            void accept(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
          className="sr-only"
        />
        {reading ? '사진을 읽는 중입니다.' : '사진 여러 장 고르기'}
      </label>

      <ul className="grid gap-4 sm:grid-cols-2">
        {drafts.map((d) => (
          <li key={d.id} className="flex gap-3 border border-gray-300 p-3">
            {/* 아직 올리지 않은 파일이라 next/image 를 쓸 수 없다 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={d.preview}
              alt=""
              className="aspect-tile w-24 shrink-0 self-start object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {d.state === 'done' ? (
                <p>{`${d.name} 등록했습니다.`}</p>
              ) : (
                <>
                  <label className="flex flex-col gap-1">
                    이름
                    <input
                      value={d.name}
                      disabled={busy}
                      maxLength={LIMITS.name.max}
                      onChange={(e) => patch(d.id, { name: e.target.value })}
                      className={FIELD}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    가격 (원)
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={d.price}
                      disabled={busy}
                      onChange={(e) => patch(d.id, { price: e.target.value })}
                      className={FIELD}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    개수
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={d.stock}
                      disabled={busy}
                      onChange={(e) => patch(d.id, { stock: e.target.value })}
                      className={FIELD}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => rename(d)}
                      className="border border-gray-300 px-3 py-2 disabled:opacity-40"
                    >
                      이름 다시 짓기
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setDrafts((list) => list.filter((x) => x.id !== d.id))
                      }
                      className="px-2 py-2 underline disabled:opacity-40"
                    >
                      빼기
                    </button>
                  </div>
                  {d.state === 'saving' ? (
                    <p role="status">등록하는 중입니다.</p>
                  ) : null}
                  {d.reason || problem(d) ? (
                    <p role="alert">{d.reason ?? problem(d)}</p>
                  ) : null}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {drafts.length > 0 ? (
        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-gray-300 bg-white py-3">
          <button
            type="button"
            onClick={saveAll}
            disabled={busy || !ready}
            className="border border-black px-4 py-3 disabled:opacity-40"
          >
            {busy ? '등록하는 중…' : `${waiting.length}개 등록하기`}
          </button>
          {done > 0 ? (
            <span role="status">{`${done}개 등록했습니다.`}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
