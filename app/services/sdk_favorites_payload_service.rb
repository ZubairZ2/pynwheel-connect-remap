# The favorites list the SDK renders: full unit, amenity, floor plan and
# gallery image objects for a set of favorited ids.
#
# Takes anything that answers `ids_for(type)` — a session's live Favorite or a
# frozen SharedFavorite — so `get_favorites` and `get_shared_favorites` return
# the same shape and can't drift apart.
class SdkFavoritesPayloadService
  def initialize(community, show_ops_map: false)
    @community    = community
    @show_ops_map = show_ops_map
  end

  # `record` may be nil (no favorites yet), which yields empty lists.
  def call(record)
    unit_ids          = ids(record, "unit")
    amenity_ids       = ids(record, "amenity")
    floorplan_ids     = ids(record, "floorplan")
    gallery_image_ids = ids(record, "gallery_image")

    {
      units:             units_json(unit_ids),
      unit_ids:          unit_ids.to_a,
      amenities:         builder.amenities_json(amenity_ids).select { |a| a[:isFavorite] },
      amenity_ids:       amenity_ids.to_a,
      floorplans:        builder.floorplans_json(nil, floorplan_ids).select { |f| f[:isFavorite] },
      floorplan_ids:     floorplan_ids.to_a,
      gallery_images:    gallery_images_json(gallery_image_ids),
      gallery_image_ids: gallery_image_ids.to_a
    }
  end

  private

  def builder
    @builder ||= SdkPayloadBuilderService.new(@community)
  end

  # Favorited ids of the given type as a Set of strings.
  def ids(record, type)
    (record&.ids_for(type) || []).to_set
  end

  def units_json(unit_ids)
    units_ar = @community.units.visible_units.without_hidden_names.where(id: unit_ids.to_a).includes(:floorplan).to_a
    units_ar.each { |u| u.association(:community).target = @community }
    # door_labelled: a favorited bedroom is shown by the same card the units
    # list uses, and that list labels every door with its apartment number.
    builder.door_labelled(builder.units_json(unit_ids, @show_ops_map, units_ar))
  end

  # Only walk the galleries when something in them is actually favorited,
  # so favorites views on gallery-less properties cost nothing.
  def gallery_images_json(gallery_image_ids)
    return [] if gallery_image_ids.empty?
    SdkGalleryBuilderService.new(@community).favorites_json(gallery_image_ids)
  end
end
