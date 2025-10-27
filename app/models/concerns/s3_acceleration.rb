require 'uri'

module S3Acceleration
  extend ActiveSupport::Concern

  def convert_to_s3_accelerate_url(original_url)
    return original_url if original_url.blank?

    uri = URI.parse(original_url)

    if uri.host =~ /^(.+)\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/
      bucket = $1
      uri.host = "#{bucket}.s3-accelerate.amazonaws.com"
      uri.to_s
    else
      original_url
    end
  rescue URI::InvalidURIError
    original_url
  end

  def validated_svg_image_url
    if respond_to?(:svg_image) && svg_image.present? && svg_image.url.present?
      convert_to_s3_accelerate_url(svg_image.url)
    end
  end

  def validated_background_svg_image_url
    if respond_to?(:background_svg_image) && background_svg_image.present? && background_svg_image.url.present?
      convert_to_s3_accelerate_url(background_svg_image.url)
    end
  end

  def validated_image_url
    if respond_to?(:image) && image.present?
      if respond_to?(:standard_image_url) && standard_image_url.present?
        convert_to_s3_accelerate_url(standard_image_url)
      elsif image.url.present?
        convert_to_s3_accelerate_url(image.url) 
      end
    end
  end
end