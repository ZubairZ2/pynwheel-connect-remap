class DesignUploader < CarrierWave::Uploader::Base

  include CarrierWave::MiniMagick

  storage Rails.env.development? ? :file : :fog

  def store_dir
    "uploads/#{model.class.to_s.underscore}/#{mounted_as}/#{model.id}"
  end

  def size_range
    0..150000.kilobytes
  end

end
