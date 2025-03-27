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
end