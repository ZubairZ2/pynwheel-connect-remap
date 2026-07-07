# Strips WebKit-expensive Figma "filter" effects (drop/inner shadows) from SVG
# markup before it is served to the maps.
#
# Safari/WebKit re-rasterizes every SVG <filter> region into its own offscreen
# buffer on each repaint and caches it poorly, so heavy Figma exports (dozens of
# feGaussianBlur / feColorMatrix shadow filters) make pan/zoom crawl and blow the
# iOS per-tab memory ceiling ("A problem occurred repeatedly while loading..."),
# while Chrome/Blink caches the filter output and stays smooth. Removing the
# filters drops the decorative shadows only; shapes/units/labels are untouched.
# (Root cause of the community 1615 floorplate slowdown.)
#
# Threshold-gated: light SVGs with a single subtle shadow are left untouched so
# their appearance does not change. Only heavy exports are rewritten.
class SvgSanitizer
  # Rewrite an SVG only when it looks like a heavy Figma export: it uses a blur
  # primitive (the most expensive one for WebKit) or carries many <filter> defs.
  HEAVY_FILTER_COUNT = 4

  FILTER_DEF_RE    = /<filter\b.*?<\/filter>/mi
  FILTER_ATTR_RE_D = /\s*filter\s*=\s*"url\(#[^"]*\)"/i
  FILTER_ATTR_RE_S = /\s*filter\s*=\s*'url\(#[^']*\)'/i

  # Returns the SVG string with heavy filters removed, or the input unchanged if
  # it is not a heavy SVG. Never raises — falls back to the original on error.
  def self.call(svg_text)
    return svg_text unless svg_text.is_a?(String) && svg_text.include?("<filter")
    return svg_text unless heavy?(svg_text)

    cleaned = svg_text.gsub(FILTER_DEF_RE, "")
    cleaned.gsub(FILTER_ATTR_RE_D, "").gsub(FILTER_ATTR_RE_S, "")
  rescue StandardError
    svg_text
  end

  def self.heavy?(svg_text)
    svg_text.include?("feGaussianBlur") ||
      svg_text.scan(/<filter\b/i).size >= HEAVY_FILTER_COUNT
  end
end
