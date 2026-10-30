-- Post-migration: actual objects created. Run against the migrated clone.
\echo '== new tables'
select table_name from information_schema.tables where table_schema='public' and table_name in ('hallway_edges','hallway_suppressions','hallway_attachments','hallway_detection_runs','wayfinding_stops') order by 1;
\echo '== new columns with nullability and defaults'
select table_name, column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema='public' and (
   (table_name='hallways' and column_name in ('source','review_status','confidence','space','community_id','detection_run_id','confirmed_at','created_by_user_id'))
 or (table_name='elevators' and column_name in ('kind','accessible','floor_positions'))
 or (table_name='doors' and column_name='note')
 or (table_name in ('floorplates','sitemaps') and column_name in ('wayfinding_version','svg_to_image_transform','scale_ft_per_px'))
 or (table_name='tours' and column_name='tour_setup_version')
 or (table_name='tour_stops' and column_name='duration_minutes')) order by 1,2;
\echo '== new indexes'
select tablename, indexname, indexdef from pg_indexes where schemaname='public' and (
   indexname in ('index_hallways_on_community_id','index_hallways_routable_lookup','index_hallways_natural_key','index_elevators_on_community_id_and_kind','index_tour_stops_on_stop_type_and_stop_id','index_units_on_floorplate_id')
   or tablename in ('hallway_edges','hallway_suppressions','hallway_attachments','hallway_detection_runs','wayfinding_stops')) order by 1,2;
\echo '== invalid indexes (a failed CONCURRENTLY build leaves an INVALID index) -- must be empty'
select indexrelid::regclass from pg_index where not indisvalid;
\echo '== foreign keys on new tables'
select conrelid::regclass child, conname, pg_get_constraintdef(oid) from pg_constraint where contype='f' and conrelid::regclass::text in ('hallway_edges','hallway_attachments','wayfinding_stops') order by 1,2;
\echo '== check constraints on new tables'
select conrelid::regclass, conname, pg_get_constraintdef(oid) from pg_constraint where contype='c' and conrelid::regclass::text in ('hallway_edges','hallway_attachments','wayfinding_stops','hallway_suppressions','hallway_detection_runs') order by 1,2;
\echo '== triggers / functions added (expect none)'
select event_object_table, trigger_name from information_schema.triggers where event_object_table in ('hallways','hallway_edges','hallway_attachments','hallway_suppressions','hallway_detection_runs','wayfinding_stops','tour_stops','units','elevators','doors','floorplates','sitemaps','tours');
\echo '== backfill result: hallways community_id coverage'
select count(*) total, count(community_id) filled, count(*)-count(community_id) still_null from hallways;
\echo '== backfill correctness: community_id mismatching parent (must be 0)'
select count(*) from hallways h join floorplates f on h.parent_type='Floorplate' and f.id=h.parent_id where h.community_id <> f.community_id;
select count(*) from hallways h join sitemaps s on h.parent_type='Sitemap' and s.id=h.parent_id where h.community_id <> s.community_id;
\echo '== every existing row routable under the defaults (must equal total)'
select count(*) total, count(*) filter (where source='manual' and review_status='confirmed' and space='raster') routable_default from hallways;
\echo '== elevators defaults'
select count(*) total, count(*) filter (where kind='elevator' and accessible and floor_positions='{}'::jsonb) defaulted from elevators;
\echo '== version counters all 0'
select (select count(*) from floorplates where wayfinding_version<>0) fp, (select count(*) from sitemaps where wayfinding_version<>0) sm, (select count(*) from tours where tour_setup_version<>0) t;
\echo '== new tables row counts (expect 0)'
select (select count(*) from hallway_edges) e,(select count(*) from hallway_suppressions) s,(select count(*) from hallway_attachments) a,(select count(*) from hallway_detection_runs) r,(select count(*) from wayfinding_stops) w;
