class AvatarUploader < CarrierWave::Uploader::Base
  include CarrierWave::RMagick
  storage Rails.env.development? ? :file : :fog

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
       elsif model.is_a? Unit
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
    resize_to_fit(200, 200)
  end

  process :resize_id_card

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

  process :crop

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
    elsif  model.is_a? Unit
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
end
