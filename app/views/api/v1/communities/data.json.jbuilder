local_assets_base_url = "http://192.168.101.77:3000"
json.version '1.0.0.6'
json.ui_settigs do
  json.theme @community.theme_name
  json.animation @community.design.animation
  if gables_theme(@community)
    json.logo @community.secondary_logo.present? ? (Rails.env.development? ? local_assets_base_url+@community.secondary_logo.url : @community.secondary_logo.url) : asset_url("pynwheel-default-logo.png")
    json.secondary_logo @community.logo.present? ? (Rails.env.development? ? local_assets_base_url+@community.logo.url : @community.logo.url) : asset_url("pynwheel-default-logo.png")
  else
    json.logo @community.logo.present? ? (Rails.env.development? ? local_assets_base_url+@community.logo.url : @community.logo.url) : asset_url("pynwheel-default-logo.png")
  end  
  #if (style_themes.include? @community.theme_name) && @community.design.present?
    json.fonts do
      json.primary_font_family @community.design.primary_font_family
      json.primary_font_size @community.design.primary_font_size
      json.primary_font_weight @community.design.primary_font_weight
      json.primary_text_align @community.design.primary_text_align
      json.primary_font_color @community.design.primary_font_color.present? ? @community.design.primary_font_color : "#FFFFFF"
      json.secondary_font_family @community.design.secondary_font_family
      json.secondary_font_size @community.design.secondary_font_size
      json.secondary_font_weight @community.design.secondary_font_weight
      json.secondary_text_align @community.design.secondary_text_align
      json.secondary_font_color @community.design.secondary_font_color
    end
    json.menu do
      json.menu_position @community.design.menu.position
      json.horizontal_menu_position @community.design.menu.horizontal_menu_position
      json.vertical_menu_position @community.design.menu.vertical_menu_position
      json.manage_background @community.design.menu.manage_background
      json.background_color @community.design.menu.background_color.present? ? @community.design.menu.background_color : "#F9AD90"
      json.primary_color @community.design.primary_color.present? ? @community.design.primary_color : "#CF492F"
      json.secondary_color @community.design.secondary_color.present? ? @community.design.secondary_color : "#4F4F4F"
      json.navigation_text_color @community.design.menu.navigation_text_color.present? ? @community.design.menu.navigation_text_color : "#636363"
      json.navigation_background_color @community.design.menu.navigation_background_color.present? ? @community.design.menu.navigation_background_color : "#FDFDFD"
    end

    json.gables do 
      json.hide_tagline @community.design.gable.present? ? @community.design.gable.hide_tagline : true
      json.appartment_button_color (@community.design.gable.present? and @community.design.gable.appartment_button_color.present?) ? @community.design.gable.appartment_button_color : "#8A8A8D" 
      json.gallery_button_color (@community.design.gable.present? and @community.design.gable.gallery_button_color.present?) ? @community.design.gable.gallery_button_color : "#44797B" 
      json.neighborhood_button_color (@community.design.gable.present? and @community.design.gable.neighborhood_button_color.present?) ? @community.design.gable.neighborhood_button_color : "#0475A9" 
      json.favorite_button_color (@community.design.gable.present? and @community.design.gable.favorite_button_color.present?) ? @community.design.gable.favorite_button_color : "#D5C228" 
      json.filter_panel_color (@community.design.gable.present? and @community.design.gable.filter_panel_color.present?) ? @community.design.gable.filter_panel_color : "#467A7D" 
      json.webpages_button_color (@community.design.gable.present? and @community.design.gable.webpages_button_color.present?) ? @community.design.gable.webpages_button_color : "#96348F" 
      json.imagepages_button_color (@community.design.gable.present? and @community.design.gable.imagepages_button_color.present?) ? @community.design.gable.imagepages_button_color : "#96348F" 
    end
    
    json.expressionist do
      json.global_navigation do
        json.global_navigation_font_color @community.design.global_navigation_font_color.present? ? @community.design.global_navigation_font_color : "#ffff"
        json.global_navigation_background_color @community.design.global_navigation_background_color.present? ? @community.design.global_navigation_background_color : "#565455"
        json.global_navigation_button_color @community.design.global_navigation_button_color.present? ? @community.design.global_navigation_button_color : "#3B3B3B"
        json.global_navigation_buttons_opacity @community.design.global_navigation_buttons_opacity.present? ? @community.design.global_navigation_buttons_opacity : "100%" 
        json.global_nav_bg_opacity @community.design.global_nav_bg_opacity.present? ? @community.design.global_nav_bg_opacity : "100%"
        json.button_shape @community.design.button_shape.present? ? @community.design.button_shape : "Rectangular"
        json.global_nav_buttons_height @community.design.global_nav_buttons_height.present? ? @community.design.global_nav_buttons_height : "110px"
        json.global_nav_buttons_width @community.design.global_nav_buttons_width.present? ? @community.design.global_nav_buttons_width : "110px"
        json.secondary_page_menu_border @community.design.secondary_page_menu_border.present? ? @community.design.secondary_page_menu_border : "All sides"
        json.buttons_as_image @community.design.buttons_as_image 
        json.global_nav_button_on @community.design.global_nav_button_on.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.global_nav_button_on.url : @community.design.global_nav_button_on.url) : "No Image"
        json.global_nav_button_off @community.design.global_nav_button_off.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.global_nav_button_off.url : @community.design.global_nav_button_off.url) : "No Image"
      end
      json.filter_panel do
        json.filter_panel_color @community.design.filter_panel_color.present? ? @community.design.filter_panel_color : "#3B3B3B"
        json.filter_panel_font_style @community.design.filter_panel_font_style.present? ? @community.design.filter_panel_font_style : "Arial"
        json.filter_panel_font_color @community.design.filter_panel_font_color.present? ? @community.design.filter_panel_font_color : "#ffff"
        json.filter_button_color @community.design.filter_button_color.present? ? @community.design.filter_button_color : "#565455"
        json.filter_button_font_style @community.design.filter_button_font_style.present? ? @community.design.filter_button_font_style : "Arial"
        json.filter_button_font_color @community.design.filter_button_font_color.present? ? @community.design.filter_button_font_color : "#ffff"
        json.filter_panel_opacity @community.design.filter_panel_opacity.present? ? @community.design.filter_panel_opacity : "100%"
        json.filter_buttons_opacity @community.design.filter_buttons_opacity.present? ? @community.design.filter_buttons_opacity : "100%"
        json.gallery_buttons_opacity @community.design.gallery_buttons_opacity.present? ? @community.design.gallery_buttons_opacity : "100%"
        json.filter_menu_buttons_border @community.design.filter_menu_buttons_border.present? ? @community.design.filter_menu_buttons_border : "All sides"
        json.gallery_buttons_border @community.design.gallery_buttons_border.present? ? @community.design.gallery_buttons_border : "All sides" 
        json.filter_button_as_image @community.design.filter_button_as_image
        json.gallery_button_as_image @community.design.gallery_button_as_image
        json.filter_panel_background_as_image @community.design.filter_panel_background_as_image
        json.filter_button @community.design.filter_button.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.filter_button.url : @community.design.filter_button.url) : "No Image"
        json.gallery_button @community.design.gallery_button.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.gallery_button.url : @community.design.gallery_button.url) : "No Image"
        json.filter_panel_background_image @community.design.filter_panel_background_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.filter_panel_background_image.url : @community.design.filter_panel_background_image.url) : "No Image"
      end
      json.home_page do
        json.home_page_menu_position (@community.design.expressionist.present? and @community.design.expressionist.home_page_menu_position.present?) ? @community.design.expressionist.home_page_menu_position : "Top"
        json.home_page_position_of_logo (@community.design.expressionist.present? and @community.design.expressionist.home_page_position_of_logo.present?) ? @community.design.expressionist.home_page_position_of_logo : "Right"
        json.home_page_logo_size (@community.design.expressionist.present? and @community.design.expressionist.home_page_logo_size.present?) ? @community.design.expressionist.home_page_logo_size : "487x160"
        json.home_page_button_border_color (@community.design.expressionist.present? and @community.design.expressionist.home_page_button_border_color.present?) ? @community.design.expressionist.home_page_button_border_color : "#565455"
        json.display_home_page_button_icon @community.design.expressionist.present? ? @community.design.expressionist.display_home_page_button_icon : true
        json.display_home_page_nav_background @community.design.expressionist.present? ? @community.design.expressionist.display_home_page_nav_background : true
        json.home_page_button_font_family (@community.design.expressionist.present? and @community.design.expressionist.home_page_button_font_family.present?) ? @community.design.expressionist.home_page_button_font_family : "Arial"
        json.home_page_button_font_size (@community.design.expressionist.present? and @community.design.expressionist.home_page_button_font_size.present?) ? @community.design.expressionist.home_page_button_font_size : "8px"
        json.home_page_button_image (@community.design.expressionist.present? and @community.design.expressionist.home_page_button_image.present?) ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.home_page_button_image.url : @community.design.expressionist.home_page_button_image.url) : "No Image"
        json.home_page_button_shape @community.design.home_page_button_shape.present? ? @community.design.home_page_button_shape : "Rectangular"
        json.home_page_buttons_border @community.design.home_page_buttons_border.present? ? @community.design.home_page_buttons_border : "All sides"
        json.home_page_navigation_background_height @community.design.home_page_navigation_background_height.present? ? @community.design.home_page_navigation_background_height : "250px"
        json.home_page_navigation_background_color @community.design.home_page_navigation_background_color.present? ? @community.design.home_page_navigation_background_color : "#565455"
        json.home_page_navigation_button_color @community.design.home_page_navigation_button_color.present? ? @community.design.home_page_navigation_button_color : "#3B3B3B"
        json.home_page_navigation_font_color @community.design.home_page_navigation_font_color.present? ? @community.design.home_page_navigation_font_color : "#ffff"
        json.home_page_buttons_height @community.design.home_page_buttons_height.present? ? @community.design.home_page_buttons_height : "110px"
        json.home_page_buttons_width @community.design.home_page_buttons_width.present? ? @community.design.home_page_buttons_width : "110px"
        json.home_page_buttons_opacity @community.design.home_page_buttons_opacity.present? ? @community.design.home_page_buttons_opacity : "100%"
        json.home_page_navigation_background_opacity @community.design.home_page_navigation_background_opacity.present? ? @community.design.home_page_navigation_background_opacity : "100%"
      end
      json.map_marker do
        json.marker_background_color @community.design.marker_background_color.present? ? @community.design.marker_background_color : "#565455"
        json.marker_style @community.design.marker_style.present? ? @community.design.marker_style : "Tear Drop"
      end
      json.floorplan_unit_popup do
        json.header_bg_color @community.design.header_bg_color.present? ? @community.design.header_bg_color : "#ada6a6"
        json.header_font_color @community.design.header_font_color.present? ? @community.design.header_font_color : "#ffffff"
        json.details_bg_color @community.design.details_bg_color.present? ? @community.design.details_bg_color : "#ada6a6"
        json.details_font_color @community.design.details_font_color.present? ? @community.design.details_font_color : "#ffff"
        json.available_appartments_font_color @community.design.available_appartments_font_color.present? ? @community.design.available_appartments_font_color : "#ffff"
        json.available_appartments_bg_color @community.design.available_appartments_bg_color.present? ? @community.design.available_appartments_bg_color : "#ada6a6"
        json.floor_bg_color @community.design.floor_bg_color.present? ? @community.design.floor_bg_color : "#565455"
        json.unit_header_bg_color @community.design.unit_header_bg_color.present? ? @community.design.unit_header_bg_color : "#ada6a6"
        json.unit_header_font_color @community.design.unit_header_font_color.present? ? @community.design.unit_header_font_color : "#ffff"
        json.unit_details_font_color @community.design.unit_details_font_color.present? ? @community.design.unit_details_font_color : "#ffff"
        json.unit_details_bg_color @community.design.unit_details_bg_color.present? ? @community.design.unit_details_bg_color : "#ada6a6"
        json.floorplan_name_bg_color @community.design.floorplan_name_bg_color.present? ? @community.design.floorplan_name_bg_color : "#ada6a6"
        json.floorplan_name_font_color @community.design.floorplan_name_font_color.present? ? @community.design.floorplan_name_font_color : "#ffff"
        json.unit_bg_color @community.design.unit_bg_color.present? ? @community.design.unit_bg_color : "#565455"
      end
    end
    
  #end
end

json.homescreen do
  if @community.design.present?
    if @community.design.home_page_images.present?
      #json.images @community.design.home_page_images.order(:sort) do |img|
      json.images @community.design.home_page_images do |img|
        json.filename img.name
        json.url Rails.env.development? ? local_assets_base_url+img.large_image_url : img.large_image_url
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
    if gables_theme(@community) && @community.design.secondary_images.present?
      json.secondary_images @community.design.secondary_images.each do |img|
        json.filename img.name
        json.url img.is_a?(DefaultImage) ? asset_url(img.image) : (Rails.env.development? ? local_assets_base_url+img.image.url(:large) : img.image.url(:large))
      end
    end
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
  if @community.has_floorplates?
    json.map_type "floorplates"
  else
    json.map_type "sitemap"
  end
  json.show_apartment_page @community.show_apartment
  json.apartment_page_name @community.apartment_page_name
  if @community.sitemap.present? and !@community.has_floorplates? 
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
  json.units @community.units.available_units do |unit|
    if floorplans.any?{|f| f.provider_floorplan_id == unit.floorplan_id}
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
      json.image unit.standard_image_url.present? ? (Rails.env.development? ? local_assets_base_url+unit.standard_image_url : unit.standard_image_url) : (floorplan.present? && floorplan.standard_image_url.present? ? (Rails.env.development? ? local_assets_base_url+floorplan.standard_image_url : floorplan.standard_image_url) : nil)
      json.floorplan_image floorplan.present? ? (floorplan.standard_image_url.present? ? (Rails.env.development? ? local_assets_base_url+floorplan.standard_image_url : floorplan.standard_image_url) : nil) : nil
      # json.floorplate_number unit.floorplate.present? ? unit.floorplate.number : 0
      json.floorplate_number unit.floor.present? ? unit.floor : 0
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
    json.image floorplan.standard_image_url.present? ? (Rails.env.development? ? local_assets_base_url+floorplan.standard_image_url : floorplan.standard_image_url) : nil
    json.virtual_tour floorplan.virtual_tour_url unless params[:action] == "ios_data"
    json.floorplan_amenities floorplan.amenities.plotted_amenities do |amenity|
      json.image amenity.standard_image_url.present? ? (Rails.env.development? ? local_assets_base_url+amenity.standard_image_url : amenity.standard_image_url) : nil
      json.name amenity.name
      json.x_plot amenity.x_plot
      json.y_plot amenity.y_plot
      json.floorplan_id floorplan.id
      json.id amenity.id
    end
  end
  #json.floorplates @community.floorplates.order("number DESC") do |floorplate|
  if @community.has_floorplates?
    floorplates = @community.floorplates
    floors = floorplates.map{|f| f.floors}.flatten.sort.reverse
    # floorplates = floorplates.sort_by { |f| -f.number }
    json.floorplates floors do |floor|
      floorplate = floorplates.select{|f| f.floors.include?(floor)}.first
      image_url = floorplate.svg_image_url.present? ? floorplate.svg_image_url : floorplate.standard_image_url
      # json.id floorplate.id
      json.id floor
      json.number floor
      json.name floorplate.name
      # json.range floorplate.range
      json.image floorplate.image_url.present? ? (Rails.env.development? ? local_assets_base_url+image_url : image_url) : nil
      json.floorplate_amenities floorplate.amenities do |amenity|
        if (amenity.x_plot.present? && amenity.y_plot.present?) && (amenity.x_plot > 0 || amenity.y_plot > 0)
          json.image amenity.standard_image_url.present? ? (Rails.env.development? ? local_assets_base_url+amenity.standard_image_url : amenity.standard_image_url) : nil
          json.name amenity.name
          json.x_plot amenity.x_plot
          json.y_plot amenity.y_plot
          json.floorplate_id floor
          json.id amenity.id
        end
      end
    end
  else
    json.floorplates nil  
  end
end

json.neighborhood do
  if @community.neighborhood.present?
    json.show_neighborhood_page @community.neighborhood.show_neighborhood
    json.neighborhood_page_name @community.neighborhood.neighborhood_name
    json.latitude @community.neighborhood.latitude.present? ? @community.neighborhood.latitude : @community.latitude
    json.longitude @community.neighborhood.longitude.present? ? @community.neighborhood.longitude : @community.longitude
    json.radius @community.neighborhood.radius.present? ? @community.neighborhood.radius : 1000
    json.zoom @community.neighborhood.zoom.present? ? @community.neighborhood.zoom : 14
    json.address @community.neighborhood.address.present? ? @community.neighborhood.address : @community.make_address
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
  else
    json.show_neighborhood_page true
    json.neighborhood_page_name "Neighborhood"
  end
end

json.favorite do
  if @community.favorite_setting.present?
    json.show_favorite_page @community.favorite_setting.show_favorite
    json.favorite_page_name @community.favorite_setting.favorite_name
    json.email_from @community.favorite_setting.email_from
    json.email_bcc @community.favorite_setting.email_bcc
  else
    json.show_favorite_page true
    json.favorite_page_name "Favorites"
  end
end

json.gallery do
  json.show_gallery_page @community.show_gallery
  json.gallery_page_name @community.gallery_page_name
  if @community.gallery_images.present?
    json.categories @community.galleries.pluck(:name).each do |name|
      json.title name
    end
    #json.images @community.gallery_images.order(:sort).each_with_index.to_a do |(img,index)|
    json.images @community.gallery_images.each do |img|
      unless params[:action] == "ios_data"
        if img.standard_image_url.include?(".mp4") || img.standard_image_url.include?(".MP4")
          json.url Rails.env.development? ? local_assets_base_url+img.standard_image_url : img.standard_image_url
          json.video true
          json.poster "https://images-pynwheel-cms-v2.s3.amazonaws.com/uploads/amenity/image/124/124-1518624577-video-placeholder.jpg"
        else
          json.url Rails.env.development? ? local_assets_base_url+img.large_image_url : img.large_image_url
          json.video false
        end
        json.type img.gallery.name
        json.id img.id
      else
        if !img.standard_image_url.include?(".mp4") and !img.standard_image_url.include?(".MP4")
          json.url Rails.env.development? ? local_assets_base_url+img.ios_image_url : img.ios_image_url
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