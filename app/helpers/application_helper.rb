module ApplicationHelper
  def sidemenu_communities_actions 
    ["index","new","create","update"]
  end
  def flash_class(level)
    case level
      when 'notice' then "alert alert-success"
      when 'error' then "alert alert-danger"
      when 'alert' then "alert alert-danger"  
    end
  end

  def font_families
    options_with_style = []
    families = ["Arial","Agency FB","Brush Script MT","Calibri","Franklin Gothic Book","Gungsuh","Global User Interface","Goudy Old Style","Gulim","Helvetica Neue","Kristen ITC","Latha","Lucida Calligraphy","Lucida Handwriting","Pristina","PMingLiU-ExtB","Rockwell","Rod","Segoe Script","SketchFlow Print","Sitka Display","Sylfaen","Segoe Marker","Times New Roman","Tunga","Trebuchet MS","Tempus Sans ITC","Vivaldi","Verdana"]
    families.each do |family|
      options_with_style << [family,family,:style => "font-family:#{family}" ] 
    end
    return options_with_style
  end

  def font_sizes
    ["14px","16px","18px","20px","22px","24px","26px","28px","30px"]
  end
  
  def filter_panel_font_sizes
    ["18px","20px","22px","24px","26px"]
  end

  def font_weight
    ["normal","bold","lighter"]
  end

  def text_align
    ["left","right","center","justify","inherit","unset","start","end"]
  end

  def menu_position
    ["Vertical","Horizontal"]
  end

  def vertical_menu_position
    ["Right","Middle","Left"]
  end

  def horizontal_menu_position
    ["Top","Middle","Bottom"]
  end
  
  def home_page_position_of_logo
    ["Right","Left","Upper right","Upper left","Upper centre","Centre"]
  end
  
  def home_page_logo_size
    ["487x160","450x200","450x200","550x250","600x300"]
  end

  def button_style
    ["Solid","Bordered","Top","Bottom"]
  end

  def border_radius
    ["1px","2px","3px","4px","5px","6px","7px","8px","9px","10px"]
  end
  def border_width
    ["1px","2px","3px","4px","5px","6px","7px","8px","9px","10px"]
  end

  def logo_position
    ["Top","Center","Bottom"]
  end

  def secondary_logo_position
    ["Right","Center","Left"]
  end

  def global_navigation_position
    ["Top","Bottom"]
  end

  def opacity_options
    ["0%","70%","100%"]
  end

  def button_shape_options
    ["Rectangular","Circular"]
  end

  def border_options
    ["Top-Bottom","Left-Right","All sides","No border"]
  end

  def button_height_options
    ["110px","150px","200px"]
  end

  def navigation_background_height_options
    ["250px","300px","350px"]
  end

  def button_width_options
    ["100px","150px","200px"]
  end
  
  def home_page_button_width
    ["350px","400px","450px","500px","550px","600px"]
  end


  def navigation_button_height_options
    ["110px","120px","125px"]
  end

  def navigation_button_width_options
    ["110px","120px","125px"]
  end

  def convert_float_to_integer(x)
    if x%1 == 0
      return x.to_i
    else
      return x
    end
  end

  # def find_floorplate_number(amenityable_id)
 #      floorplate = Floorplate.find amenityable_id
 #      return floorplate.number
  # end

  def uri(website)
        website.gsub(/^https?\:\/\//,'')
  end

  def unit_id_is_in_cookies?(cookies,fav_unit_id)
    array = JSON.parse(cookies)
    array.include? fav_unit_id.to_s
  end

  def determine_available_date(date)
    if date < Date.today
      "Now"
    else
      date.strftime("%m/%d/%Y")
    end
  end

  # def unit_count(hash,plot_x,plot_y)
  #   count = ""
  #   hash.each do |h|
  #     array_as_key = h[0] 
  #     if plot_x == array_as_key[0] and plot_y == array_as_key[1]
  #       value = h[1]
  #       if value.to_i > 1
  #        count = value
  #       end 
  #     end
  #   end
  #   return count
  # end

  def set_active_class(x,categories)
    arr = categories.split(',')
    if arr.include? x
      return 'active'
    else
      return ''
    end
  end

  def hide_decimals(x)
    if x%1 == 0
      return x.to_i
    else
      return x
    end
  end

  def bathroom_text(floorplan)
    floorplan.bathrooms <= 1 ? "Bathroom" : "Bathrooms"
  end

  def bedroom_text(floorplan)
    floorplan.bedrooms == "1" ? "Bedroom" : "Bedrooms"
  end

  def style_themes
    ["modernist","cubist","expressionist"]
  end

  def gables_theme(community)
    if community.theme_name.present?
      name = community.theme_name.split('_')
      if name[0] == 'gables'
        return true
      else
        return false
      end
    else
      return false
    end
  end
    
end
