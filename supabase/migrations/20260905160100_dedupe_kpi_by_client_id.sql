-- Count unique browsers (client_id) per employee/bucket instead of raw click
-- rows, so a reload or double-tap from the same visitor no longer inflates
-- the leaderboard/trend. Rows without a client_id (cookies blocked, or
-- recorded before this column existed) can't be deduped against anything,
-- so each one still counts on its own via coalesce(client_id, id::text).
create or replace function get_leaderboard(
  p_from timestamptz,
  p_to timestamptz,
  p_destination_id bigint default null
)
returns table (employee_id bigint, employee_name text, click_count bigint)
language sql
security invoker
set search_path = ''
as $$
  select
    e.id,
    e.name,
    count(distinct coalesce(c.client_id, c.id::text))::bigint
  from public.employees e
  left join public.clicks c
    on c.employee_id = e.id
    and c.clicked_at >= p_from
    and c.clicked_at < p_to
    and (p_destination_id is null or c.destination_id = p_destination_id)
  group by e.id, e.name
  order by count(distinct coalesce(c.client_id, c.id::text)) desc, e.name asc;
$$;

create or replace function get_click_trend(
  p_from timestamptz,
  p_to timestamptz,
  p_destination_id bigint default null,
  p_granularity text default 'day'
)
returns table (bucket timestamptz, click_count bigint)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_granularity not in ('day', 'week', 'month') then
    raise exception 'invalid granularity: %', p_granularity;
  end if;

  return query
    select
      (date_trunc(p_granularity, c.clicked_at at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok') as bucket,
      count(distinct coalesce(c.client_id, c.id::text))::bigint
    from public.clicks c
    where c.clicked_at >= p_from
      and c.clicked_at < p_to
      and (p_destination_id is null or c.destination_id = p_destination_id)
    group by 1
    order by 1;
end;
$$;
