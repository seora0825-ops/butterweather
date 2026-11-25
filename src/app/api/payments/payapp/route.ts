import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { sendOrderMail } from '@/lib/notify/orderMail'
import { createAdminClient } from '@/lib/supabase/admin'
import { classifyPaidError } from '@/lib/payments/complete'
import { recordCounterPayment } from '@/lib/payments/counterPayment'
import { isGenuineFeedback, refundPayment } from '@/lib/payments/payapp'

/**
 * 페이앱 결제 통보. **주문을 확정하는 유일한 길이다** — 페이앱에는 상태를
 * 조회하는 API 가 없고, 브라우저가 돌아오는 것은 증거가 아니다.
 *
 * ---
 *
 * ## 답은 `SUCCESS` 아니면 실패다
 *
 * 본문이 정확히 `SUCCESS` 여야 받은 것으로 친다. 아니면 5분마다 10번 다시
 * 보낸다(`checkretry`). 그래서 **다시 받아야 할 때만** 실패로 답한다 —
 * DB 가 잠깐 끊긴 것처럼 다음에는 될 일이다. 모르는 주문·다루지 않는 상태는
 * 몇 번을 받아도 같으므로 `SUCCESS` 다.
 *
 * ## 같은 통보가 여러 번, 순서가 뒤바뀌어 온다
 *
 * `mark_order_paid()`·`mark_order_cancelled()` 는 두 번 불려도 괜찮다.
 *
 * ## 한 주문이 두 번 결제될 수 있다 ★
 *
 * 「다시 결제」는 결제 요청을 새로 만든다. 앞의 것을 거두지만
 * (`withdrawRequest`) 실패할 수 있고, 손님이 창 두 개를 열어 둘 수도 있다.
 * **이미 확정된 주문에 다른 번호의 결제가 들어오면 그것을 돌려준다.**
 */

const PAID = '4'
const REFUNDED = ['9', '64']

function success(note: string, level: 'info' | 'error' = 'info') {
  console[level](`[payapp] ${note}`)
  return new Response('SUCCESS')
}

/** 다시 보내 달라는 뜻이다 */
function again(note: string) {
  console.error(`[payapp] ${note}`)
  return new Response('FAIL', { status: 500 })
}

/**
 * 사람이 주소를 열어 볼 때. 결제와 상관없다 — 통보는 POST 로만 온다.
 * `SUCCESS` 라고 답하지 않는다. 그 말은 통보를 받았다는 뜻이다.
 */
export function GET() {
  return new Response('이 주소는 페이앱이 결제 결과를 알려주는 곳입니다.', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

export async function POST(req: Request) {
  const form = new URLSearchParams(await req.text())

  let genuine: boolean
  try {
    genuine = isGenuineFeedback(form)
  } catch (err) {
    return again(String(err))
  }
  // 남의 요청이다. 값을 log 에 남기지 않는다
  if (!genuine) return new Response('FAIL', { status: 403 })

  const mulNo = form.get('mul_no') ?? ''
  const state = form.get('pay_state') ?? ''
  const orderId = form.get('var1') ?? ''

  const admin = createAdminClient()

  // 페이앱 관리자의 「공통 통보 URL」도 이 주소다. 현장 계산기·페이앱 앱에서
  // 받은 결제가 그리로 온다 — 홈페이지 주문이 아니면 현장 장부에 적는다
  async function counter(): Promise<Response> {
    const problem = await recordCounterPayment(admin, form)
    if (problem) return again(`현장 결제를 적지 못함: ${problem}`)
    // 통보가 판매를 확정하면 재고가 준다(`0013`)
    revalidatePath('/', 'layout')
    return success(`현장 결제 ${state}`)
  }

  if (!mulNo || !/^[0-9a-f-]{36}$/i.test(orderId)) return counter()

  const read = () =>
    admin
      .from('orders')
      .select('id, order_no, status, total_krw, payment_id')
      .eq('id', orderId)
      .maybeSingle()

  const { data: order, error: readError } = await read()
  if (readError) return again(`주문을 읽지 못함: ${readError.message}`)
  if (!order) return counter()

  /** 돈을 돌려준다. 안 되면 다시 받아서 또 해본다 */
  async function refund(reason: string): Promise<Response> {
    try {
      await refundPayment(mulNo, reason)
    } catch (err) {
      return again(`취소 실패 — 사람이 봐야 한다 (${mulNo}) ${err}`)
    }
    return success(`${reason} — 취소함 (${mulNo})`, 'error')
  }

  // ── 결제됨 ──────────────────────────────────────────────
  if (state === PAID) {
    // 못 읽은 것과 다른 것은 다르다. 못 읽었으면 돈을 돌려주지 않는다
    const price = (form.get('price') ?? '').replaceAll(',', '')
    if (!/^\d+$/.test(price)) return again(`금액을 읽지 못함 (${mulNo})`)
    if (Number(price) !== order.total_krw) {
      return refund('주문 금액 불일치')
    }

    if (order.status === 'pending') {
      const { error } = await admin.rpc('mark_order_paid', {
        p_order_id: order.id,
        p_provider: 'payapp',
        p_payment_id: mulNo,
      })
      if (!error) {
        // 응답을 먼저 보낸다. 메일이 느려도 페이앱이 기다리지 않는다
        after(() => sendOrderMail(order.id, 'paid'))
        return success(`결제 완료 (${order.order_no})`)
      }

      const failure = classifyPaidError(error.message ?? '')
      if (failure.kind === 'stock') {
        const response = await refund('재고 부족')
        if (response.ok) {
          await admin.rpc('mark_order_cancelled', {
            p_order_id: order.id,
            p_reason: `${failure.detail} 품절`,
          })
          after(() => sendOrderMail(order.id, 'cancelled'))
        }
        return response
      }
      // 모르는 실패에는 돈을 돌려주지 않는다 (complete.ts). 다시 받는다
      if (failure.kind === 'unknown') {
        return again(`확정 실패: ${failure.message}`)
      }
      // `already` — 그 사이 다른 통보가 끝냈다. 아래에서 같은 결제인지 본다
    }

    const { data: now, error } = await read()
    if (error || !now) return again('주문을 다시 읽지 못함')
    if (now.status === 'pending') return again('확정 중')
    if (now.status !== 'cancelled' && now.payment_id === mulNo) {
      return success(`이미 끝남 (${order.order_no})`)
    }
    return refund(
      now.status === 'cancelled' ? '취소된 주문의 결제' : '중복 결제'
    )
  }

  // ── 승인 취소 ───────────────────────────────────────────
  if (REFUNDED.includes(state)) {
    // 중복으로 낸 쪽이 취소된 것이면 주문은 그대로다
    if (order.payment_id !== mulNo) {
      return success(`다른 결제의 취소 (${order.order_no})`)
    }
    const { error } = await admin.rpc('mark_order_cancelled', {
      p_order_id: order.id,
      p_reason: '결제 취소',
    })
    if (!error) {
      // `paid` 였을 때만 손님이 낸 돈이 있다
      if (order.status === 'paid') {
        after(() => sendOrderMail(order.id, 'cancelled'))
      }
      return success(`취소 반영 (${order.order_no})`)
    }
    // 보낸 뒤의 취소는 반품이라 사람이 정리한다. 다시 받아도 같다
    if (error.message.includes('ORDER_ALREADY_SHIPPED')) {
      return success(`보낸 주문이 취소됨 (${order.order_no})`, 'error')
    }
    return again(`취소 반영 실패: ${error.message}`)
  }

  // 요청됨(1)·요청 취소(8·32)·대기(10)·부분 취소(70·71). 주문은 그대로 둔다
  return success(
    `다루지 않는 상태 ${state} (${order.order_no})`,
    state.startsWith('7') ? 'error' : 'info'
  )
}
