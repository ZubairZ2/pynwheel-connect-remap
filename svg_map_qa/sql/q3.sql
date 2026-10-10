SET default_transaction_read_only = on;
SET statement_timeout = '30s';
\echo === 8005 sample units (pointer_data placement, no floorplate_id)
SELECT id, marketing_name, provider_unit_id, floor, building, floorplate_id, x_plot, y_plot, left(pointer_data::text, 160) AS pointer_data FROM units WHERE community_id=8005 ORDER BY floor, id LIMIT 6;
\echo === 8005 floorplans
SELECT id, name, image, standard_image_url, provider_floorplan_id FROM floorplans WHERE community_id=8005 ORDER BY id LIMIT 12;
\echo === 8005 amenities / elevators / tour / stops / doors / starting points / hallways
SELECT (SELECT count(*) FROM amenities WHERE community_id=8005) AS amenities, (SELECT count(*) FROM elevators WHERE community_id=8005) AS elevators, (SELECT count(*) FROM tours WHERE community_id=8005) AS tours, (SELECT count(*) FROM tour_stops ts JOIN tours t ON t.id=ts.tour_id WHERE t.community_id=8005) AS tour_stops, (SELECT count(*) FROM doors d WHERE d.attached_with_type='Floorplate' AND d.attached_with_id IN (4604,4605,4606)) AS plate_doors, (SELECT count(*) FROM building_starting_points WHERE community_id=8005) AS starting_points, (SELECT count(*) FROM hallways WHERE parent_type='Floorplate' AND parent_id IN (4604,4605,4606)) AS hallways;
\echo === 8005 community map settings
SELECT id, name, is_beans_svg, enable_svg_mode, background_svg_image, display_building, enable_three_d_maps, enable_sdk_map, show_map, created_at::date, updated_at::date FROM communities WHERE id=8005;
\echo === hallway provenance across the database (did Connect ever write here?)
SELECT source, review_status, space, (community_id IS NOT NULL) AS has_community, (created_by_user_id IS NOT NULL) AS has_user, count(*) FROM hallways GROUP BY 1,2,3,4,5 ORDER BY 6 DESC;
\echo === 1412 / 1411 units: pointer vs raster placement per floorplate
SELECT community_id, floorplate_id, floor, count(*) AS units, count(*) FILTER (WHERE x_plot>0 OR y_plot>0) AS raster, count(*) FILTER (WHERE pointer_data->>'x_plot' IS NOT NULL) AS svg FROM units WHERE community_id IN (1411,1412) GROUP BY 1,2,3 ORDER BY 1,2,3;
\echo === bucket hosts named by standard_image_url across the database (floorplates)
SELECT substring(standard_image_url from '^https?://[^/]+') AS host, count(*) FROM floorplates WHERE standard_image_url IS NOT NULL AND standard_image_url <> '' GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
\echo === beans / background properties
SELECT id, name, company_id, is_beans_svg, enable_svg_mode, is_sitemap, background_svg_image, (SELECT count(*) FROM floorplates f WHERE f.community_id=c.id) AS plates, (SELECT count(*) FROM floorplates f WHERE f.community_id=c.id AND f.svg_image IS NOT NULL AND f.svg_image <> '') AS svg_plates, (SELECT count(*) FROM floorplates f WHERE f.community_id=c.id AND (f.image IS NULL OR f.image = '') AND f.svg_image IS NOT NULL AND f.svg_image <> '') AS svg_only_plates, (SELECT count(*) FROM sitemaps s WHERE s.community_id=c.id AND s.svg_image IS NOT NULL AND s.svg_image <> '') AS svg_sitemaps FROM communities c WHERE is_beans_svg OR (background_svg_image IS NOT NULL AND background_svg_image <> '') ORDER BY id;
\echo === floorplate asset kinds across the database
SELECT CASE WHEN svg_image IS NOT NULL AND svg_image <> '' AND (image IS NULL OR image = '') THEN 'svg-only' WHEN svg_image IS NOT NULL AND svg_image <> '' THEN 'both' WHEN image IS NOT NULL AND image <> '' THEN 'image-only' ELSE 'none' END AS kind, count(*) FROM floorplates GROUP BY 1;
\echo === svg-only floorplates whose property has no standard_image_url anywhere (bucket hint empty)
SELECT f.community_id, c.name, c.is_beans_svg, count(*) AS svg_only_plates
FROM floorplates f JOIN communities c ON c.id=f.community_id
WHERE f.svg_image IS NOT NULL AND f.svg_image <> '' AND (f.image IS NULL OR f.image='')
  AND NOT EXISTS (SELECT 1 FROM floorplates x WHERE x.community_id=f.community_id AND x.standard_image_url IS NOT NULL AND x.standard_image_url <> '')
  AND NOT EXISTS (SELECT 1 FROM amenities x WHERE x.community_id=f.community_id AND x.standard_image_url IS NOT NULL AND x.standard_image_url <> '')
  AND NOT EXISTS (SELECT 1 FROM units x WHERE x.community_id=f.community_id AND x.standard_image_url IS NOT NULL AND x.standard_image_url <> '')
  AND NOT EXISTS (SELECT 1 FROM floorplans x WHERE x.community_id=f.community_id AND x.standard_image_url IS NOT NULL AND x.standard_image_url <> '')
GROUP BY 1,2,3 ORDER BY 1;
\echo === SVG-enabled properties with stored hallways (comparison candidates)
SELECT f.community_id, c.name, c.is_beans_svg, count(*) AS plates, count(*) FILTER (WHERE f.svg_image IS NOT NULL AND f.svg_image <> '') AS svg_plates, count(*) FILTER (WHERE f.image IS NULL OR f.image='') AS svg_only, sum((SELECT count(*) FROM hallways h WHERE h.parent_type='Floorplate' AND h.parent_id=f.id)) AS hallways
FROM floorplates f JOIN communities c ON c.id=f.community_id
WHERE f.svg_image IS NOT NULL AND f.svg_image <> ''
GROUP BY 1,2,3 ORDER BY hallways DESC NULLS LAST, svg_plates DESC LIMIT 15;
