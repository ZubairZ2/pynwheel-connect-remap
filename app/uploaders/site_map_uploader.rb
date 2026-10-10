class SiteMapUploader < CarrierWave::Uploader::Base
  include CarrierWave::RMagick
  include Sprockets::Rails::Helper
  process :set_file_dimensions

  def set_file_dimensions
    if image?(file)
    end
  end

  storage Rails.env.development? ? :file : :fog 

  # Override the directory where uploaded files will be stored.
  # This is a sensible default for uploaders that are meant to be mounted:
  version :svg_for_metro, if: :image? do
    process convert: 'jpg'
    def full_filename (for_file = model.image.file) 
      super.chomp(File.extname(super)) + '.jpg'
    end
  end

  def filename
    @name ||= "#{timestamp}-#{super}" if original_filename.present? and super.present?
  end

  def timestamp
    var = :"@#{mounted_as}_timestamp"
    model.instance_variable_get(var) or model.instance_variable_set(var, Time.now.to_i)
  end

  def store_dir
    "uploads/#{model.class.to_s.underscore}/#{mounted_as}/#{model.id}"
  end
  protected

  def svg?(file)
    file&.content_type&.include?('svg') || file&.content_type&.include?('svg+xml')
  end

  IMAGE_EXTENSIONS = %w[png jpg jpeg].freeze

  # Whether the `svg_for_metro` version applies to this file.
  #
  # Answered from the filename, never from `content_type`, because this
  # condition is not evaluated where it looks like it is. CarrierWave calls it
  # from `active_versions`, which `retrieve_from_store!` runs the first time
  # anything touches a mounted image -- and on fog storage
  # `CarrierWave::Storage::Fog::File#content_type` is
  # `@content_type || file.try(:content_type)`, whose `file` is
  # `directory.files.head(path)`: a live S3 HEAD request.
  #
  # So merely reading `floorplate.image` cost a network round trip, purely to
  # decide whether a derived version exists. The SDK payload reads one per
  # floorplate, so a 28-floor property spent ~7.9s of an 8.75s response on 28
  # HEAD requests. Development never showed it -- storage is :file there.
  #
  # The extension is already on the path, which Fog::File exposes as a plain
  # attr_reader, and it answers the same question for free. Stored filenames
  # keep their extension (see #filename), so this agrees with the content type
  # for every file that has one.
  #
  # `content_type` is still consulted when there is no extension to read. That
  # is the upload path, where `file` is a local SanitizedFile and the call costs
  # nothing.
  def image?(file)
    return false if file.nil?

    extension = ::File.extname(file.try(:path).to_s).downcase.delete_prefix(".")
    return IMAGE_EXTENSIONS.include?(extension) if extension.present?

    content_type = file.try(:content_type).to_s
    IMAGE_EXTENSIONS.any? { |candidate| content_type.include?(candidate) }
  end

end