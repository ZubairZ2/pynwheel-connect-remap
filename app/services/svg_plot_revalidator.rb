# Replacing a map's SVG artwork does not, by itself, invalidate what was plotted
# on it. A plotted unit or amenity stores a pointer_data blob of
# { tag, id, selector, x_plot, y_plot }, and the map SDK resolves it the same way
# every time -- tag + id when both are present, otherwise the raw selector (see
# _pointerSelector in public/sdk/pyn-map-sdk-v1.js). The plot survives the swap
# whenever the shape it points at is still in the new file.
#
# The previous behaviour compared an MD5 of the old and new files and, on any
# difference, wiped pointer_data for every unit and amenity in the community.
# Renaming a road was enough to trigger it, so an edit that left every building
# untouched still cost a full re-plot.
#
# This walks the new artwork instead and clears only the records whose shape is
# gone. A label or road-name edit keeps the map fully plotted; a genuine redraw
# clears exactly the shapes that disappeared, which are the ones that need
# re-plotting anyway.
class SvgPlotRevalidator
  Result = Struct.new(:units, :amenities) do
    def total
      units + amenities
    end

    def any?
      total.positive?
    end
  end

  def self.call(community, svg_doc, floorplate: nil)
    new(community, svg_doc, floorplate: floorplate).call
  end

  def initialize(community, svg_doc, floorplate: nil)
    @community  = community
    @floorplate = floorplate
    # Namespaces are stripped so that both the id lookup below and any raw CSS
    # selector behave the way querySelector does in the browser. The document is
    # copied first because the caller still reads width/height off the original.
    @svg_doc = svg_doc&.dup&.tap(&:remove_namespaces!)
  end

  def call
    return Result.new(0, 0) if @svg_doc.nil? || @community.nil?

    Result.new(clear_missing(units_scope), clear_missing(amenities_scope))
  end

  # Mirrors the SDK's own resolution so that what survives here is exactly what
  # the map will be able to draw. Public because it is the whole rule, and it is
  # worth exercising against an SVG without touching the database.
  def resolvable?(pointer_data)
    data = pointer_data.presence || {}
    tag  = data["tag"].presence
    id   = data["id"].presence

    if tag && id
      shapes_by_id[id.to_s] == tag.to_s.downcase
    elsif (selector = data["selector"].presence)
      @svg_doc.at_css(selector).present?
    else
      # Nothing to resolve means the SDK cannot draw it either, so it is stale.
      false
    end
  rescue StandardError => e
    # A selector Nokogiri cannot parse is not evidence that the shape is gone.
    # Keep the plot and let a human decide.
    warn_unreadable(pointer_data, e)
    true
  end

  private

  def warn_unreadable(pointer_data, error)
    return unless defined?(Rails) && Rails.respond_to?(:logger) && Rails.logger

    Rails.logger.warn "SvgPlotRevalidator: unreadable pointer_data #{pointer_data.inspect} -- #{error.message}"
  end

  # Every element in the new artwork that carries an id, mapped to its tag name.
  # One pass, so a map with thousands of shapes costs a single walk.
  def shapes_by_id
    @shapes_by_id ||= @svg_doc.xpath("//*[@id]").each_with_object({}) do |node, acc|
      acc[node["id"].to_s] = node.name.to_s.downcase
    end
  end

  # Only the two columns the rule reads are pulled back, so a property with
  # thousands of plotted shapes does not instantiate a model for each one.
  def clear_missing(scope)
    stale_ids = scope.svg_pointed
                     .pluck(:id, :pointer_data)
                     .reject { |_id, pointer_data| resolvable?(pointer_data) }
                     .map(&:first)
    return 0 if stale_ids.empty?

    scope.where(id: stale_ids).update_all(pointer_data: {})
    stale_ids.size
  end

  def units_scope
    return Unit.where(community_id: @community.id, floorplate_id: @floorplate.id) if @floorplate

    Unit.where(community_id: @community.id, floorplate_id: nil)
  end

  def amenities_scope
    return Amenity.where(community_id: @community.id, amenityable: @floorplate) if @floorplate

    # Sitemap amenities, plus legacy rows that were never given an amenityable.
    Amenity.where(community_id: @community.id, amenityable_type: [nil, "Sitemap"])
  end
end
