local_assets_base_url = "http://192.168.101.77:3000"
json.ui_settigs do
  json.theme @community.theme_name
  json.logo @community.logo.present? ? (Rails.env.development? ? local_assets_base_url+@community.logo.url : @community.logo.url) : asset_path("logo-small.png")
end

json.homescreen do
  if @community.design.present?
    if @community.design.home_page_images.present?
      #json.images @community.design.home_page_images.order(:sort) do |img|
      json.images @community.design.home_page_images do |img|
        json.filename img.name
        json.url Rails.env.development? ? local_assets_base_url+img.image.url(:large) : img.image.url(:large)
      end
    else
      json.images DefaultImage.find_each do |img|
        json.filename img.name
        json.url Rails.env.development? ? local_assets_base_url+img.image : asset_url(img.image)
      end
    end
    vid = @community.design.home_page_video.present? ? ( Rails.env.development? ? local_assets_base_url+@community.design.home_page_video.video.url : @community.design.home_page_video.video.url ) : nil
    json.video vid
    json.loop_type vid.present? ? @community.design.loop_type : "images"
  else
    json.images DefaultImage.find_each do |img|
      json.filename img.name
      json.url Rails.env.development? ? local_assets_base_url+img.image : asset_url(img.image)
    end
    json.video nil
    json.loop_type "images"
  end
end

json.apartments do
  if @community.floorplates.present?
    json.map_type "floorplates"
  else
    json.map_type "sitemap"
  end
  if @community.sitemap.present? and !@community.floorplates.present? 
    image_url = @community.sitemap.image.url(:svg_for_metro).present? ? @community.sitemap.image.url(:svg_for_metro) : @community.sitemap.image.url
    json.sitemap Rails.env.development? ? local_assets_base_url+image_url : image_url
    json.sitemap_amenities @community.sitemap.amenities do |amenity|
      json.image amenity.image.present? ? (Rails.env.development? ? local_assets_base_url+amenity.image.url : amenity.image.url) : nil
      json.name amenity.name
      json.x_plot amenity.x_plot
      json.y_plot amenity.y_plot
      json.sitemap_id @community.id
      json.id amenity.id
    end
  else
    json.sitemap nil
  end
  units_floorplans = []
  #json.units @community.units.available_units do |unit|
  floorplans = @community.floorplans
  json.units @community.units do |unit|
    if (unit.x_plot > 0 || unit.y_plot > 0) && unit.availability == "Unoccupied" && floorplans.any?{|f| f.provider_floorplan_id == unit.floorplan_id}
      floorplan = floorplans.select{|f| f.provider_floorplan_id == unit.floorplan_id}.first
      units_floorplans << floorplan
      json.marketing_name unit.marketing_name
      json.rent unit.effective_rent
      json.availability unit.availability
      json.available_date unit.available_date.strftime('%m/%d/%Y') if unit.available_date.present?
      json.x_plot unit.x_plot
      json.y_plot unit.y_plot
      json.building unit.building
      json.floorplan_id floorplan.id
      json.unit_type unit.unit_type
      json.provider_unit_id unit.provider_unit_id
      json.id unit.id
      json.floorplan_name floorplan.present? ? floorplan.name : nil
      json.bedrooms floorplan.present? ? floorplan.bedrooms : 0
      json.bathrooms floorplan.present? ? convert_float_to_integer(floorplan.bathrooms) : 0
      json.square_feet floorplan.present? ? floorplan.square_feet : 0
      json.image unit.image.present? ? (Rails.env.development? ? local_assets_base_url+unit.image.url : unit.image.url) : (floorplan.present? && floorplan.image.present? ? (Rails.env.development? ? local_assets_base_url+floorplan.image.url : floorplan.image.url) : nil)
      json.floorplan_image floorplan.present? ? (floorplan.image.present? ? (Rails.env.development? ? local_assets_base_url+floorplan.image.url : floorplan.image.url) : nil) : nil
      json.floorplate_number unit.floorplate.present? ? unit.floorplate.number : 0
    end
  end
  json.floorplans units_floorplans.uniq do |floorplan|
    json.id floorplan.id
    json.provider_floorplan_id floorplan.provider_floorplan_id
    json.name floorplan.name
    json.rent floorplan.market_rent
    json.units_available floorplan.units_available
    json.unit_count floorplan.unit_count
    json.bedrooms floorplan.bedrooms
    json.bathrooms floorplan.bathrooms
    json.square_feet floorplan.square_feet
    json.description floorplan.description
    json.image floorplan.image.present? ? (Rails.env.development? ? local_assets_base_url+floorplan.image.url : floorplan.image.url) : nil
    json.virtual_tour floorplan.virtual_tour_url unless params[:action] == "ios_data"
    json.floorplan_amenities floorplan.amenities do |amenity|
      json.image amenity.image.present? ? (Rails.env.development? ? local_assets_base_url+amenity.image.url : amenity.image.url) : nil
      json.name amenity.name
      json.x_plot amenity.x_plot
      json.y_plot amenity.y_plot
      json.floorplan_id floorplan.id
      json.id amenity.id
    end
  end
  #json.floorplates @community.floorplates.order("number DESC") do |floorplate|
  floorplates = @community.floorplates
  floorplates = floorplates.sort_by { |f| -f.number }
  json.floorplates floorplates do |floorplate|
    image_url = floorplate.image.url(:svg_for_metro).present? ? floorplate.image.url(:svg_for_metro) : floorplate.image.url
    json.id floorplate.id
    json.number floorplate.number
    json.name floorplate.name
    json.range floorplate.range
    json.image floorplate.image.present? ? (Rails.env.development? ? local_assets_base_url+image_url : image_url) : nil
    json.floorplate_amenities floorplate.amenities do |amenity|
      if (amenity.x_plot.present? && amenity.y_plot.present?) && (amenity.x_plot > 0 || amenity.y_plot > 0)
        json.image amenity.image.present? ? (Rails.env.development? ? local_assets_base_url+amenity.image.url : amenity.image.url) : nil
        json.name amenity.name
        json.x_plot amenity.x_plot
        json.y_plot amenity.y_plot
        json.floorplate_id floorplate.id
        json.id amenity.id
      end
    end
  end
end

json.neighborhood do
  if @community.neighborhood.present?
    json.latitude @community.neighborhood.latitude
    json.longitude @community.neighborhood.longitude
    json.radius @community.neighborhood.radius
    json.zoom @community.neighborhood.zoom
    json.address @community.neighborhood.address
    arr = @community.neighborhood.category.split(',')
    arr.insert(0,'All')
    json.categories arr.each do |val|
      json.title val
    end
    if @community.neighborhood.locations.present?
      json.locations @community.neighborhood.locations.each do |location|
        json.title location.title
        json.address location.address
        json.latitude location.latitude
        json.longitude location.longitude
        json.category location.category
      end
    end
  end
end

json.favorite do
  if @community.favorite_setting.present?
    json.email_from @community.favorite_setting.email_from
    json.email_bcc @community.favorite_setting.email_bcc
  end
end

json.gallery do
  if @community.gallery_images.present?
    json.categories @community.galleries.pluck(:name).each do |name|
      json.title name
    end
    #json.images @community.gallery_images.order(:sort).each_with_index.to_a do |(img,index)|
    json.images @community.gallery_images.each_with_index.to_a do |(img,index)|
      unless params[:action] == "ios_data"
        if img.image.file.extension.downcase == 'mp4'
          json.url Rails.env.development? ? local_assets_base_url+img.image.url : img.image.url
          json.video true
          json.poster "https://images-pynwheel-cms-v2.s3.amazonaws.com/uploads/amenity/image/124/124-1518624577-video-placeholder.jpg"
        else
          json.url Rails.env.development? ? local_assets_base_url+img.image.url(:large) : img.image.url(:large)
          json.video false
        end
        json.type img.gallery.name
        json.id img.id
      else
        unless img.is_video?
          json.url Rails.env.development? ? local_assets_base_url+img.image.url(:ios) : img.image.url(:ios)
          json.video false
          json.type img.gallery.name
          json.id img.id
        end
      end
    end
  end
end

json.additional_pages do
  if @community.webpages.present?
    json.webpages @community.webpages.active.each do |webpage|
      json.id webpage.id
      json.title webpage.name
      json.url webpage.url
    end
  end
  if @community.imagepages.present?
    json.imagepages @community.imagepages.active.each do |imagepage|
      json.id imagepage.id
      json.title imagepage.name
      json.slideshow imagepage.is_slideshow
      if imagepage.additional_images.present?
        json.images imagepage.additional_images.each do |image|
          json.title image.name
          json.image Rails.env.development? ? local_assets_base_url+image.image.url : image.image.url
        end
      end
    end
  end
end

json.message "success"
json.operation "data"