# Finds embedded base64 raster images inside an SVG — anywhere in the
# document, whatever wraps them (direct <image>, or referenced indirectly
# via a <pattern><use> chain, <mask>, <clipPath>, ...) — and re-encodes each
# one to WebP at its *original pixel dimensions*. Never resizes, never
# touches any attribute on the <image> element except its href, and never
# touches anything outside the matched <image> tags, so patterns/filters/
# masks/unit polygons/pointerData are guaranteed byte-identical.
#
# Pure Ruby, no ActiveRecord/Rails dependency — usable standalone (see
# script/svg_background_optimizer.rb) or from a controller.
class SvgBackgroundOptimizerService
  MIME_EXT = {
    "image/jpeg" => "jpg",
    "image/jpg"  => "jpg",
    "image/png"  => "png",
    "image/gif"  => "gif",
    "image/webp" => "webp",
    "image/bmp"  => "bmp",
    "image/tiff" => "tiff"
  }.freeze

  # Matches any <image ...> tag (self-closing or not) anywhere in the raw
  # text. Operates on raw text, not a parsed/re-serialized DOM, so the
  # captured href substring is byte-identical to the file — Illustrator/
  # Figma exports commonly wrap the base64 payload across lines, and an XML
  # parser's attribute-value normalization would collapse those embedded
  # newlines to spaces, silently breaking an exact substring replacement.
  IMAGE_TAG_RE = /<image\b(?<attrs>[^>]*)>/m.freeze
  HREF_ATTR_RE = /(?:xlink:href|href)\s*=\s*"(?<href>[^"]*)"/m.freeze
  DATA_URI_RE  = /\Adata:(?<mime>image\/[a-zA-Z0-9.+-]+);base64,(?<payload>.*)\z/m.freeze

  BANDWIDTHS_KBPS = {
    "Slow 3G (400 kbps)"      => 400,
    "4G / LTE (10 Mbps)"      => 10_000,
    "Broadband / WiFi (50 Mbps)" => 50_000
  }.freeze

  DEFAULT_THRESHOLD_KB = 40
  DEFAULT_QUALITY = 82

  def self.call(raw_text, threshold_kb: DEFAULT_THRESHOLD_KB, quality: DEFAULT_QUALITY)
    new(raw_text, threshold_kb: threshold_kb, quality: quality).call
  end

  def initialize(raw_text, threshold_kb:, quality:)
    @raw_text = raw_text
    @threshold_kb = threshold_kb
    @quality = quality
  end

  def call
    images = find_embedded_images(@raw_text)
    mutable_text = @raw_text.dup
    image_results = []

    images.each_with_index do |img, idx|
      image_results << process_image(img, idx, mutable_text)
    end

    build_result(mutable_text, image_results)
  end

  private

  def extract_attr(attrs, name)
    m = /\b#{name}\s*=\s*"(?<val>[^"]*)"/.match(attrs)
    m && m[:val]
  end

  def find_embedded_images(raw_text)
    raw_text.to_enum(:scan, IMAGE_TAG_RE).map { Regexp.last_match }.filter_map do |tag_match|
      attrs = tag_match[:attrs]
      href_match = HREF_ATTR_RE.match(attrs)
      next unless href_match

      href_value = href_match[:href]
      data_match = DATA_URI_RE.match(href_value)
      next unless data_match

      {
        id: extract_attr(attrs, "id"),
        data_name: extract_attr(attrs, "data-name"),
        decl_width: extract_attr(attrs, "width"),
        decl_height: extract_attr(attrs, "height"),
        mime: data_match[:mime],
        raw_href_value: href_value,
        base64_payload: data_match[:payload]
      }
    end
  end

  def process_image(img, idx, mutable_text)
    decoded = Base64.decode64(img[:base64_payload])
    decoded_kb = (decoded.bytesize / 1024.0).round(1)
    encoded_bytes = img[:base64_payload].bytesize

    entry = {
      index: idx,
      id: img[:id],
      data_name: img[:data_name],
      declared_width: img[:decl_width],
      declared_height: img[:decl_height],
      mime: img[:mime],
      decoded_kb: decoded_kb,
      encoded_bytes: encoded_bytes
    }

    if decoded_kb < @threshold_kb
      entry[:action] = "skipped_below_threshold"
      return entry
    end

    begin
      ext = MIME_EXT.fetch(img[:mime], "bin")
      webp_bytes = reencode_to_webp(decoded, ext, @quality)
      webp_kb = (webp_bytes.bytesize / 1024.0).round(1)
      new_b64 = Base64.strict_encode64(webp_bytes)
      new_href_value = "data:image/webp;base64,#{new_b64}"

      replaced = mutable_text.sub!(img[:raw_href_value]) { new_href_value }
      raise "could not locate exact href substring to replace (image id: #{img[:id]})" unless replaced

      entry[:action] = "optimized"
      entry[:webp_kb] = webp_kb
      entry[:new_encoded_bytes] = new_b64.bytesize
      entry[:reduction_pct] = ((1 - (webp_bytes.bytesize.to_f / decoded.bytesize)) * 100).round(1)
    rescue StandardError => e
      entry[:action] = "failed"
      entry[:error] = e.message
    end

    entry
  end

  def reencode_to_webp(decoded_bytes, ext, quality)
    Dir.mktmpdir do |dir|
      src = File.join(dir, "src.#{ext}")
      dst = File.join(dir, "out.webp")
      File.binwrite(src, decoded_bytes)

      image = MiniMagick::Image.open(src)
      original_dims = [image.width, image.height]

      image.format("webp")
      image.quality(quality)
      image.write(dst)

      out_bytes = File.binread(dst)
      out_image = MiniMagick::Image.open(dst)
      new_dims = [out_image.width, out_image.height]

      raise "dimension mismatch: #{original_dims} -> #{new_dims}" unless original_dims == new_dims

      out_bytes
    end
  end

  def transfer_estimate_ms(bytes, kbps)
    (bytes * 8.0 / kbps).round
  end

  def build_result(mutable_text, image_results)
    original_bytes = @raw_text.bytesize
    optimized_bytes = mutable_text.bytesize
    image_bytes_original = image_results.sum { |i| i[:encoded_bytes] || 0 }
    vector_bytes_original = original_bytes - image_bytes_original

    transfer_estimates = BANDWIDTHS_KBPS.map do |label, kbps|
      before_ms = transfer_estimate_ms(original_bytes, kbps)
      after_ms = transfer_estimate_ms(optimized_bytes, kbps)
      [label, { before_ms: before_ms, after_ms: after_ms, saved_ms: before_ms - after_ms }]
    end.to_h

    {
      original_bytes: original_bytes,
      optimized_bytes: optimized_bytes,
      reduction_pct: original_bytes.zero? ? 0 : ((1 - (optimized_bytes.to_f / original_bytes)) * 100).round(1),
      image_bytes_original: image_bytes_original,
      vector_bytes_original: vector_bytes_original,
      images: image_results,
      transfer_estimates: transfer_estimates,
      notes: build_notes(original_bytes, optimized_bytes, image_bytes_original, vector_bytes_original, image_results),
      original_svg: @raw_text,
      optimized_svg: mutable_text
    }
  end

  def build_notes(original_bytes, optimized_bytes, image_bytes_original, vector_bytes_original, image_results)
    notes = []

    if image_results.empty?
      notes << "No embedded raster images were found in this file. If it's large, the weight comes entirely " \
                "from vector path/text geometry — this tool only optimizes embedded images, so it can't reduce " \
                "that. Shrinking it further would mean simplifying the underlying paths (fewer anchor points, " \
                "less precision) at export time."
      return notes
    end

    image_pct = original_bytes.zero? ? 0 : ((image_bytes_original.to_f / original_bytes) * 100).round(1)
    notes << "#{image_pct}% of this file's original size was embedded raster image data; the rest (#{vector_bytes_original} bytes) is vector paths, text, filters, and pointer data."

    optimized = image_results.select { |i| i[:action] == "optimized" }
    if optimized.any?
      saved_bytes = optimized.sum { |i| (i[:encoded_bytes] || 0) - (i[:new_encoded_bytes] || 0) }
      notes << "#{optimized.size} image(s) re-encoded to WebP at unchanged pixel dimensions, saving #{(saved_bytes / 1024.0).round(1)} KB total."
    end

    skipped = image_results.select { |i| i[:action] == "skipped_below_threshold" }
    if skipped.any?
      notes << "#{skipped.size} image(s) left untouched — already under #{@threshold_kb}KB decoded, not worth the processing risk for negligible savings."
    end

    failed = image_results.select { |i| i[:action] == "failed" }
    if failed.any?
      notes << "#{failed.size} image(s) could not be safely re-encoded and were left exactly as in the original (never partially modified)."
    end

    remaining_vector_pct = optimized_bytes.zero? ? 0 : ((vector_bytes_original.to_f / optimized_bytes) * 100).round(1)
    if remaining_vector_pct > 40
      notes << "After optimization, vector/text data is now the majority of the file (~#{remaining_vector_pct}%). Further size reduction is not something this tool addresses — it would require simplifying the SVG's own path geometry."
    end

    notes
  end
end
