'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { saveSales } from '@/lib/queries/counterSales'
import { useCounter } from '@/lib/store/counter'

/** 못 보냈으면 이만큼 뒤에 다시 해본다 */
const RETRY_MS = 10_000

/**
 * 밀린 판매를 DB 로 보낸다. 못 보내도 기록은 기기에 있다.
 * 화면에는 **못 보낸 것이 있다는 것**만 알린다.
 */
export function useCounterSync(): { waiting: number; failed: boolean } {
  const outbox = useCounter((s) => s.outbox)
  const [failed, setFailed] = useState(false)
  const sending = useRef(false)

  const flush = useCallback(async () => {
    const batch = useCounter.getState().outbox
    if (sending.current || batch.length === 0) return
    sending.current = true
    try {
      await saveSales(batch)
      useCounter.getState().sent(batch)
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      sending.current = false
    }
  }, [])

  // 보내는 중에 새로 들어온 것도 여기서 다시 잡는다 — `sent` 가 outbox 를 바꾼다
  useEffect(() => {
    void Promise.resolve().then(flush)
    const timer = setInterval(() => void flush(), RETRY_MS)
    const online = () => void flush()
    window.addEventListener('online', online)
    return () => {
      clearInterval(timer)
      window.removeEventListener('online', online)
    }
  }, [outbox, flush])

  return { waiting: outbox.length, failed }
}
