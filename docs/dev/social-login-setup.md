# 소셜 로그인 설정 — 구글 · 카카오

손님은 **회원만 산다**. 다만 가입이라는 단계를 따로 두지 않고 구글·카카오로 받는다. 근거는 [schema.md 7-3절](schema.md).

이 문서는 **한 번 하고 끝나는 설정**을 적어둔 것이다. 프로젝트를 다시 만들거나 도메인이 바뀌면 또 필요하다.

> 2026-09-19 작성. 절차는 [Supabase 공식 문서](https://supabase.com/docs/guides/auth/social-login/auth-google)를 보고 확인했다. **콘솔 화면은 바뀐다** — 여기 적힌 메뉴 이름이 안 보이면 문서를 다시 볼 것.
>
> **2026-11-23 새 저장소에서 다시 했다.** 앱 주인을 브랜드 계정으로 바꿨다 — 구글은 `butterweather@gmail.com`(OTP 를 비밀번호 관리자에 두고 여럿이 쓴다), 카카오는 그 메일로 만든 **브랜드 카카오 계정**이 소유하고 개인 계정은 멤버로 들어간다. 카카오 계정은 휴대폰에 묶여 공유가 어렵기 때문이다.

## 먼저 — 양쪽이 같이 쓰는 주소

```
https://rvbwqjiohpepmsiylyum.supabase.co/auth/v1/callback
```

구글·카카오 **양쪽 콘솔의 Redirect URI 칸에 이 주소를 넣는다.**

**우리 사이트 주소가 아니다.** 로그인이 끝나면 구글이 Supabase 로 보내고, Supabase 가 다시 우리 사이트로 보낸다. 사이트 주소를 여기 넣으면 로그인이 끝나고 갈 곳을 잃는다.

> 앞의 `rvbwqjiohpepmsiylyum` 는 프로젝트 ref 다(옛 프로젝트는 `ghrpcggsjgiiitxjqdsw`). 프로젝트를 새로 만들면 이 값이 바뀐다 — `.env.local` 의 `NEXT_PUBLIC_SUPABASE_URL` 에 있다.

---

## 구글

### 1. [Google Cloud Console](https://console.cloud.google.com) → 프로젝트

없으면 만든다. 새 저장소는 `butterweather` 프로젝트다.

> **「무료 체험 — 결제 정보 확인」 화면이 나와도 넘어가지 않아도 된다.** 유료 서비스 체험 가입이다. OAuth 클라이언트는 결제 정보 없이 만들어진다. 닫고 [Google 인증 플랫폼](https://console.cloud.google.com/auth/overview)으로 바로 간다 (2026-11-23).

### 2. OAuth consent screen (동의 화면)

- **Audience: External**
- **Scopes**: `openid` · `userinfo.email` · `userinfo.profile` — 이 셋이면 된다. 더 넣지 말 것. 손님에게 보이는 동의 항목이 늘어난다
- **Branding**(로고·앱 이름)을 채우면 동의 화면이 버터웨더로 보인다. **검증에 며칠 걸릴 수 있으므로** 급하면 나중에 한다

### 3. Clients → Create client

⚠️ **애플리케이션 유형을 「웹 애플리케이션」으로 고른다.** 「데스크톱 앱」을 고르면 **주소를 넣는 칸이 아예 안 나온다** (2026-09-19에 실제로 헷갈렸다).

| 칸                     | 넣을 것                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| 애플리케이션 유형      | **웹 애플리케이션**                                               |
| 이름                   | `butterweather-web` — 콘솔에서만 보인다                           |
| 승인된 JavaScript 원본 | `https://www.butterweather.com`<br>`http://localhost:3000` (로컬) |
| 승인된 리디렉션 URI    | 맨 위의 Supabase 콜백 주소                                        |

### 4. Client ID · Client Secret 복사

**Secret 은 그 화면을 닫으면 다시 못 본다.**

### 5. 게시 — **안 하면 손님은 「액세스 차단됨」을 본다** ★

만든 직후 게시 상태는 **「테스트 중」**이다. 그동안은 **대상 → 테스트 사용자**에 넣은 계정만 로그인된다(100명까지). 화면을 만들며 시험하는 데는 이것으로 충분하다.

손님에게 열려면 **대상 → 「앱 게시」**를 누른다. 그런데 **브랜딩을 다 채우기 전에는 버튼이 꺼져 있다** (2026-11-23). 브랜딩에 넣을 것:

| 칸                    | 넣을 것                                                                     |
| --------------------- | --------------------------------------------------------------------------- |
| 앱 이름 · 지원 이메일 | `버터웨더` · `butterweather@gmail.com`                                      |
| 앱 로고               | **비워둔다** — 올리면 브랜딩 심사가 붙어 며칠 걸린다                        |
| 홈페이지              | `https://www.butterweather.com`                                             |
| 개인정보처리방침      | `https://www.butterweather.com/privacy` — **페이지가 실제로 있어야 한다**   |
| 서비스 약관           | `https://www.butterweather.com/terms` — 같다                                |
| 승인된 도메인         | `butterweather.com` · `rvbwqjiohpepmsiylyum.supabase.co` (콜백이 이 주소다) |

범위가 기본 셋(`openid`·`email`·`profile`)뿐이면 게시에 구글 심사가 붙지 않는다.

---

## 카카오

### 1. [developers.kakao.com](https://developers.kakao.com) → 애플리케이션 추가

앱 이름 · 회사명 · 카테고리 · 주 도메인을 채운다.

### 2. 필요한 것 셋이 **한 화면**에 있다

```
사이드바의 「앱」 ˅ 을 펼친다
  → 플랫폼 키
    → REST API 키 를 고른다
       ├ REST API 키          ← Client ID
       ├ 클라이언트 시크릿      ← Client Secret
       └ 리다이렉트 URI        ← Supabase 콜백 주소
```

⚠️ **「카카오 로그인」 메뉴가 아니다.** 콘솔이 개편되어 키도 Redirect URI 도 **「앱 → 플랫폼 키」**로 모였고, 「카카오 로그인 → 일반」에는 켜고 끄는 스위치만 남았다. 2026-09-19에 **이 자리를 두 번 틀렸다** — 시크릿을, 그다음엔 Redirect URI 를 「카카오 로그인」에서 찾았다.

⚠️ **같은 화면의 「호출 허용 IP 주소」는 비워둔다.** 로그인 요청은 Supabase 서버가 보내는데 그 IP 가 고정돼 있지 않다. 채우면 로그인이 막힌다. 「비즈니스 인증 리다이렉트 URI」도 비운다 — 쓰지 않는 기능이다.

⚠️ **클라이언트 시크릿은 표의 「카카오 로그인」 줄이다.** 「코드 재발급 · 코드 삭제」 버튼 **오른쪽 칸**에 코드가 있다 — 화면이 좁으면 잘려 안 보인다. 「비즈니스 인증」 줄이 아니다.

⚠️ **REST API 키가 Client ID 다.** JavaScript 키·Native 키가 나란히 있어 틀리기 쉽다.

클라이언트 시크릿은 **새로 만든 앱이면 이미 켜져 있다** — [공식 문서](https://developers.kakao.com/docs/ko/kakaologin/prerequisite)에 「카카오 디벨로퍼스에서 발급한 모든 REST API 키에 대해 보안을 위해 자동으로 활성화된다」고 되어 있다.

리다이렉트 URI 는 **호출할 때 보낸 것과 글자 하나까지 같아야 한다** — 끝의 `/` 하나로 실패한다. 최대 10개까지 넣을 수 있으니 프리뷰 주소도 나중에 추가하면 된다.

### 3. 카카오 로그인 → 일반

- **사용 설정**을 `ON` 으로. 여기서 할 일은 이것뿐이다
- **OpenID Connect 는 `OFF` 로 둔다.** Supabase 가 OAuth 로 처리한다

### 4. 동의항목 — **안 켜면 로그인 자체가 안 된다** ★

`카카오 로그인` → `동의항목` 에서 켠다.

| 항목                                 | 설정                         |
| ------------------------------------ | ---------------------------- |
| 닉네임 (`profile_nickname`)          | 필수 동의 또는 선택 동의     |
| 프로필 사진 (`profile_image`)        | 선택 동의                    |
| 카카오계정(이메일) (`account_email`) | **비즈니스 앱만 켤 수 있다** |

⚠️ **여기를 건너뛰면 `KOE205` 가 뜬다.**

> 잘못된 요청 (KOE205)
> Butter Weather 서비스 설정에 오류가 있어, 이용할 수 없습니다.

[공식 문서](https://developers.kakao.com/docs/ko/kakaologin/trouble-shooting)에 따르면 **「앱에 설정하지 않은 동의항목을 포함해 인가 코드를 요청할 때」** 나는 에러다. Supabase 가 닉네임·프로필사진·이메일을 요청하는데 콘솔에서 안 켜두면 카카오가 거절한다. 2026-09-20에 실제로 여기서 막혔다.

### ⚠️ 그런데 닉네임만 켜서는 안 된다 — **이메일도 켜야 한다** ★

`account_email` 은 개인 앱에서 **「권한 없음」**이라 켤 수 없다. 그래서 「닉네임만 켜고 넘어가면 되겠지」 싶은데 **안 된다.**

**Supabase 가 카카오에 `account_email` 을 강제로 보내기 때문이다.**

```
scope = account_email profile_image profile_nickname
        ^^^^^^^^^^^^^ 우리가 빼달라고 해도 안 빠진다
```

`signInWithOAuth` 의 `scopes` 로 `profile_nickname profile_image` 만 주어도 **Supabase 는 기본값에 덧붙일 뿐 빼주지 않는다** (2026-09-20 실측). [supabase/supabase#36878](https://github.com/supabase/supabase/issues/36878) 로 열려 있고 아직 미해결이다.

Supabase 의 **「Allow users without an email」 도 이것을 막지 못한다.** 그건 *사용자를 만들 때*의 규칙이고, 요청은 그 전에 카카오가 거절한다.

### 해결 — 「개인으로 등록」

```
앱 설정 → 앱 → 일반 → 비즈니스 → 「개인으로 등록」
```

**사업자등록번호 없이 개인 명의로 비즈 앱이 된다.** 그러면 `account_email` 이 풀리고 동의항목에서 켤 수 있다. 선택 동의로 충분하다.

위 이슈의 결론이 **「이제 문제는 기술이 아니라 문서 부족」**이었다 — 이 경로가 Supabase 문서에 없어서 다들 헤맨다.

이메일까지 받게 되면 **주문 확인 메일을 보낼 수 있다.** 아래 「알아둘 것」의 걱정이 같이 풀린다.

이름 표시는 어차피 `AuthLinks` 가 이름 → 닉네임 → 이메일 순으로 고른다.

---

## Supabase

> **새 저장소에서는 대시보드가 아니라 [`supabase/config.toml`](../../supabase/config.toml) 로 한다 (2026-11-23).** 설정이 파일로 남아 PR 로 리뷰된다. 비밀값은 파일에 두지 않고 `env(...)` 로 `.env.local` 에서 읽는다.
>
> ```bash
> set -a; . ./.env.local; set +a        # env(...) 값을 셸에 올린다
> supabase config diff                  # 운영과 무엇이 다른지 먼저 본다
> supabase config push --yes            # 올린다
> supabase config diff                  # 「No config differences found」 가 나와야 한다
> ```
>
> 처음 한 번은 `supabase init` 뒤 **`supabase config pull --force`** 로 운영값을 받아온 다음 고친다. init 의 기본값을 그대로 push 하면 운영 설정을 덮어쓴다.

### Authentication → Sign In / Providers

Google · Kakao 를 각각 켜고 위에서 복사한 **Client ID / Secret** 을 넣는다. `config.toml` 에서는 `[auth.external.google]` · `[auth.external.kakao]` 다.

카카오는 **`email_optional = true`** 로 둔다. 이메일을 「선택 동의」로 받으므로 손님이 거절해도 로그인은 돼야 한다.

### Authentication → URL Configuration

| 칸            | 넣을 것                                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Site URL      | `https://www.butterweather.com` — **`www` 를 붙인다** (CLAUDE.md 7절)                                                                          |
| Redirect URLs | `https://www.butterweather.com/**` · `http://localhost:3000/**` · `https://butterweather-*-seora0825-1454s-projects.vercel.app/**` (PR 프리뷰) |

### 붙었는지 확인 — 콘솔을 열지 않고

```bash
curl -s -o /dev/null -w "%{redirect_url}" \
  "https://rvbwqjiohpepmsiylyum.supabase.co/auth/v1/authorize?provider=kakao&redirect_to=https://www.butterweather.com/auth/callback"
```

`kauth.kakao.com` (구글이면 `accounts.google.com`) 으로 넘어가면 공급자가 켜져 있다. 그 주소를 따라가서 **`KOE` 로 시작하는 코드**(카카오)나 **`invalid_client` · `redirect_uri_mismatch`**(구글)가 안 보이면 키와 콜백 주소가 맞다. **동의항목이 맞는지는 실제로 로그인해 봐야 안다** — `KOE205` 는 로그인 버튼을 누른 뒤에 뜬다.

⚠️ **Site URL 이 프리뷰 주소로 들어가 있으면 안 된다.** 로그인이 끝나고 돌아가는 곳이라, 프리뷰 주소면 손님이 프리뷰로 떨어진다.

### ❌ OAuth Server 는 켜지 않는다

`Authentication → OAuth Server` 는 **우리 Supabase 가 남의 앱에게 로그인을 내어주는** 기능이다. 우리가 필요한 것은 반대 방향이라 쓸 일이 없다. **2026-09-19에 한 번 잘못 켰다** — 안 쓰는 기능을 열어두면 공격면만 늘어난다.

---

## 알아둘 것 — 카카오 손님은 이메일이 없을 수 있다

비즈니스 앱이 아니면 `account_email` 을 받지 못한다.

**주문 자체는 문제없다.** 배송지·연락처를 회원 정보가 아니라 **주문할 때 받기 때문이다**(`orders.shipping_info`). 설계가 원래 그렇다.

**문제는 알림이다.** 주문 확인 메일을 보낼 주소가 없다. 알림을 붙일 때 카카오 알림톡이나 문자로 가야 할 수 있고, 그건 별도 심사와 비용이 든다. **M3 에서 결제를 붙일 때 같이 판단한다.**
