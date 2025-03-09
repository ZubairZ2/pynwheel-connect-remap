class SiteMapUploader < CarrierWave::Uploader::Base

  # Include RMagick or MiniMagick support:
  include CarrierWave::RMagick
  # Include the Sprockets helpers
  include Sprockets::Rails::Helper
  # include Piet::CarrierWaveExtension

  # Choose what kind of storage to use for this uploader:
  #storage :file
  process :set_file_dimensions

  def set_file_dimensions
    if image?(file)
      # resize_to_fill(1412, 932)
    end
  end
  #resize_to_fill(1412, 932) 
  #process convert: 'png' ,:if => :svg?
  storage Rails.env.development? ? :file : :fog 

  # Override the directory where uploaded files will be stored.
  # This is a sensible default for uploaders that are meant to be mounted:
  version :svg_for_metro, if: :image? do
    process convert: 'jpg'
    # resize_to_fit(1412, 932)
    def full_filename (for_file = model.image.file) 
      #{}"#{timestamp}-#{model.id.to_s + '.png'}"  
      super.chomp(File.extname(super)) + '.jpg'
    end
  end
  # process optimize: [{quality: 50, level: 7}]

  # process :quality => 40,  :if => :image?
  # def set_file_dimensions
  #   if image?(file)
  #     # manipulate! do |source|
  #     #   overlay_path = Rails.root.join("app/assets/images/bg.png")
  #     #   overlay = Magick::Image.read(overlay_path).first
  #     #   source = source.resize_to_fit(1412, 932)
  #     #   overlay.composite!(source, Magick::CenterGravity, Magick::OverCompositeOp)
  #     # end
  #     resize_to_fit(1412, 932)
  #   end
  # end

  def filename
    #if svg?(file)
      #@name ||= "#{timestamp}-#{super.chomp(File.extname(super)) + '.png'}" if original_filename.present?
    #else
      #@name ||= "#{timestamp}-#{super}" if original_filename.present? and super.present?
    #end
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

  # Provide a default URL as a default if there hasn't been a file uploaded:
  # def default_url(*args)
  #   # For Rails 3.1+ asset pipeline compatibility:
  #   # ActionController::Base.helpers.asset_path("fallback/" + [version_name, "default.png"].compact.join('_'))
  #
  #   "/images/fallback/" + [version_name, "default.png"].compact.join('_')
  # end

  # Process files as they are uploaded:
  # process scale: [200, 300]
  #
  # def scale(width, height)
  #   # do something
  # end

  # Create different versions of your uploaded files:
  # version :thumb do
  #   process resize_to_fit: [50, 50]
  # end

  # Add a white list of extensions which are allowed to be uploaded.
  # For images you might use something like this:
  # def extension_whitelist
  #   %w(jpg jpeg gif png)
  # end

  # Override the filename of the uploaded files:
  # Avoid using model.id or version_name here, see uploader/store.rb for details.
  # def filename
  #   "something.jpg" if original_filename
  # end

end