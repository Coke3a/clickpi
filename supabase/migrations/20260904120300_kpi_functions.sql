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
  select e.id, e.name, count(c.id)::bigint
  from public.employees e
  left join public.clicks c
    on c.employee_id = e.id
    and c.clicked_at >= p_from
    and c.clicked_at < p_to
    and (p_destination_id is null or c.destination_id = p_destination_id)
  group by e.id, e.name
  order by count(c.id) desc, e.name asc;
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
    select date_trunc(p_granularity, c.clicked_at) as bucket, count(*)::bigint
    from public.clicks c
    where c.clicked_at >= p_from
      and c.clicked_at < p_to
      and (p_destination_id is null or c.destination_id = p_destination_id)
    group by 1
    order by 1;
end;
$$;
