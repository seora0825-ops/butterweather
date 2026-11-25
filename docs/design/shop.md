# 손님 화면의 조형 — 타일 벽 (2026-11-25)

> 홍설아가 「옛 조형을 무시하고 더 편리한 UX 와 구성으로」라고 정했다. **옛 조형(얇은 격자선 · serif 제목 · 10~13px 라벨)은 새 화면에 쓰지 않는다.** [tokens.md](tokens.md) 의 2-1 이후(옛 token·글자 크기)도 옛것이다. 문구 규약 [writing.md](writing.md) 와 브랜드 기준 [foundation.md](../brand/foundation.md) 은 그대로다.
>
> 판단 순서는 [Impeccable](https://github.com/pbakaus/impeccable)(Apache-2.0)의 지침을 따랐다 — 화면의 목적을 먼저 가르고(고르게 하는 화면 / 일을 끝내는 화면), 만든 뒤 실제 크기로 보고 고친다.

## 한 줄

**나래의 일러스트 시트가 곧 사이트다.** 그림과 무늬가 번갈아 맞닿은 벽에 상품이 같은 비율(`aspect-tile` 234:279)의 타일로 끼어 있다.

## 화면은 두 종류다

| 종류            | 화면                                             | 어떻게                                                            |
| --------------- | ------------------------------------------------ | ----------------------------------------------------------------- |
| **고르게 한다** | 첫 화면 · 카테고리 · 상세                        | 타일이 화면 끝까지 맞닿는다. 여백 없이 선명한 경계. 그림이 낀다   |
| **일을 끝낸다** | 장바구니 · 주문서 · 주문 내역 · 내 정보 · 로그인 | 한 단(`max-w-2xl`), 그림 없음(빈 상태만 한 장). 조용하고 정확하게 |

## token (`globals.css`)

`butter` `butter-light` `cloud` `ink` `ink-muted` `line`. **새 색을 더하지 않는다** — 필요하면 나래에게 묻는다. 그라데이션·반투명·blur·그림자를 쓰지 않는다.

- **butter 는 한 화면에 하나** — 그 화면의 가장 중요한 button, 또는 첫 화면의 안내 띠
- 구획을 가르는 선은 `border-ink border-2`, 같은 목록 안의 줄은 `border-line border` 하나. 상자를 상자에 넣지 않는다

## 글자

Pretendard 하나. 본문 `text-base`(16px), 보조 `text-[15px]`, 최소 `text-sm`(14px, 사업자 정보 정도). 화면 제목 `text-2xl font-extrabold tracking-tight`, 구획 제목 `text-xl font-extrabold tracking-tight`. 숫자(가격·수량)는 `tabular-nums`. 제목 위에 작은 라벨을 얹지 않는다.

## 조작

- button·link-button 은 `components/shop/button.ts` 의 `button()` 하나로 만든다. 굵은 먹선 + 둥근 끝은 일러스트 윤곽선에서 왔다
- 누르는 것은 **44px 이상**. 아이콘은 `components/shop/icons.tsx` 에 그린 것만(이모지·글자 기호 금지)
- 입력 칸: `h-12 rounded-xl border-2 border-ink bg-white px-4 text-base`. 라벨은 늘 칸 위에 보인다
- 휴대폰에서 주요 button 은 아래에 붙인다(`sticky bottom-0` + safe-area). Footer 를 덮지 않게 본문 container 안에 둔다
- 잠긴 button 으로 막지 말고 **다음에 할 일로 데려간다** (상세의 「옵션 고르기」)
- 빈 상태: 일러스트 한 장 통째 + 한 문장 + button 하나

## 그림

`public/illustrations/` 를 **통째로** 놓는다. 확대해 자르는 것까지만. 카테고리와 그림의 짝은 `lib/categories.ts`.
