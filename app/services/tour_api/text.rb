# frozen_string_literal: true

module TourApi
  # Text helpers of the Tour App API: plain text from the CMS's rich-text
  # fields, the names and places the route steps phrase (as
  # `Wayfinding::Timing` phrases them), and a few mirrors of the Python
  # semantics the contract was first implemented with (the Tour App API
  # began life as a FastAPI service; its JSON is kept byte-identical).
  module Text
    module_function

    NUMBER = /[+-]?\d+(?:\.\d+)?/
    BREAKS = %r{<\s*(br|/p|/div|/li|/tr)\b[^>]*>}i
    TAGS = /<[^>]+>/

    # The leading decimal number of a string, else 0.0 (`String#to_f` as the
    # Python port had it; "Studio" is 0.0, " 2" is 2.0).
    def to_f(value)
      return 0.0 if value.nil?
      return value.to_f if value.is_a?(Numeric)

      match = value.to_s.match(/\A\s*(#{NUMBER})/)
      match ? match[1].to_f : 0.0
    end

    # Python truthiness, for the few fields the contract tests with `if value:`:
    # nil, false, 0, "" and empty collections are not truthy.
    def truthy?(value)
      case value
      when nil, false then false
      when Numeric then !value.zero?
      when String, Array, Hash then !value.empty?
      else true
      end
    end

    def presence(value)
      value.present? ? value : nil
    end

    # Python's `round()` (half to even) as an Integer, for the "1,032 px" text.
    def round_half_even(value)
      floor = value.floor
      return (floor.even? ? floor : floor + 1) if value - floor == 0.5

      value.round
    end

    # "1032" → "1,032"
    def delimited(integer)
      integer.to_s.gsub(/(\d)(?=(\d{3})+\z)/, '\1,')
    end

    # Plain text from a rich-text field (`amenities.directional_text` holds
    # HTML): tags go, line breaks become spaces, entities are decoded and
    # whitespace collapses. nil when nothing is left.
    def strip_html(value)
      return nil if value.nil?

      text = value.to_s.gsub(BREAKS, ' ').gsub(TAGS, '')
      text = Nokogiri::HTML::DocumentFragment.parse(text).text
      text = text.gsub(/[[:space:]]+/, ' ').strip
      text.empty? ? nil : text
    end

    # `Wayfinding::Timing.name_of`, for a node that may be missing: its name,
    # else its kind humanized ("tour_start" → "Tour start").
    def name_of(node, key = nil)
      return node.name.to_s if node && node.name.present?

      source = node ? node.key.to_s : key.to_s
      source.present? ? source.split(':').first.to_s.humanize : ''
    end

    # The place a leg is on, as the step titles say it: "Property map" on a
    # sitemap, "Floor 2", the level's name, else "the floor".
    def place_name(graph, level_key, floor)
      level = graph.level(level_key)
      return 'Property map' if level&.kind == 'sitemap'
      return "Floor #{floor}" unless floor.nil?

      name = level&.record.try(:name)
      name.present? ? name.to_s : 'the floor'
    end

    # ISO 8601 in UTC, fractional seconds only when there are any (as the
    # previous service serialized its datetimes).
    def timestamp(time)
      return nil if time.nil?

      utc = time.utc
      utc.usec.zero? ? utc.iso8601 : utc.iso8601(6)
    end

    # Python's `str()` of a value that may be None, for the two titles the
    # contract builds with f-strings ("Floor None" when a floor is unknown).
    def py_str(value)
      value.nil? ? 'None' : value.to_s
    end
  end
end
