-- Integrity baseline, run before and after migration; results must be identical.
\echo 'orphan floorplates (community missing)'
select count(*) from floorplates f where not exists (select 1 from communities c where c.id=f.community_id);
\echo 'orphan units (community missing)'
select count(*) from units u where not exists (select 1 from communities c where c.id=u.community_id);
\echo 'units pointing at missing floorplate'
select count(*) from units u where u.floorplate_id is not null and not exists (select 1 from floorplates f where f.id=u.floorplate_id);
\echo 'orphan amenities (community missing)'
select count(*) from amenities a where not exists (select 1 from communities c where c.id=a.community_id);
\echo 'orphan tour_stops (tour missing)'
select count(*) from tour_stops ts where not exists (select 1 from tours t where t.id=ts.tour_id);
\echo 'tour_stops whose record is missing (unit/amenity/elevator/bsp)'
select stop_type, count(*) from tour_stops ts where
   (stop_type='unit' and not exists (select 1 from units x where x.id=ts.stop_id)) or
   (stop_type='amenity' and not exists (select 1 from amenities x where x.id=ts.stop_id)) or
   (stop_type='elevator' and not exists (select 1 from elevators x where x.id=ts.stop_id)) or
   (stop_type='building_starting_point' and not exists (select 1 from building_starting_points x where x.id=ts.stop_id))
 group by 1 order by 1;
\echo 'duplicate tour stops (same tour, type, id)'
select count(*) from (select tour_id, stop_type, stop_id from tour_stops group by 1,2,3 having count(*)>1) d;
\echo 'orphan paths (tour_stop missing)'
select count(*) from paths p where p.map_path_type='TourStop' and not exists (select 1 from tour_stops ts where ts.id=p.map_path_id);
\echo 'paths by map_path_type'
select map_path_type, count(*) from paths group by 1 order by 1;
\echo 'orphan path_points (path missing)'
select count(*) from path_points pp where not exists (select 1 from paths p where p.id=pp.path_id);
\echo 'orphan hallways (parent missing)'
select count(*) from hallways h where
   (h.parent_type='Floorplate' and not exists (select 1 from floorplates f where f.id=h.parent_id)) or
   (h.parent_type='Sitemap' and not exists (select 1 from sitemaps s where s.id=h.parent_id));
\echo 'hallways with dangling next_points ids'
select count(distinct h.id) from hallways h, unnest(h.next_points) np where not exists (select 1 from hallways o where o.id=np);
\echo 'hallways self loops'
select count(*) from hallways where id = any(next_points);
\echo 'levels with selected count != 1 (among levels that have hallways)'
select count(*) from (select parent_type, parent_id, count(*) filter (where selected) sel from hallways group by 1,2 having count(*) filter (where selected) <> 1) x;
\echo 'duplicate logical hallway points (same level, same rounded coords)'
select count(*) from (select parent_type, parent_id, round(x_plot), round(y_plot) from hallways where x_plot is not null group by 1,2,3,4 having count(*)>1) d;
\echo 'elevators pointing at missing floorplate'
select count(*) from elevators e where e.floorplate_id is not null and not exists (select 1 from floorplates f where f.id=e.floorplate_id);
\echo 'units with floor outside floorplate range (informational)'
select count(*) from units u join floorplates f on f.id=u.floorplate_id where u.floor is not null and f.range is not null and not (u.floor::text = any(string_to_array(replace(f.range,' ',''),',')));
