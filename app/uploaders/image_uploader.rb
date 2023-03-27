class ImageUploader < CarrierWave::Uploader::Base

  # Include RMagick or MiniMagick support:
   include CarrierWave::RMagick
  # include CarrierWave::MiniMagick
 
  # Choose what kind of storage to use for this uploader:
  #storage :file

  storage Rails.env.development? ? :file : :fog 
  #resize_to_fit(1920, 1080)
  # Override the directory where uploaded files will be stored.
  # This is a sensible default for uploaders that are meant to be mounted:


  def filename
    if model.crop_x.present?
      @name = original_filename
    else
      @name ||= "#{secure_token}.#{file.extension}" if original_filename.present?
    end
  end

  def timestamp
    var = :"@#{mounted_as}_timestamp"
    model.instance_variable_get(var) or model.instance_variable_set(var, Time.now.to_i)
  end
  
  def store_dir
    "uploads/#{model.class.to_s.underscore}/#{mounted_as}/#{model.id}"
  end

  version :thumb , from_version: :large do
    # process :crop
    resize_to_fit(384, 210)
  end

  version :large do
    # process :crop
    resize_to_fit(1920, 1080)
  end

  def png_name for_file, version_name
    %Q{#{version_name}_#{for_file.chomp(File.extname(for_file))}.png}
  end
  resize_to_fit(1920, 1080)
  process :crop
  def crop
    if model.crop_x.present?
      manipulate! do |img|
        x = model.crop_x
        y = model.crop_y
        w = model.crop_w
        h = model.crop_h
        img.crop!(x, y, w, h)
        img
      end
    end
  end

  protected
  
  def secure_token
    var = :"@#{mounted_as}_secure_token"
    model.instance_variable_get(var) or model.instance_variable_set(var, SecureRandom.uuid)
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
