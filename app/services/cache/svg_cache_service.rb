require 'zlib'

class SvgCacheService
  TTL = 1.hour

  def self.cache_key(map_id, map_type)
    "svg_v1_#{map_id}_#{map_type}"
  end

  # Read-through cache — used by fetch_svg_image on every SDK request.
  # Returns cached bytes on HIT (no S3 hit). On MISS: fetches from S3, stores, returns.
  # On Redis error: fetches directly from S3 and returns without caching — never crashes.
  def self.fetch_and_cache(map_id, map_type, svg_url)
    Rails.cache.fetch(cache_key(map_id, map_type), expires_in: TTL) do
      compress(fetch_raw(svg_url))
    end
  rescue Redis::BaseError, Errno::ECONNREFUSED
    compress(fetch_raw(svg_url))
  end

  # Force-refresh — used by the warming worker on every scheduler run.
  # Always fetches from S3 and overwrites the cached entry atomically.
  # Old memory is freed by Redis on write (SET replaces in place).
  # Returns nil silently on Redis error — warming failure never crashes.
  def self.refresh(map_id, map_type, svg_url)
    data = compress(fetch_raw(svg_url))
    return nil unless data
    Rails.cache.write(cache_key(map_id, map_type), data, expires_in: TTL)
    data
  rescue Redis::BaseError, Errno::ECONNREFUSED
    nil
  end

  # Fetches and compresses SVG directly from S3 without touching the cache.
  # Used when enable_sdk_map_cache is off for a community.
  def self.fetch_direct(svg_url)
    compress(fetch_raw(svg_url))
  rescue StandardError
    nil
  end

  # Returns false (treat as cold) if Redis is unavailable.
  def self.warm?(map_id, map_type)
    Rails.cache.exist?(cache_key(map_id, map_type))
  rescue Redis::BaseError, Errno::ECONNREFUSED
    false
  end

  # Returns the raw (uncompressed) SVG string, reading from cache when warm
  # or fetching from source (S3 / local file in dev) and caching on a miss.
  # Used to inline SVGs into the fetch_data response so the SDK skips all
  # separate fetch_svg_image round trips.
  def self.fetch_raw_text(map_id, map_type, svg_url: nil)
    compressed = Rails.cache.read(cache_key(map_id, map_type))
    if compressed.nil? && svg_url
      compressed = fetch_and_cache(map_id, map_type, svg_url)
    end
    return nil unless compressed
    decompress(compressed)
  rescue StandardError
    nil
  end

  def self.decompress(compressed)
    Zlib::GzipReader.new(StringIO.new(compressed)).read
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
