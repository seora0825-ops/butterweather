'use client'

import { useEffect, useState } from 'react'
import { startPayment } from '@/app/(shop)/checkout/payapp'
import { button } from './button'

/** 결제가 끝나지 않은 주문을 이어서 결제한다 */
export default function PayButton({ orderNo }: { orderNo: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 결제창에서 「뒤로」 오면 떠날 때의 화면이 되살아난다(bfcache)
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) setBusy(false)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  async function pay() {
    setError(null)
    setBusy(true)
    try {
      const result = await startPayment(orderNo)
      if (result.ok) {
        // 브라우저가 떠나므로 busy 를 풀지 않는다
        window.location.assign(result.payUrl)
        return
      }
      setError(result.reason)
    } catch {
      setError('결제를 열지 못했습니다. 다시 눌러 주세요.')
    }
    setBusy(false)
  }

  return (
    <div className="space-y-3">
      {error && <p role="alert">{error}</p>}
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className={button({ tone: 'primary', size: 'full' })}
      >
        {busy ? '결제를 여는 중…' : '결제하기'}
      </button>
    </div>
  )
}
