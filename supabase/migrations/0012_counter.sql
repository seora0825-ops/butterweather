-- 0012 — 현장 판매. 휴대폰 두 대가 같은 기록을 보고, 페이앱 결제가 저절로 붙는다
--
-- 전에는 계산기 기록이 휴대폰 안에만 있었다(`lib/store/counter.ts`). 두 대로
-- 받으면 기록도 둘이었다.
--
-- **온라인 주문(`orders`)에 섞지 않는다.** 그 표는 회원과 배송지를 요구하고,
-- 현장 손님은 둘 다 없다.
--
-- ## 왜 표가 둘인가
--
-- 「무엇을 팔았나」와 「돈이 들어왔나」는 서로 다른 곳에서 온다. 앞은 사람이
-- 계산기에서 누르고, 뒤는 페이앱이 알려온다. **순서가 뒤바뀌고, 한쪽만 올 수도
-- 있다.** 하나로 합치면 먼저 온 쪽이 나머지를 기다려야 한다.
--
-- 둘을 잇는 것은 아래 `counter_match()` 다. 어느 쪽이 먼저 와도 같다.
--
-- ⚠️ 손님의 휴대폰 번호·이름은 **담지 않는다.** 장부에 필요 없다.
-- ⚠️ 다시 실행해도 된다.

-- ── 판매 ────────────────────────────────────────────────────
create table if not exists counter_sales (
  -- 계산기가 만든다. 페이앱에 `var1` 로 실어 보내고 통보로 되돌아온다
  id         uuid primary key,
  at         timestamptz not null,
  method     text not null check (method in
               ('transfer', 'cash', 'QR', 'KAKAO_PAY', 'NAVER_PAY', 'WECHAT_PAY', 'PAYAPP')),
  -- [{ key, name, priceKrw, quantity }]
  lines      jsonb not null check (jsonb_typeof(lines) = 'array'),
  total_krw  integer not null check (total_krw >= 0),
  -- waiting 결제를 기다림 · dropped 돌아가기를 누름 · done 팔았음 · voided 기록을 지움
  status     text not null check (status in ('waiting', 'dropped', 'done', 'voided')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists counter_sales_at_idx on counter_sales (at desc);

-- ── 페이앱이 알려온 결제 ────────────────────────────────────
create table if not exists counter_payments (
  mul_no       text primary key,
  -- 페이앱에 실어 보낸 판매 번호. 앱에서 금액을 직접 친 결제에는 없다
  ref          text,
  goods        text not null default '',
  price_krw    integer not null check (price_krw >= 0),
  pay_type     text not null default '',
  state        text not null check (state in ('paid', 'cancelled')),
  sale_id      uuid unique references counter_sales(id) on delete set null,
  -- 사람이 「이미 기록한 판매」라고 한 것
  dismissed_at timestamptz,
  received_at  timestamptz not null default now()
);

-- ── RLS — 관리자만 ──────────────────────────────────────────
alter table counter_sales enable row level security;
alter table counter_payments enable row level security;

drop policy if exists counter_sales_admin_all on counter_sales;
create policy counter_sales_admin_all on counter_sales
  for all to authenticated using (is_admin()) with check (is_admin());

-- 결제를 **넣는 것은 서버뿐이다.** 관리자는 보고, 짝을 잇는다
drop policy if exists counter_payments_admin_read on counter_payments;
create policy counter_payments_admin_read on counter_payments
  for select to authenticated using (is_admin());

drop policy if exists counter_payments_admin_update on counter_payments;
create policy counter_payments_admin_update on counter_payments
  for update to authenticated using (is_admin()) with check (is_admin());

-- 금액과 상태는 페이앱이 정한 것이다. 사람이 고칠 수 있는 칸은 둘뿐이다
revoke insert, update, delete on counter_payments from anon, authenticated;
grant update (sale_id, dismissed_at) on counter_payments to authenticated;

-- ── 상태는 뒤로 가지 않는다 ─────────────────────────────────
--
-- 통신이 끊긴 휴대폰은 옛 상태를 **나중에** 보낸다. 페이앱이 이미 확정한 판매를
-- 「기다림」으로 되돌리면 안 된다.
create or replace function counter_sale_forward()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  ranks constant text[] := array['waiting', 'dropped', 'done', 'voided'];
begin
  if array_position(ranks, new.status) < array_position(ranks, old.status) then
    new.status := old.status;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists counter_sales_forward on counter_sales;
create trigger counter_sales_forward
  before update on counter_sales
  for each row execute function counter_sale_forward();

-- ── 짝짓기 ──────────────────────────────────────────────────
--
-- 1. 판매 번호가 실려 왔고 금액이 같으면 그것이다
-- 2. 번호 없이 온 결제는 **앞뒤 30분 안의 같은 금액이 딱 하나일 때만** 잇는다.
--    둘 이상이면 고르지 않는다 — 사람이 본다
--
-- 금액이 다르면 잇지 않는다. 앱에서 금액을 고쳤을 수 있다.
create or replace function counter_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p     record;
  found_id uuid;
  n     integer;
begin
  -- 아래 update 가 이 함수를 다시 부른다. 한 번이면 된다
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  -- 두 통보가 같은 판매를 동시에 집지 않게 한 줄로 세운다
  perform pg_advisory_xact_lock(hashtext('counter_match'));

  for p in
    select * from counter_payments
     where sale_id is null and dismissed_at is null and state = 'paid'
       and received_at > now() - interval '7 days'
     order by received_at
  loop
    found_id := null;

    select s.id into found_id
      from counter_sales s
     where s.id::text = p.ref
       and s.total_krw = p.price_krw
       and s.status <> 'voided'
       and not exists (select 1 from counter_payments x where x.sale_id = s.id);

    if found_id is null and coalesce(p.ref, '') = '' then
      select count(*), (array_agg(s.id))[1] into n, found_id
        from counter_sales s
       where s.method not in ('transfer', 'cash')
         and s.total_krw = p.price_krw
         and s.status in ('waiting', 'done')
         and s.at between p.received_at - interval '30 minutes'
                      and p.received_at + interval '30 minutes'
         and not exists (select 1 from counter_payments x where x.sale_id = s.id);
      if n <> 1 then
        found_id := null;
      end if;
    end if;

    if found_id is not null then
      update counter_payments set sale_id = found_id where mul_no = p.mul_no;
      update counter_sales set status = 'done' where id = found_id;
    end if;
  end loop;

  -- 결제가 취소되면 그 판매도 없던 것이다
  update counter_sales s
     set status = 'voided'
    from counter_payments x
   where x.sale_id = s.id and x.state = 'cancelled' and s.status <> 'voided';

  return null;
end;
$$;

drop trigger if exists counter_sales_match on counter_sales;
create trigger counter_sales_match
  after insert or update on counter_sales
  for each statement execute function counter_match();

drop trigger if exists counter_payments_match on counter_payments;
create trigger counter_payments_match
  after insert or update on counter_payments
  for each statement execute function counter_match();

-- `0008` 에서 배운 것 — 함수는 역할마다 명시적으로 닫는다
revoke execute on function counter_match() from public, anon, authenticated;
revoke execute on function counter_sale_forward() from public, anon, authenticated;
