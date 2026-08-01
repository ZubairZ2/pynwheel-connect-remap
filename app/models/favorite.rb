# == Schema Information
#
# Table name: favorites
#
#  id                :integer          not null, primary key
#  community_id      :integer
#  session_id        :string
#  unit_ids          :jsonb
#  amenity_ids       :jsonb
#  floorplan_ids     :jsonb
#  gallery_image_ids :jsonb
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#

class Favorite < ApplicationRecord
  # Maps a favorite "type" (as sent by the SDK) to the jsonb column that
  # stores its favorited ids. "unit" is the historical default.
  TYPE_COLUMNS = {
    "unit"          => :unit_ids,
    "amenity"       => :amenity_ids,
    "floorplan"     => :floorplan_ids,
    "gallery_image" => :gallery_image_ids
  }.freeze

  def self.column_for_type(type)
    TYPE_COLUMNS[type.to_s.presence || "unit"]
  end

  def self.valid_type?(type)
    TYPE_COLUMNS.key?(type.to_s.presence || "unit")
  end

  # Favorited ids for the given type, as an array of strings.
  def ids_for(type)
    (self[self.class.column_for_type(type)] || []).map(&:to_s)
  end

  def set_ids(type, ids)
    self[self.class.column_for_type(type)] = ids
  end
end
