"""Turns the read-only export of Cypress Terra's units (units_8005.json) into
UPDATE statements for the isolated clone, so the clone's units carry the same
floor / building / SVG pointer placements production has now.

Usage: python3 -I sync_8005_units.py units_8005.json > sync_8005_units.sql
Writes only to rows of community 8005 whose id matches; never inserts.
"""
import json
import sys


def lit(value):
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (dict, list)):
        return "'" + json.dumps(value).replace("'", "''") + "'::jsonb"
    return "'" + str(value).replace("'", "''") + "'"


rows = json.load(open(sys.argv[1]))
print('BEGIN;')
print('-- Cypress Terra (8005) unit placements as of the production read on October 10, 2026')
for row in rows:
    sets = ', '.join(
        f'{col} = {lit(row.get(col))}'
        for col in ('floor', 'building', 'floorplate_id', 'x_plot', 'y_plot', 'pointer_data', 'floorplan_id', 'marketing_name',
                    'provider_unit_id', 'visible', 'available', 'sold', 'availability', 'available_date', 'unit_status', 'show_on_map')
    )
    print(f'UPDATE units SET {sets} WHERE id = {row["id"]} AND community_id = 8005;')
print('COMMIT;')
print(f'-- {len(rows)} rows', file=sys.stderr)
