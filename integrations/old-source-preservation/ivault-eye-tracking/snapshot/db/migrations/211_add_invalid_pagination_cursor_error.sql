insert into error_catalog (
  error_code,
  category,
  severity,
  http_status,
  retryable,
  user_visible,
  user_message,
  internal_message,
  owner_team
)
values (
  'INVALID_PAGINATION_CURSOR',
  'validation',
  'low',
  400,
  false,
  true,
  'The pagination cursor is invalid.',
  'Invalid pagination cursor.',
  'platform'
)
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
  user_message = excluded.user_message,
  internal_message = excluded.internal_message,
  owner_team = excluded.owner_team,
  updated_at = now();

insert into error_mapping_rules (
  match_pattern,
  error_code,
  priority,
  metadata
)
values (
  'Invalid pagination cursor',
  'INVALID_PAGINATION_CURSOR',
  5,
  '{}'::jsonb
)
on conflict do nothing;
