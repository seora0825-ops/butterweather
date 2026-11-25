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
      <fieldset disabled={busy} className="space-y-3">
        <legend className="mb-2 font-medium">송장 등록</legend>
        <label className="flex flex-col gap-1">
          택배사
          <select
            name="carrier"
            required
            defaultValue=""
            className="w-full border border-gray-300 px-3 py-2"
          >
            <option value="" disabled>
              택배사를 골라 주세요
            </option>
            {CARRIERS.map(({ code, name }) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          송장번호
          <input
            name="trackingNo"
            required
            inputMode="numeric"
            className="w-full border border-gray-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="border border-gray-300 px-3 py-2 disabled:opacity-40"
        >
          송장 등록하고 배송 중으로 바꾸기
        </button>
      </fieldset>
    </form>
  )
}
