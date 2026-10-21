# The favorite "type" → jsonb id column mapping shared by a session's live
# favorites (Favorite) and a frozen share of them (SharedFavorite). A new
# favorite type is added here once and both tables read it.
module FavoriteIdColumns
  extend ActiveSupport::Concern

  # Maps a favorite "type" (as sent by the SDK) to the jsonb column that
  # stores its favorited ids. "unit" is the historical default.
  TYPE_COLUMNS = {
    "unit"          => :unit_ids,
    "amenity"       => :amenity_ids,
    "floorplan"     => :floorplan_ids,
    "gallery_image" => :gallery_image_ids
  }.freeze

  class_methods do
    def column_for_type(type)
      TYPE_COLUMNS[type.to_s.presence || "unit"]
    end

    def valid_type?(type)
      TYPE_COLUMNS.key?(type.to_s.presence || "unit")
    end
  end

  # Favorited ids for the given type, as an array of strings.
  def ids_for(type)
    (self[self.class.column_for_type(type)] || []).map(&:to_s)
  end

  def set_ids(type, ids)
    self[self.class.column_for_type(type)] = ids
  end

  # { "unit" => [...], "amenity" => [...], ... } for every type.
  def ids_by_type
    TYPE_COLUMNS.keys.index_with { |type| ids_for(type) }
  end

  def any_ids?
    ids_by_type.values.any?(&:present?)
  end
end
