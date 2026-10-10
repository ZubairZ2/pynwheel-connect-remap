SET default_transaction_read_only = on;
SET statement_timeout = '60s';
\echo === 8005 pointer_data samples (floors 1-3)
SELECT id, marketing_name, floor, building, floorplan_id, pointer_data::text FROM units WHERE community_id=8005 AND pointer_data->>'x_plot' IS NOT NULL ORDER BY floor, id LIMIT 4;
\echo === 8005 unit columns that differ from the clone (export for the isolated copy)
\pset format unaligned
\pset tuples_only on
\o /private/tmp/claude-501/-Users-zubairzulifqar-pynwheel-staging/6bff5f74-e6f4-4255-a23e-921645ed3527/scratchpad/prod/units_8005.json
SELECT json_agg(json_build_object('id', id, 'floor', floor, 'building', building, 'floorplate_id', floorplate_id, 'x_plot', x_plot, 'y_plot', y_plot, 'pointer_data', pointer_data, 'floorplan_id', floorplan_id, 'marketing_name', marketing_name, 'provider_unit_id', provider_unit_id, 'visible', visible, 'available', available, 'sold', sold, 'availability', availability, 'available_date', available_date, 'unit_status', unit_status, 'show_on_map', show_on_map, 'updated_at', updated_at) ORDER BY id) FROM units WHERE community_id=8005;
\o
\pset tuples_only off
\pset format aligned
\echo === exported
SELECT count(*) AS units_8005 FROM units WHERE community_id=8005;
\echo === 8005 tour / community columns worth mirroring
SELECT id, enable_svg_mode, is_beans_svg, background_svg_image, self_tour, auto_wayfinding, show_map, enable_three_d_maps, data_provider, display_building FROM communities WHERE id=8005;
