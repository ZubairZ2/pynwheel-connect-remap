module Connect
  # How the legacy plotting pages draw a property's map markers, as data for
  # the Pynwheel Connect Map & Plotting screen: the unit marker colour and
  # size and the amenity marker colour and size, one per theme from the
  # property's Design (floorplates/_svg_or_image_unit_plotting.html.haml and
  # _svg_or_image_amenity_plotting.html.haml decide them the same way), the
  # fixed door colours, the font the floor SVG's labels are drawn in
  # (font_settings.svg_labels_font_family, plotexp.html.haml) and whether the
  # green "plot this unit's door" marker applies (auto_wayfinding). Read-only:
  # the same values those views compute, nothing decided differently.
  class MapMarkers
    THEME_DEFAULT_COLOR = '#d37474'.freeze
    MODERNIST_DEFAULT_COLOR = '#cf492f'.freeze
    LEGACY_MARKER_COLOR = 'rgba(247, 0, 0, 0.61)'.freeze
    DEFAULT_SIZE = 30
    DOOR_COLOR = '#3153d2'.freeze
    DOOR_PLUS_COLOR = '#59de83'.freeze

    def self.for(community)
      new(community).as_json
    end

    def initialize(community)
      @community = community
      @design = community.design
      @theme = community.theme_name.to_s
    end

    def as_json(*)
      {
        unit_color: unit_color,
        unit_size: unit_size,
        amenity_color: amenity_color,
        # The amenity partial draws its square 5px smaller than the design's size.
        amenity_size: amenity_size - 5,
        door_color: DOOR_COLOR,
        door_plus_color: DOOR_PLUS_COLOR,
        svg_font_family: community.font_setting&.svg_labels_font_family.presence,
        auto_wayfinding: community.auto_wayfinding.present?
      }
    end

    private

      attr_reader :community, :design, :theme

      def unit_color
        if theme.include?('gables')
          design&.property_map_color.presence || THEME_DEFAULT_COLOR
        elsif theme == 'modernist'
          modernist_color(design&.modernist_map_marker_color)
        elsif theme == 'futurist'
          design&.futurist_property_map_marker_color.presence || THEME_DEFAULT_COLOR
        elsif theme == 'expressionist'
          design&.expressionist_property_map_marker_color.presence || THEME_DEFAULT_COLOR
        elsif theme == 'panther'
          design&.panther_property_map_marker_color.presence || THEME_DEFAULT_COLOR
        else
          LEGACY_MARKER_COLOR
        end
      end

      def unit_size
        size =
          if theme.include?('gables')
            design&.property_map_size_integer
          elsif theme == 'modernist'
            design&.modernist_property_map_size
          elsif theme == 'futurist'
            design&.futurist_property_map_size
          elsif theme == 'expressionist'
            design&.expressionist_property_map_size
          elsif theme == 'panther'
            design&.panther_property_map_size
          end
        size.presence || DEFAULT_SIZE
      end

      def amenity_color
        if theme.include?('gables')
          design&.amenity_map_marker_color.presence || THEME_DEFAULT_COLOR
        elsif theme == 'modernist'
          modernist_color(design&.modernists_amenity_map_marker_color)
        elsif theme == 'futurist'
          design&.futurist_amenity_map_marker_color.presence || THEME_DEFAULT_COLOR
        elsif theme == 'expressionist'
          design&.expressionist__amenity_map_marker_color.presence || THEME_DEFAULT_COLOR
        elsif theme == 'panther'
          design&.panther_amenity_map_marker_color.presence || THEME_DEFAULT_COLOR
        else
          LEGACY_MARKER_COLOR
        end
      end

      def amenity_size
        size =
          if theme.include?('gables')
            design&.amenity_map_marker_size_integer
          elsif theme == 'modernist'
            design&.modernist_amenity_map_size
          elsif theme == 'futurist'
            design&.futurist_amenity_map_size
          elsif theme == 'expressionist'
            design&.expressionist_amenity_map_size
          elsif theme == 'panther'
            design&.panther_amenity_map_size
          end
        size.presence || DEFAULT_SIZE
      end

      # Modernist stores "no color" for "use the primary colour".
      def modernist_color(value)
        return value if value.present? && value != 'no color'

        design&.primary_color.presence || MODERNIST_DEFAULT_COLOR
      end
  end
end
