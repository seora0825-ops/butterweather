import type { Metadata } from 'next'
import LoginForm from './LoginForm'
import { safeNext } from './safeNext'

export const metadata: Metadata = {
  title: '로그인 — 버터웨더',
}

/**
 * 손님 로그인. **구글·카카오뿐이다.**
 *
 * **가입이라는 단계를 두지 않는다** (schema.md 7-3절). 그래서 비밀번호 칸도
 * 회원가입 화면도 없다 — 처음 온 사람과 다시 온 사람이 같은 버튼을 쓴다.
 *
 * 주소로 받는 것은 둘이다. 콜백(`app/auth/callback/route.ts`)과 짝이 맞아야
 * 한다.
 *
 * | 값      | 무엇                                           |
 * | ------- | ---------------------------------------------- |
 * | `next`  | 로그인 뒤 돌아갈 곳. 장바구니에서 왔으면 장바구니 |
 * | `error` | 콜백이 실패하고 돌려보낸 것. 값은 화면에 안 쓴다  |
 *
 * 디자인 방향을 정하기 전이라 **색·서체를 정하지 않았다** (CLAUDE.md 9절 2번).
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { next, error } = await searchParams

  return (
    <main className="mx-auto max-w-sm px-7 py-20">
      <h1 className="mb-2 text-xl">로그인</h1>
      <LoginForm next={safeNext(next)} failed={error !== undefined} />
    </main>
  )
}
