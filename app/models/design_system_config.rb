class DesignSystemConfig < ApplicationRecord
  belongs_to :community

  DEFAULT_CONFIG = {
    "colors" => {
      "primary"                  => "#E25C0A",
      "primary_opacity"          => 1.0,
      "primary_light_10"         => "#FBF3F0",
      "primary_light_10_opacity" => 1.0,
      "primary_light_20"         => "#F5DDD2",
      "primary_light_20_opacity" => 1.0,
      "main_font"                => "#1F1F1F",
      "main_font_opacity"        => 1.0,
      "subtext"                  => "#5A5A5A",
      "subtext_opacity"          => 1.0,
      "icon_background"          => "#919191",
      "icon_background_opacity"  => 1.0,
      "stroke_outlines"          => "#D0D0D0",
      "stroke_outlines_opacity"  => 1.0,
      "light_background"         => "#F5F5F5",
      "light_background_opacity" => 1.0,
      "label_yellow"             => "#F7CF76",
      "label_yellow_opacity"     => 1.0,
      "label_orange"             => "#BF5448",
      "label_orange_opacity"     => 1.0,
      "label_coral"              => "#BF8753",
      "label_coral_opacity"      => 1.0
    },
    "fonts" => {
      "family"       => "Inter",
      "base_size"    => "14px",
      "heading_size" => "16px"
    },
    "svg_unit_number" => {
      "dynamic_contrast" => true,
      "manual_color"     => "#FFFFFF",
      "opacity_vacant"   => 1.0,
      "opacity_model"    => 1.0,
      "opacity_occupied" => 1.0
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
        primaryLight10:         c["primary_light_10"],
        primaryLight10Opacity:  c["primary_light_10_opacity"].to_f,
        primaryLight20:         c["primary_light_20"],
        primaryLight20Opacity:  c["primary_light_20_opacity"].to_f,
        mainFont:               c["main_font"],
        mainFontOpacity:        c["main_font_opacity"].to_f,
        subtext:                c["subtext"],
        subtextOpacity:         c["subtext_opacity"].to_f,
        iconBackground:         c["icon_background"],
        iconBackgroundOpacity:  c["icon_background_opacity"].to_f,
        strokeOutlines:         c["stroke_outlines"],
        strokeOutlinesOpacity:  c["stroke_outlines_opacity"].to_f,
        lightBackground:        c["light_background"],
        lightBackgroundOpacity: c["light_background_opacity"].to_f,
        labelYellow:            c["label_yellow"],
        labelYellowOpacity:     c["label_yellow_opacity"].to_f,
        labelOrange:            c["label_orange"],
        labelOrangeOpacity:     c["label_orange_opacity"].to_f,
        labelCoral:             c["label_coral"],
        labelCoralOpacity:      c["label_coral_opacity"].to_f
      },
      fonts: {
        family:      cfg["fonts"]["family"],
        baseSize:    cfg["fonts"]["base_size"],
        headingSize: cfg["fonts"]["heading_size"]
      },
      svgUnitNumber: {
        dynamicContrast: cfg["svg_unit_number"]["dynamic_contrast"],
        manualColor:     cfg["svg_unit_number"]["manual_color"],
        opacityVacant:   cfg["svg_unit_number"]["opacity_vacant"].to_f,
        opacityModel:    cfg["svg_unit_number"]["opacity_model"].to_f,
        opacityOccupied: cfg["svg_unit_number"]["opacity_occupied"].to_f
      }
    }
  end

  def to_css_vars
    cfg = merged_config
    c   = cfg["colors"]
    {
      "--pyn-primary"           => cv(c["primary"], c["primary_opacity"]),
      "--pyn-primary-light-10"  => cv(c["primary_light_10"], c["primary_light_10_opacity"]),
      "--pyn-primary-light-20"  => cv(c["primary_light_20"], c["primary_light_20_opacity"]),
      "--pyn-main-font"         => cv(c["main_font"], c["main_font_opacity"]),
      "--pyn-subtext"           => cv(c["subtext"], c["subtext_opacity"]),
      "--pyn-icon-bg"           => cv(c["icon_background"], c["icon_background_opacity"]),
      "--pyn-stroke"            => cv(c["stroke_outlines"], c["stroke_outlines_opacity"]),
      "--pyn-light-bg"          => cv(c["light_background"], c["light_background_opacity"]),
      "--pyn-label-yellow"      => cv(c["label_yellow"], c["label_yellow_opacity"]),
      "--pyn-label-orange"      => cv(c["label_orange"], c["label_orange_opacity"]),
      "--pyn-label-coral"       => cv(c["label_coral"], c["label_coral_opacity"]),
      "--pyn-font-family"       => cfg["fonts"]["family"],
      "--pyn-base-font-size"    => cfg["fonts"]["base_size"],
      "--pyn-heading-font-size" => cfg["fonts"]["heading_size"]
    }
  end

  private

  def cv(hex, opacity)
    return hex.to_s if opacity.nil? || opacity.to_f >= 1.0
    hex = hex.to_s.gsub('#', '')
    r, g, b = hex[0, 2].to_i(16), hex[2, 2].to_i(16), hex[4, 2].to_i(16)
    "rgba(#{r},#{g},#{b},#{opacity.to_f.round(2)})"
  end
end
