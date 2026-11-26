import { Button, TextArea } from '@/components/admin/ui'
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
      <Button
        type="button"
        disabled={busy}
        variant="ghost"
        onClick={() => setConfirming(true)}
      >
        주문 취소
      </Button>
    )
  }

  return (
    <form
      className="border-line bg-cloud space-y-3 rounded-md border p-4"
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
      <label className="flex min-w-0 flex-col gap-1 font-medium">
        취소 사유
        <TextArea
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={busy}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="danger"
          disabled={busy || !reason.trim()}
        >
          {status === 'paid'
            ? '확인하고 결제 취소하기'
            : '확인하고 주문 취소하기'}
        </Button>
        <Button
          type="button"
          disabled={busy}
          variant="ghost"
          onClick={() => {
            setConfirming(false)
            setReason('')
          }}
        >
          돌아가기
        </Button>
      </div>
    </form>
  )
}
