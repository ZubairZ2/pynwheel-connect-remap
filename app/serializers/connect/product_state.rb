module Connect
  # The one place Pynwheel Connect decides whether a property has a product:
  # Pynwheel Touch, the Self-Guided Tour (Pynwheel Tour) and Pynwheel Maps.
  #
  # The CMS records each product in two places. The Settings page toggles the
  # `touchscreen_app`, `self_tour` and `enable_sdk_map` columns; the Pynwheel
  # Launch order form writes `product_options` (a jsonb column that holds a
  # JSON *string*, so it is parsed twice). A product is on when either says so,
  # as the Properties listing has read it since phase 1. Every Connect JSON
  # that mentions a product state — the listing, Property Detail, the
  # inventory's amenities meta, the wayfinding settings — reads it from here,
  # so no two screens can disagree about the same property.
  #
  # Read-only: nothing here decides anything new or writes anything.
  module ProductState
    module_function

    def touch?(community)
      community.touchscreen_app.present? || option_enabled?(community, 'pynwheel_touch')
    end

    # The Self-Guided Tour. It gates the tour-only fields of the amenity form,
    # the Auto Wayfinding page and the stop lists in the legacy CMS.
    def tour?(community)
      community.self_tour.present? || option_enabled?(community, 'self_tour')
    end

    def maps?(community)
      options(community).dig('product_options', 'pynwheel_maps').present? || community.enable_sdk_map.present?
    end

    # The three flags together, as the listing row and the detail payload carry them.
    def all(community)
      { touch: touch?(community), tour: tour?(community), maps: maps?(community) }
    end

    def option_enabled?(community, key)
      options(community).dig('product_options', key, 'is_enabled').present?
    end

    def options(community)
      raw = community.product_options
      raw = JSON.parse(raw) if raw.is_a?(String)
      raw.is_a?(Hash) ? raw : {}
    rescue JSON::ParserError
      {}
    end
  end
end
