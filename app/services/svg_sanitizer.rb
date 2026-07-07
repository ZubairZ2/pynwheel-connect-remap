# Strips WebKit-expensive Figma drop/inner-shadow filters from SVG markup before
# it is served to the maps.
#
# Safari/WebKit re-rasterizes every SVG <filter> region into its own offscreen
# buffer on each repaint and caches it poorly, so shadow-heavy Figma exports
# (dozens of feGaussianBlur / feColorMatrix shadow filters) make pan/zoom crawl
# and blow the iOS per-tab memory ceiling ("A problem occurred repeatedly while
# loading..."), while Chrome/Blink caches the filter output and stays smooth.
# (Root cause of the community 1615 floorplate slowdown.)
#
# This is deliberately narrow so it never changes SVGs that already work:
#   * Detection AND removal are keyed to the Figma shadow-filter id signature
#     ("filter0_d_0_1", "filter12_i_0_1", ... => filter<idx>_<d|i>_<n>_<n>).
#     Hand-authored or other-tool SVGs, and any non-shadow <filter>, are left
#     byte-for-byte untouched.
#   * It only acts when an SVG carries MANY such filters (HEAVY_FILTER_COUNT),
#     so a Figma export with just one or two subtle shadows is left alone too.
class SvgSanitizer
  # Minimum number of Figma shadow filters before we treat an SVG as heavy.
  # 1615's floor maps carry 17 each; a lightly-decorated export has 1-3.
  HEAVY_FILTER_COUNT = 8

  # The Figma shadow-filter id, e.g. filter0_i_0_1 / filter13_d_0_1.
  FIGMA_ID = 'filter\d+_[a-z]+_\d+_\d+'.freeze

  FIGMA_FILTER_DEF  = /<filter\b[^>]*\bid="#{FIGMA_ID}"[^>]*>.*?<\/filter>/mi
  FIGMA_FILTER_ATTR = /\s*filter\s*=\s*(["'])url\(##{FIGMA_ID}\)\1/i
  FIGMA_FILTER_ID_RE = /<filter\b[^>]*\bid="#{FIGMA_ID}"/i

  # Returns the SVG with Figma shadow filters removed, or the input unchanged if
  # it is not a shadow-heavy Figma export. Never raises — falls back to input.
  def self.call(svg_text)
    return svg_text unless svg_text.is_a?(String) && svg_text.include?("<filter")
    return svg_text unless heavy?(svg_text)

    cleaned = svg_text.gsub(FIGMA_FILTER_DEF, "")
    cleaned.gsub(FIGMA_FILTER_ATTR, "")
  rescue StandardError
    svg_text
  end

  # True only for Figma exports carrying many shadow filters — the class of SVG
  # that triggers the WebKit slowdown/crash.
  def self.heavy?(svg_text)
    svg_text.scan(FIGMA_FILTER_ID_RE).size >= HEAVY_FILTER_COUNT
  end
end
