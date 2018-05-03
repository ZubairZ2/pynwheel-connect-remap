module StandardUrl
  extend ActiveSupport::Concern

  def set_standard_url(klass,id)
    model = klass.constantize.find(id)
    model.update_attribute(:standard_image_url, model.image.url) 
    if klass == "Floorplate"
      model.update_attribute(:width ,model.image.width)
      model.update_attribute(:height, model.image.height)
      model.update_attribute(:svg_image_url, model.image.url(:svg_for_metro)) if model.image.url(:svg_for_metro).present?
    end
  end

end