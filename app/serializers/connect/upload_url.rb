require 'digest'
require 'net/http'

module Connect
  # URLs of the CarrierWave uploads the inventory shows, resolved the way the
  # CMS itself resolves them.
  #
  # The uploaders store to S3 everywhere except development (`storage
  # Rails.env.development? ? :file : :fog`), where `uploader.present?` also
  # checks that the file exists on this machine. So presence is read from the
  # column (the stored file name) instead, which is what `present?` amounts to
  # on S3.
  #
  # A development database restored from staging names files that were only
  # ever uploaded to S3, so an uploader on file storage answers a CMS-host
  # path (`/uploads/amenity_gallery/image/968/…`) that 404s. The CMS's own
  # answer to that is the `standard_image_url` it copies after every main
  # image upload (StandardUrl#set_standard_url), which `image` reads first. A
  # gallery photo, a secondary image or a floor SVG has no such column, so
  # when its file is not on disk `upload` reads the same stored key from the
  # bucket the record's (or the property's) standard URLs name — the URL the
  # fog storage produces on staging and production. No file is moved or
  # written; this only chooses which existing URL the JSON carries.
  #
  # Which buckets are asked (October 10, 2026): a stored key is looked for on
  # the configured bucket first, then on the bucket the record's own standard
  # URL names, then the property's (`bucket_hint`), then on every bucket the
  # database's recent uploads name (`known_buckets`). The last step is what a
  # property with no raster upload at all needs: an SVG-only Beans property
  # (its floor SVGs and shared background are its only files) has no standard
  # URL anywhere, so before this the configured bucket was the only answer —
  # and on a CMS whose database came from another environment that bucket
  # does not hold the file. In production the configured bucket is the one
  # every standard URL names, so no HEAD is ever sent there.
  module UploadUrl
    module_function

    HEAD_OPEN_TIMEOUT_S = 3
    HEAD_READ_TIMEOUT_S = 5
    # A check that could not be made (a timeout, a DNS failure) is remembered
    # briefly, so an unreachable store costs one timeout per URL in that time
    # rather than one per request; a definite answer is remembered for a day.
    FAILED_CHECK_TTL = 5.minutes
    UNCHECKED = :unchecked
    # How many of the most recent raster uploads name the buckets this
    # database's files live on; the last few are enough to see every bucket
    # an environment has ever written to.
    KNOWN_BUCKET_SAMPLE = 60
    KNOWN_BUCKETS_CACHE_KEY = 'connect/upload_url/known_buckets/v1'.freeze

    class << self
      # The HEAD check, `->(url) { true | false | nil }`; replaced in tests.
      attr_accessor :http
    end

    # A record's main raster `image`. After every upload the CMS copies the
    # final URL into `standard_image_url` (StandardUrl#set_standard_url), and
    # S3Acceleration#validated_image_url serves that copy through S3 Transfer
    # Acceleration; this returns the same URL.
    def image(record, base_url, bucket: nil)
      return nil if record.read_attribute(:image).blank?

      standard = record.try(:standard_image_url)
      return accelerated(record, standard) if standard.present?

      upload(record, :image, base_url, bucket: bucket)
    end

    # Any other mounted upload (`svg_image`, `secondary_image`, a gallery
    # image): the uploader's own URL, made absolute. On S3 it already is; in
    # development it is a path on the CMS host, unless the file is not there
    # and `bucket` (an S3 base, or a resolver from `bucket_hint`) says where
    # the stored copy lives.
    def upload(record, column, base_url, bucket: nil)
      return nil if record.read_attribute(column).blank?

      uploader = record.public_send(column)
      url = uploader.url
      url = stored_copy(url, bucket) if url.present? && missing_on_disk?(uploader)
      # Only a fog store is asked where its file really is: it runs where S3
      # answers in milliseconds. File storage (development) names the bucket
      # the database points at and sends nothing — a developer's machine can
      # take seconds to open a connection to S3, and one probe per upload per
      # request starved the server's threads (October 10, 2026).
      url = reachable_copy(url, bucket) if url.present? && on_fog?(uploader)

      absolute(accelerated(record, url), base_url)
    end

    def accelerated(record, url)
      record.respond_to?(:convert_to_s3_accelerate_url) ? record.convert_to_s3_accelerate_url(url) : url
    end

    # `{ url:, file_name: }` for one upload, or nil when nothing is stored.
    def file(record, column, base_url, bucket: nil)
      url = column == :image ? image(record, base_url, bucket: bucket) : upload(record, column, base_url, bucket: bucket)
      return nil if url.blank?

      { url: url, file_name: File.basename(record.read_attribute(column).to_s) }
    end

    def absolute(url, base_url)
      return nil if url.blank?
      return url if url.start_with?('http://', 'https://', '//')

      "#{base_url.to_s.chomp('/')}/#{url.delete_prefix('/')}"
    end

    # The S3 base a stored URL names (`https://<bucket>.s3….amazonaws.com`),
    # or nil for anything else.
    def s3_base(url)
      url.to_s[%r{\Ahttps?://[^/]+\.amazonaws\.com(?=/uploads/)}]
    end

    # The bucket to read a record's stored copy from: its own standard URL's
    # when it has one, else the property-wide `fallback` (see `bucket_hint`).
    def bucket_of(record, fallback = nil)
      s3_base(record.try(:standard_image_url)) || fallback
    end

    # A resolver for the bucket a property's uploads live on: the first
    # `standard_image_url` among its floorplates, amenities, units and floor
    # plans. It queries only when a serializer first needs it (a file missing
    # on disk), and at most once per listing.
    def bucket_hint(community)
      resolved = false
      base = nil
      lambda do
        unless resolved
          resolved = true
          base = [community.floorplates, community.amenities, community.units, community.floorplans].each do |scope|
            found = s3_base(scope.where.not(standard_image_url: [nil, '']).order(:id).limit(1).pick(:standard_image_url))
            break found if found
          end
          base = nil unless base.is_a?(String)
        end
        base
      end
    end

    # The S3 bases this database's files are known to live on, from the most
    # recent raster uploads' standard URLs (floorplates, floor plans and
    # amenities — the tables every property with a map writes to), one base
    # per bucket, most recent first. Remembered for a day; an environment's
    # buckets do not change under a running process.
    def known_buckets
      Rails.cache.fetch(KNOWN_BUCKETS_CACHE_KEY, expires_in: 24.hours) do
        bases = [Floorplate, Floorplan, Amenity].flat_map do |model|
          model.where.not(standard_image_url: [nil, '']).order(id: :desc).limit(KNOWN_BUCKET_SAMPLE).pluck(:standard_image_url)
        end
        bases.filter_map { |url| s3_base(url) }.uniq { |base| bucket_name(base) }
      end
    rescue StandardError => e
      Rails.logger.warn("[Connect::UploadUrl] known buckets unavailable: #{e.class}: #{e.message}")
      []
    end

    def forget_known_buckets!
      Rails.cache.delete(KNOWN_BUCKETS_CACHE_KEY)
    end

    # True when the uploader keeps files on this machine and the stored file
    # is not there (a database restored from another environment).
    def missing_on_disk?(uploader)
      return false unless uploader.class.storage == CarrierWave::Storage::File

      stored = uploader.file
      stored.nil? || !stored.exists?
    end

    # The same stored key on a bucket the database names, when one is known
    # (the record's family, else the first the environment knows); a fog
    # store writes the file under the CMS's own upload path, so the key is the
    # local path. `reachable_copy` then settles which of the known buckets
    # really holds it.
    def stored_copy(url, bucket)
      base = resolve_bucket(bucket) || known_buckets.first
      return url if base.blank? || !url.start_with?('/')

      "#{base}#{url}"
    end

    def on_fog?(uploader)
      uploader.class.storage == CarrierWave::Storage::Fog
    end

    # Fog storage names every file on the configured bucket (`S3_BUCKET_NAME`),
    # but a database copied from another environment holds files that were
    # uploaded to *that* environment's bucket: the Heroku staging CMS keeps
    # `staging-pynwheel` configured while its records' `standard_image_url`s
    # name `images-pynwheel-cms-v2`, so a floor SVG's URL answers 403 there
    # although the file exists. When the database names other buckets (the
    # record's family, the property's, the environment's recent uploads), the
    # configured URL is asked first (one HEAD, remembered for a day) and, when
    # it does not answer 2xx — a refusal, a missing object, or a check that
    # could not be made — the same key is tried on each known bucket in turn;
    # the first copy that answers wins. The configured URL stays when no copy
    # does. When the database names no other bucket (production: every
    # standard URL is on the configured bucket) nothing is asked at all.
    def reachable_copy(url, bucket)
      own = s3_base(url)
      return url if own.nil?

      candidates = ([resolve_bucket(bucket)] + known_buckets).compact.map(&:to_s).uniq.reject { |base| bucket_name(base) == bucket_name(own) }
      return url if candidates.empty?
      return url if reachable?(url) == true

      key = url.delete_prefix(own)
      candidates.each do |base|
        candidate = "#{base}#{key}"
        return candidate if reachable?(candidate)
      end
      url
    end

    def resolve_bucket(bucket)
      base = bucket.respond_to?(:call) ? bucket.call : bucket
      base.presence
    end

    def bucket_name(base)
      URI.parse(base).host.to_s.split('.s3').first
    rescue URI::InvalidURIError
      base
    end

    # true / false from a HEAD of the public URL; nil when the check could not
    # be made (then the caller moves on to the next candidate, keeping the
    # configured URL if none answers). An answer is remembered for a day, a
    # failed check for FAILED_CHECK_TTL.
    def reachable?(url)
      key = "connect/upload_url/reachable/#{Digest::SHA1.hexdigest(url)}"
      cached = Rails.cache.read(key)
      return (cached == UNCHECKED ? nil : cached) unless cached.nil?

      answer = (http || DEFAULT_HTTP).call(url)
      Rails.cache.write(key, answer.nil? ? UNCHECKED : answer, expires_in: answer.nil? ? FAILED_CHECK_TTL : 24.hours)
      answer
    end

    DEFAULT_HTTP = lambda do |url|
      uri = URI.parse(url)
      Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == 'https', open_timeout: HEAD_OPEN_TIMEOUT_S, read_timeout: HEAD_READ_TIMEOUT_S) do |http|
        http.head(uri.request_uri).is_a?(Net::HTTPSuccess)
      end
    rescue StandardError => e
      Rails.logger.info("[Connect::UploadUrl] HEAD #{uri&.host}#{uri&.path} could not be checked: #{e.class}")
      nil
    end
  end
end
