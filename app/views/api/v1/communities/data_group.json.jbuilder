json.group_name @community_group.name
json.compant_name @community_group.company.name
json.group_address @community_group.address
json.page_type @community_group.page_type ? "map" : "menu"
json.page_name @community_group.page_name
json.logo @community_group.logo.present? ? @community_group.logo.url : "No image"
json.inactivate !@community_group.inactivate

json.homepage_design do
  json.logo_position @community_group.group_design.present? ? (@community_group.group_design.logo_position.present? ? @community_group.group_design.logo_position : "Centre") : "Centre" rescue "Centre"
  json.logo_size @community_group.group_design.present? ? (@community_group.group_design.logo_size.present? ? @community_group.group_design.logo_size : "487x160") : "487x160" rescue "Centre"
  json.button_border_color @community_group.group_design.present? ? (@community_group.group_design.button_border_color.present? ? @community_group.group_design.button_border_color : "#3B3B3B") : "#3B3B3B"  rescue "#3B3B3B"
  json.button_shape @community_group.group_design.present? ? (@community_group.group_design.button_shape.present? ? @community_group.group_design.button_shape : "Rectangular") : "Rectangular"  rescue "Rectangular"
  json.button_width @community_group.group_design.present? ? (@community_group.group_design.button_width.present? ? @community_group.group_design.button_width : "450px") : "450px"  rescue "450px"
  json.button_height @community_group.group_design.present? ? (@community_group.group_design.button_height.present? ? @community_group.group_design.button_height : "150px") : "150px"  rescue "150px"
  json.button_spacing  @community_group.group_design.present? ? (@community_group.group_design.button_spacing.present? ? @community_group.group_design.button_spacing : "10px") : "10px"  rescue "10px"
  json.display_button_image @community_group.group_design.present? ? (@community_group.group_design.display_button_image.present? ? @community_group.group_design.display_button_image : false) : false  rescue false
  json.button_image @community_group.group_design.present? ? (@community_group.group_design.background_image.present? ? @community_group.group_design.background_image.url : "No Image") : "No Image"  rescue "No Image"
  json.button_color @community_group.group_design.present? ? (@community_group.group_design.button_color.present? ? @community_group.group_design.button_color : "#3B3B3B") : "#3B3B3B"  rescue "#3B3B3B"
  json.button_opacity @community_group.group_design.present? ? (@community_group.group_design.button_opacity.present? ? @community_group.group_design.button_opacity : "100%") : "100%" rescue "100%"
  json.button_border_side @community_group.group_design.present? ? (@community_group.group_design.button_border_side.present? ? @community_group.group_design.button_border_side : "All sides") : "All sides" rescue "All sides"
  json.button_border_color @community_group.group_design.present? ? (@community_group.group_design.button_border_color.present? ? @community_group.group_design.button_border_color : "#3B3B3B") : "#3B3B3B" rescue "#3B3B3B"
  json.button_border_opacity @community_group.group_design.present? ? (@community_group.group_design.button_border_opacity.present? ? @community_group.group_design.button_border_opacity : "100%") : "100%" rescue "100%"
  json.button_border_thickness @community_group.group_design.present? ? (@community_group.group_design.button_border_thickness.present? ? @community_group.group_design.button_border_thickness : "0px") : "0px" rescue "0px"
  json.button_font_family @community_group.group_design.present? ? (@community_group.group_design.button_font_family.present? ? @community_group.group_design.button_font_family : "") : ""  rescue ""
  json.button_font_size @community_group.group_design.present? ? (@community_group.group_design.button_font_size.present? ? @community_group.group_design.button_font_size : "18px") : "18px"  rescue "18px"
  json.button_font_color @community_group.group_design.present? ? (@community_group.group_design.button_font_color.present? ? @community_group.group_design.button_font_color : "#3B3B3B") : "#3B3B3B" rescue "#3B3B3B"
  json.bouncing_effecting @community_group.group_design.present? ? (@community_group.group_design.bouncing_effecting.present? ? @community_group.group_design.bouncing_effecting : "none") : "none"  rescue "none"
  json.homepage_video @community_group.group_design.present? ? (@community_group.group_design.group_homepage_video.video.present? ? @community_group.group_design.group_homepage_video.video.url : "No video") : "No video"  rescue "No video"
  json.loop_type @community_group.group_design.present? ? (@community_group.group_design.loop_type.present? ? @community_group.group_design.loop_type : "images") : "images" rescue "images"
  json.display_button_text @community_group.group_design.present? ? (@community_group.group_design.display_button_text) : true rescue true
  begin
  json.homepage_images @community_group.group_design.group_homepage_images do |img|
    json.filename img.name.present? ? img.name : ""
    json.url img.image.present? ? img.image.url : "No image"
  end
  rescue
    json.homepage_images []
  end
end

json.community_group @communities do |co|
  @community = co
  json.menu_button_shade @community.menu_button_shade
  if @community.id == @community_master.id
    json.master_community true
    if @community.theme_name == "expressionist"
      if @community.menu_button_shade == "dark"
        json.menu_button_shade "light"
      else
        json.menu_button_shade "dark"
      end
    end
  else
    json.master_community false
  end

  json.menu_button_shade @community_group.menu_button_shade

  json.community_name  @community.name
  json.currency_symbol @community.get_currency_symbol()
  json.country_code DateFormatter.country_code_by_region(@community.country_code)
  json.date_format_by_region DateFormatter.date_format_by_region(@community.country_code) 
  json.community_id  @community.id
  json.data_url "/api/v1/communities/#{@community.id}/data.json"
  json.company_name  Company.find_by(id: @community.company_id).name

  local_assets_base_url = "http://192.168.101.77:3000"
  random_numbers = []
  json.version @version
  json.ui_settigs do
    json.selected_theme @community.temporary_theme_name
    if @community.temporary_theme_name.include?('gables') || @community.temporary_theme_name == 'modernist'
      json.theme @community.temporary_theme_name
    else
      json.theme "expressionist"
    end
    json.animation @community.design.animation.present? ? @community.design.animation : 'bouncing effects'
    if @community.secondary_logo.present? || @community.logo.present?
      if @community.temporary_theme_name == 'modernist23'
        json.secondary_logo @community.secondary_logo.present? ? (Rails.env.development? ? local_assets_base_url+@community.secondary_logo.url + (@community.crop_x_secondary.present? ? "?temp/"+@community.crop_x_secondary.to_s + @community.secondary_logo.url.split('/')[@community.secondary_logo.url.split('/').count - 1] : "") : @community.secondary_logo.url + (@community.crop_x_secondary.present? ? "?temp/"+@community.crop_x_secondary.to_s  + @community.secondary_logo.url.split('/')[@community.secondary_logo.url.split('/').count - 1] : "") ) : (Rails.env.development? ? local_assets_base_url+@community.logo.url + (@community.crop_x.present? ? "?temp/"+@community.crop_x.to_s + @community.logo.url.split('/')[@community.logo.url.split('/').count - 1] : "") : @community.logo.url + (@community.crop_x.present? ? "?temp/" + @community.crop_x.to_s + @community.logo.url.split('/')[@community.logo.url.split('/').count - 1] : "") )

        json.logo @community.logo.present? ? (Rails.env.development? ? local_assets_base_url+@community.logo.url + (@community.crop_x.present? ? "?temp/"+@community.crop_x.to_s + @community.logo.url.split('/')[@community.logo.url.split('/').count - 1] : "") : @community.logo.url + (@community.crop_x.present? ? "?temp/" + @community.crop_x.to_s + @community.logo.url.split('/')[@community.logo.url.split('/').count - 1] : "") ) : (Rails.env.development? ? local_assets_base_url+@community.secondary_logo.url + (@community.crop_x_secondary.present? ? "?temp/"+@community.crop_x_secondary.to_s + @community.secondary_logo.url.split('/')[@community.secondary_logo.url.split('/').count - 1] : "") : @community.secondary_logo.url + (@community.crop_x_secondary.present? ? "?temp/"+@community.crop_x_secondary.to_s  + @community.secondary_logo.url.split('/')[@community.secondary_logo.url.split('/').count - 1] : "") )
      else
        json.logo @community.secondary_logo.present? ? (Rails.env.development? ? local_assets_base_url+@community.secondary_logo.url + (@community.crop_x_secondary.present? ? "?temp/"+@community.crop_x_secondary.to_s + @community.secondary_logo.url.split('/')[@community.secondary_logo.url.split('/').count - 1] : "") : @community.secondary_logo.url + (@community.crop_x_secondary.present? ? "?temp/"+@community.crop_x_secondary.to_s  + @community.secondary_logo.url.split('/')[@community.secondary_logo.url.split('/').count - 1] : "") ) : (Rails.env.development? ? local_assets_base_url+@community.logo.url + (@community.crop_x.present? ? "?temp/"+@community.crop_x.to_s + @community.logo.url.split('/')[@community.logo.url.split('/').count - 1] : "") : @community.logo.url + (@community.crop_x.present? ? "?temp/" + @community.crop_x.to_s + @community.logo.url.split('/')[@community.logo.url.split('/').count - 1] : "") )

        json.secondary_logo @community.logo.present? ? (Rails.env.development? ? local_assets_base_url+@community.logo.url + (@community.crop_x.present? ? "?temp/"+@community.crop_x.to_s + @community.logo.url.split('/')[@community.logo.url.split('/').count - 1] : "") : @community.logo.url + (@community.crop_x.present? ? "?temp/" + @community.crop_x.to_s + @community.logo.url.split('/')[@community.logo.url.split('/').count - 1] : "") ) : (Rails.env.development? ? local_assets_base_url+@community.secondary_logo.url + (@community.crop_x_secondary.present? ? "?temp/"+@community.crop_x_secondary.to_s + @community.secondary_logo.url.split('/')[@community.secondary_logo.url.split('/').count - 1] : "") : @community.secondary_logo.url + (@community.crop_x_secondary.present? ? "?temp/"+@community.crop_x_secondary.to_s  + @community.secondary_logo.url.split('/')[@community.secondary_logo.url.split('/').count - 1] : "") )

      end
    else
      json.logo asset_url("pynwheel-default-logo.png")
      json.secondary_logo asset_url("pynwheel-default-logo.png")
    end
    # json.secondary_logo @community.logo.present? ? (Rails.env.development? ? local_assets_base_url+@community.logo.url + (@community.crop_x.present? ? "?temp/"+@community.crop_x.to_s + @community.logo.url.split('/')[@community.logo.url.split('/').count - 1] : "") : @community.logo.url + (@community.crop_x.present? ? "?temp/" + @community.crop_x.to_s + @community.logo.url.split('/')[@community.logo.url.split('/').count - 1] : "") ) : asset_url("pynwheel-default-logo.png")
    json.powered_by_pynwheel @community.powered_by_btn.present? ? @community.powered_by_btn : false
    json.show_gesture_icons @community.show_gesture_icons
    json.is_vertical_app @community.is_vertical_app.present? ? @community.is_vertical_app : false
    json.show_tour_page @community.show_tour_page.present? ? @community.show_tour_page : false
    json.data_error_message @community.credential.present? ? (@community.credential.data_error_message.present? ? @community.credential.data_error_message : nil) : nil
    json.overlay_text (@community.design.expressionist.present? ? (@community.design.expressionist.overlay_text.present? ? @community.design.expressionist.overlay_text : "") : "")
    json.overlay_font (@community.design.expressionist.present? ? (@community.design.expressionist.overlay_font.present? ? @community.design.expressionist.overlay_font : "ms-appx:/DesignTemplates/Expressionist/CutomFonts/Arial.ttf#Arial") : "ms-appx:/DesignTemplates/Expressionist/CutomFonts/Arial.ttf#Arial")
    json.overlay_color (@community.design.expressionist.present? ? (@community.design.expressionist.overlay_color.present? ? @community.design.expressionist.overlay_color : "#000000") : "#000000")
    json.overlay_opacity (@community.design.expressionist.present? ? (@community.design.expressionist.overlay_opacity.present? ? @community.design.expressionist.overlay_opacity : "100%") : "100%")
    json.overlay_size (@community.design.expressionist.present? ? (@community.design.expressionist.overlay_size.present? ? @community.design.expressionist.overlay_size : "18px") : "18px")
    json.overlay_text_position (@community.design.expressionist.present? ? (@community.design.expressionist.overlay_text_position.present? ? @community.design.expressionist.overlay_text_position : "Left") : "Left")

    if @community.theme_name.include?('gables')
      json.property_map_color @community.design.present? ? (@community.design.property_map_color.present? ? @community.design.property_map_color : '#d37474') : '#d37474'
    elsif @community.temporary_theme_name == 'modernist'
      json.property_map_color @community.design.present? ? (@community.design.modernist_map_marker_color.present? ? (@community.design.modernist_map_marker_color == 'no color' || @community.design.modernist_map_marker_color == '' ? (@community.design.primary_color.present? ? @community.design.primary_color : '#CF492F') : @community.design.modernist_map_marker_color) : (@community.design.primary_color.present? ? @community.design.primary_color : '#CF492F' )) : '#d37474'
    elsif @community.temporary_theme_name == 'futurist'
      json.property_map_color @community.design.present? ? (@community.design.futurist_property_map_marker_color.present? ?  @community.design.futurist_property_map_marker_color : "#d37474") : "#d37474"
    elsif @community.temporary_theme_name == 'panther'
      json.property_map_color @community.design.present? ? (@community.design.panther_property_map_marker_color.present? ?  @community.design.panther_property_map_marker_color : "#d37474") : "#d37474"
    elsif @community.temporary_theme_name == 'expressionist'
      json.property_map_color @community.design.present? ? (@community.design.expressionist_property_map_marker_color.present? ?  @community.design.expressionist_property_map_marker_color : "#d37474") : "#d37474"
    else
      json.property_map_color '#d37474'
    end

    if @community.theme_name.include?('gables')
      json.property_map_size @community.design.present? ? (@community.design.property_map_size_integer.present? ? @community.design.property_map_size_integer.to_s + "px" : '30px') : '30px'
    elsif @community.temporary_theme_name == 'modernist'
      json.property_map_size @community.design.present? ? (@community.design.modernist_property_map_size.present? ? @community.design.modernist_property_map_size.to_s + "px" : '30px') : '30px'
    elsif @community.temporary_theme_name == 'futurist'
      json.property_map_size @community.design.present? ? (@community.design.futurist_property_map_size.present? ? @community.design.futurist_property_map_size.to_s + "px" : '30px') : '30px'
    elsif @community.temporary_theme_name == 'panther'
      json.property_map_size @community.design.present? ? (@community.design.panther_property_map_size.present? ? @community.design.panther_property_map_size.to_s + "px" : '30px') : '30px'
    elsif @community.temporary_theme_name == 'expressionist'
      json.property_map_size @community.design.present? ? (@community.design.expressionist_property_map_size.present? ? @community.design.expressionist_property_map_size.to_s + "px" : '30px') : '30px'
    else
      json.property_map_color '30px'
    end
    if @community.theme_name.include?('gables')
      json.amenity_map_marker_color @community.design.present? ? (@community.design.amenity_map_marker_color.present? ? @community.design.amenity_map_marker_color : '#d37474') : '#FF0000'
    elsif @community.temporary_theme_name == 'modernist'
      json.amenity_map_marker_color @community.design.present? ? (@community.design.modernists_amenity_map_marker_color.present? ? (@community.design.modernists_amenity_map_marker_color == 'no color' ? (@community.design.primary_color.present? ? @community.design.primary_color : '#CF492F') : @community.design.modernists_amenity_map_marker_color) : (@community.design.primary_color.present? ? @community.design.primary_color : '#CF492F' )) : '#FF0000'
    elsif @community.temporary_theme_name == 'futurist'
      json.amenity_map_marker_color @community.design.present? ? (@community.design.futurist_amenity_map_marker_color.present? ? @community.design.futurist_amenity_map_marker_color : '#d37474' ) : '#d37474'
    elsif @community.temporary_theme_name == 'expressionist'
      json.amenity_map_marker_color @community.design.present? ? (@community.design.expressionist__amenity_map_marker_color.present? ? @community.design.expressionist__amenity_map_marker_color : '#d37474' ) : '#d37474'
    elsif @community.temporary_theme_name == 'panther'
      json.amenity_map_marker_color @community.design.present? ? (@community.design.panther_amenity_map_marker_color.present? ? @community.design.panther_amenity_map_marker_color : '#d37474' ) : '#d37474'
    else
      json.amenity_map_marker_color '#ff0000'
    end

    if @community.theme_name.include?('gables')
      json.amenity_map_marker_size @community.design.present? ? (@community.design.amenity_map_marker_size_integer.present? ? @community.design.amenity_map_marker_size_integer.to_s + "px" : '30px') : '30px'
    elsif @community.temporary_theme_name == 'modernist'
      json.amenity_map_marker_size @community.design.present? ? (@community.design.modernist_amenity_map_size.present? ? @community.design.modernist_amenity_map_size.to_s + "px" : '30px' ) : '30px'
    elsif @community.temporary_theme_name == 'futurist'
      json.amenity_map_marker_size @community.design.present? ? (@community.design.futurist_amenity_map_size.present? ? @community.design.futurist_amenity_map_size.to_s + "px" : '30px' ) : '30px'
    elsif @community.temporary_theme_name == 'expressionist'
      json.amenity_map_marker_size @community.design.present? ? (@community.design.expressionist_amenity_map_size.present? ? @community.design.expressionist_amenity_map_size.to_s + "px" : '30px' ) : '30px'
    elsif @community.temporary_theme_name == 'panther'
      json.amenity_map_marker_size @community.design.present? ? (@community.design.panther_amenity_map_size.present? ? @community.design.panther_amenity_map_size.to_s + "px" : '30px' ) : '30px'
    else
      json.amenity_map_marker_size '30px'
    end

    if @community.theme_name.include?('gables')
      json.unit_floorplan_map_marker_color @community.design.present? ? (@community.design.gables_unit_floorplan_map_marker_color.present? ? @community.design.gables_unit_floorplan_map_marker_color : '#d37474') : '#d37474'
    elsif @community.temporary_theme_name == 'modernist'
      json.unit_floorplan_map_marker_color @community.design.present? ? (@community.design.modernist_unit_floorplan_map_marker_color.present? ? (@community.design.modernist_unit_floorplan_map_marker_color == 'no color' ? (@community.design.primary_color.present? ? @community.design.primary_color : '#CF492F') : @community.design.modernist_unit_floorplan_map_marker_color) : (@community.design.primary_color.present? ? @community.design.primary_color : '#CF492F' )) : '#FF0000'
    elsif @community.temporary_theme_name == 'futurist'
      json.unit_floorplan_map_marker_color @community.design.present? ? (@community.design.futurist_unit_floorplan_map_marker_color.present? ? @community.design.futurist_unit_floorplan_map_marker_color : '#d37474' ) : '#d37474'
    elsif @community.temporary_theme_name == 'expressionist'
      json.unit_floorplan_map_marker_color @community.design.present? ? (@community.design.expressionist_unit_floorplan_map_marker_color.present? ? @community.design.expressionist_unit_floorplan_map_marker_color : '#d37474' ) : '#d37474'
    elsif @community.temporary_theme_name == 'panther'
      json.unit_floorplan_map_marker_color @community.design.present? ? (@community.design.panther_unit_floorplan_map_marker_color.present? ? @community.design.panther_unit_floorplan_map_marker_color : '#d37474' ) : '#d37474'
    else
      json.unit_floorplan_map_marker_color '#ff0000'
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
      json.secondary_font_color @community.design.secondary_font_color.present? ? @community.design.secondary_font_color : "#FFFFFF"
    end
    json.menu do
      if @community.temporary_theme_name == 'modernist' && @community.is_vertical_app
        json.menu_position "Vertical"
      else
        json.menu_position @community.design.menu.present? ? @community.design.menu.position : nil
      end

      json.horizontal_menu_position  @community.design.menu.present? ?  @community.design.menu.horizontal_menu_position : nil

      if @community.temporary_theme_name == 'modernist' && @community.is_vertical_app
        json.vertical_menu_position "Middle"
      else
        json.vertical_menu_position  @community.design.menu.present? ?  @community.design.menu.vertical_menu_position : nil
      end
      json.manage_background  @community.design.menu.present? ?  @community.design.menu.manage_background : nil
      json.background_color  @community.design.menu.present? && @community.design.menu.background_color.present? ? @community.design.menu.background_color : "#F9AD90"
      json.primary_color @community.design.primary_color.present? ? @community.design.primary_color : "#CF492F"
      json.secondary_color @community.design.secondary_color.present? ? @community.design.secondary_color : "#4F4F4F"
      json.navigation_text_color  @community.design.menu.present? && @community.design.menu.navigation_text_color.present? ? @community.design.menu.navigation_text_color : "#636363"
      json.navigation_background_color  @community.design.menu.present? && @community.design.menu.navigation_background_color.present? ? @community.design.menu.navigation_background_color : "#FDFDFD"
    end

    json.gables do
      json.hide_tagline @community.design.gable.present? ? @community.design.gable.hide_tagline : true
      json.appartment_button_color (@community.design.gable.present? and @community.design.gable.appartment_button_color.present?) ? @community.design.gable.appartment_button_color : "#8A8A8D"
      json.gallery_button_color (@community.design.gable.present? and @community.design.gable.gallery_button_color.present?) ? @community.design.gable.gallery_button_color : "#44797B"
      json.neighborhood_button_color (@community.design.gable.present? and @community.design.gable.neighborhood_button_color.present?) ? @community.design.gable.neighborhood_button_color : "#0475A9"
      json.favorite_button_color (@community.design.gable.present? and @community.design.gable.favorite_button_color.present?) ? @community.design.gable.favorite_button_color : "#D5C228"
      if @community.theme_name == "panther"
        json.filter_panel_color "#cae0da"
      else
        json.filter_panel_color (@community.design.gable.present? and @community.design.gable.filter_panel_color.present?) ? @community.design.gable.filter_panel_color : "#467A7D"
      end
      json.webpages_button_color (@community.design.gable.present? and @community.design.gable.webpages_button_color.present?) ? @community.design.gable.webpages_button_color : "#96348F"
      json.imagepages_button_color (@community.design.gable.present? and @community.design.gable.imagepages_button_color.present?) ? @community.design.gable.imagepages_button_color : "#96348F"

      json.home_page_navigation_bg_image @community.design.gable.present? ? (@community.design.gable.home_page_nav_bg_image.present? ? @community.design.gable.home_page_nav_bg_image.url : "No Image") : "No Image"
      json.display_home_page_navigation_bg_image @community.design.gable.present? ? (@community.design.gable.display_home_page_nav_bg_image_button.present? ? @community.design.gable.display_home_page_nav_bg_image_button : false) : false
      json.global_navigation_bg_image @community.design.gable.present? ? (@community.design.gable.global_nav_bg_image.present? ? @community.design.gable.global_nav_bg_image.url : "No Image") : "No Image"
      json.display_global_navigation_bg_image @community.design.gable.present? ? (@community.design.gable.display_global_nav_bg_image_button.present? ? @community.design.gable.display_global_nav_bg_image_button : false) : false
      json.filter_panel_bg_image @community.design.gable.present? ? (@community.design.gable.filter_panel_bg_image.present? ? @community.design.gable.filter_panel_bg_image.url : "No Image") : "No Image"
      json.display_filter_panel_bg_image @community.design.gable.present? ? (@community.design.gable.display_filter_panel_bg_image_button.present? ? @community.design.gable.display_filter_panel_bg_image_button : false) : false

      json.filter_panel_opacity @community.design.gable.present? ? (@community.design.gable.filter_panel_opacity.present? ? @community.design.gable.filter_panel_opacity : "100%") : "100%"
      json.filter_panel_text_color (@community.design.gable.present? and @community.design.gable.filter_panel_text_color.present?) ? @community.design.gable.filter_panel_text_color : "#000000"

      json.display_application_bg_image_gables @community.design.gable.present? ? (@community.design.gable.display_application_bg_image_gables.present? ? @community.design.gable.display_application_bg_image_gables : false) : false
      json.application_bg_image_gables @community.design.gable.present? ? (@community.design.gable.application_bg_image_gables.present? ? @community.design.gable.application_bg_image_gables.url : "No Image") : "No Image"
      json.display_apartment_bg_image_gables @community.design.gable.present? ? (@community.design.gable.display_apartment_bg_image_gables.present? ? @community.design.gable.display_apartment_bg_image_gables : false) : false
      json.apartment_bg_image_gables @community.design.gable.present? ? (@community.design.gable.apartment_bg_image_gables.present? ? @community.design.gable.apartment_bg_image_gables.url : "No Image") : "No Image"
      json.display_gallery_bg_image_gables @community.design.gable.present? ? (@community.design.gable.display_gallery_bg_image_gables.present? ? @community.design.gable.display_gallery_bg_image_gables : false) : false
      json.gallery_bg_image_gables @community.design.gable.present? ? (@community.design.gable.gallery_bg_image_gables.present? ? @community.design.gable.gallery_bg_image_gables.url : "No Image") : "No Image"
      json.display_favourite_bg_image_gables @community.design.gable.present? ? (@community.design.gable.display_favourite_bg_image_gables.present? ? @community.design.gable.display_favourite_bg_image_gables : false) : false
      json.favourite_bg_image_gables @community.design.gable.present? ? (@community.design.gable.favourite_bg_image_gables.present? ? @community.design.gable.favourite_bg_image_gables.url : "No Image") : "No Image"
      json.display_additional_pages_bg_image_gables @community.design.gable.present? ? (@community.design.gable.display_additional_pages_bg_image_gables.present? ? @community.design.gable.display_additional_pages_bg_image_gables : false) : false
      json.additional_pages_bg_image_gables @community.design.gable.present? ? (@community.design.gable.additional_pages_bg_image_gables.present? ? @community.design.gable.additional_pages_bg_image_gables.url : "No Image") : "No Image"
    end

    json.expressionist do
      json.global_navigation do
        if @community.theme_name == "panther"
          json.display_global_navigation_button_icon true
        elsif @community.theme_name == "modernist1"
          json.display_global_navigation_button_icon true
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.display_global_navigation_button_icon @community.design.expressionist.present? ? @community.design.expressionist.display_global_navigation_button_icon : true
        else
          json.display_global_navigation_button_icon true
        end
        if @community.theme_name == "expressionist"
          json.display_application_background_image @community.design.expressionist.present? ? @community.design.expressionist.display_application_background_image : false
        elsif @community.theme_name == "panther"
          json.display_application_background_image true
        else
          json.display_application_background_image false
        end
        if @community.theme_name == "futurist"
          json.spacing_between_buttons "10px"
        elsif @community.theme_name == "panther"
          json.spacing_between_buttons "0px"
        elsif @community.theme_name == "modernist1"
          json.spacing_between_buttons "60px"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.spacing_between_buttons (@community.design.expressionist.present? and @community.design.expressionist.spacing_between_buttons.present?) ? @community.design.expressionist.spacing_between_buttons : "0px"
        else
          json.spacing_between_buttons "0px"
        end
        if @community.theme_name == "panther"
          json.button_on_bg_color "#534841"
        elsif @community.theme_name == "expressionist"
          json.button_on_bg_color (@community.design.expressionist.present? and @community.design.expressionist.button_on_bg_color.present?) ? @community.design.expressionist.button_on_bg_color : "#565455"
        else
          json.button_on_bg_color "#565455"
        end
        if @community.theme_name == "panther"
          json.button_on_bg_color_opacity "100%"
        elsif @community.theme_name == "expressionist"
          json.button_on_bg_color_opacity (@community.design.expressionist.present? and @community.design.expressionist.button_on_bg_color_opacity.present?) ? @community.design.expressionist.button_on_bg_color_opacity : "100%"
        else
          json.button_on_bg_color_opacity "100%"
        end
        if @community.theme_name == "panther"
          json.application_background_color "#ffffff"
        elsif @community.theme_name == "futurist"
          json.application_background_color "#c5c4c7"
        elsif @community.theme_name == "modernist1"
          json.application_background_color "#ffffff"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.application_background_color (@community.design.expressionist.present? and @community.design.expressionist.application_background_color.present?) ? @community.design.expressionist.application_background_color : "#ffff"
        else
          json.application_background_color "#ffff"
        end
        if @community.theme_name == "expressionist"
          json.application_background_color_opacity (@community.design.expressionist.present? and @community.design.expressionist.application_background_color_opacity.present?) ? @community.design.expressionist.application_background_color_opacity : "100%"
        else
          json.application_background_color_opacity "100%"
        end
        if @community.theme_name == "futurist"
          json.global_navigation_button_on_font_color "#ffffff"
        elsif @community.theme_name == "panther"
          json.global_navigation_button_on_font_color "#b6c5bf"
        elsif @community.theme_name == "expressionist"
          json.global_navigation_button_on_font_color (@community.design.expressionist.present? and @community.design.expressionist.global_navigation_button_on_font_color.present?) ? @community.design.expressionist.global_navigation_button_on_font_color : "#565455"
        else
          json.global_navigation_button_on_font_color "#565455"
        end
        if @community.theme_name == "futurist"
          json.display_button_on_bg_color false
        elsif @community.theme_name == "expressionist"
          json.display_button_on_bg_color @community.design.expressionist.present? ? @community.design.expressionist.display_button_on_bg_color : false
        else
          json.display_button_on_bg_color false
        end
        if @community.theme_name == "expressionist"
          json.display_apartment_nav_bg_image @community.design.expressionist.present? ? @community.design.expressionist.display_apartment_nav_bg_image : false
          json.display_gallery_nav_bg_image @community.design.expressionist.present? ? @community.design.expressionist.display_gallery_nav_bg_image : false
          json.display_favourities_nav_bg_image @community.design.expressionist.present? ? @community.design.expressionist.display_favourities_nav_bg_image : false
          json.display_additional_pages_nav_bg_image @community.design.expressionist.present? ? @community.design.expressionist.display_additional_pages_nav_bg_image : false
          json.display_neighborhood_background_image @community.design.expressionist.present? ? (@community.design.expressionist.display_neighborhood_bg_image.present? ? @community.design.expressionist.display_neighborhood_bg_image : false) : false
          json.display_global_navigation_button_bg_color @community.design.expressionist.present? ? @community.design.expressionist.display_global_navigation_button_bg_color : true
        else
          json.display_apartment_nav_bg_image false
          json.display_gallery_nav_bg_image false
          json.display_favourities_nav_bg_image false
          json.display_additional_pages_nav_bg_image false
          json.display_neighborhood_bg_image false
          json.display_global_navigation_button_bg_color true
        end
        if @community.theme_name == "futurist"
          json.global_navigation_button_font_family "ms-appx:/DesignTemplates/Expressionist/CutomFonts/HelveticaNeue-Roman.otf#Helvetica Neue"
        elsif @community.theme_name == "panther"
          json.global_navigation_button_font_family "ms-appx:/Assets/Fonts/Trajan Pro Regular.ttf#Trajan Pro"
        elsif @community.theme_name == "expressionist"
          json.global_navigation_button_font_family (@community.design.expressionist.present? and @community.design.expressionist.global_navigation_button_font_family.present?) ? @community.design.expressionist.global_navigation_button_font_family : "ms-appx:/DesignTemplates/Expressionist/CutomFonts/Arial.ttf#Arial"
        else
          json.global_navigation_button_font_family "ms-appx:/DesignTemplates/Expressionist/CutomFonts/Arial.ttf#Arial"
        end
        if @community.theme_name == "futurist"
          json.global_navigation_button_font_size "16px"
        elsif @community.theme_name == "panther"
          json.global_navigation_button_font_size "16px"
        elsif @community.theme_name == "expressionist"
          json.global_navigation_button_font_size (@community.design.expressionist.present? and @community.design.expressionist.global_navigation_button_font_size.present?) ? @community.design.expressionist.global_navigation_button_font_size : "13px"
        else
          json.global_navigation_button_font_size "13px"
        end
        if @community.theme_name == "panther"
          json.global_navigation_button_border_color "#b6c5bf"
        elsif @community.theme_name == "modernist1"
          json.global_navigation_button_border_color "#777777"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.global_navigation_button_border_color (@community.design.expressionist.present? and @community.design.expressionist.global_navigation_button_border_color.present?) ? @community.design.expressionist.global_navigation_button_border_color : "#ffff"
        else
          json.global_navigation_button_border_color "#ffff"
        end
        if @community.theme_name == "futurist"
          json.global_navigation_font_color "#C5C4C7"
        elsif @community.theme_name == "panther"
          json.global_navigation_font_color "#b6c5bf"
        elsif @community.theme_name == "modernist1"
          json.global_navigation_font_color "#777777"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.global_navigation_font_color @community.design.global_navigation_font_color.present? ? @community.design.global_navigation_font_color : "#ffff"
        else
          json.global_navigation_font_color "#ffff"
        end
        if @community.theme_name == "futurist"
          json.global_navigation_background_color "#C5C4C7"
        elsif @community.theme_name == "panther"
          json.global_navigation_background_color "#382f2a"
        elsif @community.theme_name == "modernist1"
          json.global_navigation_background_color "#f9ad90"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.global_navigation_background_color @community.design.global_navigation_background_color.present? ? @community.design.global_navigation_background_color : "#565455"
        else
          json.global_navigation_background_color "#565455"
        end
        if @community.theme_name == "panther"
          json.global_navigation_button_color "#382f2a"
        elsif @community.theme_name == "modernist1"
          json.global_navigation_button_color "#fdfdfd"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.global_navigation_button_color @community.design.global_navigation_button_color.present? ? @community.design.global_navigation_button_color : "#3B3B3B"
        else
          json.global_navigation_button_color "#3B3B3B"
        end
        if @community.theme_name == "futurist"
          json.global_navigation_buttons_opacity "0%"
        elsif @community.theme_name == "expressionist"
          json.global_navigation_buttons_opacity @community.design.global_navigation_buttons_opacity.present? ? @community.design.global_navigation_buttons_opacity : "100%"
        else
          json.global_navigation_buttons_opacity "100%"
        end
        if @community.theme_name == "futurist"
          json.global_nav_bg_opacity "0%"
        elsif @community.theme_name == "expressionist"
          json.global_nav_bg_opacity @community.design.global_nav_bg_opacity.present? ? @community.design.global_nav_bg_opacity : "100%"
        else
          json.global_nav_bg_opacity "100%"
        end
        if @community.theme_name == "modernist1"
          json.button_shape "Circular"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.button_shape @community.design.button_shape.present? ? @community.design.button_shape : "Rectangular"
        else
          json.button_shape "Rectangular"
        end
        if @community.theme_name == "futurist"
          json.global_nav_buttons_height "136px"
        elsif @community.theme_name == "panther"
          json.global_nav_buttons_height "125px"
        elsif @community.theme_name == "modernist1"
          json.global_nav_buttons_height "136px"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.global_nav_buttons_height @community.design.global_nav_buttons_height.present? ? @community.design.global_nav_buttons_height : "110px"
        else
          json.global_nav_buttons_height "110px"
        end
        if @community.theme_name == "futurist"
          json.global_nav_buttons_width "250px"
        elsif @community.theme_name == "panther"
          json.global_nav_buttons_width "250px"
        elsif @community.theme_name == "expressionist"
          json.global_nav_buttons_width @community.design.global_nav_buttons_width.present? ? @community.design.global_nav_buttons_width : "175px"
        else
          json.global_nav_buttons_width "175px"
        end
        if @community.theme_name == "futurist"
          json.secondary_page_menu_border "No border"
        elsif @community.theme_name == "panther"
          json.secondary_page_menu_border "left-right"
        elsif @community.theme_name == "expressionist"
          json.secondary_page_menu_border @community.design.secondary_page_menu_border.present? ? @community.design.secondary_page_menu_border : "All sides"
        else
          json.secondary_page_menu_border "All sides"
        end
        if @community.theme_name == "futurist"
          json.global_nav_button_on_as_image true
          json.global_nav_button_off_as_image true
        else
          json.global_nav_button_on_as_image @community.design.global_nav_button_on_as_image
          json.global_nav_button_off_as_image @community.design.global_nav_button_off_as_image
        end
        if @community.theme_name == "futurist"
          json.global_nav_button_on image_url("global_nav_button_on.png")
        elsif @community.theme_name == "expressionist"
          json.global_nav_button_on @community.design.global_nav_button_on.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.global_nav_button_on.url : @community.design.global_nav_button_on.url) : "No Image"
        else
          json.global_nav_button_on "No Image"
        end
        if @community.theme_name == "futurist"
          json.global_nav_button_off image_url("global_nav_button_off.png")
        elsif @community.theme_name == "expressionist"
          json.global_nav_button_off @community.design.global_nav_button_off.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.global_nav_button_off.url : @community.design.global_nav_button_off.url) : "No Image"
        else
          json.global_nav_button_off "No Image"
        end
        if @community.theme_name == "expressionist"
          json.application_background_image (@community.design.expressionist.present? and @community.design.expressionist.application_background_image.present?) ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.application_background_image.url : @community.design.expressionist.application_background_image.url) : "No Image"
          json.apartment_nav_bg_image (@community.design.expressionist.present? and @community.design.expressionist.apartment_nav_bg_image.present?) ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.apartment_nav_bg_image.url : @community.design.expressionist.apartment_nav_bg_image.url) : "No Image"
          json.gallery_nav_bg_image (@community.design.expressionist.present? and @community.design.expressionist.gallery_nav_bg_image.present?) ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.gallery_nav_bg_image.url : @community.design.expressionist.gallery_nav_bg_image.url) : "No Image"
          json.favourities_nav_bg_image (@community.design.expressionist.present? and @community.design.expressionist.favourities_nav_bg_image.present?) ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.favourities_nav_bg_image.url : @community.design.expressionist.favourities_nav_bg_image.url) : "No Image"
          json.additional_pages_nav_bg_image (@community.design.expressionist.present? and @community.design.expressionist.additional_pages_nav_bg_image.present?) ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.additional_pages_nav_bg_image.url : @community.design.expressionist.additional_pages_nav_bg_image.url) : "No Image"
          json.neighborhood_background_image (@community.design.expressionist.present? and @community.design.expressionist.neighborhood_bg_image.present?) ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.neighborhood_bg_image.url : @community.design.expressionist.neighborhood_bg_image.url) : "No Image"
          json.apartment_nav_bg_color @community.design.expressionist.apartment_nav_bg_color.present? ? @community.design.expressionist.apartment_nav_bg_color : "#ffffff"
          json.gallery_nav_bg_color @community.design.expressionist.gallery_nav_bg_color.present? ? @community.design.expressionist.gallery_nav_bg_color : "#ffffff"
          json.favourities_nav_bg_color @community.design.expressionist.favourities_nav_bg_color.present? ? @community.expressionist.design.favourities_nav_bg_color : "#ffffff"
          json.additional_pages_nav_bg_color @community.design.expressionist.additional_pages_nav_bg_color.present? ? @community.design.expressionist.additional_pages_nav_bg_color : "#ffffff"
          json.display_global_nav_background_image @community.design.expressionist.display_global_nav_background_image
          json.global_nav_background_image @community.design.expressionist.global_nav_background_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.global_nav_background_image.url : @community.design.expressionist.global_nav_background_image.url) : "No Image"
        else
          if @community.theme_name == "panther"
            json.application_background_image image_url("application_background_img.png")
          else
            json.application_background_image "No Image"
          end
          json.apartment_nav_bg_image   "No Image"
          json.gallery_nav_bg_image "No Image"
          json.favourities_nav_bg_image  "No Image"
          json.additional_pages_nav_bg_image  "No Image"
          json.neighborhood_background_image  "No Image"
          json.apartment_nav_bg_color  "#ffffff"
          json.gallery_nav_bg_color "#ffffff"
          json.favourities_nav_bg_color "#ffffff"
          json.additional_pages_nav_bg_color "#ffffff"
          json.display_global_nav_background_image @community.design.expressionist.present? ? @community.design.expressionist.display_global_nav_background_image : "No Image"
          json.global_nav_background_image "No Image"
        end
        json.global_navigation_btn_on_for_all @community.design.expressionist.present? ? @community.design.expressionist.global_navigation_btn_on_for_all : false
        if @community.theme_name == "expressionist"
          if @community.design.expressionist.global_navigation_btn_on_for_all
            json.apartment_btn_on_image @community.design.expressionist.apartment_btn_on_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.apartment_btn_on_image.url : @community.design.expressionist.apartment_btn_on_image.url) : "No Image"
            json.display_apartment_btn_on_image @community.design.expressionist.display_apartment_btn_on_image
            json.gallery_btn_on_image @community.design.expressionist.gallery_btn_on_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.gallery_btn_on_image.url : @community.design.expressionist.gallery_btn_on_image.url) : "No Image"
            json.display_gallery_btn_on_image @community.design.expressionist.display_gallery_btn_on_image
            json.neighborhood_btn_on_image @community.design.expressionist.neighborhood_btn_on_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.neighborhood_btn_on_image.url : @community.design.expressionist.neighborhood_btn_on_image.url) : "No Image"
            json.display_neighborhood_btn_on_image @community.design.expressionist.display_neighborhood_btn_on_image
            json.imagepage_btn_on_image @community.design.expressionist.imagepage_btn_on_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.imagepage_btn_on_image.url : @community.design.expressionist.imagepage_btn_on_image.url) : "No Image"
            json.display_imagepage_btn_on_image @community.design.expressionist.display_imagepage_btn_on_image
            json.webpage_btn_on_image @community.design.expressionist.webpage_btn_on_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.webpage_btn_on_image.url : @community.design.expressionist.webpage_btn_on_image.url) : "No Image"
            json.display_webpage_btn_on_image @community.design.expressionist.display_webpage_btn_on_image
            json.favourite_btn_on_image @community.design.expressionist.favourite_btn_on_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.favourite_btn_on_image.url : @community.design.expressionist.favourite_btn_on_image.url) : "No Image"
            json.display_favourite_btn_on_image @community.design.expressionist.display_favourite_btn_on_image
          else
            json.apartment_btn_on_image @community.design.expressionist.apartment_btn_on_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.apartment_btn_on_image.url : @community.design.expressionist.apartment_btn_on_image.url) : "No Image"
            json.display_apartment_btn_on_image false
            json.gallery_btn_on_image @community.design.expressionist.gallery_btn_on_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.gallery_btn_on_image.url : @community.design.expressionist.gallery_btn_on_image.url) : "No Image"
            json.display_gallery_btn_on_image false
            json.neighborhood_btn_on_image @community.design.expressionist.neighborhood_btn_on_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.neighborhood_btn_on_image.url : @community.design.expressionist.neighborhood_btn_on_image.url) : "No Image"
            json.display_neighborhood_btn_on_image false
            json.imagepage_btn_on_image @community.design.expressionist.imagepage_btn_on_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.imagepage_btn_on_image.url : @community.design.expressionist.imagepage_btn_on_image.url) : "No Image"
            json.display_imagepage_btn_on_image false
            json.webpage_btn_on_image @community.design.expressionist.webpage_btn_on_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.webpage_btn_on_image.url : @community.design.expressionist.webpage_btn_on_image.url) : "No Image"
            json.display_webpage_btn_on_image false
            json.favourite_btn_on_image @community.design.expressionist.favourite_btn_on_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.favourite_btn_on_image.url : @community.design.expressionist.favourite_btn_on_image.url) : "No Image"
            json.display_favourite_btn_on_image false
          end
        else
          json.apartment_btn_on_image "No Image"
          json.display_apartment_btn_on_image false
          json.gallery_btn_on_image "No Image"
          json.display_gallery_btn_on_image false
          json.neighborhood_btn_on_image "No Image"
          json.display_neighborhood_btn_on_image false
          json.imagepage_btn_on_image "No Image"
          json.display_imagepage_btn_on_image false
          json.webpage_btn_on_image "No Image"
          json.display_webpage_btn_on_image false
          json.favourite_btn_on_image "No Image"
          json.display_favourite_btn_on_image false

        end






        json.global_navigation_btn_off_for_all @community.design.expressionist.present? ? @community.design.expressionist.global_navigation_btn_off_for_all : false
        if @community.theme_name == "expressionist"
          if @community.design.expressionist.global_navigation_btn_off_for_all
            json.apartment_btn_off_image @community.design.expressionist.apartment_btn_off_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.apartment_btn_off_image.url : @community.design.expressionist.apartment_btn_off_image.url) : "No Image"
            json.display_apartment_btn_off_image @community.design.expressionist.display_apartment_btn_off_image
            json.gallery_btn_off_image @community.design.expressionist.gallery_btn_off_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.gallery_btn_off_image.url : @community.design.expressionist.gallery_btn_off_image.url) : "No Image"
            json.display_gallery_btn_off_image @community.design.expressionist.display_gallery_btn_off_image
            json.neighborhood_btn_off_image @community.design.expressionist.neighborhood_btn_off_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.neighborhood_btn_off_image.url : @community.design.expressionist.neighborhood_btn_off_image.url) : "No Image"
            json.display_neighborhood_btn_off_image @community.design.expressionist.display_neighborhood_btn_off_image
            json.imagepage_btn_off_image @community.design.expressionist.imagepage_btn_off_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.imagepage_btn_off_image.url : @community.design.expressionist.imagepage_btn_off_image.url) : "No Image"
            json.display_imagepage_btn_off_image @community.design.expressionist.display_imagepage_btn_off_image
            json.webpage_btn_off_image @community.design.expressionist.webpage_btn_off_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.webpage_btn_off_image.url : @community.design.expressionist.webpage_btn_off_image.url) : "No Image"
            json.display_webpage_btn_off_image @community.design.expressionist.display_webpage_btn_off_image
            json.favourite_btn_off_image @community.design.expressionist.favourite_btn_off_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.favourite_btn_off_image.url : @community.design.expressionist.favourite_btn_off_image.url) : "No Image"
            json.display_favourite_btn_off_image @community.design.expressionist.display_favourite_btn_off_image
          else
            json.apartment_btn_off_image @community.design.expressionist.apartment_btn_off_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.apartment_btn_off_image.url : @community.design.expressionist.apartment_btn_off_image.url) : "No Image"
            json.display_apartment_btn_off_image false
            json.gallery_btn_off_image @community.design.expressionist.gallery_btn_off_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.gallery_btn_off_image.url : @community.design.expressionist.gallery_btn_off_image.url) : "No Image"
            json.display_gallery_btn_off_image false
            json.neighborhood_btn_off_image @community.design.expressionist.neighborhood_btn_off_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.neighborhood_btn_off_image.url : @community.design.expressionist.neighborhood_btn_off_image.url) : "No Image"
            json.display_neighborhood_btn_off_image false
            json.imagepage_btn_off_image @community.design.expressionist.imagepage_btn_off_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.imagepage_btn_off_image.url : @community.design.expressionist.imagepage_btn_off_image.url) : "No Image"
            json.display_imagepage_btn_off_image false
            json.webpage_btn_off_image @community.design.expressionist.webpage_btn_off_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.webpage_btn_off_image.url : @community.design.expressionist.webpage_btn_off_image.url) : "No Image"
            json.display_webpage_btn_off_image false
            json.favourite_btn_off_image @community.design.expressionist.favourite_btn_off_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.favourite_btn_off_image.url : @community.design.expressionist.favourite_btn_off_image.url) : "No Image"
            json.display_favourite_btn_off_image false
          end
        else
          json.apartment_btn_off_image "No Image"
          json.display_apartment_btn_off_image false
          json.gallery_btn_off_image "No Image"
          json.display_gallery_btn_off_image false
          json.neighborhood_btn_off_image "No Image"
          json.display_neighborhood_btn_off_image false
          json.imagepage_btn_off_image "No Image"
          json.display_imagepage_btn_off_image false
          json.webpage_btn_off_image "No Image"
          json.display_webpage_btn_off_image false
          json.favourite_btn_off_image "No Image"
          json.display_favourite_btn_off_image false

        end
        if @community.theme_name == "panther"
          json.global_navigation_border_thickness "2px"
        elsif @community.theme_name == "expressionist"
          json.global_navigation_border_thickness @community.design.expressionist.global_navigation_border_thickness.present? ? (@community.design.expressionist.global_navigation_border_thickness.present? ? @community.design.expressionist.global_navigation_border_thickness : "0px") : "0px"
        else
          json.global_navigation_border_thickness "0px"
        end
        if @community.theme_name == "expressionist"
          json.global_navigation_text_outside_the_button_border @community.design.expressionist.global_navigation_text_outside_the_button_border.present? ? (@community.design.expressionist.global_navigation_text_outside_the_button_border.present? ? @community.design.expressionist.global_navigation_text_outside_the_button_border : false ): false
        else
          json.global_navigation_text_outside_the_button_border false
        end

        if @community.theme_name == "futurist"
          json.global_navigation_icons_position "Right of text"
        elsif @community.theme_name == "modernist1"
          json.global_navigation_icons_position "Above of text"
        elsif @community.theme_name == "modernist1"
          json.global_navigation_icons_position "Above the text"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.global_navigation_icons_position "Above the text"# @community.design.expressionist.global_navigation_icons_position.present? ? (@community.design.expressionist.global_navigation_icons_position.present? ? @community.design.expressionist.global_navigation_icons_position : "Above the text") : "Above the text"
        else
          json.global_navigation_icons_position "Above the text"
        end
        json.global_nav_button_icon_size @community.design.expressionist.present? ? (@community.design.expressionist.global_nav_button_icon_size.present? ? @community.design.expressionist.global_nav_button_icon_size : "55px") : "55px"
        if @community.theme_name == "modernist1"
          json.global_navigation_show_background_color true
        elsif @community.theme_name == "expressionist"
          json.global_navigation_show_background_color @community.design.expressionist.global_navigation_show_background_color.present? ? (@community.design.expressionist.global_navigation_show_background_color.present? ? @community.design.expressionist.global_navigation_show_background_color : false ): false
        else
          json.global_navigation_show_background_color false
        end
        if @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.use_gables_buttons @community.design.expressionist.present? ? (@community.design.expressionist.use_gables_buttons.present? ? @community.design.expressionist.use_gables_buttons : false ): false
          # json.display_global_navigation_button_color @community.design.expressionist.present? ? (@community.design.expressionist.display_global_navigation_button_color.present? ? @community.design.expressionist.display_global_navigation_button_color : false ): false
        else
          json.use_gables_buttons false
          # json.display_global_navigation_button_color @community.design.expressionist.present? ? (@community.design.expressionist.display_global_navigation_button_color.present? ? @community.design.expressionist.display_global_navigation_button_color : false ): false
        end
        if @community.theme_name == "panther"
          json.global_navigation_home_icon true
        else
          json.global_navigation_home_icon @community.design.expressionist.present? ? (@community.design.expressionist.global_navigation_home_icon.present? ? @community.design.expressionist.global_navigation_home_icon : false ): false
        end
      end
      json.filter_panel do
        if @community.theme_name == "modernist1"
          json.filter_panel_color "#cf492f"
        elsif @community.theme_name == "panther"
          json.filter_panel_color "#534841"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.filter_panel_color @community.design.filter_panel_color.present? ? @community.design.filter_panel_color : "#3B3B3B"
        else
          json.filter_panel_color "#3B3B3B"
        end
        if @community.theme_name == "futurist"
          json.filter_panel_font_style "ms-appx:/DesignTemplates/Expressionist/CutomFonts/HelveticaNeue-Roman.otf#Helvetica Neue"
        elsif @community.theme_name == "panther"
          json.filter_panel_font_style "Futura"
        elsif @community.theme_name == "expressionist"
          json.filter_panel_font_style @community.design.filter_panel_font_style.present? ? @community.design.filter_panel_font_style : "ms-appx:/DesignTemplates/Expressionist/CutomFonts/Arial.ttf#Arial"
        else
          json.filter_panel_font_style "ms-appx:/DesignTemplates/Expressionist/CutomFonts/Arial.ttf#Arial"
        end
        if @community.theme_name == "panther"
          json.filter_panel_font_color "#cae0da"
        elsif @community.theme_name == "futurist"
          json.filter_panel_font_color "#ffffff"
        elsif @community.theme_name == "modernist1"
          json.filter_panel_font_color "#ffffff"
        else
          json.filter_panel_font_color @community.design.filter_panel_font_color.present? ? @community.design.filter_panel_font_color : "#ffff"
        end
        if @community.theme_name == "panther"
          json.filter_button_color "#cae0da"
        elsif @community.theme_name == "modernist1"
          json.filter_button_color "#cf492f"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.filter_button_color @community.design.filter_button_color.present? ? @community.design.filter_button_color : "#565455"
        else
          json.filter_button_color "#565455"
        end
        if @community.theme_name == "futurist"
          json.filter_button_font_style "Futura"
        elsif @community.theme_name == "panther"
          json.filter_button_font_style "Futura"
        elsif @community.theme_name == "expressionist"
          json.filter_button_font_style @community.design.filter_button_font_style.present? ? @community.design.filter_button_font_style : "ms-appx:/DesignTemplates/Expressionist/CutomFonts/Arial.ttf#Arial"
        else
          json.filter_button_font_style "ms-appx:/DesignTemplates/Expressionist/CutomFonts/Arial.ttf#Arial"
        end
        if @community.theme_name == "panther"
          json.filter_button_font_color "#534841"
        elsif @community.theme_name == "modernist1"
          json.filter_button_font_color "#ffffff"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.filter_button_font_color @community.design.filter_button_font_color.present? ? @community.design.filter_button_font_color : "#ffff"
        else
          json.filter_button_font_color "#ffff"
        end
        if @community.theme_name == "expressionist"
          json.filter_panel_opacity @community.design.filter_panel_opacity.present? ? @community.design.filter_panel_opacity : "100%"
          json.filter_buttons_opacity @community.design.filter_buttons_opacity.present? ? @community.design.filter_buttons_opacity : "100%"
          json.gallery_buttons_opacity @community.design.gallery_buttons_opacity.present? ? @community.design.gallery_buttons_opacity : "100%"
        else
          json.filter_panel_opacity "100%"
          json.filter_buttons_opacity "100%"
          json.gallery_buttons_opacity "100%"
        end
        if @community.theme_name == "futurist"
          json.filter_panel_label_opacity "100%"
        elsif @community.theme_name == "panther"
          json.filter_panel_label_opacity "100%"
        else
          json.filter_panel_label_opacity @community.design.filter_panel_label_opacity.present? ? @community.design.filter_panel_label_opacity : "100%"
        end
        if @community.theme_name == "panther"
          json.filter_panel_label_color "#cae0da"
        else
          json.filter_panel_label_color @community.design.filter_panel_label_color.present? ? @community.design.filter_panel_label_color : "#565455"
          end
        if @community.theme_name == "futurist"
          json.filter_menu_buttons_border "No border"
        elsif @community.theme_name == "panther"
          json.filter_menu_buttons_border "No border"
        elsif @community.theme_name == "modernist1"
          json.filter_menu_buttons_border "No border"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.filter_menu_buttons_border @community.design.filter_menu_buttons_border.present? ? @community.design.filter_menu_buttons_border : "All sides"
        else
          json.filter_menu_buttons_border "All sides"
        end
        if @community.theme_name == "futurist"
          json.gallery_buttons_border "No border"
        elsif @community.theme_name == "panther"
          json.gallery_buttons_border "No border"
        elsif @community.theme_name == "modernist1"
          json.gallery_buttons_border "No border"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.gallery_buttons_border @community.design.gallery_buttons_border.present? ? @community.design.gallery_buttons_border : "All sides"
        else
          json.gallery_buttons_border "All sides"
        end
        if @community.theme_name == "futurist"
          json.filter_button_as_image true
        else
          json.filter_button_as_image @community.design.filter_button_as_image
        end
        json.gallery_button_as_image @community.design.gallery_button_as_image
        if @community.theme_name == "modernist1"
          json.filter_panel_background_as_image false
          json.display_filter_label_image false
        elsif @community.theme_name == "panther"
          json.filter_panel_background_as_image false
          json.display_filter_label_image false
        elsif @community.theme_name == "futurist"
          json.display_filter_label_image true
          json.filter_panel_background_as_image false
        else
          json.display_filter_label_image @community.design.display_filter_label_image.present? ? @community.design.display_filter_label_image : false
          json.filter_panel_background_as_image @community.design.filter_panel_background_as_image
        end
        if @community.theme_name == "futurist"
          json.filter_button image_url("filetr_panel_button_bg.png")
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.filter_button @community.design.filter_button.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.filter_button.url : @community.design.filter_button.url) : "No Image"
        else
          json.filter_button "No Image"
        end
        if @community.theme_name == "expressionist"
          json.gallery_button @community.design.gallery_button.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.gallery_button.url : @community.design.gallery_button.url) : "No Image"
          json.gallery_button_on_image @community.design.gallery_button_on_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.gallery_button_on_image.url : @community.design.gallery_button_on_image.url) : "No Image"
        else
          json.gallery_button "No Image"
          json.gallery_button_on_image "No Image"
        end
        if @community.theme_name == "futurist"
          json.filter_label_image image_url("filetr_panel_button_bg.png")
          json.filter_panel_background_image image_url("filter_panel_bg.png")
        elsif @community.theme_name == "expressionist"
          json.filter_panel_background_image @community.design.filter_panel_background_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.filter_panel_background_image.url : @community.design.filter_panel_background_image.url) : "No Image"
          json.filter_label_image @community.design.filter_label_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.filter_label_image.url : @community.design.filter_label_image.url) : "No Image"

        else
          json.filter_panel_background_image "No Image"
          json.filter_label_image "No Image"
        end
        json.gallery_button_on_as_image @community.design.gallery_button_on_as_image
        if @community.theme_name == "panther"
          json.filter_panel_button_border_color "#565455"
        elsif @community.theme_name == "expressionist"
          json.filter_panel_button_border_color (@community.design.filter_panel.present? and @community.design.filter_panel.button_border_color.present?) ? @community.design.filter_panel.button_border_color : "#565455"
        else
          json.filter_panel_button_border_color "#565455"
        end
        if @community.theme_name == "expressionist"
          json.gallery_button_on_font_color (@community.design.filter_panel.present? and @community.design.filter_panel.gallery_button_on_font_color.present?) ? @community.design.filter_panel.gallery_button_on_font_color : "#ffff"
          json.gallery_button_on_background_color (@community.design.filter_panel.present? and @community.design.filter_panel.gallery_button_on_background_color.present?) ? @community.design.filter_panel.gallery_button_on_background_color : "#565455"
          json.gallery_button_on_background_color_opacity (@community.design.filter_panel.present? and @community.design.filter_panel.gallery_button_on_background_color_opacity.present?) ? @community.design.filter_panel.gallery_button_on_background_color_opacity : "100%"
        else
          json.gallery_button_on_font_color "#ffff"
          json.gallery_button_on_background_color "#565455"
          json.gallery_button_on_background_color_opacity "100%"
        end
        if @community.theme_name == "modernist1"
          json.filter_panel_icon_color "#ecb6ac"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.filter_panel_icon_color (@community.design.filter_panel.present? and @community.design.filter_panel.filter_panel_icon_color.present?) ? @community.design.filter_panel.filter_panel_icon_color : "#ffff"
        else
          json.filter_panel_icon_color "#ffff"
        end
        if @community.theme_name == "modernist1"
          json.filter_panel_icon_background_color "#ffffff"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.filter_panel_icon_background_color (@community.design.filter_panel.present? and @community.design.filter_panel.icon_background_color.present?) ? @community.design.filter_panel.icon_background_color : "#565455"
        else
          json.filter_panel_icon_background_color "#565455"
        end
        if @community.theme_name == "expressionist"
          json.filter_panel_icon_background_color_opacity (@community.design.filter_panel.present? and @community.design.filter_panel.icon_background_color_opacity.present?) ? @community.design.filter_panel.icon_background_color_opacity : "100%"
          json.display_gallery_button_on_background_color @community.design.filter_panel.present? ? @community.design.filter_panel.display_gallery_button_on_background_color : false
        else
          json.filter_panel_icon_background_color_opacity "100%"
          json.display_gallery_button_on_background_color false
        end
        if @community.theme_name == "futurist"
          json.display_filter_panel_icon true
        elsif @community.theme_name == "modernist1"
          json.display_filter_panel_icon true
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.display_filter_panel_icon @community.design.filter_panel.present? ? @community.design.filter_panel.display_filter_panel_icon : false
        else
          json.display_filter_panel_icon false
        end
        if @community.theme_name == "futurist"
          json.filter_panel_text_font_size "20px"
        elsif @community.theme_name == "panther"
          json.filter_panel_text_font_size "18px"
        elsif @community.theme_name == "expressionist"
          json.filter_panel_text_font_size (@community.design.filter_panel.present? and @community.design.filter_panel.text_font_size.present?) ? @community.design.filter_panel.text_font_size : "18px"
        else
          json.filter_panel_text_font_size "18px"
        end
        if @community.theme_name == "panther"
          json.filter_panel_button_text_font_size "21px"
        elsif @community.theme_name == "modernist1"
          json.filter_panel_button_text_font_size "18px"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.filter_panel_button_text_font_size (@community.design.filter_panel.present? and @community.design.filter_panel.button_text_font_size.present?) ? @community.design.filter_panel.button_text_font_size : "18px"
        else
          json.filter_panel_button_text_font_size "18px"
        end
        if @community.theme_name == "modernist1"
          json.filter_panel_buttons_show_backround_color true
        elsif @community.theme_name == "panther"
          json.filter_panel_buttons_show_backround_color true
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.filter_panel_buttons_show_backround_color @community.design.filter_panel.present? ? (@community.design.filter_panel.filter_panel_buttons_show_backround_color.present? ? @community.design.filter_panel.filter_panel_buttons_show_backround_color : false) : false
        else
          json.filter_panel_buttons_show_backround_color false
        end
        if @community.theme_name == "modernist1"
          json.filter_buttons_icons_position "Right of text"
        elsif @community.theme_name == "futurist"
          json.filter_buttons_icons_position "Right of text"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.filter_buttons_icons_position @community.design.filter_panel.present? ? (@community.design.filter_panel.filter_buttons_icons_position.present? ? @community.design.filter_panel.filter_buttons_icons_position : "Left of text") : "Left of text"
        else
          json.filter_buttons_icons_position "Left of text"
        end

      end
      json.home_page do
        if @community.theme_name == "futurist" && @community.is_vertical_app
          json.home_page_menu_position "Vertical_Middle"
        elsif @community.theme_name == "futurist"
          json.home_page_menu_position "Bottom"
        elsif @community.theme_name == "modernist1" && @community.is_vertical_app
          json.home_page_menu_position "Vertical_Middle"
        elsif @community.theme_name == "modernist1"
          json.home_page_menu_position "Vertical Right"
        elsif @community.theme_name == "panther" && @community.is_vertical_app
          json.home_page_menu_position "Vertical_Middle"
        elsif @community.theme_name == "panther"
          json.home_page_menu_position "Middle"
        elsif @community.theme_name == "expressionist"  && @community.is_vertical_app
          json.home_page_menu_position "Vertical_Middle"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.home_page_menu_position (@community.design.expressionist.present? and @community.design.expressionist.home_page_menu_position.present?) ? @community.design.expressionist.home_page_menu_position : "Bottom"
        else
          json.home_page_menu_position "Bottom"
        end
        if @community.theme_name == "futurist" && @community.is_vertical_app
          json.home_page_position_of_logo "Top"
        elsif @community.theme_name == "futurist"
          json.home_page_position_of_logo "Right"
        elsif @community.theme_name == "modernist1" && @community.is_vertical_app
          json.home_page_position_of_logo "Right"
        elsif @community.theme_name == "modernist1"
          json.home_page_position_of_logo "Right"
        elsif @community.theme_name == "panther"
          json.home_page_position_of_logo "Bottom center"
        elsif @community.theme_name == "expressionist"  && @community.is_vertical_app
          if @community.design.expressionist.present? && (@community.design.expressionist.home_page_position_of_logo == "Left" || @community.design.expressionist.home_page_position_of_logo == "Right")
            json.home_page_position_of_logo "Top"
          else
            json.home_page_position_of_logo @community.design.expressionist.home_page_position_of_logo.sub '=',''
          end
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.home_page_position_of_logo (@community.design.expressionist.present? and @community.design.expressionist.home_page_position_of_logo.present?) ? (@community.design.expressionist.home_page_position_of_logo.sub '=','') : "Right"
        else
          json.home_page_position_of_logo "Right"
        end
        if @community.theme_name == "expressionist"
          json.home_page_logo_size (@community.design.expressionist.present? and @community.design.expressionist.home_page_logo_size.present?) ? @community.design.expressionist.home_page_logo_size : "487x160"
        else
          json.home_page_logo_size "487x160"
        end
        if @community.theme_name == "panther"
          json.home_page_button_border_color "#cae0da"
        elsif @community.theme_name == "modernist1"
          json.home_page_button_border_color "#fdfdfd"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.home_page_button_border_color (@community.design.expressionist.present? and @community.design.expressionist.home_page_button_border_color.present?) ? @community.design.expressionist.home_page_button_border_color : "#565455"
        else
          json.home_page_button_border_color "#565455"
        end
        if @community.theme_name == "expressionist"
          json.display_home_page_button_icon @community.design.expressionist.present? ? @community.design.expressionist.display_home_page_button_icon : true
          json.display_home_page_image @community.design.expressionist.present? ? @community.design.expressionist.display_home_page_image : true
        else
          json.display_home_page_button_icon true
          if @community.theme_name == "modernist1" || @community.theme_name == "panther"
            json.display_home_page_image false
          else
            json.display_home_page_image true
          end
        end
        if @community.theme_name == "futurist"
          json.home_page_button_font_family "ms-appx:/DesignTemplates/Expressionist/CutomFonts/HelveticaNeue-Roman.otf#Helvetica Neue"
        elsif @community.theme_name == "panther"
          json.home_page_button_font_family "ms-appx:/Assets/Fonts/Trajan Pro Regular.ttf#Trajan Pro"
        elsif @community.theme_name == "expressionist"
          json.home_page_button_font_family (@community.design.expressionist.present? and @community.design.expressionist.home_page_button_font_family.present?) ? @community.design.expressionist.home_page_button_font_family : "ms-appx:/DesignTemplates/Expressionist/CutomFonts/Arial.ttf#Arial"
        else
          json.home_page_button_font_family "ms-appx:/DesignTemplates/Expressionist/CutomFonts/Arial.ttf#Arial"
        end
        if @community.theme_name == "futurist"
          json.home_page_button_font_size "28px"
        elsif @community.theme_name == "panther"
          json.home_page_button_font_size "28px"
        elsif @community.theme_name == "modernist1"
          json.home_page_button_font_size "16px"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.home_page_button_font_size (@community.design.expressionist.present? and @community.design.expressionist.home_page_button_font_size.present?) ? @community.design.expressionist.home_page_button_font_size : "18px"
        else
          json.home_page_button_font_size "18px"
        end
        if @community.theme_name == "futurist"
          json.home_page_button_image image_url("home_page_button_bg.png")
        elsif @community.theme_name == "expressionist"
          json.home_page_button_image (@community.design.expressionist.present? and @community.design.expressionist.home_page_button_image.present?) ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.home_page_button_image.url : @community.design.expressionist.home_page_button_image.url) : "No Image"
        else
          json.home_page_button_image "No Image"
        end
        if @community.theme_name == "modernist1"
          json.home_page_button_shape "Circular"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.home_page_button_shape @community.design.home_page_button_shape.present? ? @community.design.home_page_button_shape : "Rectangular"
        else
          json.home_page_button_shape "Rectangular"
        end
        if @community.theme_name == "expressionist"
          json.home_page_buttons_border @community.design.home_page_buttons_border.present? ? @community.design.home_page_buttons_border : "All sides"
          json.home_page_navigation_background_height @community.design.home_page_navigation_background_height.present? ? @community.design.home_page_navigation_background_height : "250px"
        elsif @community.theme_name == "futurist" && @community.is_vertical_app
          json.home_page_buttons_border "No border"
          json.home_page_navigation_background_height "350px"
        else
          json.home_page_buttons_border "All sides"
          json.home_page_navigation_background_height "250px"
        end
        if @community.theme_name == "modernist1"
          json.home_page_navigation_background_color "#a33e2a"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.home_page_navigation_background_color @community.design.home_page_navigation_background_color.present? ? @community.design.home_page_navigation_background_color : "#565455"
        else
          json.home_page_navigation_background_color "#565455"
        end
        if @community.theme_name == "modernist1"
          json.home_page_navigation_button_color "#fdfdfd"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.home_page_navigation_button_color @community.design.home_page_navigation_button_color.present? ? @community.design.home_page_navigation_button_color : "#3B3B3B"
        else
          json.home_page_navigation_button_color "#3B3B3B"
        end
        if @community.theme_name == "panther"
          json.home_page_navigation_font_color "#cae0da"
        elsif @community.theme_name == "modernist1"
          json.home_page_navigation_font_color "#777777"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.home_page_navigation_font_color @community.design.home_page_navigation_font_color.present? ? @community.design.home_page_navigation_font_color : "#ffff"
        else
          json.home_page_navigation_font_color "#ffff"
        end
        if @community.theme_name == "futurist" && @community.is_vertical_app
          json.spacing_between_buttons_for_homepage "50px"
        elsif @community.theme_name == "futurist"
          json.spacing_between_buttons_for_homepage "0px"
        elsif @community.theme_name == "panther" && @community.is_vertical_app
          json.spacing_between_buttons_for_homepage "75px"
        elsif @community.theme_name == "panther"
          json.spacing_between_buttons_for_homepage "20px"
        elsif @community.theme_name == "modernist"
          json.spacing_between_buttons_for_homepage "0px"
        elsif @community.theme_name == "expressionist"
          json.spacing_between_buttons_for_homepage (@community.design.expressionist.present? and @community.design.expressionist.spacing_between_buttons_for_homepage.present?) ? @community.design.expressionist.spacing_between_buttons_for_homepage : "10px"
        else
          json.spacing_between_buttons_for_homepage "0px"
        end
        if @community.theme_name == "futurist"
          json.home_page_buttons_height "200px"
        elsif @community.theme_name == "panther"
          json.home_page_buttons_height "150px"
        elsif @community.theme_name == "modernist1"
          json.home_page_buttons_height "200px"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.home_page_buttons_height @community.design.home_page_buttons_height.present? ? @community.design.home_page_buttons_height : "150px"
        else
          json.home_page_buttons_height "150px"
        end
        if @community.theme_name == "futurist"
          json.home_page_buttons_width "450px"
        elsif @community.theme_name == "expressionist"
          json.home_page_buttons_width @community.design.home_page_buttons_width.present? ? @community.design.home_page_buttons_width : "350px"
        else
          json.home_page_buttons_width "350px"
        end
        if @community.theme_name == "futurist"
          json.home_page_buttons_opacity "0%"
        elsif @community.theme_name == "panther"
          json.home_page_buttons_opacity "70%"
        elsif @community.theme_name == "expressionist"
          json.home_page_buttons_opacity @community.design.home_page_buttons_opacity.present? ? @community.design.home_page_buttons_opacity : "100%"
        else
          json.home_page_buttons_opacity "100%"
        end
        if @community.theme_name == "expressionist"
          json.home_page_navigation_background_opacity @community.design.home_page_navigation_background_opacity.present? ? @community.design.home_page_navigation_background_opacity : "100%"
          if @community.theme_name == "panther"
            json.display_home_page_nav_background false
          else
            json.display_home_page_nav_background @community.design.expressionist.present? ? @community.design.expressionist.display_home_page_nav_background : true
          end
          if @community.theme_name == "panther"
            json.display_home_page_nav_background_image false
          else
            json.display_home_page_nav_background_image @community.design.expressionist.display_home_page_nav_background_image
          end
          json.home_page_background_image @community.design.expressionist.home_page_background_image.present? ? (Rails.env.development? ? local_assets_base_url+@community.design.expressionist.home_page_background_image.url : @community.design.expressionist.home_page_background_image.url) : "No Image"

          json.home_page_logo_visible @community.design.expressionist.present? ? (@community.design.expressionist.home_page_logo_visible.present? ? @community.design.expressionist.home_page_logo_visible : false) : false
        else
          json.home_page_navigation_background_opacity "100%"
          if @community.theme_name == "futurist"
            json.display_home_page_nav_background false
          elsif @community.theme_name == "panther"
            json.display_home_page_nav_background false
          else
            json.display_home_page_nav_background true
          end
          json.display_home_page_nav_background_image @community.design.expressionist.present? ? @community.design.expressionist.display_home_page_nav_background_image : false
          json.home_page_background_image "No Image"

          json.home_page_logo_visible false
        end

        if @community.theme_name == "futurist"
          json.home_page_icons_position "Right of text"
        elsif @community.theme_name == "panther"
          json.home_page_icons_position "Above of text"
        elsif @community.theme_name == "panther"
          json.home_page_icons_position "Above of text"
        elsif @community.theme_name == "modernist1"
          json.home_page_icons_position "Above of text"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.home_page_icons_position @community.design.expressionist.present? ? (@community.design.expressionist.home_page_icons_position.present? ? @community.design.expressionist.home_page_icons_position : "Above of text") : "Above of text"

        else
          json.home_page_icons_position "Above the text"
        end
        if @community.theme_name == "expressionist"
          json.gables_home_page_images @community.design.expressionist.present? ? (@community.design.expressionist.gables_home_page_images.present? ? @community.design.expressionist.gables_home_page_images : false) : false
        else
          json.gables_home_page_images false
        end
        # json.button_text_position @community.design.expressionist.present? ? (@community.design.expressionist.button_text_position.present? ? @community.design.expressionist.button_text_position : "Left of text") : "Left of text"
        if @community.theme_name == "panther"
          json.homepage_button_border_thickness "2px"
        elsif @community.theme_name == "expressionist"
          json.homepage_button_border_thickness  @community.design.expressionist.present? ? (@community.design.expressionist.homepage_button_border_thickness.present? ? @community.design.expressionist.homepage_button_border_thickness : "0px") : "0px"
        else
          json.homepage_button_border_thickness "0px"
        end
        if @community.theme_name == "expressionist"
          json.homepage_button_border  @community.design.expressionist.present? ? (@community.design.expressionist.homepage_button_border.present? ? @community.design.expressionist.homepage_button_border : "100%") : "100%"
        end
      end
      json.map_marker do
        json.marker_background_color @community.design.marker_background_color.present? ? @community.design.marker_background_color : "#565455"
        json.marker_style @community.design.marker_style.present? ? @community.design.marker_style : "Tear Drop"
      end
      json.floorplan_unit_popup do
        if @community.theme_name == "futurist"
          json.header_bg_color "#ffffff"
        elsif @community.theme_name == "modernist1"
          json.header_bg_color "#4f4f4f"
        elsif @community.theme_name == "panther"
          json.header_bg_color "#534841"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.header_bg_color @community.design.header_bg_color.present? ? @community.design.header_bg_color : "#ada6a6"
        else
          json.header_bg_color "#ada6a6"
        end
        if @community.theme_name == "expressionist"
          json.header_bg_color_opacity @community.design.header_bg_color_opacity.present? ? @community.design.header_bg_color_opacity : "100%"
        else
          json.header_bg_color_opacity "100%"
        end
        if @community.theme_name == "futurist"
          json.header_font_color "#565656"
        elsif @community.theme_name == "modernist1"
          json.header_font_color "#ffffff"
        elsif @community.theme_name == "panther"
          json.header_font_color "#ffffff"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.header_font_color @community.design.header_font_color.present? ? @community.design.header_font_color : "#ffffff"
        else
          json.header_font_color "#ffffff"
        end
        # if @community.theme_name == "expressionist"
        #   json.header_font_color @community.design.header_font_color.present? ? @community.design.header_font_color : "#ffffff"
        # else
        #   json.header_font_color  "#ffffff"
        # end
        if @community.theme_name == "futurist"
          json.details_bg_color "#7b7b7b"
        elsif @community.theme_name == "modernist1"
          json.details_bg_color "#4f4f4f"
        elsif @community.theme_name == "panther"
          json.details_bg_color "#b6c5bf"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.details_bg_color @community.design.details_bg_color.present? ? @community.design.details_bg_color : "#ada6a6"
        else
          json.details_bg_color "#ada6a6"
        end
        if @community.theme_name == "expressionist"
          json.details_bg_color_opacity @community.design.details_bg_color_opacity.present? ? @community.design.details_bg_color_opacity : "100%"
        else
          json.details_bg_color_opacity "100%"
        end
        if @community.theme_name == "futurist"
          json.details_font_color "#ffffff"
        elsif @community.theme_name == "modernist1"
          json.details_font_color "#ffffff"
        elsif @community.theme_name == "panther"
          json.details_font_color "#ffffff"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.details_font_color @community.design.details_font_color.present? ? @community.design.details_font_color : "#ffff"
        else
          json.details_font_color "#ffff"
        end
        if @community.theme_name == "futurist"
          json.available_appartments_font_color "#ffffff"
        elsif @community.theme_name == "modernist1"
          json.available_appartments_font_color "#ffffff"
        elsif @community.theme_name == "panther"
          json.available_appartments_font_color "#ffffff"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.available_appartments_font_color @community.design.available_appartments_font_color.present? ? @community.design.available_appartments_font_color : "#ffff"
        else
          json.available_appartments_font_color "#ffff"
        end
        if @community.theme_name == "futurist"
          json.available_appartments_bg_color "#3c3c3c"
        elsif @community.theme_name == "modernist1"
          json.available_appartments_bg_color "#cf492f"
        elsif @community.theme_name == "panther"
          json.available_appartments_bg_color "#424344"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.available_appartments_bg_color @community.design.available_appartments_bg_color.present? ? @community.design.available_appartments_bg_color : "#ada6a6"
        else
          json.available_appartments_bg_color "#ada6a6"
        end
        if @community.theme_name == "expressionist"
          json.available_appartments_bg_color_opacity @community.design.available_appartments_bg_color_opacity.present? ? @community.design.available_appartments_bg_color_opacity : "100%"
        else
          json.available_appartments_bg_color_opacity "100%"
        end
        if @community.theme_name == "futurist"
          json.floor_bg_color "#d2d2d2"
        elsif @community.theme_name == "modernist1"
          json.floor_bg_color "#dedee0"
        elsif @community.theme_name == "panther"
          json.floor_bg_color "#ffffff"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.floor_bg_color @community.design.floor_bg_color.present? ? @community.design.floor_bg_color : "#565455"
        else
          json.floor_bg_color "#565455"
        end
        if @community.theme_name == "expressionist"
          json.floor_bg_color_opacity @community.design.floor_bg_color_opacity.present? ? @community.design.floor_bg_color_opacity : "100%"
        else
          json.floor_bg_color_opacity "100%"
        end
        if @community.theme_name == "futurist"
          json.unit_header_bg_color "#ffffff"
        elsif @community.theme_name == "modernist1"
          json.unit_header_bg_color "#4f4f4f"
        elsif @community.theme_name == "panther"
          json.unit_header_bg_color "#534841"
        elsif @community.theme_name == "expressionist"
          json.unit_header_bg_color @community.design.unit_header_bg_color.present? ? @community.design.unit_header_bg_color : "#ada6a6"
        else
          json.unit_header_bg_color "#ada6a6"
        end
        if @community.theme_name == "expressionist"
          json.unit_header_bg_color_opacity @community.design.unit_header_bg_color_opacity.present? ? @community.design.unit_header_bg_color_opacity : "100%"
        else
          json.unit_header_bg_color_opacity "100%"
        end
        if @community.theme_name == "futurist"
          json.unit_header_font_color "#565656"
        elsif @community.theme_name == "modernist1"
          json.unit_header_font_color "#ffffff"
        elsif @community.theme_name == "panther"
          json.unit_header_font_color "#ffffff"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.unit_header_font_color @community.design.unit_header_font_color.present? ? @community.design.unit_header_font_color : "#ffff"
        else
          json.unit_header_font_color "#ffff"
        end
        if @community.theme_name == "futurist"
          json.unit_details_font_color "#ffffff"
        elsif @community.theme_name == "modernist1"
          json.unit_details_font_color "#ffffff"
        elsif @community.theme_name == "panther"
          json.unit_details_font_color "#ffffff"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.unit_details_font_color @community.design.unit_details_font_color.present? ? @community.design.unit_details_font_color : "#ffff"
        else
          json.unit_details_font_color "#ffff"
        end
        if @community.theme_name == "futurist"
          json.unit_details_bg_color "#7b7b7b"
        elsif @community.theme_name == "modernist1"
          json.unit_details_bg_color "#4f4f4f"
        elsif @community.theme_name == "panther"
          json.unit_details_bg_color "#b6c5bf"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.unit_details_bg_color @community.design.unit_details_bg_color.present? ? @community.design.unit_details_bg_color : "#ada6a6"
        else
          json.unit_details_bg_color "#ada6a6"
        end
        if @community.theme_name == "expressionist"
          json.unit_details_bg_color_opacity @community.design.unit_details_bg_color_opacity.present? ? @community.design.unit_details_bg_color_opacity : "100%"
        else
          json.unit_details_bg_color_opacity "100%"
        end
        if @community.theme_name == "futurist"
          json.floorplan_name_bg_color "#3d3e3e"
        elsif @community.theme_name == "modernist1"
          json.floorplan_name_bg_color "#cf492f"
        elsif @community.theme_name == "panther"
          json.floorplan_name_bg_color "#424344"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.floorplan_name_bg_color @community.design.floorplan_name_bg_color.present? ? @community.design.floorplan_name_bg_color : "#ada6a6"
        else
          json.floorplan_name_bg_color "#ada6a6"
        end
        if @community.theme_name == "expressionist"
          json.floorplan_name_bg_color_opacity @community.design.floorplan_name_bg_color_opacity.present? ? @community.design.floorplan_name_bg_color_opacity : "100%"
        else
          json.floorplan_name_bg_color_opacity "100%"
        end
        if @community.theme_name == "futurist"
          json.floorplan_name_font_color "#ffffff"
        elsif @community.theme_name == "modernist"
          json.floorplan_name_font_color @community.design.secondary_font_color.present? ? @community.design.secondary_font_color : "#ffff"
        elsif @community.theme_name == "panther"
          json.floorplan_name_font_color "#ffffff"
        elsif @community.theme_name == "expressionist"
          json.floorplan_name_font_color @community.design.floorplan_name_font_color.present? ? @community.design.floorplan_name_font_color : "#ffff"
        else
          json.floorplan_name_font_color "#ffff"
        end
        if @community.theme_name == "futurist"
          json.unit_bg_color "#d2d2d2"
        elsif @community.theme_name == "modernist1"
          json.unit_bg_color "#dedee0"
        elsif @community.theme_name == "panther"
          json.unit_bg_color "#ffffff"
        elsif @community.theme_name == "expressionist" || @community.theme_name == "modernist"
          json.unit_bg_color @community.design.unit_bg_color.present? ? @community.design.unit_bg_color : "#565455"
        else
          json.unit_bg_color "#565455"
        end
        if @community.theme_name == "expressionist"
          json.unit_bg_color_opacity @community.design.unit_bg_color_opacity.present? ? @community.design.unit_bg_color_opacity : "100%"
        else
          json.unit_bg_color_opacity "100%"
        end
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
          json.url Rails.env.development? ? local_assets_base_url+img.large_image_url + (img.crop_x.present? ? "?temp/"+img.crop_x.to_s  +  img.large_image_url.split('/')[ img.large_image_url.split('/').count - 1] : "")  : img.large_image_url + (img.crop_x.present? ? "?temp/"+img.crop_x.to_s +  img.large_image_url.split('/')[ img.large_image_url.split('/').count - 1] : "")
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
    if (@community.display_sitemap || @community.display_floorplan_gallery)
      json.show_apartment_page  true
    else
      json.show_apartment_page false
    end
    json.apartment_page_name @community.apartment_page_name
    json.display_rent @community.display_rent
    json.pricing_message @community.pricing_message
    json.display_pricing_options @community.display_pricing_options
    json.display_sitemap @community.display_sitemap
    json.display_floorplan_gallery @community.display_floorplan_gallery
    json.display_available_date @community.display_available_date
    json.units_availability_over_120_days @community.units_availability_over_120_days
    json.show_property_map_key @community.show_property_map_key
    json.show_property_map_key_text @community.show_property_map_key_text
    json.show_amenity_key @community.show_amenity_key
    json.show_amenity_key_text @community.show_amenity_key_text

    if @community.sitemap.present? and !@community.has_floorplates?
      image_url = @community&.sitemap&.image&.url
      # image_url = @community.sitemap.image.url(:svg_for_metro).present? ? @community.sitemap.image.url(:svg_for_metro) : @community.sitemap.image.url
      begin
        json.sitemap Rails.env.development? ? local_assets_base_url+image_url : image_url
      rescue

      end

      json.sitemap_amenities @community.sitemap.amenities do |amenity|
        json.image amenity.image.present? ? (Rails.env.development? ? local_assets_base_url+amenity.image.url : amenity.image.url) : nil
        json.name amenity.name
        json.x_plot amenity.x_plot
        json.y_plot amenity.y_plot
        json.sitemap_id @community.id
        json.id amenity.id
        json.video_link_button_label amenity.video_link_button_label || "3D TOUR"
        json.video_link amenity.video_link
      end

    else
      json.sitemap nil
    end

    units_floorplans = []
    floorplans = @community.floorplans
    available_units_and_sold_units = @community.units.available_units(@community.units_availability_over_120_days)# + @community.units.are_sold
    json.display_unit_on_homepage @community.display_unit_on_homepage
    json.units available_units_and_sold_units.map {|i| i.marketing_name.gsub(/\d+/) {|s| "%08d" % s.to_i } }.zip(available_units_and_sold_units).sort.map{|x,y| y}.each do |unit|
      if @community.data_provider == "psi"
        conditionAvailable = unit.available
      else
        conditionAvailable = 1
      end
      if floorplans.any?{|f| f.provider_floorplan_id == unit.floorplan_id} && conditionAvailable
        floorplan = floorplans.select{|f| f.provider_floorplan_id == unit.floorplan_id}.first
        units_floorplans << floorplan
        json.marketing_name unit.api_unit_marketing_name
        json.rent unit.effective_rent.present? ? unit.effective_rent : 0
        json.min_rent unit.effective_rent.present? ? unit.effective_rent : 0
        json.avg_rent unit.avg_effective_rent.present? ? unit.avg_effective_rent : 0
        json.max_rent (unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override) ?  (unit.effective_rent.present? ? unit.effective_rent : 0) : (unit.max_effective_rent.present? && unit.max_effective_rent.to_i > 0)? unit.max_effective_rent : (unit.effective_rent.present? ? unit.effective_rent : 0)
        json.availability unit.availability
        json.available_date DateFormatter.formatted_date_by_region(@community.country_code, (unit.available_date.present? ? ((unit.available_date < Time.now) ? Time.now.strftime('%m/%d/%Y') : unit.available_date.strftime('%m/%d/%Y')) : Date.today - 1.day) )
        json.available unit.available
        json.sold unit.sold
        json.additional_fee @community.get_additional_fees(unit)

        if @community.theme_name == "modernist"
          json.unit_description unit.description.present? ? "<div style='color:#{(@community.design.primary_font_color.present? ? @community.design.primary_font_color : "#FFFFFF")}'>"+unit.description+"</div>" : (unit&.floorplan&.description.present? ? "<div style='color:#{(@community.design.primary_font_color.present? ? @community.design.primary_font_color : "#FFFFFF")}'>"+unit&.floorplan&.description+"</div>"  : nil)
        else
          json.unit_description unit.description.present? ? "<div>"+unit.description+"</div>" : (unit&.floorplan&.description.present? ? "<div'>"+unit&.floorplan&.description+"</div>"  : nil)
        end
        json.x_plot unit.x_plot
        json.y_plot unit.y_plot
        json.building unit.building
        json.floorplan_id floorplan.id
        json.unit_type unit.unit_type
        json.provider_unit_id unit.provider_unit_id
        json.id unit.id
        json.floorplan_name floorplan.present? ? floorplan.name : nil
        json.bedrooms floorplan.present? ? floorplan.bedrooms : 0
        json.display_virtual_tour_button_label true #unit.display_virtual_tour_button_label.present? ? unit.display_virtual_tour_button_label : false
        json.virtual_tour_button_label unit.virtual_tour_button_label.present? ? unit.virtual_tour_button_label : "3D Tour"
        json.virtual_tour unit.get_unit_virtual_tour_url()
        json.bathrooms floorplan.present? ? convert_float_to_integer(floorplan.bathrooms) : 0
        json.floorplan_description floorplan.description.present? ? "<div>"+floorplan.description+"</div>"  : nil
        json.square_feet unit.square_feet.present? && unit.square_feet > 1 ? unit.square_feet : (floorplan.present? ? floorplan.square_feet : 0)
        
        if @community.display_rent
          if unit.lease_pricing.present? && @community.display_pricing_options
            json.lease_pricing unit.lease_pricing.gsub('=>', ':')
          else
            json.lease_pricing nil
          end
          
        else
          json.lease_pricing nil
        end

        if unit.standard_image_url.present? || unit.secondary_image.present?
          json.image unit.standard_image_url.present? ? (Rails.env.development? ? local_assets_base_url+unit.standard_image_url : unit.standard_image_url) : nil
          json.secondary_image unit.secondary_image.present? ? (Rails.env.development? ? local_assets_base_url+unit.secondary_image.url : unit.secondary_image.url) : nil
        else
          # json.image floorplan.present? ? (floorplan.standard_image_url.present? ? (Rails.env.development? ? local_assets_base_url+floorplan.standard_image_url : floorplan.standard_image_url) : nil) : nil
          # json.secondary_image floorplan.present? ? (floorplan.secondary_image.present? ? (Rails.env.development? ? local_assets_base_url+floorplan.secondary_image.url : floorplan.secondary_image.url) : nil) : nil

          json.image floorplan.standard_image_url.present? ? (Rails.env.development? ? local_assets_base_url+floorplan.standard_image_url + (floorplan.crop_x.present? ? "?temp/"+floorplan.crop_x.to_s +  floorplan.standard_image_url.split('/')[ floorplan.standard_image_url.split('/').count - 1] : ""): floorplan.standard_image_url + (floorplan.crop_x.present? ? "?temp/"+floorplan.crop_x.to_s+  floorplan.standard_image_url.split('/')[ floorplan.standard_image_url.split('/').count - 1] : "")) : nil
          json.secondary_image floorplan.secondary_image.present? ? (Rails.env.development? ? local_assets_base_url+floorplan.secondary_image.url + (floorplan.crop_x_secondary.present? ? "?temp/"+floorplan.crop_x_secondary.to_s +  floorplan.secondary_image.url.split('/')[ floorplan.secondary_image.url.split('/').count - 1] : ""): floorplan.secondary_image.url + (floorplan.crop_x_secondary.present? ? "?temp/"+floorplan.crop_x_secondary.to_s + floorplan.secondary_image.url.split('/')[ floorplan.secondary_image.url.split('/').count - 1] : "")) : nil
        end
        json.floorplan_image floorplan.present? ? (floorplan.standard_image_url.present? ? (Rails.env.development? ? local_assets_base_url+floorplan.standard_image_url : floorplan.standard_image_url) : nil) : nil
        # json.floorplate_number unit.floorplate.present? ? unit.floorplate.number : 0
        json.floorplate_number unit.floor.present? ? unit.floor : 0
        if unit.amenities.plotted_amenities.size > 0
          json.unit_amenities unit.amenities.plotted_amenities do |amenity|
            json.image amenity.standard_image_url.present? ? (Rails.env.development? ? local_assets_base_url+amenity.standard_image_url : amenity.standard_image_url) : nil
            json.name amenity.name
            json.x_plot amenity.x_plot
            json.y_plot amenity.y_plot
            json.unit_id unit.id
            #json.id amenity.id
            random_number = SecureRandom.random_number(59999)
            unless random_numbers.include?(random_number)
              random_numbers << random_number
              json.id random_number
            else
              random_number = SecureRandom.random_number(69999)
              random_numbers << random_number
              json.id random_number
            end
          end
        elsif !unit.standard_image_url.present?
          #If unit amenities are not present then send floorplan amenities
          json.unit_amenities floorplan.amenities.plotted_amenities do |amenity|
            json.image amenity.standard_image_url.present? ? (Rails.env.development? ? local_assets_base_url+amenity.standard_image_url : amenity.standard_image_url) : nil
            json.name amenity.name
            json.x_plot amenity.x_plot
            json.y_plot amenity.y_plot
            json.unit_id unit.id
            random_number = SecureRandom.random_number(59999)
            unless random_numbers.include?(random_number)
              random_numbers << random_number
              json.id random_number
            else
              random_number = SecureRandom.random_number(69999)
              random_numbers << random_number
              json.id random_number
            end
          end
        else
          json.unit_amenities []
        end
      end
    end
    json.floorplans units_floorplans.map {|i| i.name.gsub(/\d+/) {|s| "%08d" % s.to_i } }.zip(units_floorplans).sort.map{|x,y| y}.uniq do |floorplan|
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
      json.image floorplan.standard_image_url.present? ? (Rails.env.development? ? local_assets_base_url+floorplan.standard_image_url + (floorplan.crop_x.present? ? "?temp/"+floorplan.crop_x.to_s +  floorplan.standard_image_url.split('/')[ floorplan.standard_image_url.split('/').count - 1] : ""): floorplan.standard_image_url + (floorplan.crop_x.present? ? "?temp/"+floorplan.crop_x.to_s+  floorplan.standard_image_url.split('/')[ floorplan.standard_image_url.split('/').count - 1] : "")) : nil
      json.secondary_image floorplan.secondary_image.present? ? (Rails.env.development? ? local_assets_base_url+floorplan.secondary_image.url + (floorplan.crop_x_secondary.present? ? "?temp/"+floorplan.crop_x_secondary.to_s +  floorplan.secondary_image.url.split('/')[ floorplan.secondary_image.url.split('/').count - 1] : ""): floorplan.secondary_image.url + (floorplan.crop_x_secondary.present? ? "?temp/"+floorplan.crop_x_secondary.to_s + floorplan.secondary_image.url.split('/')[ floorplan.secondary_image.url.split('/').count - 1] : "")) : nil
      json.display_virtual_tour_button_label true #floorplan.display_virtual_tour_button_label.present? ? floorplan.display_virtual_tour_button_label : false
      json.virtual_tour_button_label floorplan.virtual_tour_button_label.present? ? floorplan.virtual_tour_button_label : "3D Tour"
      json.virtual_tour floorplan.get_floorplan_virtual_tour_url()

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
        json.id floor
        json.number floor
        json.name floorplate.name
        json.floor_name floorplate.floor_name_added ? floorplate.floor_name : floor
        json.image floorplate.image_url.present? ? (Rails.env.development? ? local_assets_base_url+image_url : image_url) : nil

        json.floorplate_amenities floorplate.amenities do |amenity|
          if (amenity.x_plot.present? && amenity.y_plot.present?) && (amenity.x_plot > 0 || amenity.y_plot > 0)
            json.image amenity.standard_image_url.present? ? (Rails.env.development? ? local_assets_base_url+amenity.standard_image_url : amenity.standard_image_url) : nil
            json.name amenity.name
            json.x_plot amenity.x_plot
            json.y_plot amenity.y_plot
            json.floorplate_id floor
            json.floor amenity.floor
            json.id amenity.id
            json.video_link_button_label amenity.video_link_button_label || "3D TOUR"
            json.video_link amenity.video_link
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
      # json.latitude @community.neighborhood.latitude.present? ? @community.neighborhood.latitude : @community.latitude
      # json.longitude @community.neighborhood.longitude.present? ? @community.neighborhood.longitude : @community.longitude
      json.latitude @community.latitude.present? ? @community.latitude : 0.0
      json.longitude @community.longitude.present? ? @community.longitude : 0.0
      json.radius @community.neighborhood.radius.present? ? @community.neighborhood.radius : 5000
      json.zoom @community.neighborhood.zoom.present? ? @community.neighborhood.zoom : 14
      json.address @community.neighborhood.address.present? ? @community.neighborhood.address : @community.make_address
      json.display_neighborhood_on_homepage @community.neighborhood.display_neighborhood_on_homepage
      if @community.neighborhood.listing.present?
        json.listing @community.neighborhood.listing
      end
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
          json.image location.standard_image_url.present? ? (Rails.env.development? ? local_assets_base_url+location.standard_image_url : location.standard_image_url) : asset_url("no_img.png")
          json.distance location.distance
          json.time location.time
          json.rating location.rating.present? ? location.rating : 0
        end
      end
    else
      json.show_neighborhood_page true
      json.neighborhood_page_name "Neighborhood"
      json.display_neighborhood_on_homepage true
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
    json.display_gallery_on_homepage @community.display_gallery_on_homepage
    if @community.gallery_images.present?
      json.categories @community.galleries.order(:sort).pluck(:name).each do |name|
        json.title name
      end
      #json.images @community.gallery_images.order(:sort).each_with_index.to_a do |(img,index)|
      json.images @community.gallery_images.each do |img|
        unless params[:action] == "ios_data"
          if img.standard_image_url.include?(".mp4") || img.standard_image_url.include?(".MP4")
            json.url Rails.env.development? ? local_assets_base_url+img.standard_image_url : (img.video.url || img.standard_image_url)
            json.video true
            json.poster "https://images-pynwheel-cms-v2.s3.amazonaws.com/uploads/amenity/image/124/124-1518624577-video-placeholder.jpg"
          else
            json.url Rails.env.development? ? local_assets_base_url+img.large_image_url + (img.crop_x.present? ? "?temp/"+img.crop_x.to_s   +  img.large_image_url.split('/')[ img.large_image_url.split('/').count - 1] : "") : img.large_image_url + (img.crop_x.present? ? "?temp/"+img.crop_x.to_s  + img.large_image_url.split('/')[ img.large_image_url.split('/').count - 1] : "")
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
        json.url webpage.get_webpage_virtual_tour_url()
        json.position webpage.position.present? ? webpage.position : 0
        json.display_on_homepage webpage.display_on_homepage.present? ? webpage.display_on_homepage : false
      end
    end
    if @community.imagepages.present?
      json.imagepages @community.imagepages.active.each do |imagepage|
        json.id imagepage.id
        json.title imagepage.name
        json.position imagepage.position.present? ? imagepage.position : 0
        json.display_on_homepage imagepage.display_on_homepage.present?  ? imagepage.display_on_homepage : false
        json.slideshow imagepage.is_slideshow
        if imagepage.additional_images.present?
          json.images imagepage.additional_images.order(:sort)  do |image|
            json.id image.id
            json.title image.name
            json.image Rails.env.development? ? local_assets_base_url+image.image.url + (image.crop_x.present? ? "?temp/"+image.crop_x.to_s  +  image.image.url.split('/')[ image.image.url.split('/').count - 1] : "") : image.image.url + (image.crop_x.present? ? "?temp/"+image.crop_x.to_s  + image.image.url.split('/')[ image.image.url.split('/').count - 1] : "")
          end
        end
      end
    end
  end
  json.message "success"
  json.operation "data"

end