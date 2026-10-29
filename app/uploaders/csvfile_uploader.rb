class CsvfileUploader < CarrierWave::Uploader::Base
  prepend SharedSourceStorage

  include CarrierWave::MiniMagick

  storage Rails.env.development? ? :file : :fog

  def store_dir
    "uploads/#{model.class.to_s.underscore}/#{mounted_as}/#{model.id}"
  end

  def extension_whitelist
    %w(csv)
  end
end
