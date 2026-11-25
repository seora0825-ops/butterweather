-- 0011 — **손님이 주문을 직접 넣지 못하게 닫는다.** 보안 수정
--
-- `orders_insert_own` 은 「누구의 주문인가」만 본다. 그래서 로그인한 손님이
-- 우리 서버를 거치지 않고 API 로 직접 이런 주문을 넣을 수 있었다.
--
--   · `total_krw` 를 마음대로 적은 주문
--   · 처음부터 `status = 'paid'` 인 주문 — 결제 없이 「결제 완료」로 보인다
--   · 이미 결제한 자기 주문에 `order_items` 를 더 끼워 넣기
--
-- 주문을 만드는 것은 `createOrder` 하나이고, 2026-11-25 부터 `service_role` 로
-- 쓴다(PR #17). service_role 은 RLS 를 지나가므로 손님에게 열어 둘 이유가 없다.
--
-- **읽기(`orders_own`·`order_items_own`)와 관리자 정책은 그대로다.**
--
-- ⚠️ 다시 실행해도 된다 — `if exists`. 다만 `0005` 를 다시 돌리면 정책이
-- 되살아나므로 **`0011` 이 뒤에 와야 한다**(번호 순서대로면 그렇다).

drop policy if exists orders_insert_own on orders;
drop policy if exists order_items_insert_own on order_items;
