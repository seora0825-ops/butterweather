import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * 페이앱 REST. 홈페이지 결제가 쓰는 쪽이다 — 현장 계산기가 앱을 여는 것은
 * `lib/payapp.ts` 이고 열쇠가 필요 없다.
 *
 * 규격은 docs.payapp.kr 의 01(인증)·02(결제요청)·04(통보)·07(취소).
 *
 * ---
 *
 * ## 포트원과 다른 것 ★
 *
 * **결제 상태를 조회하는 API 가 없다.** 포트원은 「통지를 믿지 않고 다시
 * 물어본다」가 됐지만 여기서는 못 한다. 결제됐다는 근거는 **통보(feedback)
 * 하나뿐**이고, 그것이 진짜인지는 우리만 아는 연동 KEY·VALUE 가 같이 왔는지로
 * 가른다 (`isGenuineFeedback`). 그래서 이 두 값은 절대 밖으로 나가면 안 된다.
 *
 * **테스트 모드도 없다.** 여기서 부르는 것은 전부 실거래다.
 */

const API = 'https://api.payapp.kr/oapi/v2'

/** 밖에 등록하는 주소는 www 로 적는다 (CLAUDE.md 7절). 통보는 redirect 를 따라오지 않는다 */
const SITE = 'https://www.butterweather.com'

/**
 * 받는 수단. **비워두지 않는다** — 비우면 가상계좌·휴대폰 결제까지 열린다.
 * 가상계좌는 나중에 입금되는 것이라 주문 흐름이 다르다.
 */
const PAY_TYPES = 'card,kakaopay,naverpay'

function credentials() {
  const userId = process.env.PAYAPP_USER_ID
  const linkKey = process.env.PAYAPP_LINK_KEY
  const linkValue = process.env.PAYAPP_LINK_VALUE
  const payKey = process.env.PAYAPP_PAY_KEY
  if (!userId || !linkKey || !linkValue || !payKey) {
    throw new Error('PAYAPP_* 환경변수가 없습니다 (.env.example)')
  }
  return { userId, linkKey, linkValue, payKey }
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

/** 한국 시각 `yyyymmddhhiiss`. 페이앱 시계와 15분 넘게 다르면 거절된다 */
function requestDate(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .replace(/\D/g, '')
    .slice(0, 14)
}

async function call(params: Record<string, string>): Promise<URLSearchParams> {
  const { userId, payKey } = credentials()
  const requestdate = requestDate()

  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      ...params,
      userid: userId,
      requestdate,
      hash: sha256(userId + requestdate + payKey),
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`페이앱 ${params.cmd} 실패 (${res.status})`)

  const body = new URLSearchParams((await res.text()).trim())
  if (body.get('state') !== '1') {
    // 요청한 값(전화번호)은 남기지 않는다
    throw new Error(
      `페이앱 ${params.cmd} 거절 ${body.get('errorCode') ?? body.get('errno') ?? ''} ${body.get('errorMessage') ?? ''}`
    )
  }
  return body
}

/** 결제창 주소를 만든다. **만들었다고 결제된 것이 아니다** */
export async function requestPayment(input: {
  orderId: string
  orderNo: string
  goodName: string
  totalKrw: number
  phone: string
}): Promise<{ mulNo: string; payUrl: string }> {
  const body = await call({
    cmd: 'payrequest',
    goodname: input.goodName,
    price: String(input.totalKrw),
    recvphone: input.phone.replace(/\D/g, ''),
    // 손님은 이미 우리 화면에 있다. 결제 문자를 따로 보내지 않는다
    smsuse: 'n',
    feedbackurl: `${SITE}/api/payments/payapp`,
    // 통보를 못 받으면 5분마다 10번 다시 보내 준다
    checkretry: 'y',
    // `skip_cstpage` 를 쓰지 않는다 — POST 로 돌아와 로그인 cookie 가 빠진다
    returnurl: `${SITE}/orders/${input.orderNo}?paid=1`,
    openpaytype: PAY_TYPES,
    var1: input.orderId,
  })

  const mulNo = body.get('mul_no')
  const payUrl = body.get('payurl')
  if (!mulNo || !payUrl?.startsWith('https://')) {
    throw new Error('페이앱이 결제 주소를 주지 않았습니다')
  }
  return { mulNo, payUrl }
}

/** 아직 결제하지 않은 요청을 거둔다. **결제된 것은 건드리지 않는다** (`ready`) */
export async function withdrawRequest(mulNo: string): Promise<void> {
  await call({
    cmd: 'paycancel',
    linkkey: credentials().linkKey,
    mul_no: mulNo,
    cancelmemo: '다시 결제',
    cancelmode: 'ready',
    partcancel: '0',
  })
}

/**
 * 결제를 전부 취소한다. **정산(D+3) 전까지만 된다.** 그 뒤에는 정산받은 돈을
 * 돌려보내는 다른 절차(`paycancelreq`)라, 사람이 페이앱에서 한다.
 */
export async function refundPayment(
  mulNo: string,
  reason: string
): Promise<void> {
  await call({
    cmd: 'paycancel',
    linkkey: credentials().linkKey,
    mul_no: mulNo,
    cancelmemo: reason,
    partcancel: '0',
  })
}

function same(a: string | null, b: string): boolean {
  if (a === null) return false
  // 길이가 새지 않게 같은 길이의 hash 끼리 견준다
  return timingSafeEqual(Buffer.from(sha256(a)), Buffer.from(sha256(b)))
}

/** 페이앱이 보낸 통보인가. **셋이 다 맞아야 한다** */
export function isGenuineFeedback(form: URLSearchParams): boolean {
  const { userId, linkKey, linkValue } = credentials()
  return [
    same(form.get('userid'), userId),
    same(form.get('linkkey'), linkKey),
    same(form.get('linkval'), linkValue),
  ].every(Boolean)
}

/** 결제 문서에 적는 이름 */
export function goodName(names: string[]): string {
  if (names.length === 0) return '버터웨더 주문'
  return names.length === 1 ? names[0] : `${names[0]} 외 ${names.length - 1}건`
}

/** 휴대폰 번호인가. 페이앱은 결제 요청에 번호를 꼭 받는다 */
export function isMobile(phone: string): boolean {
  return /^01\d{8,9}$/.test(phone.replace(/\D/g, ''))
}
