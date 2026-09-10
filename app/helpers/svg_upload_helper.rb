module SvgUploadHelper
  MIN_WIDTH  = 1000
  MIN_HEIGHT = 700

  def process_svg(svg_file)
    return svg_error("SVG file is missing.") unless svg_file.present?

    unless svg_file.content_type == "image/svg+xml"
      return svg_error("Image must be of SVG type.")
    end

    doc = parse_svg(svg_file)
    return unless doc

    width  = doc.root["width"].to_i
    height = doc.root["height"].to_i

    if width < MIN_WIDTH && height < MIN_HEIGHT
      return svg_error("Too small property map image")
    end

    {
      width: width,
      height: height,
      checksum: Digest::MD5.hexdigest(doc.to_xml),
      # Handed back so the caller can re-check plotted shapes against the new
      # artwork without paying to parse the file a second time.
      doc: doc
    }
  end

  def parse_svg(svg_file)
    Nokogiri::XML(File.read(svg_file.path)) { |c| c.strict }
  rescue => e
    Rails.logger.error "SVG parse failed: #{e.message}"
    svg_error("Invalid SVG file.")
    nil
  end

  def svg_error(message)
    flash[:error] = message
    nil
  end
end