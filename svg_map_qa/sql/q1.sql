SET default_transaction_read_only = on;
SET statement_timeout = '30s';
\echo === connection
SELECT current_user, current_database(), pg_is_in_recovery() AS in_recovery, (SELECT setting FROM pg_settings WHERE name='default_transaction_read_only') AS read_only;
\echo === communities of interest
SELECT c.id, c.name, c.company_id, co.name AS company, c.is_beans_svg, c.enable_svg_mode, c.is_sitemap, c.web_map_type, c.data_provider, c.self_tour, c.auto_wayfinding, c.background_svg_image
FROM communities c LEFT JOIN companies co ON co.id = c.company_id
WHERE c.id IN (8005, 1411, 1412, 1414, 1618) OR c.name ILIKE '%jennifer demo%' OR c.name ILIKE '%john demo%' OR c.name ILIKE '%cypress%'
ORDER BY c.id;
\echo === floorplates of those communities
SELECT f.id, f.community_id, f.name, f.number, f.building, f.range, f.floor_name, f.floor_name_added, f.image, f.svg_image, f.label_image, f.file, f.standard_image_url, f.svg_image_url, f.width, f.height, f.svg_metadata, f.manual_override, f.updated_at::date,
  (SELECT count(*) FROM hallways h WHERE h.parent_type='Floorplate' AND h.parent_id=f.id) AS hallways,
  (SELECT count(*) FROM units u WHERE u.floorplate_id=f.id AND (u.x_plot>0 OR u.y_plot>0)) AS raster_units,
  (SELECT count(*) FROM units u WHERE u.floorplate_id=f.id AND u.pointer_data->>'x_plot' IS NOT NULL) AS svg_units,
  (SELECT count(*) FROM amenities a WHERE a.amenityable_type='Floorplate' AND a.amenityable_id=f.id) AS amenities,
  (SELECT count(*) FROM elevators e WHERE e.floorplate_id=f.id) AS elevators
FROM floorplates f
WHERE f.community_id IN (8005, 1411, 1412, 1414, 1618) OR f.community_id IN (SELECT id FROM communities WHERE name ILIKE '%jennifer demo%' OR name ILIKE '%john demo%' OR name ILIKE '%cypress%')
ORDER BY f.community_id, f.number, f.id;
\echo === sitemaps of those communities
SELECT s.id, s.community_id, s.image, s.svg_image, s.standard_image_url, s.width, s.height, s.svg_metadata FROM sitemaps s WHERE s.community_id IN (8005, 1411, 1412, 1414, 1618);
\echo === where standard URLs for 8005 live (units / floorplans / amenities)
SELECT 'units' AS tbl, count(*) AS rows_total, count(*) FILTER (WHERE image IS NOT NULL AND image <> '') AS with_image, count(*) FILTER (WHERE standard_image_url IS NOT NULL AND standard_image_url <> '') AS with_std, min(standard_image_url) AS sample_std FROM units WHERE community_id=8005
UNION ALL SELECT 'floorplans', count(*), count(*) FILTER (WHERE image IS NOT NULL AND image <> ''), count(*) FILTER (WHERE standard_image_url IS NOT NULL AND standard_image_url <> ''), min(standard_image_url) FROM floorplans WHERE community_id=8005
UNION ALL SELECT 'amenities', count(*), count(*) FILTER (WHERE image IS NOT NULL AND image <> ''), count(*) FILTER (WHERE standard_image_url IS NOT NULL AND standard_image_url <> ''), min(standard_image_url) FROM amenities WHERE community_id=8005;
\echo === bucket hosts named by standard_image_url across the database (floorplates)
SELECT substring(standard_image_url from '^https?://[^/]+') AS host, count(*) FROM floorplates WHERE standard_image_url IS NOT NULL AND standard_image_url <> '' GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
\echo === beans / background properties
SELECT id, name, company_id, is_beans_svg, background_svg_image, (SELECT count(*) FROM floorplates f WHERE f.community_id=c.id) AS plates, (SELECT count(*) FROM floorplates f WHERE f.community_id=c.id AND f.svg_image IS NOT NULL AND f.svg_image <> '') AS svg_plates FROM communities c WHERE is_beans_svg OR (background_svg_image IS NOT NULL AND background_svg_image <> '') ORDER BY id;
\echo === floorplate asset kinds across the database
SELECT CASE WHEN svg_image IS NOT NULL AND svg_image <> '' AND (image IS NULL OR image = '') THEN 'svg-only' WHEN svg_image IS NOT NULL AND svg_image <> '' THEN 'both' WHEN image IS NOT NULL AND image <> '' THEN 'image-only' ELSE 'none' END AS kind, count(*) FROM floorplates GROUP BY 1;
