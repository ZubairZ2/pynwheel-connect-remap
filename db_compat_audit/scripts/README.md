Run order (replace DB):
  psql -U zubairzulifqar -d $DB -f 01_preflight.sql      # pre-migration clone
  psql -U zubairzulifqar -d $DB -f 02_counts.sql > counts_before.txt
  psql -U zubairzulifqar -d $DB -f 03_integrity.sql > integrity_before.txt
  pg_dump -U zubairzulifqar --schema-only $DB > schema_before.sql
  DATABASE_URL=postgres://zubairzulifqar@localhost/$DB bundle exec rails db:migrate
  psql ... -f 04_post_schema.sql ; 02 and 03 again -> diff ; pg_dump schema_after.sql -> diff
  psql ... -f 05_legacy_write_sim.sql   (rolls back)
