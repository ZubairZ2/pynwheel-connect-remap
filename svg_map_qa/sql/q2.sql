SET default_transaction_read_only = on;
SET statement_timeout = '30s';
\echo === sitemaps of those communities
SELECT s.id, s.community_id, s.image, s.svg_image, s.width, s.height, s.svg_metadata FROM sitemaps s WHERE s.community_id IN (8005, 1411, 1412, 1414, 1618);
\echo === where standard URLs for 8005 live (units / floorplans / amenities)
SELECT 'units' AS tbl, count(*) AS rows_total, count(*) FILTER (WHERE image IS NOT NULL AND image <> '') AS with_image, count(*) FILTER (WHERE standard_image_url IS NOT NULL AND standard_image_url <> '') AS with_std, min(standard_image_url) AS sample_std FROM units WHERE community_id=8005
UNION ALL SELECT 'floorplans', count(*), count(*) FILTER (WHERE image IS NOT NULL AND image <> ''), count(*) FILTER (WHERE standard_image_url IS NOT NULL AND standard_image_url <> ''), min(standard_image_url) FROM floorplans WHERE community_id=8005
UNION ALL SELECT 'amenities', count(*), count(*) FILTER (WHERE image IS NOT NULL AND image <> ''), count(*) FILTER (WHERE standard_image_url IS NOT NULL AND standard_image_url <> ''), min(standard_image_url) FROM amenities WHERE community_id=8005;
\echo === 8005 units by floor / building / plotting
SELECT floor, building, count(*) AS units, count(*) FILTER (WHERE floorplate_id IS NOT NULL) AS on_plate, count(*) FILTER (WHERE x_plot>0 OR y_plot>0) AS raster_plotted, count(*) FILTER (WHERE pointer_data->>'x_plot' IS NOT NULL) AS svg_plotted, count(*) FILTER (WHERE image IS NOT NULL AND image <> '') AS with_image FROM units WHERE community_id=8005 GROUP BY 1,2 ORDER BY 1,2;
\echo === 8005 sample unit images (first 5)
SELECT id, name, floor, floorplate_id, image, standard_image_url, pointer_data FROM units WHERE community_id=8005 ORDER BY id LIMIT 5;
\echo === 8005 floorplans images
SELECT id, name, image, standard_image_url, provider_floorplan_id FROM floorplans WHERE community_id=8005 ORDER BY id LIMIT 10;
\echo === 8005 amenities / elevators / tour / stops / doors / building starting points
SELECT (SELECT count(*) FROM amenities WHERE community_id=8005) AS amenities, (SELECT count(*) FROM elevators WHERE community_id=8005) AS elevators, (SELECT count(*) FROM tours WHERE community_id=8005) AS tours, (SELECT count(*) FROM tour_stops ts JOIN tours t ON t.id=ts.tour_id WHERE t.community_id=8005) AS tour_stops, (SELECT count(*) FROM doors d WHERE d.attached_with_type='Floorplate' AND d.attached_with_id IN (4604,4605,4606)) AS plate_doors, (SELECT count(*) FROM building_starting_points WHERE community_id=8005) AS starting_points, (SELECT count(*) FROM hallways WHERE community_id=8005 OR (parent_type='Floorplate' AND parent_id IN (4604,4605,4606))) AS hallways;
\echo === 8005 community map settings
SELECT id, name, is_beans_svg, enable_svg_mode, background_svg_image, display_building, enable_three_d_maps, enable_sdk_map, show_map, three_d_maps_configuration IS NOT NULL AS has_3d_config, created_at::date, updated_at::date FROM communities WHERE id=8005;
\echo === bucket hosts named by standard_image_url across the database (floorplates)
SELECT substring(standard_image_url from '^https?://[^/]+') AS host, count(*) FROM floorplates WHERE standard_image_url IS NOT NULL AND standard_image_url <> '' GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
\echo === beans / background properties
SELECT id, name, company_id, is_beans_svg, enable_svg_mode, is_sitemap, background_svg_image, (SELECT count(*) FROM floorplates f WHERE f.community_id=c.id) AS plates, (SELECT count(*) FROM floorplates f WHERE f.community_id=c.id AND f.svg_image IS NOT NULL AND f.svg_image <> '') AS svg_plates, (SELECT count(*) FROM floorplates f WHERE f.community_id=c.id AND (f.image IS NULL OR f.image = '') AND f.svg_image IS NOT NULL AND f.svg_image <> '') AS svg_only_plates, (SELECT count(*) FROM sitemaps s WHERE s.community_id=c.id AND s.svg_image IS NOT NULL AND s.svg_image <> '') AS svg_sitemaps FROM communities c WHERE is_beans_svg OR (background_svg_image IS NOT NULL AND background_svg_image <> '') ORDER BY id;
\echo === floorplate asset kinds across the database
SELECT CASE WHEN svg_image IS NOT NULL AND svg_image <> '' AND (image IS NULL OR image = '') THEN 'svg-only' WHEN svg_image IS NOT NULL AND svg_image <> '' THEN 'both' WHEN image IS NOT NULL AND image <> '' THEN 'image-only' ELSE 'none' END AS kind, count(*) FROM floorplates GROUP BY 1;
\echo === svg-only floorplates whose property has no standard_image_url anywhere (the bucket hint would be empty)
SELECT f.community_id, c.name, c.is_beans_svg, count(*) AS svg_only_plates
FROM floorplates f JOIN communities c ON c.id=f.community_id
WHERE f.svg_image IS NOT NULL AND f.svg_image <> '' AND (f.image IS NULL OR f.image='')
  AND NOT EXISTS (SELECT 1 FROM floorplates x WHERE x.community_id=f.community_id AND x.standard_image_url IS NOT NULL AND x.standard_image_url <> '')
  AND NOT EXISTS (SELECT 1 FROM amenities x WHERE x.community_id=f.community_id AND x.standard_image_url IS NOT NULL AND x.standard_image_url <> '')
  AND NOT EXISTS (SELECT 1 FROM units x WHERE x.community_id=f.community_id AND x.standard_image_url IS NOT NULL AND x.standard_image_url <> '')
  AND NOT EXISTS (SELECT 1 FROM floorplans x WHERE x.community_id=f.community_id AND x.standard_image_url IS NOT NULL AND x.standard_image_url <> '')
GROUP BY 1,2,3 ORDER BY 1;
\echo === other SVG-enabled properties with stored hallways (candidates for comparison)
SELECT f.community_id, c.name, c.is_beans_svg, count(*) AS plates, count(*) FILTER (WHERE f.svg_image IS NOT NULL AND f.svg_image <> '') AS svg_plates, sum((SELECT count(*) FROM hallways h WHERE h.parent_type='Floorplate' AND h.parent_id=f.id)) AS hallways
FROM floorplates f JOIN communities c ON c.id=f.community_id
WHERE f.svg_image IS NOT NULL AND f.svg_image <> ''
GROUP BY 1,2,3 ORDER BY hallways DESC NULLS LAST, svg_plates DESC LIMIT 15;
