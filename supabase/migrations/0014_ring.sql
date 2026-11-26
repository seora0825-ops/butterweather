-- 0014 — 반지를 카테고리에 더한다
--
-- 카테고리는 소재가 아니라 **형태**다(CLAUDE.md 1절). 「형태가 다른 것이 들어오면
-- 그때 카테고리를 늘린다」고 정해 두었고, 2026-11-26 반지 세 점이 들어왔다.
--
-- 키링은 지우지 않는다. 지금 가진 것이 없을 뿐이고, 화면에서만 감춘다
-- (`src/lib/categories.ts`).
--
-- ⚠️ 다시 실행해도 된다 — `if not exists`. 값을 더할 뿐 있던 행은 건드리지 않는다.

alter type product_category add value if not exists 'ring';
