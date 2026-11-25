import 'server-only'
import { BUSINESS } from '@/lib/business'
import { findCarrier } from '@/lib/carriers'
import { hasVariantName } from '@/lib/orders'
import { formatKRW } from '@/lib/queries/products'
import { createAdminClient } from '@/lib/supabase/admin'
import type { OrderDetail } from '@/types/order'

/**
 * 주문 메일. Resend 로 보낸다 (CLAUDE.md 7절 「Resend」).
 *
 * ---
 *
 * ## 메일이 안 나가도 주문은 그대로다 ★
 *
 * 여기서 나는 오류는 **절대 밖으로 던지지 않는다.** 결제 확정이나 송장 등록이
 * 메일 때문에 실패하면 안 된다. 부르는 쪽은 `after()` 로 응답 뒤에 부른다.
 *
 * ## 담는 것을 줄인다
 *
 * Resend 는 **내용과 주소를 미국에 30일 저장한다.** 도쿄 region 은 발송 경로일
 * 뿐이다 (resend.com/docs/dashboard/domains/regions, 2026-11-25 확인). 그래서
 * `/privacy` 5절에 적었다 — **담는 것을 늘리면 그 항목을 먼저 고친다.** **받는 분 이름·휴대폰·주소를 메일에
 * 넣지 않는다** — 주문 화면으로 가는 주소만 준다. 로그인해야 보인다.
 *
 * ## 두 번 보내지 않는다
 *
 * 결제 통보는 여러 번 온다. `Idempotency-Key` 를 주문·종류로 정해 두어 같은
 * 메일은 한 번만 나간다.
 *
 * `RESEND_API_KEY` 가 없으면 아무것도 하지 않는다 — 로컬·프리뷰에서 손님에게
 * 메일이 가지 않게 **Production 에만** 넣는다.
 */
export type OrderMailKind = 'paid' | 'shipped' | 'done' | 'cancelled'

const FROM = '버터웨더 <noreply@butterweather.com>'
const SITE = 'https://www.butterweather.com'

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function itemName(item: OrderDetail['items'][number]): string {
  return hasVariantName(item.variant_name)
    ? `${item.product_name} ${item.variant_name}`
    : item.product_name
}

type Mail = { subject: string; lead: string; rows: [string, string][] }

function compose(order: OrderDetail, kind: OrderMailKind): Mail {
  const items: [string, string][] = order.items.map((i) => [
    `${itemName(i)} ${i.quantity}개`,
    formatKRW(i.price_krw * i.quantity),
  ])
  const no = order.order_no

  switch (kind) {
    case 'paid':
      return {
        subject: `주문이 확정되었습니다 (${no})`,
        lead: '결제가 완료되었습니다. 상품이 준비되는 대로 보내드립니다.',
        rows: [
          ...items,
          [
            '배송비',
            order.shipping_fee_krw === 0
              ? '무료'
              : formatKRW(order.shipping_fee_krw),
          ],
          ['합계', formatKRW(order.total_krw)],
        ],
      }
    case 'shipped':
      return {
        subject: `상품을 보내드렸습니다 (${no})`,
        lead: '배송 조회는 주문 화면에서 하실 수 있습니다.',
        rows: [
          ...items,
          [
            '송장번호',
            `${findCarrier(order.carrier)?.name ?? ''} ${order.tracking_no ?? ''}`.trim(),
          ],
        ],
      }
    case 'done':
      return {
        subject: `배송이 끝났습니다 (${no})`,
        lead: '주문하신 상품의 배송이 끝났습니다.',
        rows: items,
      }
    case 'cancelled':
      return {
        subject: `주문이 취소되었습니다 (${no})`,
        lead: '결제하신 금액은 결제 수단으로 돌려드립니다. 카드사에 따라 며칠 걸릴 수 있습니다.',
        rows: [...items, ['취소 사유', order.cancel_reason ?? '—']],
      }
  }
}

function render(mail: Mail, url: string): { text: string; html: string } {
  const text = [
    mail.lead,
    '',
    ...mail.rows.map(([k, v]) => `${k}  ${v}`),
    '',
    `주문 보기: ${url}`,
    '',
    `문의: ${BUSINESS.email}`,
    '버터웨더',
  ].join('\n')

  // 메일 프로그램은 외부 CSS·flex 를 못 읽는다. 표와 inline style 만 쓴다
  const row = ([k, v]: [string, string]) =>
    `<tr><td style="padding:8px 0;border-top:1px solid #d9d9d9">${escapeHtml(k)}</td><td style="padding:8px 0;border-top:1px solid #d9d9d9;text-align:right;white-space:nowrap">${escapeHtml(v)}</td></tr>`
  const html = `<!doctype html><html lang="ko"><body style="margin:0;background:#f7f7f7;color:#1a1a1a;font-family:Pretendard,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;font-size:16px;line-height:1.6"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px"><tr><td style="font-weight:800;padding-bottom:24px;border-bottom:2px solid #1a1a1a">BUTTER WEATHER</td></tr><tr><td style="padding:24px 0"><h1 style="margin:0 0 8px;font-size:22px;line-height:1.35">${escapeHtml(mail.subject)}</h1><p style="margin:0">${escapeHtml(mail.lead)}</p></td></tr><tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${mail.rows.map(row).join('')}</table></td></tr><tr><td style="padding:28px 0"><a href="${url}" style="display:inline-block;background:#f5c842;border:2px solid #1a1a1a;border-radius:999px;padding:12px 24px;color:#1a1a1a;font-weight:700;text-decoration:none">주문 보기</a></td></tr><tr><td style="padding-top:16px;border-top:1px solid #d9d9d9;font-size:14px;color:#6b6b6b">문의 ${escapeHtml(BUSINESS.email)}</td></tr></table></td></tr></table></body></html>`

  return { text, html }
}

async function send(input: {
  to: string
  subject: string
  text: string
  html?: string
  key: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.key,
    },
    body: JSON.stringify({
      from: FROM,
      to: [input.to],
      reply_to: BUSINESS.email,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  })
  // 본문에는 받는 주소가 섞여 올 수 있다. 상태만 남긴다
  if (!res.ok) throw new Error(`Resend ${res.status}`)
}

/** 손님에게 보낸다. **던지지 않는다** */
export async function sendOrderMail(
  orderId: string,
  kind: OrderMailKind
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', orderId)
      .maybeSingle()
    if (error || !data) throw new Error('주문을 읽지 못함')
    const order = data as OrderDetail
    const url = `${SITE}/orders/${order.order_no}`

    // 가게에도 알린다. 주문이 들어온 것을 모르면 못 보낸다
    if (kind === 'paid') {
      await send({
        to: BUSINESS.email,
        subject: `새 주문 ${order.order_no} ${formatKRW(order.total_krw)}`,
        text: `${order.items.map((i) => `${itemName(i)} ${i.quantity}개`).join('\n')}\n\n${SITE}/admin/orders/${order.order_no}`,
        key: `${order.id}-shop`,
      }).catch((err) => console.error('[mail] 가게 알림 실패', err))
    }

    // 카카오로 가입하면 이메일이 없을 수 있다. 그때는 주문 화면이 전부다
    const { data: account } = await admin.auth.admin.getUserById(order.user_id)
    const to = account.user?.email
    if (!to) return
    // 메일을 원하지 않는다고 하신 분 (`/privacy` 5절). Supabase 대시보드에서 그
    // 회원의 app_metadata 에 `no_order_mail: true` 를 넣는다
    if (account.user?.app_metadata?.no_order_mail === true) return

    const mail = compose(order, kind)
    await send({
      to,
      subject: `[버터웨더] ${mail.subject}`,
      ...render(mail, url),
      key: `${order.id}-${kind}`,
    })
  } catch (err) {
    console.error('[mail] 보내지 못함', kind, orderId, err)
  }
}
