# frozen_string_literal: true

# Data repair for the hallway graph and the tour stops, from the findings of
# backend_architecture_plan_report.md §8 / §26. Every task is a dry run unless
# APPLY=1 is set; a dry run prints what would change and writes the affected
# rows to tmp/wayfinding_repair/<task>-<timestamp>.csv first, so a repair can
# be undone from the export. Idempotent: a second run finds nothing.
#
#   rake wayfinding:repair:report          # every check, counts only
#   rake wayfinding:repair:orphans         # hallways whose parent level is gone
#   rake wayfinding:repair:self_loops      # id inside its own next_points
#   rake wayfinding:repair:dangling        # next_points ids with no row
#   rake wayfinding:repair:duplicates      # repeated ids inside one next_points
#   rake wayfinding:repair:selected        # levels with 0 or >1 selected nodes
#   rake wayfinding:repair:negative_coords # clamp negative coordinates to 0
#   rake wayfinding:repair:orphan_tour_stops
#   rake wayfinding:repair:community_ids   # backfill hallways.community_id
#   rake wayfinding:repair:all             # all of the above, in that order
require 'csv'

namespace :wayfinding do
  namespace :repair do
    def repair_apply?
      ENV['APPLY'].to_s == '1'
    end

    def repair_export(name, rows)
      return if rows.empty?

      dir = Rails.root.join('tmp', 'wayfinding_repair')
      FileUtils.mkdir_p(dir)
      file = dir.join("#{name}-#{Time.current.strftime('%Y%m%d-%H%M%S')}.csv")
      CSV.open(file, 'w') do |csv|
        csv << rows.first.keys
        rows.each { |row| csv << row.values }
      end
      puts "  exported #{rows.size} row(s) to #{file}"
    end

    def repair_note(name, count)
      puts "#{name}: #{count} #{repair_apply? ? 'fixed' : 'found (dry run; set APPLY=1 to fix)'}"
    end

    def orphan_hallways
      Hallway.where(<<~SQL)
        NOT EXISTS (SELECT 1 FROM floorplates f WHERE hallways.parent_type = 'Floorplate' AND f.id = hallways.parent_id)
        AND NOT EXISTS (SELECT 1 FROM sitemaps s WHERE hallways.parent_type = 'Sitemap' AND s.id = hallways.parent_id)
      SQL
    end

    desc 'Counts of every finding, no changes'
    task report: :environment do
      puts "orphan hallways: #{orphan_hallways.count}"
      puts "self-loops: #{Hallway.where('id = ANY(next_points)').count}"
      dangling = Hallway.connection.select_value(<<~SQL).to_i
        SELECT count(*) FROM (SELECT h.id, unnest(h.next_points) AS n FROM hallways h) x
         WHERE NOT EXISTS (SELECT 1 FROM hallways o WHERE o.id = x.n)
      SQL
      puts "dangling next_points ids: #{dangling}"
      dup = Hallway.connection.select_value('SELECT count(*) FROM hallways WHERE array_length(next_points, 1) > (SELECT count(DISTINCT n) FROM unnest(next_points) n)').to_i
      puts "arrays with duplicate ids: #{dup}"
      multi = Hallway.where(selected: true).group(:parent_type, :parent_id).having('count(*) > 1').count.size
      none = Hallway.connection.select_value("SELECT count(*) FROM (SELECT parent_type, parent_id FROM hallways GROUP BY 1,2 HAVING bool_or(coalesce(selected,false)) = false) x").to_i
      puts "levels with >1 selected: #{multi}; with none: #{none}"
      puts "negative coordinates: #{Hallway.where('x_plot < 0 OR y_plot < 0').count}"
      puts "orphan tour stops: #{orphan_tour_stops.count}"
      puts "hallways without community_id: #{Hallway.where(community_id: nil).count}"
    end

    desc 'Delete hallways whose floorplate / sitemap no longer exists'
    task orphans: :environment do
      rows = orphan_hallways.order(:id).to_a
      repair_export('orphans', rows.map(&:attributes))
      Hallway.where(id: rows.map(&:id)).delete_all if repair_apply?
      repair_note('orphan hallways', rows.size)
    end

    desc 'Remove a node from its own next_points'
    task self_loops: :environment do
      rows = Hallway.where('id = ANY(next_points)').order(:id).to_a
      repair_export('self_loops', rows.map { |h| { id: h.id, next_points: h.next_points.inspect } })
      Hallway.where(id: rows.map(&:id)).update_all('next_points = array_remove(next_points, id)') if repair_apply?
      repair_note('self-loops', rows.size)
    end

    desc 'Drop next_points ids that name no row'
    task dangling: :environment do
      rows = Hallway.where(<<~SQL).order(:id).to_a
        EXISTS (SELECT 1 FROM unnest(next_points) n WHERE NOT EXISTS (SELECT 1 FROM hallways o WHERE o.id = n))
      SQL
      repair_export('dangling', rows.map { |h| { id: h.id, next_points: h.next_points.inspect } })
      if repair_apply?
        rows.each do |h|
          kept = Hallway.where(id: h.next_points).pluck(:id)
          h.update_columns(next_points: h.next_points & kept)
        end
      end
      repair_note('dangling edges', rows.size)
    end

    desc 'Deduplicate ids inside one next_points array'
    task duplicates: :environment do
      rows = Hallway.where('array_length(next_points, 1) > (SELECT count(DISTINCT n) FROM unnest(next_points) n)').order(:id).to_a
      repair_export('duplicates', rows.map { |h| { id: h.id, next_points: h.next_points.inspect } })
      rows.each { |h| h.update_columns(next_points: h.next_points.uniq) } if repair_apply?
      repair_note('duplicate ids', rows.size)
    end

    desc 'Leave exactly one selected node per level'
    task selected: :environment do
      fixed = 0
      Hallway.group(:parent_type, :parent_id).count.each_key do |type, id|
        scope = Hallway.where(parent_type: type, parent_id: id)
        selected = scope.where(selected: true).order(:id).pluck(:id)
        next if selected.size == 1

        fixed += 1
        next unless repair_apply?

        keep = selected.max || scope.maximum(:id)
        scope.where(id: selected - [keep]).update_all(selected: false) if selected.size > 1
        scope.where(id: keep).update_all(selected: true)
      end
      repair_note('levels with a wrong selected count', fixed)
    end

    desc 'Clamp negative coordinates to 0'
    task negative_coords: :environment do
      rows = Hallway.where('x_plot < 0 OR y_plot < 0').order(:id).to_a
      repair_export('negative_coords', rows.map { |h| { id: h.id, x_plot: h.x_plot, y_plot: h.y_plot } })
      rows.each { |h| h.update_columns(x_plot: [h.x_plot.to_f, 0].max, y_plot: [h.y_plot.to_f, 0].max) } if repair_apply?
      repair_note('negative coordinates', rows.size)
    end

    def orphan_tour_stops
      TourStop.where(<<~SQL)
        NOT EXISTS (SELECT 1 FROM units u WHERE tour_stops.stop_type = 'unit' AND u.id = tour_stops.stop_id)
        AND NOT EXISTS (SELECT 1 FROM amenities a WHERE tour_stops.stop_type = 'amenity' AND a.id = tour_stops.stop_id)
        AND NOT EXISTS (SELECT 1 FROM elevators e WHERE tour_stops.stop_type = 'elevator' AND e.id = tour_stops.stop_id)
        AND NOT EXISTS (SELECT 1 FROM building_starting_points b WHERE tour_stops.stop_type = 'building_starting_point' AND b.id = tour_stops.stop_id)
        AND tour_stops.stop_type IN ('unit', 'amenity', 'elevator', 'building_starting_point')
      SQL
    end

    desc 'Delete tour stops whose record no longer exists'
    task orphan_tour_stops: :environment do
      rows = orphan_tour_stops.order(:id).to_a
      repair_export('orphan_tour_stops', rows.map(&:attributes))
      if repair_apply?
        rows.each do |stop|
          VisitedStop.where(tour_stop_id: stop.id).destroy_all
          stop.destroy
        end
      end
      repair_note('orphan tour stops', rows.size)
    end

    desc 'Backfill hallways.community_id from the parent level'
    task community_ids: :environment do
      count = Hallway.where(community_id: nil).count
      if repair_apply?
        Hallway.connection.execute("UPDATE hallways h SET community_id = f.community_id FROM floorplates f WHERE h.parent_type = 'Floorplate' AND h.parent_id = f.id AND h.community_id IS NULL")
        Hallway.connection.execute("UPDATE hallways h SET community_id = s.community_id FROM sitemaps s WHERE h.parent_type = 'Sitemap' AND h.parent_id = s.id AND h.community_id IS NULL")
      end
      repair_note('hallways without community_id', count)
    end

    desc 'Run every repair in order'
    task all: %i[orphans self_loops dangling duplicates selected negative_coords orphan_tour_stops community_ids]
  end
end
