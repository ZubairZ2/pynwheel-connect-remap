-- Record counts, run before and after migration; diff must be empty except schema_migrations.
select 'communities' t, count(*) from communities union all
select 'companies', count(*) from companies union all
select 'users', count(*) from users union all
select 'floorplates', count(*) from floorplates union all
select 'sitemaps', count(*) from sitemaps union all
select 'floorplans', count(*) from floorplans union all
select 'units', count(*) from units union all
select 'amenities', count(*) from amenities union all
select 'elevators', count(*) from elevators union all
select 'doors', count(*) from doors union all
select 'building_starting_points', count(*) from building_starting_points union all
select 'tours', count(*) from tours union all
select 'tour_stops', count(*) from tour_stops union all
select 'paths', count(*) from paths union all
select 'path_points', count(*) from path_points union all
select 'hallways', count(*) from hallways union all
select 'hallways_selected', count(*) from hallways where selected union all
select 'versions', count(*) from versions union all
select 'schedual_tours', count(*) from schedual_tours
order by 1;
