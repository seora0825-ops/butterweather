'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/store/cart'
import PayButton from './PayButton'

/** 통보는 보통 몇 초 안에 온다. 30초까지 기다려 본다 */
const EVERY_MS = 3000
const TRIES = 10

/**
 * 결제창에서 돌아온 주문. **돌아온 것은 결제됐다는 증거가 아니다** — 통보가
 * 주문을 확정할 때까지 다시 읽으며 기다린다. 그동안 「결제하기」를 보여주지
 * 않는다. 보이면 한 번 더 낸다.
 */
export function PaymentWaiting({ orderNo }: { orderNo: string }) {
  const router = useRouter()
  const [tries, setTries] = useState(0)
  const waiting = tries < TRIES

  useEffect(() => {
    if (!waiting) return
    const timer = setTimeout(() => {
      router.refresh()
      setTries((n) => n + 1)
    }, EVERY_MS)
    return () => clearTimeout(timer)
  }, [tries, waiting, router])

  if (waiting) {
    return <p role="status">결제를 확인하고 있습니다…</p>
  }
  return (
    <div className="space-y-4">
      <p role="status">
        아직 결제를 확인하지 못했습니다. 이미 결제하셨다면 다시 누르지 마시고
        잠시 뒤 새로고침해 주세요.
      </p>
      <PayButton orderNo={orderNo} />
    </div>
  )
}

/**
 * 결제가 확정됐다. 산 것을 장바구니에서 뺀다. **한 번만 한다** — 주소의
 * `?paid=1` 을 지워, 나중에 같은 주소로 와도 새로 담은 것을 건드리지 않는다.
 */
export function PaymentDone({
  orderNo,
  variantIds,
}: {
  orderNo: string
  variantIds: string[]
}) {
  const router = useRouter()
  const remove = useCart((s) => s.remove)

  useEffect(() => {
    variantIds.forEach(remove)
    router.replace(`/orders/${orderNo}`)
    // 처음 한 번만 돈다. 주소가 바뀌면 이 component 는 사라진다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
