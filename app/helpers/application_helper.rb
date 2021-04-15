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
  def encoded(payload)
    JWT.encode payload, ENV['SECRET_KEY_BASE'], 'HS256'
  end
  def decoded(token)
    JWT.decode token, ENV['SECRET_KEY_BASE'], true, { algorithm: 'HS256' } rescue nil
  end
  def grant_access(payload)
    begin
        ((TourUser.find payload[0]['tour_user_id'].to_i).secure_random == payload[0]['secure_random']) && (payload[0]['license_key'] == ENV['TEMP_ACESS_TOKEN'])
    rescue => ex
        false
    end
  end
  def api_access
    return false
  end

  def gables_theme_options
    ["gables_organic","gables_refined","gables_energetic","gables_natural","gables_custom"]
  end
  def self_tour_icon_size
    [["19x25","0"],["17x23","1"],["15x21","2"],["13x19","3"],["11x17","4"]]
  end
  def get_time_zone community
  time_zone = Timezone.lookup(community.latitude, community.longitude)
  timezone = time_zone.name
  rescue
    return ""
  end

  def font_families
    options_with_style = []
    families = [
        "AGaramondPro",
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

    f_families = [
        #["Abadi MT Condensed","Abadi MT Condensed"],
        # ["Minion Web","Minion Web"],
        # ["Agency FB","Agency FB"],
        # ["Aharoni","Aharoni"],
        ["Akzidenz Grotesk BE","ms-appx:///DesignTemplates/Expressionist/CutomFonts/AkzidenzGroteskBE-MdCn.ttf#Berthold Akzidenz Grotesk BE"],
        ["Aleo Bold","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Aleo-Bold.otf#Aleo"],
        ["Aleo Light","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Aleo-Light.otf#Aleo"],
        ["Aleo Regular","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Aleo-Regular.otf#Aleo"],
        # ["Aldhabi","Aldhabi"],
        # ["Algerian","Algerian"],
        # ["Almanac MT","Almanac MT"],
        # ["American Uncial","American Uncial"],
        # ["Andale Mono","Andale Mono"],
        # ["Andalus","Andalus"],
        # ["Andy","Andy"],
        # ["AngsanaUPC","AngsanaUPC"],
        # ["Angsana New","Angsana New"],
        # ["Aparajita","Aparajita"],
        # ["Arabic Transparent","Arabic Transparent"],
        # ["Arabic Typesetting","Arabic Typesetting"],
        ["Arial","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Arial.ttf#Arial"],
        # ["Arial Black","Arial Black"],
        # ["Arial Narrow","Arial Narrow"],
        # ["Arial Narrow Special","Arial Narrow Special"],
        # ["Arial Rounded MT","Arial Rounded MT"],
        # ["Arial Special","Arial Special"],
        # ["Arial Unicode MS","Arial Unicode MS"],
        # ["Augsburger Initials","Augsburger Initials"],
        ["Avenir Light","ms-appx:/DesignTemplates/Expressionist/CutomFonts/AvenirLTStd-Light.otf#Avenir LT Std"],
        ["Avenir Medium" , "ms-appx:/DesignTemplates/Expressionist/CutomFonts/Avenir-Medium.ttf#Avenir"],
        ["Avenir Next Condensed Regular" , "ms-appx:/DesignTemplates/Expressionist/CutomFonts/AvenirNextCondensed-Regular.ttf#Avenir Next"],
        ["Avenir Next Semi Bold" , "ms-appx:/DesignTemplates/Expressionist/CutomFonts/AvenirNextCondensed-DemiBold.ttf#Avenir Next"],
        # ["Avenir LT Std 35 Light","ms-appx:/DesignTemplates/Expressionist/CutomFonts/AvenirLTStd-Light.otf#Avenir"],
        # ["Baskerville","Baskerville"],
        # ["Baskerville Old Face","ms-appx:/DesignTemplates/Expressionist/CutomFonts/BASKVILL.TTF#Baskerville"],
        ["BASKVILL","ms-appx:/DesignTemplates/Expressionist/CutomFonts/BASKVILL.TTF#Baskerville Old Face"],
        ["Bebas Neue regular","ms-appx:/DesignTemplates/Expressionist/CutomFonts/BebasNeue-Regular.otf#Bebas Neue"],
        # ["Batang","Batang"],
        # ["BatangChe","BatangChe"],
        # ["Bauhaus 93","Bauhaus 93"],
        ["Beaufort","ms-appx:/Assets/Fonts/Beaurg__.ttf#Beaufort"],
        # ["Beesknees ITC","Beesknees ITC"],
        # ["Bell MT","Bell MT"],
        # ["Berlin Sans FB","Berlin Sans FB"],
        # ["Bernard MT Condensed","Bernard MT Condensed"],
        # ["Bickley Script","Bickley Script"],
        # ["Blackadder ITC","Blackadder ITC"],
        ["Bodoni MT","ms-appx:/DesignTemplates/Expressionist/CutomFonts/BodoniMT.ttf#Bodoni MT"],
        ["Bodoni MT Condensed","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Bodoni MT Condensed.ttf#Bodoni MT"],
        # ["Bon Apetit MT","Bon Apetit MT"],
        # ["Bookman Old Style","Bookman Old Style"],
        # ["Bookshelf Symbol","Bookshelf Symbol"],
        # ["Book Antiqua","Book Antiqua"],
        # ["Bradley Hand ITC","Bradley Hand ITC"],
        # ["Braggadocio","Braggadocio"],
        # ['BriemScript','BriemScript'],
        # ["Britannic Bold","Britannic Bold"],
        # ['Britannic Bold','Britannic Bold'],
        # ['Broadway','Broadway'],
        # ["BrowalliaUPC","BrowalliaUPC"],
        # ["Browallia New","Browallia New"],
        # ["Brush Script MT","Brush Script MT"],
        # ["Calibri","Calibri"],
        # ["Californian FB","Californian FB"],
        # ["Calisto MT","Calisto MT"],
        # ["Cambria","Cambria"],
        # ["Cambria Math","Cambria Math"],
        # ["Candara","Candara"],
        # ["Cariadings","Cariadings"],
        # ["Castellar","Castellar"],
        # ["Centaur","Centaur"],
        # ["Century","Century"],
        # ["Century Gothic","Century Gothic"],
        # ["Century Schoolbook","Century Schoolbook"],
        # ["Chiller","Chiller"],
        # ["Colonna MT","Colonna MT"],
        # ["Comic Sans MS","Comic Sans MS"],
        # ["Consolas","Consolas"],
        # ["Constantia","Constantia"],
        # ["Contemporary Brush","Contemporary Brush"],
        # ["Cooper Black","Cooper Black"],
        # ["Copperplate Gothic","Copperplate Gothic"],
        # ["Corbel","Corbel"],
        # ["CordiaUPC","CordiaUPC"],
        # ["Cordia New","Cordia New"],
        # ["Courier New","Courier New"],
        # ["Curlz MT","Curlz MT"],
        # ["DaunPenh","DaunPenh"],
        # ["David","David"],
        # ["Desdemona","Desdemona"],
        # ["DFKai-SB","DFKai-SB"],
        # ["DilleniaUPC","DilleniaUPC"],
        ["DIN Bold","ms-appx:/DesignTemplates/Expressionist/CutomFonts/DIN Regular.ttf#DIN"],
        ["DIN","DIN"],
        # ["Directions MT","Directions MT"],
        ["District Pro Demi","ms-appx:/DesignTemplates/Expressionist/CutomFonts/DistrictPro-Demi.otf#District Pro"],
        ["District Pro Thin","ms-appx:/DesignTemplates/Expressionist/CutomFonts/DistrictPro-Thin.otf#District Pro"],
        # ["DokChampa","DokChampa"],
        # ["Dotum","Dotum"],
        # ["DotumChe","DotumChe"],
        # ["Ebrima","Ebrima"],
        # ["Eckmann","Eckmann"],
        # ["Edda","Edda"],
        # ["Edwardian Script ITC","Edwardian Script ITC"],
        # ["Elephant","Elephant"],
        # ["Engravers MT","Engravers MT"],
        # ["Enviro","Enviro"],
        # ["Eras ITC","Eras ITC"],
        # ["Estrangelo Edessa","Estrangelo Edessa"],
        # ["EucrosiaUPC","EucrosiaUPC"],
        # ["Euphemia","Euphemia"],
        # ["Eurostile","Eurostile"],
        # ["FangSong","FangSong"],
        # ["Felix Titling","Felix Titling"],
        # ["Fine Hand","Fine Hand"],
        # ["Fixed Miriam Transparent","Fixed Miriam Transparent"],
        # ["Flexure","Flexure"],
        # ["Footlight MT","Footlight MT"],
        # ["Forte","Forte"],
        # ["Franklin Gothic","Franklin Gothic"],
        ["Franklin Gothic Medium","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Franklin Gothic Medium.ttf#Franklin Gothic"],
        # ["FrankRuehl","FrankRuehl"],
        # ["FreesiaUPC","FreesiaUPC"],
        # ["Freestyle Script","Freestyle Script"],
        # ["French Script MT","French Script MT"],
        ["Futura","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Futura Bk BT Book.ttf#Futura Bk BT"],
        ["Futura Bk BT","ms-appx:/DesignTemplates/Expressionist/CutomFonts/FuturaBookBT.ttf#Futura"],
        # ["Gabriola","Gabriola"],
        # ["Gadugi","Gadugi"],
        ["GaramondPro","ms-appx:/DesignTemplates/Expressionist/CutomFonts/AGaramondPro-Regular.otf#Adobe Garamond Pro"],
        ["Garamond","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Garamond.ttf#Garamond"],
        ["Garamond MT","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Garamond MT.ttf#Garamond MT"],
        # ["Gautami","Gautami"],
        ["Georgia", "ms-appx:/DesignTemplates/Expressionist/CutomFonts/Georgia.ttf#Georgia"],
        # ["Georgia Ref","Georgia Ref"],
        # ["Gigi","Gigi"],
        ["Gill Sans MT","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Gill Sans MT.ttf#Gill"],
        ["Gill Sans MT Condensed","Gill Sans MT Condensed"],
        # ["Gisha","Gisha"],
        # ["Gloucester","Gloucester"],
        ["Gotham Book","ms-appx:/Assets/Fonts/gotham_book.ttf#Gotham Book"],
        ["Gotham Bold","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Gotham Bold.otf#Gotham"],
        ["Gotham Light","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Gotham Light.otf#Gotham"],
        ["Gotham Condensed Light","Gotham Light"],
        ["Gotham Condensed Book","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Gotham Condensed Book.otf#Gotham"],
        # ["Goudy Old Style","Goudy Old Style"],
        # ["Goudy Stout","Goudy Stout"],
        # ["Gradl","Gradl"],
        # ["Gulim","Gulim"],
        # ["GulimChe","GulimChe"],
        # ["Gungsuh","Gungsuh"],
        # ["GungsuhChe","GungsuhChe"],
        # ["Haettenschweiler","Haettenschweiler"],
        # ["Harlow Solid Italic","Harlow Solid Italic"],
        # ["Harrington","Harrington"],
        ["Helvetica Neue thin","ms-appx:/DesignTemplates/Expressionist/CutomFonts/HelveticaNeue Thin.ttf#HelveticaNeue"],
        ["Helvetica Neue", "ms-appx:/DesignTemplates/Expressionist/CutomFonts/HelveticaNeue-Roman.otf#Helvetica Neue"],
        ["Helvetica Neue LT Std","ms-appx:/DesignTemplates/Expressionist/CutomFonts/helvetica-neue-lt-std-47-light-condensed.otf#Helvetica Neue LT Std"],
        ["Helvetica-Normal","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Helvetica-Normal.ttf#Helvetica-Normal"],
        ["Helvetica Regular","ms-appx:/DesignTemplates/Expressionist/CutomFonts/HELR45W.ttf#Helvetica"],
        # ["High Tower Text","High Tower Text"],
        # ["Holidays MT","Holidays MT"],
        # ["Impact","Impact"],
        # ["Imprint MT Shadow","Imprint MT Shadow"],
        # ["Informal Roman","Informal Roman"],
        # ["IrisUPC","IrisUPC"],
        # ["Iskoola Pota","Iskoola Pota"],
        # ["JasmineUPC","JasmineUPC"],
        # ["Jokerman","Jokerman"],
        # ["Juice ITC","Juice ITC"],
        ["Jura Bold","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Jura-DemiBold.otf#Jura"],
        ["Jura Regular","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Jura-Regular.otf#Jura"],
        # ["KaiTi","KaiTi"],
        # ["Kalinga","Kalinga"],
        # ["Kartika","Kartika"],
        # ["Keystrokes MT","Keystrokes MT"],
        # ["Khmer UI","Khmer UI"],
        # ["Kino MT","Kino MT"],
        # ["KodchiangUPC","KodchiangUPC"],
        # ["Kokila","Kokila"],
        ["Kievit","ms-appx:/DesignTemplates/Expressionist/CutomFonts/kievit_regular.ttf#Kievit"],
        # ["Kristen ITC","Kristen ITC"],
        # ["Kunstler Script","Kunstler Script"],
        # ["Lao UI","Lao UI"],
        # ["Latha","Latha"],
        ["Lato Bold","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Lato-Bold.ttf#Lato"],
        ["Lato Light","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Lato-Light.ttf#Lato"],
        ["Lato Regular","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Lato-Regular.ttf#Lato"],
        # ["LCD","LCD"],
        # ["Leelawadee","Leelawadee"],
        # ["Levenim MT","Levenim MT"],
        # ["Levenim MT","Levenim MT"],
        # ["Lucida Blackletter","Lucida Blackletter"],
        # ["Lucida Bright","Lucida Bright"],
        # ["Lucida Bright Math","Lucida Bright Math"],
        # ["Lucida Calligraphy","Lucida Calligraphy"],
        # ["Lucida Console","Lucida Console"],
        ["Lucida Fax","ms-appx:/DesignTemplates/Expressionist/CutomFonts/LFAX.ttf#Lucida"],
        # ["Lucida Handwriting","Lucida Handwriting"],
        # ["Lucida Sans","Lucida Sans"],
        # ["Lucida Sans Typewriter","Lucida Sans Typewriter"],
        # ["Lucida Sans Unicode","Lucida Sans Unicode"],
        # ["Magneto","Magneto"],
        # ["Maiandra GD","Maiandra GD"],
        # ["Malgun Gothic","Malgun Gothic"],
        # ["Mangal","Mangal"],
        # ["Map Symbols","Map Symbols"],
        # ["Marlett","Marlett"],
        # ["Matisse ITC","Matisse ITC"],
        # ["Matura MT Script Capitals","Matura MT Script Capitals"],
        # ["McZee","McZee"],
        # ["Mead Bold","Mead Bold"],
        # ["Meiryo","Meiryo"],
        # ["Meiryo UI","Meiryo UI"],
        # ["Mercurius Script MT Bold","Mercurius Script MT Bold"],
        # ["Microsoft Himalaya","Microsoft Himalaya"],
        # ["Microsoft JhengHei","Microsoft JhengHei"],
        # ["Microsoft JhengHei UI","Microsoft JhengHei UI"],
        # ["Microsoft New Tai Lue","Microsoft New Tai Lue"],
        # ["Microsoft PhagsPa","Microsoft PhagsPa"],
        # ["Microsoft Sans Serif","Microsoft Sans Serif"],
        # ["Microsoft Tai Le","Microsoft Tai Le"],
        # ["Microsoft Uighur","Microsoft Uighur"],
        # ["Microsoft YaHei","Microsoft YaHei"],
        # ["Microsoft YaHei UI","Microsoft YaHei UI"],
        # ["Microsoft Yi Baiti","Microsoft Yi Baiti"],
        # ["MingLiU-ExtB","MingLiU-ExtB"],
        # ["PMingLiU","PMingLiU"],
        # ["MingLiU_HKSCS-ExtB","MingLiU_HKSCS-ExtB"],
        # ["MingLiU_HKSCS","MingLiU_HKSCS"],
        # ["Minion Web","Minion Web"],
        # ["Miriam","Miriam"],
        # ["Miriam Fixed","Miriam Fixed"],
        # ["Mistral","Mistral"],
        # ["Modern No. 20","Modern No. 20"],
        # ["Mongolian Baiti","Mongolian Baiti"],
        # ["Monotype.com","Monotype.com"],
        # ["Monotype Corsiva","Monotype Corsiva"],
        # ["Monotype Sorts","Monotype Sorts"],
        # ["MoolBoran","MoolBoran"],
        ["Montserrat Medium","ms-appx:///DesignTemplates/Expressionist/CutomFonts/Montserrat-Medium.otf#Montserrat"],
        ["Montserrat Light","ms-appx:///DesignTemplates/Expressionist/CutomFonts/Montserrat-Light.otf#Montserrat"],
        # ["MS Gothic","MS Gothic"],
        # ["MS LineDraw","MS LineDraw"],
        # ["MS Mincho","MS Mincho"],
        # ["MS Outlook","MS Outlook"],
        # ["MS PGothic","MS PGothic"],
        # ["MS PMincho","MS PMincho"],
        # ["MS Reference","MS Reference"],
        # ["MS UI Gothic","MS UI Gothic"],
        # ["MT Extra","MT Extra"],
        # ["MV Boli","MV Boli"],
        # ["Myanmar Text","Myanmar Text"],
        ["Myriad Pro","ms-appx:/DesignTemplates/Expressionist/CutomFonts/MyriadPro-Cond.otf#Myriad Pro Cond"],
        ["Myriad Pro Regular","ms-appx:/DesignTemplates/Expressionist/CutomFonts/MyriadPro-Regular.otf#Myriad Pro"],
        # ["Narkisim","Narkisim"],
        # ["News Gothic MT","News Gothic MT"],
        # ["New Caledonia","New Caledonia"],
        ["Neutra Display Alt","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Neutra Display Medium Alt.otf#Neutra"],
        # ["Niagara","Niagara"],
        # ["Nirmala UI","Nirmala UI"],
        # ["NSimSun","NSimSun"],
        # ["Nyala","Nyala"],
        # ["OCR-B-Digits","OCR-B-Digits"],
        # ["OCRB","OCRB"],
        # ["OCR A Extended","OCR A Extended"],
        # ["Old English Text MT","Old English Text MT"],
        # ["Onyx","Onyx"],
        ["Open Sans Bold","ms-appx:/DesignTemplates/Expressionist/CutomFonts/OpenSans-Bold.ttf#Open Sans"],
        ["Open Sans Light","ms-appx:/DesignTemplates/Expressionist/CutomFonts/OpenSans-Light.ttf#Open Sans"],
        ["Open Sans Regular","ms-appx:/DesignTemplates/Expressionist/CutomFonts/OpenSans-Regular.ttf#Open Sans"],
        ["Oswald Light","ms-appx:/DesignTemplates/Expressionist/CutomFonts/oswald.light.ttf#Oswald"],
        ["Oswald Regular","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Oswald-Regular.ttf#Oswald"],
        # ["Palace Script MT","Palace Script MT"],
        # ["Palatino Linotype","Palatino Linotype"],
        # ["Papyrus","Papyrus"],
        # ["Parade","Parade"],
        # ["Parchment","Parchment"],
        # ["Parties MT","Parties MT"],
        # ["Peignot Medium","Peignot Medium"],
        # ["Pepita MT","Pepita MT"],
        # ["Perpetua","Perpetua"],
        # ["Perpetua Titling MT","Perpetua Titling MT"],
        # ["Placard Condensed","Placard Condensed"],
        # ["Plantagenet Cherokee","Plantagenet Cherokee"],
        # ["Playbill","Playbill"],
        ["Play Fair Display","ms-appx:/DesignTemplates/Expressionist/CutomFonts/PlayfairDisplay-Regular.ttf#Playfair Display"],
        # ["PMingLiU-ExtB","PMingLiU-ExtB"],
        # ["PMingLiU-ExtB","PMingLiU-ExtB"],
        # ["Poor Richard","Poor Richard"],
        ["Poppins Light","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Poppins-Light.otf#Poppins"],
        ["Poppins Medium","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Poppins-Medium.otf#Poppins"],
        ["Poppins Semi Bold","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Poppins-SemiBold.otf#Poppins"],
        # ["Pristina","Pristina"],
        ["Proxima Nova Bold","ms-appx:/DesignTemplates/Expressionist/CutomFonts/ProximaNova-Bold.otf#Proxima Nova"],
        ["Proxima Nova Condensed","ms-appx:/DesignTemplates/Expressionist/CutomFonts/ProximaNovaCond-Regular.otf#Proxima Nova"],
        ["Proxima Nova Light","ms-appx:/DesignTemplates/Expressionist/CutomFonts/ProximaNova-Light.otf#Proxima Nova"],
        ["Proxima Nova Medium","ms-appx:/DesignTemplates/Expressionist/CutomFonts/ProximaNova-Regular.otf#Proxima Nova"],
        ["Proxima Nova Regular","ms-appx:/DesignTemplates/Expressionist/CutomFonts/proxima-nova-regular.ttf#Proxima"],
        # ["Proxima Nova Rg","ms-appx:/DesignTemplates/Expressionist/CutomFonts/proxima-nova-regular.ttf#Proxima"],
        # ["Raavi","Raavi"],
        # ["Rage Italic","Rage Italic"],
        ["Raleway Regular","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Raleway-Regular.ttf#Raleway"],
        # ["Ransom","Ransom"],
        # ["Ravie","Ravie"],
        # ["RefSpecialty","RefSpecialty"],
        ["Roboto Medium","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Roboto-Medium.ttf#Roboto"],
        ["Roboto Condensed","ms-appx:/DesignTemplates/Expressionist/CutomFonts/RobotoCondensed-Bold.ttf#Roboto"],
        # ["Rockwell","Rockwell"],
        # ["Rockwell Condensed","Rockwell Condensed"],
        # ["Rockwell Extra Bold","Rockwell Extra Bold"],
        # ["Rod","Rod"],
        # ["Runic MT Condensed","Runic MT Condensed"],
        # ["Sakkal Majalla","Sakkal Majalla"],
        # ["Script MT Bold","Script MT Bold"],
        # ["Segoe Chess","Segoe Chess"],
        # ["Segoe Print","Segoe Print"],
        # ["Segoe Pseudo","Segoe Pseudo"],
        # ["Segoe Script","Segoe Script"],
        # ["Segoe UI","Segoe UI"],
        # ["Segoe UI Symbol","Segoe UI Symbol"],
        # ["Shonar Bangla","Shonar Bangla"],
        # ["Showcard Gothic","Showcard Gothic"],
        # ["Shruti","Shruti"],
        # ["Signs MT","Signs MT"],
        # ["SimHei","SimHei"],
        # ["Simplified Arabic Fixed","Simplified Arabic Fixed"],
        # ["SimSun-ExtB","SimSun-ExtB"],
        ["SourceSansPro Regular","ms-appx:/DesignTemplates/Expressionist/CutomFonts/SourceSansPro-Regular.ttf#Source Sans Pro"],
        # ["Snap ITC","Snap ITC"],
        # ["Sports MT","Sports MT"],
        # ["Stencil","Stencil"],
        # ["Stop","Stop"],
        # ["Sylfaen","Sylfaen"],
        # ["Symbol","Symbol"],
        ["Tahoma", "ms-appx:/DesignTemplates/Expressionist/CutomFonts/Tahoma.ttf#Tahoma"],
        # ["Tempo Grunge","Tempo Grunge"],
        # ["Tempus Sans ITC","Tempus Sans ITC"],
        # ["Temp Installer Font","Temp Installer Font"],
        ["ThrohandRegular","ms-appx:/DesignTemplates/Expressionist/CutomFonts/ThrohandRegular-Roman.otf#ThrohandRegular"],
        # ["Times New Roman","Times New Roman"],
        # ["Times New Roman Special","Times New Roman Special"],
        # ["Traditional Arabic","Traditional Arabic"],
        ["Trajan Pro","ms-appx:/Assets/Fonts/Trajan Pro Regular.ttf#Trajan Pro"],
        ["Trajan Pro Bold","ms-appx:/DesignTemplates/Expressionist/CutomFonts/TRAJANPRO-BOLD.otf#Trajan Pro"],
        # ["Transport MT","Transport MT"],
        # ["Trebuchet MS","Trebuchet MS"],
        # ["Tunga","Tunga"],
        # ["Tw Cen MT","Tw Cen MT"],
        # ["Tw Cen MT Condensed","Tw Cen MT Condensed"],
        ["Univers LT Std","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Univers LT Std 45 Light.ttf#Univers"],
        # ["Urdu Typesetting","Urdu Typesetting"],
        # ["Utsaah","Utsaah"],
        # ["Vacation MT","Vacation MT"],
        # ["Vani","Vani"],
        # ["Verdana","Verdana"],
        # ["Verdana Ref","Verdana Ref"],
        # ["Vijaya","Vijaya"],
        # ["Viner Hand ITC","Viner Hand ITC"],
        # ["Vivaldi","Vivaldi"],
        # ["Vixar ASCI","Vixar ASCI"],
        # ["Vladimir Script","Vladimir Script"],
        # ["Vrinda","Vrinda"],
        # ["Webdings","Webdings"],
        # ["Westminster","Westminster"],
        # ["Wide Latin","Wide Latin"],
        # ["Wingdings","Wingdings"]
    ]


    f_families.each do |family|
      options_with_style << [family[0],family[1],:style => "font-family:#{family[0]}" ]
    end
    return options_with_style
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
    ["HID Prox 26-bit H10301", "HID Prox 33-bit D10202", "HID Prox 35-bit C1000", "HID Prox 37-bit H10304", "HID Prox 37-bit H10302"]
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
    if cookies.present?
      array = JSON.parse(cookies)
      array.include? fav_unit_id.to_s
    end
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
  def invitation_communities(company)
    c = Company.find_by(name: company)
    c.communities.pluck(:name,:id)
  end
  def delete_logs(item_type, item_id)
    f = PaperTrail::Version.find_by(item_id: item_id, item_type: item_type,event: "destroy")
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
      f = PaperTrail::Version.find_by(item_id: item_id, item_type: item_type,event: "destroy")
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
      # return "Not Found"
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

end