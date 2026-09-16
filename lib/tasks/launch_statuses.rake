# Backfill for records created before LaunchStatusable existed.
#
# Records written from Connect or by a PMS importer never got a Status row, so
# Pynwheel Launch rendered their forms as untouched. New records now get one on
# create, and reads fall back to the derived status either way -- this writes
# that history down so stored data agrees with the screens.
#
# Picks up every model that includes LaunchStatusable, so a new form's models
# are covered without touching this file.
#
#   rake pynwheel_launch:backfill_statuses
#   rake pynwheel_launch:backfill_statuses[dry_run]
namespace :pynwheel_launch do
  desc "Create missing Launch statuses for every record backing an onboarding form"
  task :backfill_statuses, [:mode] => :environment do |_task, args|
    dry_run = args[:mode].to_s == "dry_run"

    Rails.application.eager_load!

    models = ActiveRecord::Base.descendants
                               .select { |klass| klass.include?(LaunchStatusable) }
                               .reject(&:abstract_class?)
                               .select(&:table_exists?)
                               .sort_by(&:name)

    abort "No models include LaunchStatusable." if models.empty?

    grand_total = 0
    grand_failed = 0

    models.each do |model|
      total = model.where.missing(:status).count
      grand_total += total

      puts "#{model.name}: #{total} record(s) without a Launch status#{dry_run ? ' (dry run)' : ''}"
      next if total.zero?
      next if dry_run

      created = 0
      failed  = 0

      model.where.missing(:status).find_each(batch_size: 500) do |record|
        if record.create_status(status: record.derive_launch_status)
          created += 1
        else
          failed += 1
          puts "  FAILED #{model.name}##{record.id}: #{record.status&.errors&.full_messages&.join(', ')}"
        end
      rescue StandardError => ex
        failed += 1
        puts "  FAILED #{model.name}##{record.id}: #{ex.message}"
      end

      grand_failed += failed
      puts "  created #{created}, failed #{failed}"
    end

    puts "\n#{grand_total} record(s) across #{models.size} models#{dry_run ? ' would be backfilled' : "; #{grand_failed} failed"}."
  end

  # Property maps whose only artwork is an SVG used to derive "in progress", so
  # Launch never offered to approve them. Moves those still in progress on to
  # submitted; any status a reviewer has set is left alone.
  #
  #   rake pynwheel_launch:advance_svg_map_statuses
  #   rake pynwheel_launch:advance_svg_map_statuses[dry_run]
  desc "Mark SVG-only property maps still in progress as submitted"
  task :advance_svg_map_statuses, [:mode] => :environment do |_task, args|
    dry_run = args[:mode].to_s == "dry_run"

    [Sitemap, Floorplate].each do |model|
      scope = model.joins(:status)
                   .where(statuses: { status: Status.statuses[IN_PROGRESS] })
                   .where.not(svg_image: [nil, ""])
      advanced = 0

      scope.find_each(batch_size: 500) do |record|
        next unless record.derive_launch_status.eql?(SUBMITTED)

        advanced += 1
        record.advance_launch_status unless dry_run
      end

      puts "#{model.name}: #{advanced} record(s) #{dry_run ? "would be moved" : "moved"} to submitted"
    end
  end
end
