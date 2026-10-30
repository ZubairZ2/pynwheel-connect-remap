-- Pre-migration validation. Run against the PRE-migration clone.
-- Every query answers a count; anything non-zero in the "must be 0" block is a migration blocker.
\echo '== hallways rows total'
select count(*) from hallways;
\echo '== MUST BE 0: hallways with NaN/Infinity or |coord| > 2^31-1 (index_hallways_natural_key casts round(x)::int)'
select count(*) from hallways
 where x_plot = 'NaN'::float8 or y_plot = 'NaN'::float8
    or x_plot in ('Infinity'::float8,'-Infinity'::float8) or y_plot in ('Infinity'::float8,'-Infinity'::float8)
    or abs(x_plot) > 2147483647 or abs(y_plot) > 2147483647;
\echo '== hallways with NULL coordinates (index tolerates NULL; informational)'
select count(*) from hallways where x_plot is null or y_plot is null;
\echo '== hallways orphans (parent floorplate/sitemap missing) -> backfill leaves community_id NULL'
select parent_type, count(*) from hallways h
 where (h.parent_type='Floorplate' and not exists (select 1 from floorplates f where f.id=h.parent_id))
    or (h.parent_type='Sitemap'    and not exists (select 1 from sitemaps  s where s.id=h.parent_id))
    or h.parent_type not in ('Floorplate','Sitemap') or h.parent_type is null
 group by 1;
\echo '== hallways by parent_type'
select parent_type, count(*) from hallways group by 1;
\echo '== elevators rows (NOT NULL defaults added: kind/accessible/floor_positions)'
select count(*) from elevators;
\echo '== floorplates / sitemaps / tours rows (NOT NULL default columns added)'
select (select count(*) from floorplates) fp, (select count(*) from sitemaps) sm, (select count(*) from tours) t, (select count(*) from tour_stops) ts, (select count(*) from units) u, (select count(*) from doors) d;
\echo '== table sizes for lock/backfill estimate'
select relname, pg_size_pretty(pg_total_relation_size(oid)) size, n_live_tup
  from pg_class c join pg_stat_user_tables s using (relname)
 where relname in ('hallways','tour_stops','units','elevators','doors','floorplates','sitemaps','tours','versions') order by 1;
\echo '== name collisions with new tables (must be empty)'
select table_name from information_schema.tables where table_schema='public'
   and table_name in ('hallway_edges','hallway_suppressions','hallway_attachments','hallway_detection_runs','wayfinding_stops');
\echo '== column collisions (must be empty)'
select table_name, column_name from information_schema.columns where table_schema='public' and (
   (table_name='hallways' and column_name in ('source','review_status','confidence','space','community_id','detection_run_id','confirmed_at','created_by_user_id'))
 or (table_name='elevators' and column_name in ('kind','accessible','floor_positions'))
 or (table_name='doors' and column_name='note')
 or (table_name in ('floorplates','sitemaps') and column_name in ('wayfinding_version','svg_to_image_transform','scale_ft_per_px'))
 or (table_name='tours' and column_name='tour_setup_version')
 or (table_name='tour_stops' and column_name='duration_minutes'));
\echo '== existing triggers on affected tables (expect none / list)'
select event_object_table, trigger_name from information_schema.triggers
 where event_object_table in ('hallways','tour_stops','units','elevators','doors','floorplates','sitemaps','tours') order by 1,2;
\echo '== views depending on affected tables'
select distinct dependent_view.relname from pg_depend d
 join pg_rewrite r on r.oid=d.objid join pg_class dependent_view on dependent_view.oid=r.ev_class
 join pg_class src on src.oid=d.refobjid
 where src.relname in ('hallways','tour_stops','units','elevators','doors','floorplates','sitemaps','tours') and dependent_view.relkind='v';
\echo '== schema_migrations state'
select max(version) from schema_migrations; select count(*) from schema_migrations where version >= '20261003100001';
