require 'open-uri'

module ApplicationHelper
  
  def currencies
    Community.last&.all_currencies(Money::Currency::table)
  end

  def data_provider_options(community)
    company = community.company
    options =  if community.use_company_level_data_settings
      [
        (["Entrata", "psi"] if company.data_providers.include?("psi") ),
        (["RealPage", "realpagesvc"] if company.data_providers.include?("realpagesvc") ),
        (["YardiRentCafe", "yardirentcafe"] if company.data_providers.include?("yardirentcafe") ),
        (["Yardi", "yardi"] if company.data_providers.include?("yardi") ),
        (["ResMan", "resman"] if company.data_providers.include?("resman") ),
      ]
    else
      [
        ["App Folio", "appfolio"],
        ["Entrata", "psi"],
        ["RealPage", "realpagesvc"],
        ["YardiRentCafe", "yardirentcafe"],
        ["Yardi", "yardi"],
        ["ResMan", "resman"],
        ["RentManager", "rentmanager"],
        ["RE Data Systems (ftp)", "zaremba"],
        ["Xml", "xml"],
        ["Spreadsheet", "spreadsheet"],
      ]
    end
    options.compact.reject(&:empty?)
  end

  def javascript_version
    timestamp = DateTime.now.to_i
    "v#{timestamp}"
  end

  def sidemenu_communities_actions
    ["index","new","create","update"]
  end

  def sidemenu_communities_controllers
    ["home", "companies", "community_groups", "regions", "group_design","analytics"]
  end

  def accounts_dropdown_menu
    ["companies", "community_groups", "regions", "communities"]
  end

  def flash_class(level)
    case level
    when 'notice' then "alert alert-success"
    when 'error' then "alert alert-danger"
    when 'alert' then "alert alert-danger"
    end
  end

  def encoded(tour_user)
    payload = {tour_user_id: tour_user&.id, tour_user_email: tour_user&.email}
    JWT.encode payload, ENV['SECRET_KEY_BASE'], 'HS256'
  end

  def decoded(token)
    JWT.decode token, ENV['SECRET_KEY_BASE'], true, { algorithm: 'HS256' } rescue nil
  end

  def grant_access(token, tour_user_id)
    begin
      tour_user = TourUser.find tour_user_id
      if tour_user.present?
        (tour_user&.id == token[0]['tour_user_id'].to_i)
      else
        false
      end
      # ((TourUser.find payload[0]['tour_user_id'].to_i).secure_random == payload[0]['secure_random']) && (payload[0]['license_key'] == ENV['TEMP_ACESS_TOKEN'])
    rescue => ex
      false
    end
  end

  def api_access
    ENV["API_ACCESS"] == "true" ? true : false
  end

  def make_link str
    start_index = str.index('{')
    end_index = str.index('}')
    middle_index = str.index(',')
    while start_index.present? and end_index.present? and middle_index.present? and start_index < middle_index and middle_index < end_index do
      puts "res"
      word = str[start_index..end_index] rescue nil

      if word.present? && word.include?(',')
        link, text = str[start_index+1..end_index-1].split(',')
        link = "<a href=#{link} target='_blank'>#{text}</a>"
        str = str.sub(word,link)
      end

      start_index = str.index('{')
      end_index = str.index('}')
      middle_index = str.index(',')
    end

    str
  end

  def gables_theme_options
    ["gables_organic","gables_refined","gables_energetic","gables_natural","gables_custom"]
  end

  def self_tour_icon_size
    [["19x25","0"],["17x23","1"],["15x21","2"],["13x19","3"],["11x17","4"]]
  end

  def font_families
    options_with_style = []
    families = JSON.parse(File.read(Rails.root.join("app/assets/jsons/font_families.json")))
    f_families = JSON.parse(File.read(Rails.root.join("app/assets/jsons/f_font_families.json")))

    f_families.each do |family|
      options_with_style << [family[0],family[1],:style => "font-family:#{family[0]}" ]
    end

    options_with_style
  end

  def font_sizes
    ["14px","16px","18px","20px","22px","24px","26px","28px","30px","32px","34px","36px","38px","40px","42px","44px","46px","48px","50px","52px","54px","56px","58px","60px"]
  end

  def display_position_on_homepage
    [["Select",""],["1","1"],["2","2"],["3","3"]]
  end

  def filter_panel_text_font_sizes
    ["12px","13px","14px","15px","16px","17px","18px"]
  end

  def global_navigation_button_font_sizes
    ["13px","14px","15px","16px","17px","18px","19px","20px","21px","22px","23px","24px","25px","26px","27px","28px","29px","30px"]
  end

  def filter_panel_button_text_font_sizes
    ["18px","19px","20px","21px"]
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

  def horizontal_menu_position_homepage
    ["Top","Middle","Bottom",["Vertical Left","Vertical_Left"],["Vertical Middle","Vertical_Middle"],["Vertical Right","Vertical_Right"]]
  end

  def home_page_position_of_logo
    [["Right align (Horizontal)","Right"],["Left align (Horizontal)","Left"],"Upper right","Upper left","Upper centre","Centre",["Bottom right","=Bottom right"],["Bottom left","=Bottom left"],["Bottom center","=Bottom center"],["Top align (Vertical)","Top"], ["Bottom align (Vertical)","Bottom"]]
  end

  def home_page_logo_size
    ["487x160","450x200","550x250","600x300"]
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
    ["0%","30%","70%","100%"]
  end

  def button_shape_options
    ["Rectangular","Circular"]
  end

  def border_options
    ["Top-Bottom","Left-Right","All sides","No border"]
  end

  def button_height_options
    ["110px","150px","200px","400px","450px","500px"]
  end

  def navigation_background_height_options
    ["250px","300px","350px","400px","450px","500px"]
  end

  def button_width_options
    ["100px","150px","200px"]
  end

  def home_page_button_width
    ["300px","350px","400px","450px","500px","550px","600px"]
  end

  def navigation_button_height_options
    ["50px","75px","100px","110px","120px","125px","136px"]
  end

  def navigation_button_width_options
    ["175px","250px","377px","475px","502px"]
  end

  def spacing_options
    ["0px","10px","20px","30px","40px","50px","60px","70px","80px","90px","100px"]
  end

  def spacing_between_buttons_options
    ["0px","5px","10px","20px","30px","40px","50px","60px","70px","80px","90px","100px"]
  end

  def map_marker_size_option
    ["25px","30px","35px"]
  end

  def global_navigation_border_thickness_space
    ["0px","2px","4px","6px","8px","10px","12px","14px","16px","18px","20px","22px","24px","26px","28px","30px","32px",
     "34px","36px","38px","40px","42px","44px","46px","48px","50px"]
  end

  def home_page_icons_position_option
    ["Left of text","Right of text","Above of text"]
  end

  def global_nav_icons_position_option
    ["Left of text","Right of text","Above the text"]
  end

  def global_nav_button_icon_size_option
    ["25px","35px","45px","55px","65px"]
  end

  def cards_formats
    ["HID Prox 26-bit H10301", "HID Prox 35-bit C1000", "HID Prox 37-bit H10304", "HID Prox 37-bit H10302", "26-bit QuadReal Commerce Place", "HID Prox 36-bit C10202", "HID Prox 32-bit SNC", "HID Prox 48-bit", "HID Wiegand 33-bit D10202", "HID Prox 33-bit D10202"]
  end

  def convert_float_to_integer(x)
    if x%1 == 0
      return x.to_i
    else
      return x
    end
  end

  def uri(website)
    website.gsub(/^https?\:\/\//,'')
  end

  def unit_id_is_in_cookies?(cookies,fav_unit_id)
    if cookies.present?
      array = JSON.parse(cookies)
      array.include? fav_unit_id.to_s
    end
  end

  def determine_available_date(date)
    return unless date

    if date < Date.today
      "Now"
    else
      date.strftime("%m/%d/%Y")
    end
  end

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
  rescue
    0
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

  def invitation_communities(company)
    c = Company.find_by(name: company)
    c.communities.real_properties.pluck(:name,:id)
  end

  def delete_logs(item_type, item_id)
    f = nil #PaperTrail::Version.find_by(item_id: item_id, item_type: item_type,event: "destroy")
    if f.present?
      if item_type == "Unit"
        return f.object.split("marketing_name:")[1].split("'")[1]
      elsif item_type == "AdditionalImage" || item_type == "Amenity"  || item_type == "Gallery" || item_type == "Imagepage" || item_type == "FavoriteImage"|| item_type == "GalleryImage"
        return f.object.split("name:")[1].split(" ")[0].split(" ")[0]
      elsif item_type == "Floorplan"
        f.object.split("name:")[1].split(" ")[0].split(" ")[0]
      elsif item_type == "Location"
        return f.object.split("title:")[1].split(" ")[0]
      elsif item_type == "Community"
        return f.object.split("name:")[1].split(" ")[0]
      elsif item_type == "Design" || item_type == "Expressionist" || item_type == "FilterPanel" || item_type == "Neighborhood"
        return (Community.find (Design.find (f.object.split("design_id:")[1].split(" ")[1].to_i)).community_id).name
      elsif item_type == "EbrochureMenuButton"
        return f.object.split("name:")[1].split(" ")[0]
      else
        if item_type == "PathPoint" ||  item_type == "TourStop" ||  item_type == "TourStopStartingPoint"  ||  item_type == "TourPath"
          return f.object.split("name:")[1].split(" ")[0].split("'")[1]
        else
          return "Not Found"
        end
      end

    else
      "Not found"
    end
  end

  def delete_community_name(item_type, item_id)
    begin
      f = nil #PaperTrail::Version.find_by(item_id: item_id, item_type: item_type,event: "destroy")
      if f.present?
        if item_type == "Unit"
          return (Community.find f.object.split("community_id:")[1].split("'")[1].to_i).name
        elsif item_type == "Floorplan" || item_type == "Amenity" || item_type == "FavoriteImage"
          (Community.find f.object.split("community_id:")[1].split(" ")[0].to_i).name
        elsif item_type == "AdditionalImage" || item_type == "Imagepage" || item_type == "Gallery" || item_type == "GalleryImage"
          (Community.find (f.object.split("community_id:")[1].split("'")[1].to_i)).name
        elsif item_type == "Design" || item_type == "Expressionist" || item_type == "FilterPanel" || item_type == "Neighborhood"
          (Community.find (Design.find (f.object.split("design_id:")[1].split(" ")[1].to_i)).community_id).name
        elsif item_type == "Community"
          f.object.split("name:")[1].split(" ")[0]
        elsif item_type == "Location"
          (Community.find (Neighborhood.find (f.object.split("neighborhood_id:")[1].split(" ")[0].to_i)).community_id).name
        else
          if item_type == "PathPoint" ||  item_type == "TourStop" ||  item_type == "TourStopStartingPoint" ||  item_type == "TourPath"
            return (Community.find f.object.split("community_id:")[1].split(" ")[0].split("'")[1]).name
          else
            return "Not Found"
          end
        end
      else
        if item_type == "ImportData" || item_type == "ReplaceData" || item_type == "SwapData"
          return (Community.find f.community_id).name
        end
        "Not found"
      end
    rescue => mm
      "Not found"
    end
  end

  def get_logs_name(item_type, item_id,f)
    begin
      if (item_type.classify.constantize.find_by(id: item_id).nil?)
        if item_type == "Unit"
          f.object.split("marketing_name:")[1].split("'")[1]
        elsif item_type == "AdditionalImage"|| item_type == "Gallery" || item_type == "Imagepage" || item_type == "FavoriteImage"|| item_type == "GalleryImage"
          f.object.split("name:")[1].split(" ")[0].split("'")[1]
        elsif item_type == "Floorplan" || item_type == "HomePageImage" || item_type == "Amenity"
          f.object.split("name:")[1].split(" ")[0].split(" ")[0]
        elsif item_type == "Floorplate"
          f.object.split("name:")[1].split(" ")[0]
        elsif item_type == "Location"
          f.object.split("title:")[1].split(" ")[0]
        elsif item_type == "Community"  && item_type == "Floorplate"
          f.object.split("name:")[1].split(" ")[0]
        elsif item_type == "Design" || item_type == "Expressionist" || item_type == "FilterPanel" || item_type == "Neighborhood"
          (Community.find (Design.find (f.object.split("design_id:")[1].split(" ")[1].to_i)).community_id).name
        elsif item_type == "EbrochureMenuButton"
          f.object.split("name:")[1].split(" ")[0]
        elsif item_type == "ImportData" || item_type == "ReplaceData" || item_type == "SwapData" || item_type == "Credential"
          (Community.find f.community_id).name
        else
          if item_type == "PathPoint" ||  item_type == "TourStop" ||  item_type == "TourStopStartingPoint"  ||  item_type == "TourPath"
            return f.object.split("name:")[1].split(" ")[0].split("'")[1]
          else
            return "Not Found"
          end
        end

      else
        if item_type == "Unit"
          return (item_type.classify.constantize.find item_id).marketing_name
        elsif item_type == "Neighborhood"
          return (item_type.classify.constantize.find item_id).neighborhood_name
        elsif item_type == "FavoriteSetting"
          return (item_type.classify.constantize.find item_id).favorite_name
        elsif item_type == "Credential" || item_type == "Design"
          return ((Community.find ((item_type.classify.constantize.find item_id).community_id)).name)
        elsif item_type == "Expressionist" || item_type == "Menu" || item_type == "Gable"  || item_type == "FilterPanel"
          return ((Community.find ((Design.find (item_type.classify.constantize.find item_id).design_id).community_id)).name)
        elsif item_type == "User"
          return (item_type.classify.constantize.find item_id).email
        elsif item_type == "Location"
          return (item_type.classify.constantize.find item_id).title
        elsif item_type == "EbrochureMenuButton"
          f.object.split("name:")[1].split(" ")[0]
        else
          return (item_type.classify.constantize.find item_id).name
        end
      end

    rescue => ex
      begin
        if item_type == "PathPoint" ||  item_type == "TourStop" ||  item_type == "TourStopStartingPoint"  ||  item_type == "TourPath"
          return f.object.split("name:")[1].split(" ")[0].split("'")[1]
        end
        if item_type == "ImportData" || item_type == "ReplaceData" || item_type == "SwapData"
          return (Community.find f.community_id).name
        end
        return delete_logs(item_type,item_id)
      rescue => ee
      end
    end
  end

  def get_community_name(item_type, item_id,f)
    if f.community_id.present?
      begin
        if (item_type.classify.constantize.find_by(id: item_id).nil?)
          if item_type == "Unit"
            return (Community.find f.object.split("community_id:")[1].split("'")[1].to_i).name
          elsif item_type == "Floorplan" || item_type == "Amenity" || item_type == "FavoriteImage"   && item_type == "Floorplate"
            (Community.find f.object.split("community_id:")[1].split(" ")[0].to_i).name
          elsif item_type == "Floorplate"
            (Community.find f.object.split("community_id:")[1].to_i).name
          elsif item_type == "AdditionalImage" || item_type == "Imagepage" || item_type == "Gallery" || item_type == "GalleryImage"
            (Community.find (f.object.split("community_id:")[1].split("'")[1].to_i)).name
          elsif item_type == "Design" || item_type == "Expressionist" || item_type == "FilterPanel" || item_type == "Neighborhood"
            (Community.find (Design.find (f.object.split("design_id:")[1].split(" ")[1].to_i)).community_id).name
          elsif item_type == "HomePageImage"
            (Community.find (Design.find (f.object.split("design_id:")[1].split(" ")[0].to_i)).community_id).name
          elsif item_type == "Community"
            f.object.split("name:")[1].split(" ")[0]
          elsif item_type == "Location"
            (Community.find (Neighborhood.find (f.object.split("neighborhood_id:")[1].split(" ")[0].to_i)).community_id).name
          else
            if item_type == "PathPoint" ||  item_type == "TourStop" ||  item_type == "TourStopStartingPoint" ||  item_type == "TourPath"
              return (Community.find f.object.split("community_id:")[1].split(" ")[0].split("'")[1]).name
            else
              return "Not Found"
            end
          end
        else
          return (Community.find f.community_id).name
        end

      rescue => ecc
        "Not Found"
      end

    else
      begin
        if (item_type.classify.constantize.find_by(id: item_id).nil?)
          if item_type == "Unit"
            return (Community.find f.object.split("community_id:")[1].split("'")[1].to_i).name
          elsif item_type == "Floorplan" || item_type == "Amenity" || item_type == "FavoriteImage"
            (Community.find f.object.split("community_id:")[1].split(" ")[0].to_i).name
          elsif item_type == "AdditionalImage" || item_type == "Imagepage" || item_type == "Gallery" || item_type == "GalleryImage"
            (Community.find (f.object.split("community_id:")[1].split("'")[1].to_i)).name
          elsif item_type == "Design" || item_type == "Expressionist" || item_type == "FilterPanel" || item_type == "Neighborhood"
            (Community.find (Design.find (f.object.split("design_id:")[1].split(" ")[1].to_i)).community_id).name
          elsif item_type == "HomePageImage"
            (Community.find (Design.find (f.object.split("design_id:")[1].split(" ")[0].to_i)).community_id).name
          elsif item_type == "Community"
            f.object.split("name:")[1].split(" ")[0]
          elsif item_type == "Location"
            (Community.find (Neighborhood.find (f.object.split("neighborhood_id:")[1].split(" ")[0].to_i)).community_id).name
          else
            if item_type == "PathPoint" ||  item_type == "TourStop" ||  item_type == "TourStopStartingPoint" ||  item_type == "TourPath"
              return (Community.find f.object.split("community_id:")[1].split(" ")[0].split("'")[1]).name
            else
              return "Not Found"
            end
          end
        else
          if item_type == "Community"
            return (item_type.classify.constantize.find item_id).name
          elsif item_type == "FavoriteImage" || item_type == "EbrochureMenuButton"
            return (Community.find (FavoriteSetting.find (item_type.classify.constantize.find item_id).favorite_setting_id).community_id).name
          elsif item_type == "AdditionalImage"
            return (Community.find (Imagepage.find (item_type.classify.constantize.find item_id).imagepage_id).community_id).name
          elsif item_type == "Design"
            return ((Community.find ((item_type.classify.constantize.find item_id).community_id)).name)
          elsif item_type == "Expressionist" || item_type == "Menu" || item_type == "Gable" || item_type == "HomePageImage"  || item_type == "FilterPanel"
            return ((Community.find ((Design.find (item_type.classify.constantize.find item_id).design_id).community_id)).name)
          elsif item_type == "Location"
            return ((Community.find ((Neighborhood.find (item_type.classify.constantize.find item_id).neighborhood_id).community_id)).name)
          elsif item_type == "Path"
            return ((Community.find ((Neighborhood.find (item_type.classify.constantize.find item_id).neighborhood_id).community_id)).name)
          else
            return (Community.find (item_type.classify.constantize.find item_id).community_id).name
          end
        end

      rescue => ex
        begin
          if item_type == "PathPoint" ||  item_type == "TourStop" ||  item_type == "TourStopStartingPoint"  ||  item_type == "TourPath"
            return (Community.find f.object.split("community_id:")[1].split(" ")[0].split("'")[1]).name
          end
        rescue => ee
        end
        delete_community_name(item_type,item_id)
      end
    end
  end

  def companies_hash
    arr = Company.all.map { |c| [c.name , c.id] }
    arr.to_h
  end

  def lock_provider_type(actual_stop)
    stop_lock_provider = ""
    have_door = (actual_stop.class.name == "Unit" &&  actual_stop.door.present?) || (actual_stop.class.name == "Amenity" &&  actual_stop.ordered_doors.any?)
    if have_door
      if actual_stop.class.name == "Unit"
        stop_lock_provider = actual_stop.door.lock_provider
      elsif actual_stop.class.name == "Amenity"
        stop_lock_provider = actual_stop.ordered_doors.first.lock_provider
      end
    else
      stop_lock_provider = actual_stop.lock_provider
    end
    stop_lock_provider
  end

  def generate_six_digit_random_pin
    (SecureRandom.random_number(9e5) + 1e5).to_i.to_s
  end

  def product_defualt_options
    {
      "dwelo_community": false,

      "product_options": {
        "self_tour": {
          "is_enabled": false,
          "options": {
            "hardware_required": {
              "is_enabled": false,
              "options": {
                "pynwheel_access": {
                  "is_enabled": false,
                  "options": {
                    "pyns": 0,
                    "deadbolts": 0,
                    "others": {
                      "is_enabled": false,
                      "options": {
                        "type": "",
                        "quantity":0
                      }
                    }
                  }
                },

                "latch":false,

                "igloo":false,

                "remote_lock": {
                  "is_enabled": false,
                  "options": {
                    "igloo": 0,
                    "yale": 0,
                    "schlage": 0
                  }
                }
              }
            }
          }
        },

        "pynwheel_touch": {
          "is_enabled": false,
          "options": {
            "desing_style": "Futurnist",
            "hardware": "No Touchscreen",
            "installation": "No",
            "stand": "Chief"
          }
        },

        "pynwheel_maps": false,

        "graphic_design_services": {
          "is_enabled": false,
          "options": {
            "floorplans": {
              "2d": 0,
              "3d": 0
            },
            "site_plan": 0
          }
        },

        "additional_options": {
          "is_enabled": false,
          "options": {
            "virtual_staging": 0,
            "photography": 0,
            "panoskin_tour_package": 0
          }
        }
      }
    }
  end

  def image_original_dimensions(resource = nil, svg_url = false)
    return { width: 0, height: 0 } unless resource.present?

    begin
      # 1. First check DB attributes
      if svg_url
        width  = resource.svg_metadata["width"].to_i rescue 0
        height = resource.svg_metadata["height"].to_i rescue 0
      else
        width  = resource.width.to_i
        height = resource.height.to_i
      end

      # 2. If DB values are valid (non-zero), return them
      return { width: width, height: height } if width.positive? && height.positive?

      # 3. Otherwise, fallback to heavy methods
      result =
        if svg_url
          if (svg_data = fetch_svg_by_url(url = get_environment_based_svg_url(resource)))
            doc = Nokogiri::XML(svg_data)
            svg_tag = doc.at("svg")
            return { width: 0, height: 0 } unless svg_tag

            width  = svg_tag["width"]&.gsub(/[^0-9.]/, "").to_i
            height = svg_tag["height"]&.gsub(/[^0-9.]/, "").to_i

            if (width + height).zero? && (viewbox = svg_tag["viewBox"])
              parts  = viewbox.split.map(&:to_i)
              width  = parts[2]
              height = parts[3]
            end

            { width: width.to_i, height: height.to_i }
          end
        else
          url = resource.validated_image_url
          image = MiniMagick::Image.read(URI.open(url).read)
          { width: image.width.to_i, height: image.height.to_i }
        end

      # 4. Save results back to DB for next time
      if result.present?
        if svg_url
          resource.svg_metadata["width"]  = result[:width]
          resource.svg_metadata["height"] = result[:height]
          resource.save(validate: false)
        else
          resource.update_columns(width: result[:width], height: result[:height])
        end
      end

      result || { width: 0, height: 0 }
    rescue => e
      Rails.logger.error("Error fetching image dimensions: #{e.message}")
      { width: 0, height: 0 }
    end
  end

  def svg_image_url_and_dimensions(resource)
    dimensions = image_original_dimensions(resource, true)
    if dimensions.values.sum.positive?
      { svg_url: get_environment_based_svg_url(resource) }.merge(dimensions)
    else
      { svg_url: "/assets/default.jpeg", width: 0, height: 0 }
    end
  end

  def clear_svg_plotted_units_and_amenities(resource, new_checksum, old_checksum)
    if new_checksum != old_checksum
      @community.clear_svg_plotted_units_and_amenities(resource.is_a?(Floorplate) ? resource : nil)
    end
  end
  
  def fetch_svg_by_url(url)
    return unless url

    if Rails.env.development?
      File.read(url)
    else
      URI.open(url).read
    end
  rescue 
    nil
  end

  def get_environment_based_svg_url(resource)
    return unless resource

    Rails.env.development? ? resource.svg_image.path : resource.validated_svg_image_url
  end
end
