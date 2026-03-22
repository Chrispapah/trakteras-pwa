alter table public.assets
add column if not exists color text;

update public.assets
set color = '#3b82f6'
where color is null;

with palette as (
  select array[
    '#22c55e',
    '#3b82f6',
    '#f59e0b',
    '#a855f7',
    '#ef4444',
    '#14b8a6',
    '#eab308',
    '#ec4899'
  ]::text[] as colors
),
ranked_assets as (
  select
    asset_id,
    row_number() over (order by created_at, asset_id) - 1 as color_index
  from public.assets
)
update public.assets as assets
set color = palette.colors[(ranked_assets.color_index % array_length(palette.colors, 1)) + 1]
from ranked_assets
cross join palette
where assets.asset_id = ranked_assets.asset_id;

alter table public.assets
alter column color set default '#3b82f6';

alter table public.assets
alter column color set not null;
