-- get_click_trend previously bucketed clicked_at with date_trunc() in the
-- database session's timezone (UTC), so a click made late at night in
-- Thailand could be attributed to the wrong calendar day from the shop
-- owner's point of view. This buckets in Asia/Bangkok instead: convert the
-- instant to Bangkok wall-clock time, truncate there, then convert the
-- truncated wall-clock value back to an absolute instant (still
-- Asia/Bangkok, so it always renders as local midnight when the frontend
-- displays it in the same timezone).
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
      count(*)::bigint
    from public.clicks c
    where c.clicked_at >= p_from
      and c.clicked_at < p_to
      and (p_destination_id is null or c.destination_id = p_destination_id)
    group by 1
    order by 1;
end;
$$;
