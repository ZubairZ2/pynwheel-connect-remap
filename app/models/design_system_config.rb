class DesignSystemConfig < ApplicationRecord
  belongs_to :community

  DEFAULT_CONFIG = {
    "colors" => {
      "primary"                  => "#E25C0A",
      "primary_opacity"          => 1.0,
      "main_font"                => "#1F1F1F",
      "main_font_opacity"        => 1.0,
      "subtext"                  => "#5A5A5A",
      "subtext_opacity"          => 1.0,
      "stroke_outlines"          => "#D0D0D0",
      "stroke_outlines_opacity"  => 1.0,
      "light_background"         => "#F5F5F5",
      "light_background_opacity" => 1.0,
    },
    "fonts" => {
      "family"       => "Inter",
      "base_size"    => "14px",
      "heading_size" => "16px"
    },
    # Per-property names for the map's four right-rail / bottom-nav tabs, set on
    # Design -> Custom Design. A property that renames "Units" to "Homes" gets it
    # on web and touch with no deploy. The keys here are also the fallback
    # labels, so an empty CMS field means the default below rather than a blank
    # tab.
    "tab_labels" => {
      "units"       => "Units",
      "floor_plans" => "Floor Plans",
      "amenities"   => "Amenities",
      # "Favorites", not "Favs": this is what the map has always rendered, so an
      # unset field must not silently rename the tab on every property.
      "favs"        => "Favorites"
    }
  }.freeze

  def merged_config
    DEFAULT_CONFIG.deep_merge(config_json)
  end

  def to_theme_config
    cfg = merged_config
    c   = cfg["colors"]
    {
      colors: {
        primary:                c["primary"],
        primaryOpacity:         c["primary_opacity"].to_f,
        mainFont:               c["main_font"],
        mainFontOpacity:        c["main_font_opacity"].to_f,
        subtext:                c["subtext"],
        subtextOpacity:         c["subtext_opacity"].to_f,
        strokeOutlines:         c["stroke_outlines"],
        strokeOutlinesOpacity:  c["stroke_outlines_opacity"].to_f,
        lightBackground:        c["light_background"],
        lightBackgroundOpacity: c["light_background_opacity"].to_f
      },
      fonts: {
        family:      cfg["fonts"]["family"],
        baseSize:    cfg["fonts"]["base_size"],
        headingSize: cfg["fonts"]["heading_size"]
      }
    }
  end

  # The tab names for the SDK payload, camelCased for JS.
  #
  # `presence` rather than a plain fetch: clearing a CMS input saves "" (the
  # field is not removed from the JSONB blob), and deep_merge keeps that ""
  # over the default. Falling back here is what makes "clear the field to get
  # the default label back" work.
  def to_tab_labels
    labels   = merged_config["tab_labels"] || {}
    defaults = DEFAULT_CONFIG["tab_labels"]

    {
      units:      labels["units"].presence       || defaults["units"],
      floorPlans: labels["floor_plans"].presence || defaults["floor_plans"],
      amenities:  labels["amenities"].presence   || defaults["amenities"],
      favs:       labels["favs"].presence        || defaults["favs"]
    }
  end

  # The icon above each tab's label, for the SDK payload next to tabLabels.
  # Stored separately under config_json["tab_icons"], so renaming a tab and
  # re-iconing it never touch each other:
  #
  #   "tab_icons" => { "floor_plans" => { "icon" => "briefcase", "show" => true } }
  #
  # Each tab comes out as
  #
  #   { icon: "briefcase", isDefault: false, show: true, svg: "<svg…>" }
  #
  # A tab with nothing stored (every property until someone opens the picker),
  # a blank key (Reset to default saves ""), or a key no longer in the set, all
  # resolve to the stock icon with isDefault: true, and the map keeps drawing
  # its own built-in component for those — nothing changes on upgrade. `svg` is
  # still sent for them so other API consumers can draw every tab one way.
  def to_tab_icons
    stored = config_json["tab_icons"] || {}

    {
      units:      tab_icon("units",       stored["units"]),
      floorPlans: tab_icon("floor_plans", stored["floor_plans"]),
      amenities:  tab_icon("amenities",   stored["amenities"]),
      favs:       tab_icon("favs",        stored["favs"])
    }
  end

  def to_css_vars
    cfg = merged_config
    c   = cfg["colors"]
    {
      "--pyn-primary"           => cv(c["primary"], c["primary_opacity"]),
      "--pyn-main-font"         => cv(c["main_font"], c["main_font_opacity"]),
      "--pyn-subtext"           => cv(c["subtext"], c["subtext_opacity"]),
      "--pyn-stroke"            => cv(c["stroke_outlines"], c["stroke_outlines_opacity"]),
      "--pyn-light-bg"          => cv(c["light_background"], c["light_background_opacity"]),
      "--pyn-font-family"       => cfg["fonts"]["family"],
      "--pyn-base-font-size"    => cfg["fonts"]["base_size"],
      "--pyn-heading-font-size" => cfg["fonts"]["heading_size"]
    }
  end

  private

  def tab_icon(tab, cfg)
    cfg   = cfg.is_a?(Hash) ? cfg : {}
    stock = MapTabIcons::STOCK.fetch(tab)
    key   = MapTabIcons.valid?(cfg["icon"]) ? cfg["icon"].to_s : stock

    {
      icon:      key,
      isDefault: key == stock,
      # Shown unless explicitly switched off; "false" covers a form-encoded save.
      show:      ![false, "false"].include?(cfg["show"]),
      svg:       MapTabIcons.svg(key)
    }
  end

  def cv(hex, opacity)
    return hex.to_s if opacity.nil? || opacity.to_f >= 1.0
    hex = hex.to_s.gsub('#', '')
    r, g, b = hex[0, 2].to_i(16), hex[2, 2].to_i(16), hex[4, 2].to_i(16)
    "rgba(#{r},#{g},#{b},#{opacity.to_f.round(2)})"
  end
end
