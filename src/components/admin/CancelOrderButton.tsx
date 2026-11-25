import { useState } from 'react'
import { cancelOrder, type CancelOrderResult } from '@/app/admin/orders/actions'
import { krw } from '@/lib/orders'
import { getOrder } from '@/lib/queries/adminOrders'
import type { OrderStatus } from '@/types/order'

export default function CancelOrderButton({
  orderNo,
  status,
  total,
  busy,
  runAction,
}: {
  orderNo: string
  status: Extract<OrderStatus, 'pending' | 'paid'>
  total: number
  busy: boolean
  runAction: (action: () => Promise<CancelOrderResult>) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')

  if (!confirming) {
    return (
      <button
        type="button"
        disabled={busy}
        className="underline disabled:opacity-40"
        onClick={() => setConfirming(true)}
      >
        주문 취소하기
      </button>
    )
  }

  return (
    <form
      className="space-y-3 border border-gray-300 p-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (!reason.trim()) return
        runAction(async () => {
          const current = await getOrder(orderNo)
          if (
            !current ||
            current.status !== status ||
            current.total_krw !== total
          ) {
            return {
              ok: false,
              reason:
                '주문이 바뀌었습니다. 새로고침해서 상태와 금액을 확인해 주세요.',
            }
          }
          return cancelOrder(orderNo, reason.trim())
        })
      }}
    >
      <p>주문 금액 {krw(total)}원</p>
      <p>
        {status === 'paid'
          ? '결제를 취소하고 재고를 되돌립니다.'
          : '결제된 적이 없는 주문입니다. 주문을 취소합니다.'}
      </p>
      <label className="flex flex-col gap-1">
        취소 사유
        <textarea
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={busy}
          className="w-full border border-gray-300 px-3 py-2"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy || !reason.trim()}
          className="border border-gray-300 px-3 py-2 disabled:opacity-40"
        >
          {status === 'paid'
            ? '확인하고 결제 취소하기'
            : '확인하고 주문 취소하기'}
        </button>
        <button
          type="button"
          disabled={busy}
          className="underline disabled:opacity-40"
          onClick={() => {
            setConfirming(false)
            setReason('')
          }}
        >
          돌아가기
        </button>
      </div>
    </form>
  )
}
