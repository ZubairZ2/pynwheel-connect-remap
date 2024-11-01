class TestUploader < CarrierWave::Uploader::Base
  include CarrierWave::RMagick
  include Sprockets::Rails::Helper
  storage :fog

  process convert: 'jpg'
  resize_to_fit(1412, 932)

  def full_filename (for_file = model.image.file) 
    super.chomp(File.extname(super)) + '.jpg'
  end 

  def store_dir
    "uploads/#{model.class.to_s.underscore}/#{mounted_as}/#{model.id}"
  end
end
