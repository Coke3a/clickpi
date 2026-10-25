-- Identifies the browser behind a click via a cookie set on the redirect
-- response (see src/worker/clickClientId.ts), so KPI aggregation can dedupe
-- repeat clicks from the same browser. IP address can't be used for this:
-- Thai mobile carriers rotate CGNAT/IPv6-privacy addresses on almost every
-- request, so the same phone shows up under many different IPs in one
-- session. Nullable because older rows predate this column and because a
-- client with cookies blocked has no id to record.
alter table clicks add column client_id text;
