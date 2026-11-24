/**
 * 로그인 뒤 돌아갈 곳. **밖에서 온 값이라 그대로 믿지 않는다** — 우리 안의
 * 주소만 받는다. 아니면 우리 로그인 화면이 남의 사이트로 보내는 문이 된다.
 *
 * 콜백은 `${origin}${next}` 로 앞에 우리 주소를 붙이므로 `//` 만 막아도
 * 되지만, **이 화면은 값을 link 에 그대로 넣는다.** 브라우저는 `/\evil.com`
 * 이나 `/<tab>/evil.com` 도 남의 주소로 읽으므로 글자를 비교하지 않고
 * **브라우저와 같은 규칙(`URL`)으로 풀어 본다.**
 */
export function safeNext(raw: string | string[] | undefined): string {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return '/'

  const base = 'http://internal.invalid'
  try {
    const url = new URL(raw, base)
    const path = `${url.pathname}${url.search}${url.hash}`
    // `/.//evil.com` 은 origin 은 같지만 풀고 나면 `//evil.com` 이 된다
    return url.origin === base && !path.startsWith('//') ? path : '/'
  } catch {
    return '/'
  }
}
