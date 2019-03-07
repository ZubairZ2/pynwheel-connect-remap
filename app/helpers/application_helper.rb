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

    f_families = [["Abadi MT Condensed","Abadi MT Condensed"],
                  ["Minion Web","Minion Web"],
                  ["Agency FB","Agency FB"],
                  ["Aharoni","Aharoni"],
                  ["Aldhabi","Aldhabi"],
                  ["Algerian","Algerian"],
                  ["Almanac MT","Almanac MT"],
                  ["American Uncial","American Uncial"],
                  ["Andale Mono","Andale Mono"],
                  ["Andalus","Andalus"],
                  ["Andy","Andy"],
                  ["AngsanaUPC","AngsanaUPC"],
                  ["Angsana New","Angsana New"],
                  ["Aparajita","Aparajita"],
                  ["Arabic Transparent","Arabic Transparent"],
                  ["Arabic Typesetting","Arabic Typesetting"],
                  ["Arial","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Arial.ttf#Arial"],
                  ["Arial Black","Arial Black"],
                  ["Arial Narrow","Arial Narrow"],
                  ["Arial Narrow Special","Arial Narrow Special"],
                  ["Arial Rounded MT","Arial Rounded MT"],
                  ["Arial Special","Arial Special"],
                  ["Arial Unicode MS","Arial Unicode MS"],
                  ["Augsburger Initials","Augsburger Initials"],
                  ["Avenir LT Std 35 Light","ms-appx:/DesignTemplates/Expressionist/CutomFonts/AvenirLTStd-Light.otf#Avenir LT Std 35 Light"],
                  ["Baskerville Old Face","ms-appx:/DesignTemplates/Expressionist/CutomFonts/BASKVILL.TTF#Baskerville Old Face"],
                  ["Batang","Batang"],
                  ["BatangChe","BatangChe"],
                  ["Bauhaus 93","Bauhaus 93"],
                  ["Beaufort","ms-appx:/Assets/Fonts/Beaurg__.ttf#Beaufort"],
                  ["Beesknees ITC","Beesknees ITC"],
                  ["Bell MT","Bell MT"],
                  ["Berlin Sans FB","Berlin Sans FB"],
                  ["Bernard MT Condensed","Bernard MT Condensed"],
                  ["Bickley Script","Bickley Script"],
                  ["Blackadder ITC","Blackadder ITC"],
                  ["Bodoni MT","ms-appx:/DesignTemplates/Expressionist/CutomFonts/BOD_B.TTF#Bodoni MT"],
                  ["Bodoni MT Condensed","Bodoni MT Condensed"],
                  ["Bon Apetit MT","Bon Apetit MT"],
                  ["Bookman Old Style","Bookman Old Style"],
                  ["Bookshelf Symbol","Bookshelf Symbol"],
                  ["Book Antiqua","Book Antiqua"],
                  ["Bradley Hand ITC","Bradley Hand ITC"],
                  ["Braggadocio","Braggadocio"],
                  ['BriemScript','BriemScript'],
                  ["Britannic Bold","Britannic Bold"],
                  ['Britannic Bold','Britannic Bold'],
                  ['Broadway','Broadway'],
                  ["BrowalliaUPC","BrowalliaUPC"],
                  ["Browallia New","Browallia New"],
                  ["Brush Script MT","Brush Script MT"],
                  ["Calibri","Calibri"],
                  ["Californian FB","Californian FB"],
                  ["Calisto MT","Calisto MT"],
                  ["Cambria","Cambria"],
                  ["Cambria Math","Cambria Math"],
                  ["Candara","Candara"],
                  ["Cariadings","Cariadings"],
                  ["Castellar","Castellar"],
                  ["Centaur","Centaur"],
                  ["Century","Century"],
                  ["Century Gothic","Century Gothic"],
                  ["Century Schoolbook","Century Schoolbook"],
                  ["Chiller","Chiller"],
                  ["Colonna MT","Colonna MT"],
                  ["Comic Sans MS","Comic Sans MS"],
                  ["Consolas","Consolas"],
                  ["Constantia","Constantia"],
                  ["Contemporary Brush","Contemporary Brush"],
                  ["Cooper Black","Cooper Black"],
                  ["Copperplate Gothic","Copperplate Gothic"],
                  ["Corbel","Corbel"],
                  ["CordiaUPC","CordiaUPC"],
                  ["Cordia New","Cordia New"],
                  ["Courier New","Courier New"],
                  ["Curlz MT","Curlz MT"],
                  ["DaunPenh","DaunPenh"],
                  ["David","David"],
                  ["Desdemona","Desdemona"],
                  ["DFKai-SB","DFKai-SB"],
                  ["DilleniaUPC","DilleniaUPC"],
                  ["DIN","ms-appx:/DesignTemplates/Expressionist/CutomFonts/DIN Regular.ttf#DIN"],
                  ["Directions MT","Directions MT"],
                  ["DokChampa","DokChampa"],
                  ["Dotum","Dotum"],
                  ["DotumChe","DotumChe"],
                  ["Ebrima","Ebrima"],
                  ["Eckmann","Eckmann"],
                  ["Edda","Edda"],
                  ["Edwardian Script ITC","Edwardian Script ITC"],
                  ["Elephant","Elephant"],
                  ["Engravers MT","Engravers MT"],
                  ["Enviro","Enviro"],
                  ["Eras ITC","Eras ITC"],
                  ["Estrangelo Edessa","Estrangelo Edessa"],
                  ["EucrosiaUPC","EucrosiaUPC"],
                  ["Euphemia","Euphemia"],
                  ["Eurostile","Eurostile"],
                  ["FangSong","FangSong"],
                  ["Felix Titling","Felix Titling"],
                  ["Fine Hand","Fine Hand"],
                  ["Fixed Miriam Transparent","Fixed Miriam Transparent"],
                  ["Flexure","Flexure"],
                  ["Footlight MT","Footlight MT"],
                  ["Forte","Forte"],
                  ["Franklin Gothic","Franklin Gothic"],
                  ["Franklin Gothic Medium","Franklin Gothic Medium"],
                  ["FrankRuehl","FrankRuehl"],
                  ["FreesiaUPC","FreesiaUPC"],
                  ["Freestyle Script","Freestyle Script"],
                  ["French Script MT","French Script MT"],
                  ["Futura","Futura"],
                  ["Futura Bk BT","ms-appx:/DesignTemplates/Expressionist/CutomFonts/FuturaBookBT.ttf#Futura Bk BT"],
                  ["Gabriola","Gabriola"],
                  ["Gadugi","Gadugi"],
                  ["Garamond","Garamond"],
                  ["Garamond MT","Garamond MT"],
                  ["Gautami","Gautami"],
                  ["Georgia","Georgia"],
                  ["Georgia Ref","Georgia Ref"],
                  ["Gigi","Gigi"],
                  ["Gill Sans MT","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Gill Sans MT.ttf#Gill Sans MT"],
                  ["Gill Sans MT Condensed","Gill Sans MT Condensed"],
                  ["Gisha","Gisha"],
                  ["Gloucester","Gloucester"],
                  ["Gotham Book","ms-appx:/Assets/Fonts/gotham_book.ttf#Gotham Book"],
                  ["Gotham Bold","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Gotham Bold.otf#Gotham Bold"],
                  ["Gotham Light","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Gotham Light.otf#Gotham"],
                  ["Gotham Condensed Book","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Gotham Condensed Book.otf#Gotham Condensed Book"],
                  ["Goudy Old Style","Goudy Old Style"],
                  ["Goudy Stout","Goudy Stout"],
                  ["Gradl","Gradl"],
                  ["Gulim","Gulim"],
                  ["GulimChe","GulimChe"],
                  ["Gungsuh","Gungsuh"],
                  ["GungsuhChe","GungsuhChe"],
                  ["Haettenschweiler","Haettenschweiler"],
                  ["Harlow Solid Italic","Harlow Solid Italic"],
                  ["Harrington","Harrington"],
                  ["Helvetica Neue","ms-appx:/DesignTemplates/Expressionist/CutomFonts/HelveticaNeue-Roman.otf#Helvetica Neue"],
                  ["Helvetica Neue LT Std","ms-appx:/DesignTemplates/Expressionist/CutomFonts/HelveticaNeueLTStd-LtCn.ttf#Helvetica Neue LT Std"],
                  ["Helvetica-Normal","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Helvetica-Normal.ttf#Helvetica-Normal"],
                  ["Helvetica Regular","ms-appx:/DesignTemplates/Expressionist/CutomFonts/HELR45W.ttf#Helvetica"],
                  ["High Tower Text","High Tower Text"],
                  ["Holidays MT","Holidays MT"],
                  ["Impact","Impact"],
                  ["Imprint MT Shadow","Imprint MT Shadow"],
                  ["Informal Roman","Informal Roman"],
                  ["IrisUPC","IrisUPC"],
                  ["Iskoola Pota","Iskoola Pota"],
                  ["JasmineUPC","JasmineUPC"],
                  ["Jokerman","Jokerman"],
                  ["Juice ITC","Juice ITC"],
                  ["KaiTi","KaiTi"],
                  ["Kalinga","Kalinga"],
                  ["Kartika","Kartika"],
                  ["Keystrokes MT","Keystrokes MT"],
                  ["Khmer UI","Khmer UI"],
                  ["Kino MT","Kino MT"],
                  ["KodchiangUPC","KodchiangUPC"],
                  ["Kokila","Kokila"],
                  ["Kievit","ms-appx:/DesignTemplates/Expressionist/CutomFonts/kievit_regular.ttf#Kievit"],
                  ["Kristen ITC","Kristen ITC"],
                  ["Kunstler Script","Kunstler Script"],
                  ["Lao UI","Lao UI"],
                  ["Latha","Latha"],
                  ["LCD","LCD"],
                  ["Leelawadee","Leelawadee"],
                  ["Levenim MT","Levenim MT"],
                  ["Levenim MT","Levenim MT"],
                  ["Lucida Blackletter","Lucida Blackletter"],
                  ["Lucida Bright","Lucida Bright"],
                  ["Lucida Bright Math","Lucida Bright Math"],
                  ["Lucida Calligraphy","Lucida Calligraphy"],
                  ["Lucida Console","Lucida Console"],
                  ["Lucida Fax","Lucida Fax"],
                  ["Lucida Handwriting","Lucida Handwriting"],
                  ["Lucida Sans","Lucida Sans"],
                  ["Lucida Sans Typewriter","Lucida Sans Typewriter"],
                  ["Lucida Sans Unicode","Lucida Sans Unicode"],
                  ["Magneto","Magneto"],
                  ["Maiandra GD","Maiandra GD"],
                  ["Malgun Gothic","Malgun Gothic"],
                  ["Mangal","Mangal"],
                  ["Map Symbols","Map Symbols"],
                  ["Marlett","Marlett"],
                  ["Matisse ITC","Matisse ITC"],
                  ["Matura MT Script Capitals","Matura MT Script Capitals"],
                  ["McZee","McZee"],
                  ["Mead Bold","Mead Bold"],
                  ["Meiryo","Meiryo"],
                  ["Meiryo UI","Meiryo UI"],
                  ["Mercurius Script MT Bold","Mercurius Script MT Bold"],
                  ["Microsoft Himalaya","Microsoft Himalaya"],
                  ["Microsoft JhengHei","Microsoft JhengHei"],
                  ["Microsoft JhengHei UI","Microsoft JhengHei UI"],
                  ["Microsoft New Tai Lue","Microsoft New Tai Lue"],
                  ["Microsoft PhagsPa","Microsoft PhagsPa"],
                  ["Microsoft Sans Serif","Microsoft Sans Serif"],
                  ["Microsoft Tai Le","Microsoft Tai Le"],
                  ["Microsoft Uighur","Microsoft Uighur"],
                  ["Microsoft YaHei","Microsoft YaHei"],
                  ["Microsoft YaHei UI","Microsoft YaHei UI"],
                  ["Microsoft Yi Baiti","Microsoft Yi Baiti"],
                  ["MingLiU-ExtB","MingLiU-ExtB"],
                  ["PMingLiU","PMingLiU"],
                  ["MingLiU_HKSCS-ExtB","MingLiU_HKSCS-ExtB"],
                  ["MingLiU_HKSCS","MingLiU_HKSCS"],
                  ["Minion Web","Minion Web"],
                  ["Miriam","Miriam"],
                  ["Miriam Fixed","Miriam Fixed"],
                  ["Mistral","Mistral"],
                  ["Modern No. 20","Modern No. 20"],
                  ["Mongolian Baiti","Mongolian Baiti"],
                  ["Monotype.com","Monotype.com"],
                  ["Monotype Corsiva","Monotype Corsiva"],
                  ["Monotype Sorts","Monotype Sorts"],
                  ["MoolBoran","MoolBoran"],
                  ["Montserrat Medium","ms-appx:///DesignTemplates/Expressionist/CutomFonts/Montserrat-Medium.otf#Montserrat"],
                  ["Montserrat Light","ms-appx:///DesignTemplates/Expressionist/CutomFonts/Montserrat-Light.otf#Montserrat"],
                  ["MS Gothic","MS Gothic"],
                  ["MS LineDraw","MS LineDraw"],
                  ["MS Mincho","MS Mincho"],
                  ["MS Outlook","MS Outlook"],
                  ["MS PGothic","MS PGothic"],
                  ["MS PMincho","MS PMincho"],
                  ["MS Reference","MS Reference"],
                  ["MS UI Gothic","MS UI Gothic"],
                  ["MT Extra","MT Extra"],
                  ["MV Boli","MV Boli"],
                  ["Myanmar Text","Myanmar Text"],
                  ["Narkisim","Narkisim"],
                  ["News Gothic MT","News Gothic MT"],
                  ["New Caledonia","New Caledonia"],
                  ["Neutra Display Alt","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Neutra Display Medium Alt.otf#Neutra Display Alt"],
                  ["Niagara","Niagara"],
                  ["Nirmala UI","Nirmala UI"],
                  ["NSimSun","NSimSun"],
                  ["Nyala","Nyala"],
                  ["OCR-B-Digits","OCR-B-Digits"],
                  ["OCRB","OCRB"],
                  ["OCR A Extended","OCR A Extended"],
                  ["Old English Text MT","Old English Text MT"],
                  ["Onyx","Onyx"],
                  ["Open Sans","ms-appx:/DesignTemplates/Expressionist/CutomFonts/OpenSans-Regular.ttf#Open Sans"],
                  ["Palace Script MT","Palace Script MT"],
                  ["Palatino Linotype","Palatino Linotype"],
                  ["Papyrus","Papyrus"],
                  ["Parade","Parade"],
                  ["Parchment","Parchment"],
                  ["Parties MT","Parties MT"],
                  ["Peignot Medium","Peignot Medium"],
                  ["Pepita MT","Pepita MT"],
                  ["Perpetua","Perpetua"],
                  ["Perpetua Titling MT","Perpetua Titling MT"],
                  ["Placard Condensed","Placard Condensed"],
                  ["Plantagenet Cherokee","Plantagenet Cherokee"],
                  ["Playbill","Playbill"],
                  ["PMingLiU-ExtB","PMingLiU-ExtB"],
                  ["PMingLiU-ExtB","PMingLiU-ExtB"],
                  ["Poor Richard","Poor Richard"],
                  ["Pristina","Pristina"],
                  ["Proxima Nova Light","ms-appx:/DesignTemplates/Expressionist/CutomFonts/ProximaNova-Light.otf#Proxima Nova Light"],
                  ["Proxima Nova Regular","ms-appx:/DesignTemplates/Expressionist/CutomFonts/proxima-nova-regular.ttf#Proxima"],
                  ["Proxima Nova Rg","ms-appx:/DesignTemplates/Expressionist/CutomFonts/proxima-nova-regular.ttf#Proxima Nova Rg"],
                  ["Raavi","Raavi"],
                  ["Rage Italic","Rage Italic"],
                  ["Ransom","Ransom"],
                  ["Ravie","Ravie"],
                  ["RefSpecialty","RefSpecialty"],
                  ["Roboto Medium","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Roboto-Medium.ttf#Roboto"],
                  ["Roboto Condensed","ms-appx:/DesignTemplates/Expressionist/CutomFonts/RobotoCondensed-Bold.ttf#Roboto"],
                  ["Rockwell","Rockwell"],
                  ["Rockwell Condensed","Rockwell Condensed"],
                  ["Rockwell Extra Bold","Rockwell Extra Bold"],
                  ["Rod","Rod"],
                  ["Runic MT Condensed","Runic MT Condensed"],
                  ["Sakkal Majalla","Sakkal Majalla"],
                  ["Script MT Bold","Script MT Bold"],
                  ["Segoe Chess","Segoe Chess"],
                  ["Segoe Print","Segoe Print"],
                  ["Segoe Pseudo","Segoe Pseudo"],
                  ["Segoe Script","Segoe Script"],
                  ["Segoe UI","Segoe UI"],
                  ["Segoe UI Symbol","Segoe UI Symbol"],
                  ["Shonar Bangla","Shonar Bangla"],
                  ["Showcard Gothic","Showcard Gothic"],
                  ["Shruti","Shruti"],
                  ["Signs MT","Signs MT"],
                  ["SimHei","SimHei"],
                  ["Simplified Arabic Fixed","Simplified Arabic Fixed"],
                  ["SimSun-ExtB","SimSun-ExtB"],
                  ["Snap ITC","Snap ITC"],
                  ["Sports MT","Sports MT"],
                  ["Stencil","Stencil"],
                  ["Stop","Stop"],
                  ["Sylfaen","Sylfaen"],
                  ["Symbol","Symbol"],
                  ["Tahoma","Tahoma"],
                  ["Tempo Grunge","Tempo Grunge"],
                  ["Tempus Sans ITC","Tempus Sans ITC"],
                  ["Temp Installer Font","Temp Installer Font"],
                  ["ThrohandRegular","ms-appx:/DesignTemplates/Expressionist/CutomFonts/ThrohandRegular-Roman.otf#ThrohandRegular"],
                  ["Times New Roman","Times New Roman"],
                  ["Times New Roman Special","Times New Roman Special"],
                  ["Traditional Arabic","Traditional Arabic"],
                  ["Trajan Pro","ms-appx:/Assets/Fonts/Trajan Pro Regular.ttf#Trajan Pro"],
                  ["Transport MT","Transport MT"],
                  ["Trebuchet MS","Trebuchet MS"],
                  ["Tunga","Tunga"],
                  ["Tw Cen MT","Tw Cen MT"],
                  ["Tw Cen MT Condensed","Tw Cen MT Condensed"],
                  ["Univers LT Std","ms-appx:/DesignTemplates/Expressionist/CutomFonts/Univers LT Std 45 Light.ttf#Univers LT Std"],
                  ["Urdu Typesetting","Urdu Typesetting"],
                  ["Utsaah","Utsaah"],
                  ["Vacation MT","Vacation MT"],
                  ["Vani","Vani"],
                  ["Verdana","Verdana"],
                  ["Verdana Ref","Verdana Ref"],
                  ["Vijaya","Vijaya"],
                  ["Viner Hand ITC","Viner Hand ITC"],
                  ["Vivaldi","Vivaldi"],
                  ["Vixar ASCI","Vixar ASCI"],
                  ["Vladimir Script","Vladimir Script"],
                  ["Vrinda","Vrinda"],
                  ["Webdings","Webdings"],
                  ["Westminster","Westminster"],
                  ["Wide Latin","Wide Latin"],
                  ["Wingdings","Wingdings"]
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
    ["Top","Middle","Bottom"]
  end
  
  def home_page_position_of_logo
    ["Right","Left","Upper right","Upper left","Upper centre","Centre","Bottom center"]
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
    ["Left of text","Right of text","Above the text"]
  end
  def global_nav_button_icon_size_option
    ["65px","55px","45px","35px","25px"]
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
    
end
