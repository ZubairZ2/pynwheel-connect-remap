# frozen_string_literal: true

module Wayfinding
  # Once a level has an `svg_to_image_transform`, its rows drawn in the floor
  # SVG's frame (`space: 'svg'`: nodes, edge polylines, tombstones, attachment
  # anchors, additional stops) are converted into floor-image pixels in one
  # transaction and become routable. Hallway nodes also take the legacy
  # icon-top-left offset (the SVG point is the centre). Nothing happens when
  # the level has no transform; nothing is guessed.
  module ReprojectPlate
    module_function

    def call(level, user: nil)
      return { converted: 0, reason: 'no_transform' } unless PlateTransform.present?(level)

      transform = level.svg_to_image_transform
      converted = 0
      VersionBump.suspend do
        ApplicationRecord.transaction do
          Hallway.on_level(level).where(space: 'svg').find_each do |h|
            x, y = PlateTransform.apply(transform, h.x_plot.to_f, h.y_plot.to_f)
            h.update!(x_plot: x - GraphBuilder::ICON_OFFSET, y_plot: y - GraphBuilder::ICON_OFFSET, space: 'raster')
            converted += 1
          end
          HallwayEdge.on_level(level).where(space: 'svg').find_each do |e|
            points = Array(e.path_points).map do |px, py|
              x, y = PlateTransform.apply(transform, px.to_f, py.to_f)
              [x - GraphBuilder::ICON_OFFSET, y - GraphBuilder::ICON_OFFSET]
            end
            e.update!(path_points: points, space: 'raster')
            converted += 1
          end
          HallwaySuppression.on_level(level).where(space: 'svg').find_each do |s|
            x1, y1 = PlateTransform.apply(transform, s.x1.to_f, s.y1.to_f)
            attrs = { x1: x1 - GraphBuilder::ICON_OFFSET, y1: y1 - GraphBuilder::ICON_OFFSET, space: 'raster' }
            if s.x2 && s.y2
              x2, y2 = PlateTransform.apply(transform, s.x2.to_f, s.y2.to_f)
              attrs.merge!(x2: x2 - GraphBuilder::ICON_OFFSET, y2: y2 - GraphBuilder::ICON_OFFSET)
            end
            s.update_columns(attrs)
            converted += 1
          end
          HallwayAttachment.on_level(level).where(space: 'svg').find_each do |a|
            attrs = { space: 'raster' }
            if a.anchor
              x, y = PlateTransform.apply(transform, *a.anchor)
              attrs.merge!(anchor_x: x, anchor_y: y)
            end
            a.update!(attrs)
            converted += 1
          end
          WayfindingStop.on_level(level).where(space: 'svg').find_each do |stop|
            attrs = { space: 'raster' }
            if stop.placed?
              x, y = PlateTransform.apply(transform, stop.x_plot.to_f, stop.y_plot.to_f)
              attrs.merge!(x_plot: x, y_plot: y)
            end
            stop.update!(attrs)
            converted += 1
          end
          level.class.where(id: level.id).update_all('wayfinding_version = wayfinding_version + 1') if converted.positive?
          PaperTrail::Version.create!(item_type: level.class.base_class.name, item_id: level.id, event: 'wayfinding_reproject', whodunnit: user&.id&.to_s,
                                      community_id: level.community_id, object: { converted: converted }.to_json) if converted.positive?
        end
      end
      { converted: converted }
    end
  end
end
