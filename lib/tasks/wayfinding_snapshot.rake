# frozen_string_literal: true

# Regression harness for the legacy routing engine (`ShortestPath`).
#
# The owner's rule for the wayfinding work is that `start_tour` and the legacy
# "Run Algo" output stay byte-identical. These two tasks make that checkable:
#
#   rake wayfinding:snapshot[1411,2934]    # writes tmp/wayfinding_snapshots/<id>.json
#   rake wayfinding:compare[1411,2934]     # recomputes and diffs against the files
#
# With no ids the default set below is used. Every web variant is run for both
# `path_type`s, and every mobile variant with the main tour's visible plotted
# stops in sort order behind the tour's own start (the same inputs the
# `start_tour` jbuilder hands the engine once it has ordered them). An
# exception inside the engine is recorded as the result, so a run that raises
# before and after a change still compares equal.
#
# Nothing is written to the database; the tasks only read.
namespace :wayfinding do
  DEFAULT_SNAPSHOT_IDS = %w[1411 2934 1468 1839 2919 1105 1234 1786 2935].freeze

  def wayfinding_snapshot_dir
    dir = Rails.root.join('tmp', 'wayfinding_snapshots')
    FileUtils.mkdir_p(dir)
    dir
  end

  def wayfinding_snapshot_ids(args)
    ids = args.extras.presence || args[:ids].to_s.split(/[\s,]+/).presence || DEFAULT_SNAPSHOT_IDS
    ids.map(&:to_i).reject(&:zero?)
  end

  # Deterministic stop list for the mobile variants: the tour, then the main
  # tour's visible plotted stops in sort order with the floor and building of
  # the record they point at (what the jbuilder sets on each stop).
  def wayfinding_mobile_stops(community)
    tour = community.community_tour
    return [] unless tour

    stops = tour.tour_stops.plotted_stops.visible.order(:sort, :id).to_a
    stops.each do |stop|
      record = stop.stop_type.to_s.classify.safe_constantize&.find_by(id: stop.stop_id)
      next unless record

      stop.floor = record.try(:floor)
      stop.building = record.try(:building)
    end
    [tour] + community.get_stops_with_floor_and_buildings(stops)
  end

  def wayfinding_capture
    yield
  rescue StandardError => e
    { 'error' => e.class.name, 'message' => e.message.to_s[0, 300] }
  end

  def wayfinding_snapshot_for(community)
    out = { 'community_id' => community.id, 'name' => community.name, 'web' => {}, 'mobile' => {} }
    %w[sorting actual\ shortest].each do |path_type|
      out['web'][path_type] = wayfinding_capture do
        if community.is_sitemap
          ShortestPath.return_path_for_sitemap(community.id, path_type)
        else
          buildings = community.fetch_building_list(community.community_tour&.building_order)
          if buildings.count < 2
            ShortestPath.return_path_for_floorplate(community.id, path_type)
          else
            ShortestPath.return_floorplate_path_for_multiple_buildings(buildings, community.id, path_type)
          end
        end
      end
    end
    out['mobile']['sorting'] = wayfinding_capture do
      stops = wayfinding_mobile_stops(community)
      if community.is_sitemap
        ShortestPath.return_path_for_mobile(stops, community.id, 'sorting')
      else
        multiple, buildings = ShortestPath.check_stops_have_multiple_buildings(stops, community, nil)
        if multiple
          stops = ShortestPath.fetch_tour_stops_which_are_required_from_mobile_side_for_multiple(stops, community.id, nil)
          ShortestPath.return_floorplate_mobile_path_for_multiple_buildings(stops, buildings, community.id, 'sorting', nil)
        else
          stops = ShortestPath.fetch_tour_stops_which_are_required_from_mobile_side(stops, community.id, nil)
          ShortestPath.return_floorplate_path_for_mobile(stops, community.id, 'sorting', nil)
        end
      end
    end
    out
  end

  # ActiveRecord objects inside the engine's answers (the mobile variants
  # hand back the stop list they were given) become stable tuples, not
  # object addresses.
  def wayfinding_normalise(value)
    JSON.parse(JSON.generate(wayfinding_plain(value)))
  end

  def wayfinding_plain(value)
    case value
    when Hash then value.transform_values { |v| wayfinding_plain(v) }
    when Array then value.map { |v| wayfinding_plain(v) }
    when ActiveRecord::Base
      [value.class.name, value.id, value.try(:stop_type), value.try(:stop_id), value.try(:floor), value.try(:building)].compact
    else value
    end
  end

  desc 'Snapshot the legacy ShortestPath outputs for the given community ids'
  task :snapshot, [:ids] => :environment do |_t, args|
    dir = wayfinding_snapshot_dir
    wayfinding_snapshot_ids(args).each do |id|
      community = Community.find_by(id: id)
      next puts("#{id}: no such community") unless community

      started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      snapshot = wayfinding_normalise(wayfinding_snapshot_for(community))
      File.write(dir.join("#{id}.json"), JSON.pretty_generate(snapshot))
      elapsed = (Process.clock_gettime(Process::CLOCK_MONOTONIC) - started).round(2)
      puts "#{id} #{community.name}: snapshot written (#{elapsed}s)"
    end
  end

  desc 'Recompute the legacy ShortestPath outputs and compare with the snapshots'
  task :compare, [:ids] => :environment do |_t, args|
    dir = wayfinding_snapshot_dir
    failures = []
    wayfinding_snapshot_ids(args).each do |id|
      file = dir.join("#{id}.json")
      next puts("#{id}: no snapshot (run wayfinding:snapshot first)") unless File.exist?(file)

      community = Community.find_by(id: id)
      next puts("#{id}: no such community") unless community

      before = JSON.parse(File.read(file))
      after = wayfinding_normalise(wayfinding_snapshot_for(community))
      if before == after
        puts "#{id} #{community.name}: identical"
      else
        failures << id
        %w[web mobile].each do |side|
          (before[side].keys | after[side].keys).each do |key|
            next if before[side][key] == after[side][key]

            puts "#{id} #{community.name}: #{side}/#{key} DIFFERS"
            diff_file = dir.join("#{id}.#{side}.#{key.tr(' ', '_')}.after.json")
            File.write(diff_file, JSON.pretty_generate(after[side][key]))
            puts "  new output written to #{diff_file}"
          end
        end
      end
    end
    abort("wayfinding:compare: #{failures.size} snapshot(s) differ: #{failures.join(', ')}") if failures.any?
  end
end
