class ImageUploader < CarrierWave::Uploader::Base
  include CarrierWave::RMagick

  storage Rails.env.development? ? :file : :fog 

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
    resize_to_fit(384, 210)
  end

  version :large do
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
end
