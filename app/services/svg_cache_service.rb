require 'zlib'

class SvgCacheService
  TTL = 24.hours

  def self.cache_key(map_id, map_type)
    "svg_v1_#{map_id}_#{map_type}"
  end

  # Returns the gzip-compressed SVG bytes from cache, fetching and caching on miss.
  def self.fetch_and_cache(map_id, map_type, svg_url)
    Rails.cache.fetch(cache_key(map_id, map_type), expires_in: TTL) do
      compress(fetch_raw(svg_url))
    end
  end

  # Warms the cache only if it is cold — safe to call concurrently.
  def self.warm(map_id, map_type, svg_url)
    return if Rails.cache.exist?(cache_key(map_id, map_type))
    fetch_and_cache(map_id, map_type, svg_url)
  end

  def self.invalidate(map_id, map_type)
    Rails.cache.delete(cache_key(map_id, map_type))
  end

  def self.warm?(map_id, map_type)
    Rails.cache.exist?(cache_key(map_id, map_type))
  end

  private_class_method def self.fetch_raw(url)
    return unless url
    Rails.env.development? ? File.read(url) : URI.open(url).read
  rescue
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
