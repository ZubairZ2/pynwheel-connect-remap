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

  def image?(file)
    file&.content_type&.include?('png') || file&.content_type&.include?('jpg') || file&.content_type&.include?('jpeg')
  end

end