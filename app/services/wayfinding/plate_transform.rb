# frozen_string_literal: true

module Wayfinding
  # The affine map from a level's floor SVG (viewBox units) to its floor image
  # (natural pixels), stored in `svg_to_image_transform` as
  # `{a, b, c, d, e, f, method, viewBox}` with x' = a·x + c·y + e,
  # y' = b·x + d·y + f.
  #
  # `derive` gives the scale-only transform when the SVG's viewBox and the
  # image share an aspect ratio (within 1%); anything else is nil, and
  # svg-space rows then stay in their own frame (non-routable) until a
  # calibrated transform is stored. Nothing here guesses.
  module PlateTransform
    module_function

    ASPECT_TOLERANCE = 0.01

    def present?(level)
      transform = level.respond_to?(:svg_to_image_transform) ? level.svg_to_image_transform : nil
      transform.is_a?(Hash) && %w[a b c d e f].all? { |k| transform[k].is_a?(Numeric) }
    end

    def apply(transform, x, y)
      a, b, c, d, e, f = transform.values_at('a', 'b', 'c', 'd', 'e', 'f').map(&:to_f)
      [a * x + c * y + e, b * x + d * y + f]
    end

    # viewBox: [min_x, min_y, width, height]; image: [width, height].
    def derive(view_box, image_width, image_height)
      return nil unless view_box.is_a?(Array) && view_box.size == 4
      vb_x, vb_y, vb_w, vb_h = view_box.map(&:to_f)
      w = image_width.to_f
      h = image_height.to_f
      return nil if vb_w <= 0 || vb_h <= 0 || w <= 0 || h <= 0

      image_ratio = w / h
      return nil if ((vb_w / vb_h) - image_ratio).abs / image_ratio > ASPECT_TOLERANCE

      a = w / vb_w
      d = h / vb_h
      { 'a' => a, 'b' => 0.0, 'c' => 0.0, 'd' => d, 'e' => -vb_x * a, 'f' => -vb_y * d, 'method' => 'aspect', 'viewBox' => [vb_x, vb_y, vb_w, vb_h] }
    end

    # The viewBox of an SVG document's root (`<svg viewBox="…">`), or the one
    # its width/height attributes imply; nil when neither is readable.
    def view_box_of(svg_text)
      root = Nokogiri::XML(svg_text.to_s).at('svg')
      return nil unless root

      if root['viewBox'].present?
        parts = root['viewBox'].split(/[\s,]+/).map(&:to_f)
        return parts if parts.size == 4 && parts[2].positive? && parts[3].positive?
      end
      width = root['width'].to_s.gsub(/[^0-9.]/, '').to_f
      height = root['height'].to_s.gsub(/[^0-9.]/, '').to_f
      width.positive? && height.positive? ? [0.0, 0.0, width, height] : nil
    rescue StandardError
      nil
    end
  end
end
