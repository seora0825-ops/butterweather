'use client'

import { Button, Notice } from '@/components/admin/ui'
import { useRef, useState } from 'react'
import { deleteProduct } from '@/lib/queries/adminProducts'
import { revalidateShop } from '@/app/admin/actions'

/** 삭제 후 실제 상품 목록을 다시 읽는다. 옵션도 함께 지워진다. */
export default function DeleteProductButton({
  id,
  name,
  onDeleted,
}: {
  id: string
  name: string
  onDeleted: (refreshFailed: boolean) => void
}) {
  const deleting = useRef(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirmDelete() {
    if (deleting.current) return
    deleting.current = true
    setBusy(true)
    setError(null)
    try {
      await deleteProduct(id)
    } catch {
      setError(
        '상품을 지우지 못했습니다. 주문된 상품인지 확인한 뒤 다시 시도해 주세요.'
      )
      deleting.current = false
      setBusy(false)
      return
    }

    let refreshFailed = false
    try {
      await revalidateShop()
    } catch {
      refreshFailed = true
    }
    onDeleted(refreshFailed)
  }

  if (!confirming) {
    return (
      <Button type="button" onClick={() => setConfirming(true)} variant="ghost">
        지우기
      </Button>
    )
  }

  return (
    <div className="border-line bg-cloud basis-full space-y-2 rounded-md border p-3 sm:max-w-72">
      <p className="wrap-anywhere">{`「${name}」을 지우면 옵션도 함께 지워지고 되돌릴 수 없습니다. 사진 파일은 저장소에 남습니다.`}</p>
      <p>이미 주문된 상품은 수정 화면에서 가게에 보이기를 꺼 주세요.</p>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={busy}
          onClick={confirmDelete}
          variant="danger"
        >
          {busy ? '지우는 중…' : '확정하고 지우기'}
        </Button>
        <Button
          type="button"
          disabled={busy}
          onClick={() => {
            setConfirming(false)
            setError(null)
          }}
          variant="ghost"
        >
          취소하기
        </Button>
      </div>
    </div>
  )
}
