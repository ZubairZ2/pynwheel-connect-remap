namespace :maps do
  # Fills in the width/height columns that StoredImageDimensions would otherwise
  # work out lazily, one unlucky request at a time.
  #
  # Reading them costs an S3 download and an ImageMagick decode per record, so
  # the first payload built for a property that has never recorded them pays for
  # every floorplate at once -- on a 28-floor building that was the difference
  # between a fast map and an eight-second one. Doing it here means no visitor
  # ever does.
  #
  # Safe to re-run: records that already have both numbers are skipped, and a
  # record whose artwork is missing or unreadable is logged and left alone.
  #
  #   rake maps:backfill_image_dimensions
  #   rake maps:backfill_image_dimensions COMMUNITY_ID=7941
  desc "Record pixel dimensions for floorplate and sitemap artwork"
  task backfill_image_dimensions: :environment do
    community_id = ENV["COMMUNITY_ID"].presence

    [Floorplate, Sitemap].each do |klass|
      scope = klass.where("width IS NULL OR width <= 0 OR height IS NULL OR height <= 0")
                   .where.not(image: [nil, ""])
      scope = scope.where(community_id: community_id) if community_id

      total = scope.count
      puts "#{klass.name}: #{total} record(s) to measure#{" for community #{community_id}" if community_id}"
      done = failed = 0

      scope.find_each do |record|
        width, height = record.stored_image_dimensions
        done += 1
        puts "  #{klass.name} #{record.id} -> #{width}x#{height}"
      rescue => e
        failed += 1
        warn "  #{klass.name} #{record.id} FAILED: #{e.class}: #{e.message}"
      end

      puts "#{klass.name}: #{done} measured, #{failed} failed"
    end
  end
end
