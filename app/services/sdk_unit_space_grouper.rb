# Rolls a student-housing property's flat unit list up into one group per plotted
# position.
#
# Student housing stores every leasable bedroom ("unit space") as its own Unit
# row, and all the bedrooms in one apartment share the very same plot — the same
# x_plot/y_plot on an image map, the same pointer_data shape on an SVG map,
# because they are the same door. A 250-apartment property therefore ships ~1000
# units, of which ~750 are drawn directly on top of each other.
#
# Grouping is keyed on that plot anchor rather than on the marketing name.
# Parsing "115-A" down to "115" would work on the properties we have seen and
# break on the next PMS that names its beds differently; the anchor is the thing
# that actually caused the collision. It is also the same key the old map groups
# on at click time (webpages.js setUnitModalButtons) and the key the new map's
# unitSiblings.js already uses, so this reproduces existing behaviour rather than
# inventing a second rule.
#
# Holds no state beyond the community's map mode, touches no database, and
# duck-types the units it is handed — anything answering to #id, #floor,
# #x_plot, #y_plot, #pointer_data and #marketing_name works.
class SdkUnitSpaceGrouper
  # base is always spaces.first; carried explicitly so callers read intent
  # rather than an index.
  Group = Struct.new(:base, :spaces, keyword_init: true) do
    # A position holding a single unit — a conventional unit, or an apartment
    # whose other beds are filtered out. Callers serialize these as plain units
    # with no nested spaces.
    def single?
      spaces.size <= 1
    end
  end

  # Wide enough for any unit number a PMS will produce. See #natural_key.
  DIGIT_PAD = 12

  def initialize(community)
    @svg_mode = community.enable_svg_mode?
  end

  # Returns one Group per plotted position, in the order the positions first
  # appear in `units`. The caller's ordering is therefore preserved — `map_units`
  # already applies the natural-name ordering the map and list depend on.
  def call(units)
    return [] if units.blank?

    groups    = []
    by_anchor = {}

    units.each do |unit|
      anchor = anchor_for(unit)

      # No anchor means nothing to group on: an unplotted unit, or a beans-only
      # property that carries no 2D plot data at all. Such units must each stand
      # alone — collapsing them would invent one phantom apartment holding every
      # unplotted unit on the property.
      if anchor.nil?
        groups << Group.new(base: unit, spaces: [unit])
        next
      end

      if (existing = by_anchor[anchor])
        existing.spaces << unit
      else
        group = Group.new(base: nil, spaces: [unit])
        by_anchor[anchor] = group
        groups << group
      end
    end

    groups.each do |group|
      group.spaces.sort_by! { |unit| space_order(unit) }
      group.base = group.spaces.first
    end

    groups
  end

  # What to label a door holding the given unit names, or nil to keep the base
  # unit's own name.
  #
  # Several bedrooms answer with the number they share; a single bedroom answers
  # with its own apartment number. Both go through here so a units list never
  # mixes the two conventions — "100-A, 103, 105" reads as broken data, and
  # whether an apartment happens to have one bedroom plotted or four is not
  # something a visitor should be able to see in the naming.
  def self.door_name(names)
    names = Array(names).map(&:to_s)
    return nil if names.empty?

    names.uniq.one? ? apartment_number(names.first) : shared_unit_number(names)
  end

  # The apartment a single bedroom belongs to: "100-A" -> "100", "12B" -> "12".
  #
  # Strips a trailing bedroom letter, optionally preceded by a separator, and
  # only when what remains ends in a digit — so a unit simply named "103" keeps
  # its name, and "2-101" is left alone because its suffix is a number, not a
  # bedroom. Returns nil when there is nothing to strip, meaning "keep the name
  # you have".
  #
  # This one is a convention, not a fact the data states: a property that ends
  # its unit numbers in a letter for some other reason would be shortened here.
  # It is the same convention shared_unit_number infers from a group, applied
  # where there is only one name to go on.
  def self.apartment_number(name)
    stripped = name.to_s[/\A(.*\d)[^A-Za-z0-9]?[A-Za-z]{1,2}\z/, 1]
    stripped.presence
  end

  # The apartment number the given unit names share, or nil when they do not
  # name one apartment — "105-A".."105-D" gives "105", and the caller labels the
  # door with that instead of borrowing one bedroom's name.
  #
  # The stem has to end on a real boundary. Two co-plotted but unrelated units
  # "2-101" and "2-102" share the characters "2-10", which names nothing, so the
  # remainder of every name must start with something other than a digit for the
  # stem to be accepted. The caller falls back to the base unit's own name.
  def self.shared_unit_number(names)
    names = Array(names).map(&:to_s)
    return nil if names.empty? || names.any?(&:empty?)
    return names.first if names.uniq.one?

    stem = names.reduce { |a, b| common_prefix(a, b) }
    # A trailing separator belongs to the suffix, not the apartment: "105-" -> "105".
    stem = stem.sub(/[^A-Za-z0-9]+\z/, "")
    return nil if stem.empty?
    # Cutting mid-number ("2-10" out of "2-101") names no apartment.
    return nil if names.any? { |name| name[stem.length..].to_s.start_with?(/\d/) }

    stem
  end

  def self.common_prefix(a, b)
    length = [a.length, b.length].min
    cut    = (0...length).find { |i| a[i] != b[i] } || length
    a[0, cut]
  end
  private_class_method :common_prefix

  private

  # The plot anchor, scoped by floor.
  #
  # Floor rather than map id: floor *determines* the map (the floorplate serving
  # that floor, or the single sitemap), so keying on it is equivalent for sitemap
  # properties and stricter for floorplate ones — it can never merge two units
  # that should stay apart. It is also exactly what the old map scoped on.
  #
  # Floor plan is deliberately NOT in the key. It was, briefly, to stop a space
  # inheriting a neighbour's layout — but co-plotted units on a real
  # student-housing property genuinely carry different floor plans (Harmony's
  # 2-101 "Overture" and 2-102 "Dolce" share one polygon), so keying on it
  # refused to group exactly the units this feature exists for. The inheritance
  # problem is solved where it belongs instead: a space carries every field that
  # differs from its base, floor plan included. See
  # SdkPayloadBuilderService#space_json.
  #
  # Preferred anchor first, then the other: a property can carry both kinds of
  # plot data, and an SVG unit missing its pointer_data is still pinned by
  # coordinates.
  def anchor_for(unit)
    key = @svg_mode ? (svg_anchor(unit) || image_anchor(unit))
                    : (image_anchor(unit) || svg_anchor(unit))
    return nil if key.nil?

    "#{unit.floor}|#{key}"
  end

  # The SVG shape the unit is drawn on. Mirrors the SDK's _unitPid and
  # unitSiblings.js svgAnchor: an explicit id wins, a blank id falls through to
  # the raw selector.
  def svg_anchor(unit)
    pointer_data = unit.pointer_data
    return nil unless pointer_data.respond_to?(:[])

    id = pointer_data["id"].presence || pointer_data[:id].presence
    return "pid:#{id}" if id.present?

    selector = pointer_data["selector"].presence || pointer_data[:selector].presence
    selector.present? ? "sel:#{selector}" : nil
  end

  # The pixel the unit's pin sits on. Unplotted units carry 0/0 and must not all
  # collapse into one group, so 0/0 yields no anchor.
  def image_anchor(unit)
    x = unit.x_plot.to_i
    y = unit.y_plot.to_i
    return nil if x <= 0 && y <= 0

    "xy:#{x}-#{y}"
  end

  # Election order for the base unit: natural-sorted marketing name, then id.
  #
  # Deliberately NOT "prefer an available space". Availability flips as leases
  # are signed, so an availability-ranked base would change identity during the
  # day — and the base unit's id is what deep links, saved favourites, analytics
  # and any future response cache are keyed on. Availability reaches the map
  # through the roll-up fields the payload builder computes instead, which is
  # where a changing value belongs.
  def space_order(unit)
    [natural_key(unit.marketing_name), unit.id.to_i]
  end

  # Sort key that orders "3-1-2" before "3-1-10" — every digit run is left-padded
  # to a fixed width, so plain string comparison becomes numeric-aware. Returning
  # a padded String rather than the usual alternating [text, number, ...] array
  # keeps every key mutually comparable, which an array of mixed types is not.
  def natural_key(name)
    name.to_s.downcase.gsub(/\d+/) { |digits| digits.rjust(DIGIT_PAD, "0") }
  end
end
