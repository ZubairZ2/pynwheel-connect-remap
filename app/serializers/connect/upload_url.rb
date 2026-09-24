module Connect
  # URLs of the CarrierWave uploads the inventory shows, resolved the way the
  # CMS itself resolves them.
  #
  # The uploaders store to S3 everywhere except development (`storage
  # Rails.env.development? ? :file : :fog`), where `uploader.present?` also
  # checks that the file exists on this machine. So presence is read from the
  # column (the stored file name) instead, which is what `present?` amounts to
  # on S3.
  module UploadUrl
    module_function

    # A record's main raster `image`. After every upload the CMS copies the
    # final URL into `standard_image_url` (StandardUrl#set_standard_url), and
    # S3Acceleration#validated_image_url serves that copy through S3 Transfer
    # Acceleration; this returns the same URL.
    def image(record, base_url)
      return nil if record.read_attribute(:image).blank?

      standard = record.try(:standard_image_url)
      return accelerated(record, standard) if standard.present?

      upload(record, :image, base_url)
    end

    # Any other mounted upload (`svg_image`, `secondary_image`, a gallery
    # image): the uploader's own URL, made absolute. On S3 it already is; in
    # development it is a path on the CMS host.
    def upload(record, column, base_url)
      return nil if record.read_attribute(column).blank?

      absolute(accelerated(record, record.public_send(column).url), base_url)
    end

    def accelerated(record, url)
      record.respond_to?(:convert_to_s3_accelerate_url) ? record.convert_to_s3_accelerate_url(url) : url
    end

    # `{ url:, file_name: }` for one upload, or nil when nothing is stored.
    def file(record, column, base_url)
      url = column == :image ? image(record, base_url) : upload(record, column, base_url)
      return nil if url.blank?

      { url: url, file_name: File.basename(record.read_attribute(column).to_s) }
    end

    def absolute(url, base_url)
      return nil if url.blank?
      return url if url.start_with?('http://', 'https://', '//')

      "#{base_url.to_s.chomp('/')}/#{url.delete_prefix('/')}"
    end
  end
end
