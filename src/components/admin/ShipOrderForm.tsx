import { Button, Select, TextField } from '@/components/admin/ui'
import type { FormEvent } from 'react'
import { markShipped, type CancelOrderResult } from '@/app/admin/orders/actions'
import { CARRIERS } from '@/lib/carriers'

export default function ShipOrderForm({
  orderNo,
  busy,
  runAction,
}: {
  orderNo: string
  busy: boolean
  runAction: (action: () => Promise<CancelOrderResult>) => void
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    runAction(() =>
      markShipped(
        orderNo,
        String(data.get('carrier') ?? ''),
        String(data.get('trackingNo') ?? '')
      )
    )
  }

  return (
    <form onSubmit={submit}>
      <fieldset disabled={busy} className="grid min-w-0 gap-3">
        <legend className="mb-3 text-base font-semibold">송장 등록</legend>
        <label className="flex min-w-0 flex-col gap-1 font-medium">
          택배사
          <Select name="carrier" required defaultValue="">
            <option value="" disabled>
              택배사를 골라 주세요
            </option>
            {CARRIERS.map(({ code, name }) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 font-medium">
          송장번호
          <TextField name="trackingNo" required inputMode="numeric" />
        </label>
        <Button type="submit" variant="primary" className="justify-self-start">
          {busy ? '등록하는 중…' : '송장 등록하고 배송 시작'}
        </Button>
      </fieldset>
    </form>
  )
}
