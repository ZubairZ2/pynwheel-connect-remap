module StandardUrl
  extend ActiveSupport::Concern

  def set_standard_url(klass,id)
    model = klass.constantize.find(id)
    model.update_column(:standard_image_url, model.image.url) 
    if klass == "Floorplate"
      model.update_column(:svg_image_url, model.image.url(:svg_for_metro)) if model.image.url(:svg_for_metro).present?
    end

    if klass == "HomePageImage"
      model.update_column(:thumb_image_url, model.image.url(:thumb))
      model.update_column(:large_image_url, model.image.url(:large)) 
    end
  end

end