-- Simulate the legacy Server A write shapes against the migrated clone, inside a transaction that is rolled back.
-- Legacy INSERTs name only the columns the old model knows; new NOT NULL columns must be filled by defaults.
begin;
\echo '-- legacy HallwaysController#point_save shape'
insert into hallways (x_plot, y_plot, parent_type, parent_id, next_points, selected, created_at, updated_at)
select 100, 200, 'Floorplate', (select id from floorplates where id in (select parent_id from hallways where parent_type='Floorplate') limit 1), '{}', true, now(), now()
returning id, source, review_status, space, community_id;
\echo '-- legacy Elevator create shape (ElevatorsController#create)'
insert into elevators (name, x_plot, y_plot, community_id, floorplate_id, created_at, updated_at)
select 'audit-elev', 1, 1, f.community_id, f.id, now(), now() from floorplates f limit 1
returning id, kind, accessible, floor_positions;
\echo '-- legacy TourStop create shape (ToursController add stop)'
insert into tour_stops (tour_id, stop_id, stop_type, name, sort, display_stop)
select t.id, 1, 'unit', 'audit', 99, true from tours t limit 1 returning id, duration_minutes;
\echo '-- legacy Tour create shape (ApplicationController creates a Tour on first visit)'
insert into tours (community_id, created_at, updated_at) select id, now(), now() from communities limit 1 returning id, tour_setup_version;
\echo '-- legacy Door create shape'
insert into doors (name, community_id, created_at, updated_at) select 'audit-door', id, now(), now() from communities limit 1 returning id, note;
\echo '-- legacy Floorplate / Sitemap create shape'
insert into floorplates (community_id, created_at, updated_at) select id, now(), now() from communities limit 1 returning id, wayfinding_version, svg_to_image_transform, scale_ft_per_px;
\echo '-- legacy update_all shapes'
update hallways set selected=false where parent_id=(select parent_id from hallways limit 1) and parent_type='Floorplate';
update units set x_plot=0, y_plot=0, floorplate_id=null where id=(select id from units limit 1);
\echo '-- legacy hallway DELETE with FK children present: create child rows then delete parent (cascade/nullify expected)'
insert into hallway_edges (from_hallway_id, to_hallway_id, parent_type, parent_id, created_at, updated_at)
select least(a.id,b.id), greatest(a.id,b.id), a.parent_type, a.parent_id, now(), now()
  from hallways a join hallways b on a.parent_type=b.parent_type and a.parent_id=b.parent_id and a.id<b.id limit 1 returning id;
delete from hallways where id=(select from_hallway_id from hallway_edges limit 1) returning id;
select count(*) edges_left from hallway_edges;
\echo '-- legacy floorplate DELETE must not be blocked by new tables (no FK to floorplates)'
delete from floorplates where id=(select id from floorplates order by id desc limit 1) returning id;
rollback;
