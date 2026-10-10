#!/bin/bash
# Retry test on the isolated clone: break Cypress Terra floor 3's stored SVG name, drive the UI, restore the row when the script asks, let it retry.
S=/private/tmp/claude-501/-Users-zubairzulifqar-pynwheel-staging/6bff5f74-e6f4-4255-a23e-921645ed3527/scratchpad
rm -f $S/retry-wait.flag $S/retry-go.flag
psql -X -q -U zubairzulifqar -d pynwheel_audit_clone -c "UPDATE floorplates SET svg_image = 'bogus-1790021794-Floor_3_noBG.svg' WHERE id = 4604 AND community_id = 8005;"
echo "row broken: $(psql -X -A -t -U zubairzulifqar -d pynwheel_audit_clone -c "SELECT svg_image FROM floorplates WHERE id = 4604")"
(
  for i in $(seq 1 240); do [ -f $S/retry-wait.flag ] && break; sleep 1; done
  psql -X -q -U zubairzulifqar -d pynwheel_audit_clone -c "UPDATE floorplates SET svg_image = '1790021794-Floor_3_noBG.svg' WHERE id = 4604 AND community_id = 8005;"
  echo "row restored: $(psql -X -A -t -U zubairzulifqar -d pynwheel_audit_clone -c "SELECT svg_image FROM floorplates WHERE id = 4604")"
  touch $S/retry-go.flag
) &
cd $S && node verify.mjs retry 2>&1 | tee $S/verify-retry.log | tail -25
wait
psql -X -q -U zubairzulifqar -d pynwheel_audit_clone -c "UPDATE floorplates SET svg_image = '1790021794-Floor_3_noBG.svg' WHERE id = 4604 AND community_id = 8005;"
echo "final row: $(psql -X -A -t -U zubairzulifqar -d pynwheel_audit_clone -c "SELECT svg_image FROM floorplates WHERE id = 4604")"
