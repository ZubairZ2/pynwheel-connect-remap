class AvatarUploader < CarrierWave::Uploader::Base

  # Include RMagick or MiniMagick support:
  include CarrierWave::RMagick
  # include Piet::CarrierWaveExtension
  # include CarrierWave::MiniMagick

  # Choose what kind of storage to use for this uploader:
  #storage :file

  storage Rails.env.development? ? :file : :fog

  # Override the directory where uploaded files will be stored.
  # This is a sensible default for uploaders that are meant to be mounted:
   def filename
     if (model.is_a? Community) || (model.is_a? Floorplan) || (model.is_a? AdditionalImage) || (model.is_a? Amenity) || (model.is_a? Unit)
       if model.is_a? Amenity
         if  model.crop_x.present?
           @name = original_filename
         else
           @name ||= "#{model.id}-#{timestamp}-#{SecureRandom.hex(4)}-#{super}" if original_filename.present? and super.present?
         end
       elsif model.is_a? Floorplan
         if !model.image_bit.nil? && model.crop_x.present?
           @name = original_filename
         elsif !model.image_bit.nil? && model.crop_x_secondary.present?
           @name = original_filename
         else
           @name ||= "#{model.id}-#{timestamp}-#{SecureRandom.hex(4)}-#{super}" if original_filename.present? and super.present?
         end
       elsif model.is_a? Community
         if !model.image_bit.nil? && model.crop_x.present?
           @name = original_filename
         elsif !model.image_bit.nil? && model.crop_x_secondary.present?
           @name = original_filename
         else
           @name ||= "#{model.id}-#{timestamp}-#{SecureRandom.hex(4)}-#{super}" if original_filename.present? and super.present?
         end
       else
         if model.crop_x.present?
           @name = original_filename
         else
           @name ||= "#{model.id}-#{timestamp}-#{SecureRandom.hex(4)}-#{super}" if original_filename.present? and super.present?
         end
       end
     else
       @name ||= "#{model.id}-#{timestamp}-#{SecureRandom.hex(4)}-#{super}" if original_filename.present? and super.present?
     end

   end
  version :thumb do
    # process :crop
    resize_to_fit(200, 200)
  end

  process :quality => 40 , :if => :image?
  process :resize_id_card

  # process optimize: [{quality: 20, level: 7}]
  # resize_to_fit(500, 500)
  def timestamp
    var = :"@#{mounted_as}_timestamp"
    model.instance_variable_get(var) or model.instance_variable_set(var, Time.now.to_i)
  end
  def image?(file)
    file.content_type.include?('png') || file.content_type.include?('jpg') || file.content_type.include?('jpeg')
  end
  def store_dir
    "uploads/#{model.class.to_s.underscore}/#{mounted_as}/#{model.id}"
  end
  # version :orignal do
  process :crop
  #   resize_to_limit(1920, 1080)
  #   #process resize_and_crop: 200
  # end

  def resize_id_card
    if model.is_a? TourUser
      if model.crop_image_bit
        manipulate! do |img|
          img = img.auto_orient
          crop_w = (img.columns.to_f / 100.0) * 94.0
          crop_h = (img.rows.to_f / 100.0) * 49.6
          crop_x = (img.rows.to_f / 100.0) * 0.0175
          crop_y = (img.rows.to_f / 100.0) * 25.2
          img.crop!(crop_x, crop_y, crop_w, crop_h)

          img
        end
      else
        manipulate! do |img|
          img = img.auto_orient
          crop_w = (img.columns.to_f / 100.0) * 95.0
          crop_h = (img.rows.to_f / 100.0) * 35.63
          crop_x = (img.rows.to_f / 100.0) * 1.45
          crop_y = (img.rows.to_f / 100.0) * 41.27
          img.crop!(crop_x, crop_y, crop_w, crop_h)

          img
        end
      end

      # resize_to_fit(1980, 1080)
    end
    if model.is_a? VisitedStop
      manipulate! do |img|
        img = img.auto_orient
        img
      end
    end
  end

  def crop
    if model.is_a? Floorplan
      if (model.image_bit.nil? ? false : model.image_bit) && model.crop_x.present?
        manipulate! do |img|

          xx = model.crop_x
          yy = model.crop_y
          ww = model.crop_w
          hh = model.crop_h
          img.crop!(xx, yy, ww, hh)
          img
        end
      else
        if (model.image_bit.nil? ? false : !model.image_bit) && model.crop_x_secondary.present?
          manipulate! do |img|

            xx = model.crop_x_secondary
            yy = model.crop_y_secondary
            ww = model.crop_w_secondary
            hh = model.crop_h_secondary
            img.crop!(xx, yy, ww, hh)
            img
          end
        end
      end
    elsif  model.is_a? Community
      if (model.image_bit.nil? ? false : model.image_bit) && model.crop_x.present?
        manipulate! do |img|

          xx = model.crop_x
          yy = model.crop_y
          ww = model.crop_w
          hh = model.crop_h
          img.crop!(xx, yy, ww, hh)
          img
        end
      else
        if (model.image_bit.nil? ? false : !model.image_bit) && model.crop_x_secondary.present?
          manipulate! do |img|

            xx = model.crop_x_secondary
            yy = model.crop_y_secondary
            ww = model.crop_w_secondary
            hh = model.crop_h_secondary
            img.crop!(xx, yy, ww, hh)
            img
          end
        end
      end
      if model.is_a? Amenity
        if model.crop_x.present?
          manipulate! do |img|
            xx = model.crop_x
            yy = model.crop_y
            ww = model.crop_w
            hh = model.crop_h
            img.crop!(xx, yy, ww, hh)
            img
          end
        end
    end
    else
      if (model.is_a? Community) || (model.is_a? Floorplan) || (model.is_a? AdditionalImage) || (model.is_a? Amenity)
        if model.crop_x.present?
          manipulate! do |img|
            xx = model.crop_x
            yy = model.crop_y
            ww = model.crop_w
            hh = model.crop_h
            img.crop!(xx, yy, ww, hh)
            img
          end
        end
      end
    end

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
