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
  module UploadUrl
    module_function

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

    # True when the uploader keeps files on this machine and the stored file
    # is not there (a database restored from another environment).
    def missing_on_disk?(uploader)
      return false unless uploader.class.storage == CarrierWave::Storage::File

      stored = uploader.file
      stored.nil? || !stored.exists?
    end

    # The same stored key on the bucket, when one is known; a fog store writes
    # the file under the CMS's own upload path, so the key is the local path.
    def stored_copy(url, bucket)
      base = bucket.respond_to?(:call) ? bucket.call : bucket
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
    # name `images-pynwheel-cms-v2`, so a gallery photo's URL answers 403
    # there although the file exists. When the record's family names another
    # bucket, the two are asked (one HEAD each, remembered for a day) and the
    # copy that answers wins; the configured URL stays when neither does, or
    # when the check itself fails.
    def reachable_copy(url, bucket)
      own = s3_base(url)
      family = bucket.respond_to?(:call) ? bucket.call : bucket
      return url if own.nil? || family.blank? || bucket_name(family) == bucket_name(own)
      return url if reachable?(url) != false

      candidate = "#{family}#{url.delete_prefix(own)}"
      reachable?(candidate) ? candidate : url
    end

    def bucket_name(base)
      URI.parse(base).host.to_s.split('.s3').first
    rescue URI::InvalidURIError
      base
    end

    # true / false from a HEAD of the public URL; nil when the check could not
    # be made (then the caller keeps what it has). Answers are cached, failures
    # are not.
    def reachable?(url)
      Rails.cache.fetch("connect/upload_url/reachable/#{Digest::SHA1.hexdigest(url)}", expires_in: 24.hours, skip_nil: true) do
        uri = URI.parse(url)
        Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == 'https', open_timeout: 3, read_timeout: 5) do |http|
          http.head(uri.request_uri).is_a?(Net::HTTPSuccess)
        end
      rescue StandardError
        nil
      end
    end
  end
end
