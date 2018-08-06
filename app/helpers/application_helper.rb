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
  
  def gables_theme_options
    ["gables_organic","gables_refined","gables_energetic","gables_natural","gables_custom"]
  end

  def font_families
    options_with_style = []
    families = [
      "Abadi MT Condensed",
      "Minion Web",
      "Agency FB",
      "Aharoni",
      "Aldhabi",
      "Algerian",
      "Almanac MT",
      "American Uncial",
      "Andale Mono",
      "Andalus",
      "Andy",
      "AngsanaUPC",
      "Angsana New",
      "Aparajita",
      "Arabic Transparent",
      "Arabic Typesetting",
      "Arial",
      "Arial Black",
      "Arial Narrow",
      "Arial Narrow Special",
      "Arial Rounded MT",
      "Arial Special",
      "Arial Unicode MS",
      "Augsburger Initials",
      "Baskerville Old Face",
      "Batang",
      "BatangChe",
      "Bauhaus 93",
      "Beesknees ITC",
      "Bell MT",
      "Berlin Sans FB",
      "Bernard MT Condensed",
      "Bickley Script",
      "Blackadder ITC",
      "Bodoni MT",
      "Bodoni MT Condensed",
      "Bon Apetit MT",
      "Bookman Old Style",
      "Bookshelf Symbol",
      "Book Antiqua",
      "Bradley Hand ITC",
      "Braggadocio",
      'BriemScript',
      "Britannic Bold",
      'Britannic Bold',
      'Broadway',
      "BrowalliaUPC",
      "Browallia New",
      "Brush Script MT",
      "Calibri",
      "Californian FB",
      "Calisto MT",
      "Cambria",
      "Cambria Math",
      "Candara",
      "Cariadings",
      "Castellar",
      "Centaur",
      "Century",
      "Century Gothic",
      "Century Schoolbook",
      "Chiller",
      "Colonna MT",
      "Comic Sans MS",
      "Consolas",
      "Constantia",
      "Contemporary Brush",
      "Cooper Black",
      "Copperplate Gothic",
      "Corbel",
      "CordiaUPC",
      "Cordia New",
      "Courier New",
      "Curlz MT",
      "DaunPenh",
      "David",
      "Desdemona",
      "DFKai-SB",
      "DilleniaUPC",
      "Directions MT",
      "DokChampa",
      "Dotum",
      "DotumChe",
      "Ebrima",
      "Eckmann",
      "Edda",
      "Edwardian Script ITC",
      "Elephant",
      "Engravers MT",
      "Enviro",
      "Eras ITC",
      "Estrangelo Edessa",
      "EucrosiaUPC",
      "Euphemia",
      "Eurostile",
      "FangSong",
      "Felix Titling",
      "Fine Hand",
      "Fixed Miriam Transparent",
      "Flexure",
      "Footlight MT",
      "Forte",
      "Franklin Gothic",
      "Franklin Gothic Medium",
      "FrankRuehl",
      "FreesiaUPC",
      "Freestyle Script",
      "French Script MT",
      "Futura",
      "Gabriola",
      "Gadugi",
      "Garamond",
      "Garamond MT",
      "Gautami",
      "Georgia",
      "Georgia Ref",
      "Gigi",
      "Gill Sans MT",
      "Gill Sans MT Condensed",
      "Gisha",
      "Gloucester",
      "Goudy Old Style",
      "Goudy Stout",
      "Gradl",
      "Gulim",
      "GulimChe",
      "Gungsuh",
      "GungsuhChe",
      "Haettenschweiler",
      "Harlow Solid Italic",
      "Harrington",
      "High Tower Text",
      "Holidays MT",
      "Impact",
      "Imprint MT Shadow",
      "Informal Roman",
      "IrisUPC",
      "Iskoola Pota",
      "JasmineUPC",
      "Jokerman",
      "Juice ITC",
      "KaiTi",
      "Kalinga",
      "Kartika",
      "Keystrokes MT",
      "Khmer UI",
      "Kino MT",
      "KodchiangUPC",
      "Kokila",
      "Kristen ITC",
      "Kunstler Script",
      "Lao UI",
      "Latha",
      "LCD",
      "Leelawadee",
      "Levenim MT",
      "LilyUPC",
      "Lucida Blackletter",
      "Lucida Bright",
      "Lucida Bright Math",
      "Lucida Calligraphy",
      "Lucida Console",
      "Lucida Fax",
      "Lucida Handwriting",
      "Lucida Sans",
      "Lucida Sans Typewriter",
      "Lucida Sans Unicode",
      "Magneto",
      "Maiandra GD",
      "Malgun Gothic",
      "Mangal",
      "Map Symbols",
      "Marlett",
      "Matisse ITC",
      "Matura MT Script Capitals",
      "McZee",
      "Mead Bold",
      "Meiryo",
      "Meiryo UI",
      "Mercurius Script MT Bold",
      "Microsoft Himalaya",
      "Microsoft JhengHei",
      "Microsoft JhengHei UI",
      "Microsoft New Tai Lue",
      "Microsoft PhagsPa",
      "Microsoft Sans Serif",
      "Microsoft Tai Le",
      "Microsoft Uighur",
      "Microsoft YaHei",
      "Microsoft YaHei UI",
      "Microsoft Yi Baiti",
      "MingLiU-ExtB",
      "PMingLiU",
      "MingLiU_HKSCS-ExtB",
      "MingLiU_HKSCS",
      "Minion Web",
      "Miriam",
      "Miriam Fixed",
      "Mistral",
      "Modern No. 20",
      "Mongolian Baiti",
      "Monotype.com",
      "Monotype Corsiva",
      "Monotype Sorts",
      "MoolBoran",
      "MS Gothic",
      "MS LineDraw",
      "MS Mincho",
      "MS Outlook",
      "MS PGothic",
      "MS PMincho",
      "MS Reference",
      "MS UI Gothic",
      "MT Extra",
      "MV Boli",
      "Myanmar Text",
      "Narkisim",
      "News Gothic MT",
      "New Caledonia",
      "Niagara",
      "Nirmala UI",
      "NSimSun",
      "Nyala",
      "OCR-B-Digits",
      "OCRB",
      "OCR A Extended",
      "Old English Text MT",
      "Onyx",
      "Palace Script MT",
      "Palatino Linotype",
      "Papyrus",
      "Parade",
      "Parchment",
      "Parties MT",
      "Peignot Medium",
      "Pepita MT",
      "Perpetua",
      "Perpetua Titling MT",
      "Placard Condensed",
      "Plantagenet Cherokee",
      "Playbill",
      "PMingLiU-ExtB",
      "PMingLiU-ExtB",
      "Poor Richard",
      "Pristina",
      "Raavi",
      "Rage Italic",
      "Ransom",
      "Ravie",
      "RefSpecialty",
      "Rockwell",
      "Rockwell Condensed",
      "Rockwell Extra Bold",
      "Rod",
      "Runic MT Condensed",
      "Sakkal Majalla",
      "Script MT Bold",
      "Segoe Chess",
      "Segoe Print",
      "Segoe Pseudo",
      "Segoe Script",
      "Segoe UI",
      "Segoe UI Symbol",
      "Shonar Bangla",
      "Showcard Gothic",
      "Shruti",
      "Signs MT",
      "SimHei",
      "Simplified Arabic Fixed",
      "SimSun-ExtB",
      "Snap ITC",
      "Sports MT",
      "Stencil",
      "Stop",
      "Sylfaen",
      "Symbol",
      "Tahoma",
      "Tempo Grunge",
      "Tempus Sans ITC",
      "Temp Installer Font",
      "Times New Roman",
      "Times New Roman Special",
      "Traditional Arabic",
      "Transport MT",
      "Trebuchet MS",
      "Tunga",
      "Tw Cen MT",
      "Tw Cen MT Condensed",
      "Urdu Typesetting",
      "Utsaah",
      "Vacation MT",
      "Vani",
      "Verdana",
      "Verdana Ref",
      "Vijaya",
      "Viner Hand ITC",
      "Vivaldi",
      "Vixar ASCI",
      "Vladimir Script",
      "Vrinda",
      "Webdings",
      "Westminster",
      "Wide Latin",
      "Wingdings"]
    families.each do |family|
      options_with_style << [family,family,:style => "font-family:#{family}" ] 
    end
    return options_with_style
  end

  def font_sizes
    ["14px","16px","18px","20px","22px","24px","26px","28px","30px"]
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
  
  def home_page_position_of_logo
    ["Right","Left","Upper right","Upper left","Upper centre","Centre"]
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
    ["50px","75px","100px","110px","136px","120px","125px"]
  end

  def navigation_button_width_options
    ["175px","250px","377px","475px","502px"]
  end
  
  def spacing_options
    ["0px","10px","20px","30px","40px","50px","60px","70px","80px","90px","100px"]
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
