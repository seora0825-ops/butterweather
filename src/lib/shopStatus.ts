/**
 * 온라인 주문을 받는가.
 *
 * ⚠️ **지금 붙어 있는 결제 채널은 테스트다** (CLAUDE.md 7절 「포트원」).
 * 열어 두면 손님은 결제한 줄 알고, 우리는 돈을 받지 못한다. 테스트 채널의
 * 간편결제가 실거래로 나간 사고도 있었다. **실연동 채널 키로 바꾼 PR 에서만
 * `true` 로 고친다.**
 *
 * 화면의 버튼만 막는 값이다. 결제를 지키는 것은 서버(`checkout/payment.ts`)다.
 */
export const ORDERING_OPEN = false

/** 장바구니·상세의 주문 버튼에 쓰는 말 */
export const ORDER_LABEL = ORDERING_OPEN ? '주문하기' : '온라인 주문 준비 중'
