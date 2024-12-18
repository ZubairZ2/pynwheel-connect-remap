class GalleryUploader < CarrierWave::Uploader::Base
  include CarrierWave::RMagick
  include CarrierWave::Video
  include CarrierWave::Video::Thumbnailer
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

  version :thumb , from_version: :large, :if => :image? do
    process :crop
    resize_to_fit(640, 360)
  end

  version :video_thumbnail, :if => :video? do
    process thumbnail: [{format: 'png', quality: 10, size: 192, strip: true, logger: Rails.logger}]
    def full_filename for_file
      png_name for_file, version_name
    end
  end

  version :ios, :if => :image? do
    resize_to_limit(1024, 768)
  end

  process :crop
  resize_to_limit(1920, 1080)
  version :large, :if => :image? do
    resize_to_limit(1920, 1080)
  end

  def png_name for_file, version_name
    %Q{#{version_name}_#{for_file.chomp(File.extname(for_file))}.png}
  end


  def crop
    if model.crop_x.present?
      begin
        manipulate! do |img|
          x = model.crop_x
          y = model.crop_y
          w = model.crop_w
          h = model.crop_h
          img.crop!(x, y, w, h)
          img
        end
      rescue => ex
      end
    end
  end

  protected
  
  def secure_token
    var = :"@#{mounted_as}_secure_token"
    model.instance_variable_get(var) or model.instance_variable_set(var, SecureRandom.uuid)
  end

  def image?(new_file)
    return false if new_file.nil? || new_file.content_type.nil?
    new_file.content_type.start_with?('image')
  end
  
  def video?(new_file)
    return false if new_file.nil? || new_file.content_type.nil?
    new_file.content_type.start_with?('application')
  end

end
