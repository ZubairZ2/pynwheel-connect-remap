# frozen_string_literal: true

# Shared upload folders (October 29, 2026): a record whose table has
# `file_source_id` reads its uploaded files from that record's folder on S3
# (`uploads/<model>/<mount>/<file_source_id>/`) instead of its own. The
# property clone sets it so a cloned property shows the original's images and
# maps without copying objects. NULL (the default) changes nothing.
class AddFileSourceIdForSharedUploads < ActiveRecord::Migration[7.2]
  TABLES = %i[
    community_groups group_designs group_homepage_images group_homepage_videos communities
    favorite_images designs gables expressionists home_screens main_screens home_page_images
    homepage_icons home_page_videos locations design_directions hardware_specs gallery_images
    additional_images additional_files tutorials floorplans floorplates sitemaps units amenities
    amenity_galleries elevators elevator_galleries stop_galleries
  ].freeze

  def change
    TABLES.each do |table|
      add_column table, :file_source_id, :integer, null: true, comment: 'record whose upload folder this record reads (shared files of a property clone)'
    end
  end
end
