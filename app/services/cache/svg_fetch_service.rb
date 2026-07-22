require 'zlib'

# Fetches an SVG from its source (S3 / local file in dev) and gzip-compresses
# it for transport. No caching layer of any kind — every call re-fetches.
class SvgFetchService
  def self.fetch(svg_url)
    compress(fetch_raw(svg_url))
  rescue StandardError
    nil
  end

  private_class_method def self.fetch_raw(url)
    return nil unless url
    Rails.env.development? ? File.read(url) : URI.open(url).read
  rescue StandardError
    nil
  end

  private_class_method def self.compress(raw)
    return nil unless raw
    buf = StringIO.new.binmode
    gz  = Zlib::GzipWriter.new(buf)
    gz.write(raw)
    gz.close
    buf.string
  end
end
