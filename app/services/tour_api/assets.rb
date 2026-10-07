# frozen_string_literal: true

require 'net/http'
require 'digest'

module TourApi
  # Floor plan files the app cannot read for itself.
  #
  # The CMS stores floor SVGs on S3 without CORS headers, so a web view can
  # draw them as an <image> but can never fetch them (which it must, to send
  # the API token and to learn the drawing's viewBox). The API reads the file
  # server-side, checks that it is an SVG document, and caches it per
  # process: the stored file names carry an upload timestamp, so a URL's
  # content never changes. Only `https://*.amazonaws.com` and this host's
  # own uploads are ever read (a development upload on this host is read from
  # public/, never requested from ourselves).
  module Assets
    MAX_BYTES = 24 * 1024 * 1024
    CACHE_BYTES = 128 * 1024 * 1024
    OPEN_TIMEOUT_S = 15
    READ_TIMEOUT_S = 60
    MAX_REDIRECTS = 3
    NUMBER = /[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/

    Svg = Struct.new(:url, :content, :etag, :view_box, keyword_init: true)

    class Error < StandardError
      attr_reader :code

      def initialize(code, message)
        super(message)
        @code = code
      end
    end

    @cache = {}
    @cache_bytes = 0
    @mutex = Mutex.new

    class << self
      # The HTTP reader, `->(url) { [status, body] }`; replaced in tests.
      attr_accessor :http
    end

    module_function

    def svg(url, local_base: nil)
      @mutex.synchronize do
        if (hit = @cache.delete(url))
          @cache[url] = hit # most recently used last
          return hit
        end
      end
      content = read(url, local_base)
      view_box = view_box_of(content)
      asset = Svg.new(url: url, content: content, etag: Digest::SHA1.hexdigest(content)[0, 20], view_box: view_box)
      @mutex.synchronize do
        @cache[url] = asset
        @cache_bytes += content.bytesize
        while @cache_bytes > CACHE_BYTES && @cache.size > 1
          _, old = @cache.shift
          @cache_bytes -= old.content.bytesize
        end
      end
      asset
    end

    def clear!
      @mutex.synchronize do
        @cache.clear
        @cache_bytes = 0
      end
    end

    def allowed?(url, local_base)
      host = URI.parse(url).host.to_s.downcase
      return true if host.end_with?('.amazonaws.com')

      local_host = local_base.present? ? URI.parse(local_base).host.to_s.downcase : ''
      local_host.present? && host == local_host
    rescue URI::InvalidURIError
      false
    end

    def read(url, local_base)
      local = local_file(url, local_base)
      return local if local
      raise Error.new('svg_unavailable', 'The floor plan is stored somewhere this service does not read from.') unless allowed?(url, local_base)

      fetch(url)
    end

    # An upload this very host serves (development file storage) is read from public/.
    def local_file(url, local_base)
      return nil if local_base.blank? || !url.start_with?("#{local_base.to_s.chomp('/')}/uploads/")

      path = Rails.root.join('public', URI.parse(url).path.delete_prefix('/'))
      return nil unless File.file?(path)
      raise Error.new('svg_unavailable', 'The floor plan file is too large to serve.') if File.size(path) > MAX_BYTES

      File.binread(path)
    rescue URI::InvalidURIError
      nil
    end

    def fetch(url)
      status, body = (http || method(:get)).call(url)
      unless status == 200 && body
        Rails.logger.warn("[tour-api] svg fetch #{url} -> #{status}")
        raise Error.new('svg_unavailable', 'The floor plan file could not be fetched.')
      end
      raise Error.new('svg_unavailable', 'The floor plan file is too large to serve.') if body.bytesize > MAX_BYTES

      body
    rescue Error
      raise
    rescue StandardError => e
      Rails.logger.warn("[tour-api] svg fetch failed #{url}: #{e.class}")
      raise Error.new('svg_unavailable', 'The floor plan file could not be fetched.')
    end

    # GET with redirects, streaming the body under the size cap.
    def get(url, redirects = MAX_REDIRECTS)
      uri = URI.parse(url)
      Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == 'https', open_timeout: OPEN_TIMEOUT_S, read_timeout: READ_TIMEOUT_S) do |http|
        http.request_get(uri.request_uri, 'Accept' => 'image/svg+xml, */*') do |response|
          if response.is_a?(Net::HTTPRedirection)
            raise Error.new('svg_unavailable', 'The floor plan file could not be fetched.') if redirects.zero? || response['location'].blank?

            return get(URI.join(url, response['location']).to_s, redirects - 1)
          end
          chunks = +''
          response.read_body do |chunk|
            chunks << chunk
            raise Error.new('svg_unavailable', 'The floor plan file is too large to serve.') if chunks.bytesize > MAX_BYTES
          end
          return [response.code.to_i, chunks]
        end
      end
    end

    # The root <svg viewBox>, else the box its width/height imply (the rule
    # of `Wayfinding::PlateTransform.view_box_of`), read from the first
    # element only. Raises invalid_svg when the document is not an SVG.
    def view_box_of(content)
      raise Error.new('invalid_svg', 'The floor plan file is empty.') if content.nil? || content.empty?

      reader = Nokogiri::XML::Reader(content, nil, nil, Nokogiri::XML::ParseOptions::STRICT | Nokogiri::XML::ParseOptions::NONET)
      reader.each do |node|
        next unless node.node_type == Nokogiri::XML::Reader::TYPE_ELEMENT
        raise Error.new('invalid_svg', 'The floor plan file is not an SVG document.') unless node.name.split(':').last == 'svg'

        raw = node.attribute('viewBox')
        if raw.present?
          parts = raw.strip.split(/[\s,]+/).map(&:to_f)
          return parts if parts.size == 4 && parts[2].positive? && parts[3].positive?
        end
        width = node.attribute('width').to_s[NUMBER]&.to_f
        height = node.attribute('height').to_s[NUMBER]&.to_f
        return [0.0, 0.0, width, height] if width&.positive? && height&.positive?

        return nil
      end
      raise Error.new('invalid_svg', 'The floor plan file is empty.')
    rescue Nokogiri::XML::SyntaxError
      raise Error.new('invalid_svg', 'The floor plan file is not valid SVG.')
    end
  end
end
