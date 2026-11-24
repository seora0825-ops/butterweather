'use client'

import { useId, useRef, useState } from 'react'
import Image from 'next/image'
import { imageUrl } from '@/lib/images'
import { compressImage, formatBytes } from '@/lib/compressImage'
import { uploadProductImages } from '@/lib/queries/adminProducts'
import { LIMITS } from '@/lib/productLimits'

/**
 * 사진 칸. 고르기·끌어다 놓기·순서 바꾸기·대표 지정을 맡는다.
 *
 * **첫 장이 대표다.** 따로 「대표」 표시를 저장하지 않는다 — `images[0]` 이
 * 목록과 상세의 첫 사진이라는 규칙이 이미 있고(schema.md 7절), 표시를
 * 따로 두면 순서와 어긋날 수 있다. **대표를 바꾸는 것은 맨 앞으로 옮기는
 * 것이다.**
 *
 * ⚠️ **slug 를 채워야 올릴 수 있다.** 버킷 폴더 이름이 slug 다.
 */
export default function ImageField({
  slug,
  images,
  onChange,
  onNotice,
  onError,
  disabled,
  uploading,
  onUploadingChange,
}: {
  slug: string
  images: string[]
  onChange: (next: string[]) => void
  onNotice: (text: string) => void
  onError: (text: string) => void
  disabled?: boolean
  uploading: boolean
  onUploadingChange: (active: boolean) => void
}) {
  const inputId = useId()
  const uploadInFlight = useRef(false)
  const [dragging, setDragging] = useState(false)

  const validSlug = LIMITS.slug.pattern.test(slug)
  const locked = disabled || !validSlug || uploading

  async function accept(files: File[]) {
    if (locked || uploadInFlight.current) return
    const picked = files.filter((f) => f.type.startsWith('image/') || !f.type)
    if (picked.length === 0) {
      if (files.length > 0)
        onError('사진을 읽지 못했습니다. 사진 파일을 골라 주세요.')
      return
    }

    // 올린 뒤에 「10장까지입니다」라고 하면 저장소에 쓰레기가 남는다
    const room = LIMITS.images.max - images.length
    if (room <= 0) {
      onError(
        `사진은 ${LIMITS.images.max}장까지입니다. 기존 사진을 뺀 뒤 다시 골라 주세요.`
      )
      return
    }
    const batch = picked.slice(0, room)
    uploadInFlight.current = true
    onUploadingChange(true)
    if (picked.length > room) {
      onError(
        `사진은 ${LIMITS.images.max}장까지 올릴 수 있어 처음 ${room}장만 처리합니다.`
      )
    }
    try {
      const results = await Promise.all(batch.map(compressImage))
      const before = results.reduce(
        (size, result, index) => (result.ok ? size + batch[index].size : size),
        0
      )

      // 못 읽는 파일은 **올리지 않는다.** 올려 두면 화면에서 엑스박스가 된다
      const usable = results.flatMap((r) => (r.ok ? [r.file] : []))
      const failed = results.flatMap((r) => (r.ok ? [] : [r]))

      if (usable.length > 0) {
        const after = usable.reduce((n, f) => n + f.size, 0)
        const paths = await uploadProductImages(slug, usable)
        onChange([...images, ...paths])
        onNotice(
          `사진 ${usable.length}장을 올렸습니다. 파일 크기는 처리 전 ${formatBytes(before)}, 처리 후 ${formatBytes(after)}입니다.`
        )
      }

      if (failed.length > 0) {
        onError(
          failed
            .map(
              (f) =>
                `「${f.name}」을 올리지 못했습니다. ${f.reason} 파일을 확인한 뒤 다시 골라 주세요.`
            )
            .join('\n')
        )
      }
    } catch {
      onError(
        '사진을 올리지 못했습니다. 연결을 확인한 뒤 사진을 다시 골라 주세요.'
      )
    } finally {
      uploadInFlight.current = false
      onUploadingChange(false)
    }
  }

  function move(from: number, to: number) {
    if (disabled || uploading || to < 0 || to >= images.length) return
    const next = [...images]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  return (
    <div>
      {/*
        dragOver에서 preventDefault를 하지 않으면 브라우저가 파일을
        새 탭으로 열어버린다.
      */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!locked) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void accept(Array.from(e.dataTransfer.files))
        }}
      >
        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          disabled={locked}
          onChange={(e) => {
            void accept(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
          className="peer sr-only"
        />
        <label
          htmlFor={inputId}
          className={`flex min-h-24 items-center justify-center border border-dashed border-gray-300 px-4 py-3 text-center peer-focus-visible:outline ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          사진 고르기
        </label>
      </div>
      <p role="status" className="mt-2">
        {uploading
          ? '사진을 올리는 중입니다.'
          : !validSlug
            ? '사진을 올리려면 올바른 slug를 먼저 입력해 주세요.'
            : dragging
              ? '사진을 놓으면 올립니다.'
              : '사진을 끌어다 놓아도 올릴 수 있습니다.'}
      </p>

      {images.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-3">
          {images.map((path, i) => (
            <div key={`${path}-${i}`} className="w-24">
              <div className="relative h-24 w-24 overflow-hidden border border-gray-300">
                <Image
                  src={imageUrl(path)}
                  alt=""
                  unoptimized
                  fill
                  className="object-cover"
                />
              </div>

              <div className="mt-1 flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  disabled={disabled || uploading || i === 0}
                  aria-label={`사진 ${i + 1}을 앞으로 옮기기`}
                  className="disabled:opacity-40"
                >
                  ←
                </button>
                {i === 0 ? (
                  <span>대표</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => move(i, 0)}
                    disabled={disabled || uploading}
                    className="underline disabled:opacity-40"
                  >
                    대표로 놓기
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  disabled={disabled || uploading || i === images.length - 1}
                  aria-label={`사진 ${i + 1}을 뒤로 옮기기`}
                  className="disabled:opacity-40"
                >
                  →
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  onChange(images.filter((_, index) => index !== i))
                }
                disabled={disabled || uploading}
                className="mt-1 w-full underline disabled:opacity-40"
              >
                빼기
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-2 space-y-1">
        <p>
          첫 장이 대표 사진입니다. 「대표로 놓기」를 누르면 맨 앞으로
          옮겨집니다.
        </p>
        <p>사진은 올리기 전에 필요에 따라 크기와 형식을 바꿉니다.</p>
        <p>사진을 빼면 상품 화면에서 빠지고 저장소에는 남습니다.</p>
      </div>
    </div>
  )
}
