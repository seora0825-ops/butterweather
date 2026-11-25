-- 0013 — 현장에서 팔면 홈페이지 재고도 준다
--
-- 물건이 전부 하나뿐이다. 매대에서 판 것이 홈페이지에 남아 있으면 **없는 물건을
-- 판다.** 사람이 지우기로 하면 바쁠 때 잊는다.
--
-- ## 언제 깎고 언제 되돌리나
--
--   done    깎는다
--   voided  깎은 만큼 되돌린다 (기록을 지웠거나 결제가 취소됐다)
--
-- 같은 판매가 몇 번을 와도 **한 번만** 깎는다. 휴대폰이 같은 기록을 다시 보내고,
-- 페이앱 통보도 여러 번 온다. 깎은 것을 `counter_taken` 에 적어 두고 그것으로
-- 판단한다.
--
-- **0 아래로 내려가지 않는다.** 온라인에서 먼저 팔렸으면 깎을 것이 없다. 그때
-- 되돌릴 것도 없다 — 그래서 「몇 개를 실제로 깎았나」를 적는다.
--
-- ⚠️ `before insert` 로 하면 안 된다. 계산기는 upsert 로 보내는데, 이미 있는
-- 판매여도 before insert trigger 는 **먼저 돈다** — 두 번 깎인다.
-- ⚠️ 다시 실행해도 된다.

create table if not exists counter_taken (
  sale_id     uuid not null references counter_sales(id) on delete cascade,
  variant_id  uuid not null references product_variants(id) on delete cascade,
  -- 실제로 깎은 개수. 모자랐으면 판 개수보다 적다
  quantity    integer not null check (quantity >= 0),
  restored_at timestamptz,
  primary key (sale_id, variant_id)
);

-- 아무도 직접 보거나 고치지 않는다. 정책을 만들지 않아 API 로 닫힌다
alter table counter_taken enable row level security;
revoke all on counter_taken from anon, authenticated;

create or replace function counter_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item  record;
  taken integer;
begin
  if new.status = 'done' then
    if exists (select 1 from counter_taken where sale_id = new.id) then
      return null;
    end if;

    -- 금액만 넣은 줄(`custom-…`)과 지워진 옵션은 건너뛴다. 같은 옵션이 두 줄이면
    -- 합친다. 늘 같은 순서로 잠가 서로 기다리지 않게 한다
    for item in
      select v.id, sum((l->>'quantity')::integer) as quantity
        from jsonb_array_elements(new.lines) as l
        join product_variants v on v.id::text = l->>'key'
       where l->>'quantity' ~ '^[1-9][0-9]{0,2}$'
       group by v.id
       order by v.id
    loop
      select least(stock, item.quantity) into taken
        from product_variants where id = item.id for update;

      update product_variants set stock = stock - taken where id = item.id;
      insert into counter_taken (sale_id, variant_id, quantity)
      values (new.id, item.id, taken);
    end loop;

  elsif new.status = 'voided' then
    for item in
      select variant_id, quantity from counter_taken
       where sale_id = new.id and restored_at is null
       order by variant_id
       for update
    loop
      update product_variants
         set stock = stock + item.quantity
       where id = item.variant_id;
      update counter_taken set restored_at = now()
       where sale_id = new.id and variant_id = item.variant_id;
    end loop;
  end if;

  return null;
end;
$$;

drop trigger if exists counter_sales_stock on counter_sales;
create trigger counter_sales_stock
  after insert or update on counter_sales
  for each row execute function counter_stock();

revoke execute on function counter_stock() from public, anon, authenticated;
