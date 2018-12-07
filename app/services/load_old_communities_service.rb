class LoadOldCommunitiesService < ApplicationJob
  include SuckerPunch::Job

  def perform
    require 'rubygems'
    require 'write_xlsx'
    workbook = WriteXLSX.new('Report.xlsx')

    filePath = 'public/swoop/'
    imagePath = 'public/'
    worksheet = workbook.add_worksheet
    row = 0
    companies = Dir.entries(filePath)
    companies.each do |company|
      unless company.to_s == '.' || company.to_s == '..'

        companyObj = Company.find_by(name: company)
        unless companyObj.present?
          companyObj = Company.create(name: company)
        end
        worksheet.write(row, 0, "Created Comapny")
        worksheet.write(row, 1, "------")
        worksheet.write(row, 2, company)
        row += 1
        communities = Dir.entries(filePath+company)

        ################## Communities area start
        communities.each do |community|
          unless community.to_s == '.' || community.to_s == '..'

            communityObj = Community.find_by(name: community,company_id: companyObj.id)
            unless communityObj
              communityObj = Community.create(name: community,company_id: companyObj.id)
            end
            floorplanHash = Hash.new
            unitHash = Hash.new
            floorplateHash = Hash.new
            sitemapHash = Hash.new
            amenityHash = Hash.new
            floorplateHeightHash = Hash.new
            floorplateWidthHash = Hash.new
            worksheet.write(row, 0, "Created Community")
            worksheet.write(row, 1, "------")
            worksheet.write(row, 2, "Community - "+community)
            worksheet.write(row, 3, "Company - "+company)
            row += 1
            files = Dir.entries(filePath+company+'/'+community)
            ############ file area start
            files.sort.each do |file|
              # ********************************************** Floor Plan ***********************************
              if file.to_s == "afloorplans.xml"

                begin
                  o = File.read(filePath+company+'/'+community+'/'+file)
                  o.gsub!(/&(?!(?:amp|lt|gt|quot|apos);)/, '&amp;')
                  data = JSON.parse(Hash.from_xml(o).to_json)

                  if data['data']['floorplans']['floorplan'].class == Array
                    data['data']['floorplans']['floorplan'].each do |floor|
                      begin

                        begin
                          img = File.open(imagePath+floor['image'])
                          if File.extname(img) == ".swf"
                            begin
                              path = File.path(img)
                              img = File.open(path[0..path.length-5]+".png")
                            rescue
                              begin
                                img = File.open(path[0..path.length-5]+".jpg")
                              rescue
                                img = nil
                              end
                            end
                          end
                        rescue => e
                          img = nil
                        end
                        floorplanHash[floor['floorplanID']] = floor['name']
                        f = Floorplan.new(name: floor['name'], community_id: communityObj.id, provider_floorplan_id: floor['floorplanID'], description: floor['description'], square_feet: floor['sqft'], market_rent: floor['price'], bedrooms: floor['bedrooms'], bathrooms: floor['bathrooms'], image: img )
                        f.save(validate: false)
                        if f.provider_floorplan_id == nil
                          f.provider_floorplan_id = f.id
                          f.save(validate: false)
                        end
                        worksheet.write(row, 0, "Floorplan Created")
                        worksheet.write(row, 1, "Floor Name - "+floor['name'])
                        worksheet.write(row, 2, "Floor Image Url - "+f.image.to_s)
                        worksheet.write(row, 3, "Community - "+community)
                        worksheet.write(row, 4, "Company - "+company)
                        row += 1
                      rescue
                      end
                    end
                  else
                    floor = data['data']['floorplans']['floorplan']
                    begin
                      img = File.open(imagePath+floor['image'])
                      if File.extname(img) == ".swf"
                        begin
                          path = File.path(img)
                          img = File.open(path[0..path.length-5]+".png")
                        rescue
                          begin
                            img = File.open(path[0..path.length-5]+".jpg")
                          rescue
                            img = nil
                          end
                        end
                      end
                    rescue => e
                      img = nil
                    end
                    floorplanHash[floor['floorplanID']] = floor['name']
                    f = Floorplan.new(name: floor['name'], community_id: communityObj.id, provider_floorplan_id: floor['floorplanID'], description: floor['description'], square_feet: floor['sqft'], market_rent: floor['price'], bedrooms: floor['bedrooms'], bathrooms: floor['bathrooms'], image: img )
                    f.save(validate: false)
                    worksheet.write(row, 0, "Floorplan Created")
                    worksheet.write(row, 1, "Floor Name - "+floor['name'])
                    worksheet.write(row, 2, "Floor Image Url - "+f.image.to_s)
                    worksheet.write(row, 3, "Community - "+community)
                    worksheet.write(row, 4, "Company - "+company)
                    row += 1
                  end

                rescue => ex
                  puts "+++++++++++++"*100
                  puts "--company--"+company +"--community--"+ community +"--file--"+ file
                  worksheet.write(row, 0, "Exception")
                  worksheet.write(row, 1, "-------------")
                  worksheet.write(row, 2, "-------------")
                  worksheet.write(row, 3, "-------------")
                  worksheet.write(row, 4, "-------------")
                  worksheet.write(row, 5, "-------------")
                  worksheet.write(row, 6, "-------------")
                  worksheet.write(row, 7, "-------------")
                  worksheet.write(row, 8, "-------------")
                  worksheet.write(row, 9, "File - "+file)
                  worksheet.write(row, 10, "Community - "+community)
                  worksheet.write(row, 11, "Company - "+company)
                  row += 1
                end
              end
              # ********************************************** Availability ***********************************
              if file.to_s == "bavailability.xml"

                begin
                  o = File.open(filePath+company+'/'+community+'/'+file,"r:iso-8859-1:utf-8").read
                  # o = File.read(filePath+company+'/'+community+'/'+file)
                  o.gsub!(/&(?!(?:amp|lt|gt|quot|apos);)/, '&amp;')
                  if o[0..1] == "[{"
                    begin
                      data = JSON.parse(o)

                      data.each do |d|
                        f = Floorplan.find_by(name: d["FloorplanName"],community_id: communityObj.id)
                        begin
                          img = File.open(imagePath+d['UnitImageURLs'])
                          if File.extname(img) == ".swf"
                            begin
                              path = File.path(img)
                              img = File.open(path[0..path.length-5]+".png")
                            rescue
                              begin
                                img = File.open(path[0..path.length-5]+".jpg")
                              rescue
                                img = nil
                              end
                            end
                          end
                        rescue => e
                          img = nil
                        end
                        unitHash[d["ApartmentId"]] = d["ApartmentName"]
                        u = Unit.new(marketing_name: d["ApartmentName"],provider_unit_id: d["ApartmentId"],floorplan_id: f.present? ? f.provider_floorplan_id : '',property_id: d["PropertyId"],square_feet: d["SQFT"],market_rent: d["MinimumRent"],effective_rent: d["MinimumRent"],community_id: communityObj.id,image: img)
                        if d["AvailableDate"].present?
                          begin
                            dateTemp = d["AvailableDate"].split('/')
                            year = dateTemp[2]
                            month = dateTemp[1]
                            day = dateTemp[0]
                            u.available_date = Date.parse("#{year}-#{month}-#{day}")
                          rescue
                          end
                        end
                        u.save(validate: false)

                        worksheet.write(row, 0, "Unit Created")
                        worksheet.write(row, 1, "Unit Marketing Name - "+d['ApartmentName'])
                        worksheet.write(row, 2, "Unit image - "+u.image.to_s)
                        worksheet.write(row, 3, "Community - "+community)
                        worksheet.write(row, 4, "Company - "+company)
                        row += 1
                      rescue
                      end
                    end
                  elsif o[0..2] == "<s:"
                    begin
                      data = JSON.parse(Hash.from_xml(o).to_json)
                      data["Envelope"]["Body"]["getunitsbypropertyResponse"]["getunitsbypropertyResult"]["GetUnitsByProperty"]["UnitObject"].each do |d|
                        begin
                          f = Floorplan.find_by(name: floorplanHash[d["FloorplanID"]],community_id: communityObj.id)
                          u = Unit.new(marketing_name: d["UnitNumber"], community_id: communityObj.id, floor: d["FloorNumber"],floorplan_id: f.present? ? f.provider_floorplan_id : nil, market_rent: d["BaseRentAmount"], effective_rent: d["BaseRentAmount"], square_feet: d["RentSqFtCount"] )
                          if d["AvailableBit"] == "false"
                            u.available = false
                          else
                            u.available = true
                          end
                          u.available_date = Date.parse(d["AvailableDate"][0..10])
                          u.save(validate: false)
                          u.provider_unit_id = u.id
                          u.save(validate: false)
                          unitHash[d["UnitID"]] = d["UnitNumber"]
                          worksheet.write(row, 0, "Unit Created")
                          worksheet.write(row, 1, "Unit Marketing Name - "+d["UnitNumber"])
                          worksheet.write(row, 2, "Unit image - "+u.image.to_s)
                          worksheet.write(row, 3, "Community - "+community)
                          worksheet.write(row, 4, "Company - "+company)
                          row += 1
                        rescue
                        end
                      end
                    rescue
                    end
                  else
                    data = JSON.parse(Hash.from_xml(o).to_json)
                    data["response"]["result"]["PhysicalProperty"]["Property"]["ILS_Unit"].each do |d|
                      begin
                        f = Floorplan.find_by(name: d["Units"]["Unit"]["FloorplanName"],community_id: communityObj.id)
                        u = Unit.new(marketing_name: d["Units"]["Unit"]["MarketingName"],provider_unit_id: d["Units"]["Unit"]["Identification"]["IDValue"] , community_id: communityObj.id,unit_type: d["Units"]["Unit"]["UnitType"],floorplan_id: f.present? ? f.provider_floorplan_id : nil, market_rent: d["Units"]["Unit"]["MarketRent"], effective_rent: d["EffectiveRent"], square_feet: d["Units"]["Unit"]["MinSquareFeet"] )
                        if d["Availability"].present?
                          u.available = true
                          year = d["Availability"]["VacateDate"]["Year"]
                          month = d["Availability"]["VacateDate"]["Month"]
                          day = d["Availability"]["VacateDate"]["Day"]
                          u.available_date = Date.parse("#{year}-#{month}-#{day}")
                        end
                        u.save(validate: false)
                        unitHash[d["Units"]["Unit"]["Identification"]["IDValue"]] = d["Units"]["Unit"]["MarketingName"]
                        worksheet.write(row, 0, "Unit Created")
                        worksheet.write(row, 1, "Unit Marketing Name - "+d["Units"]["Unit"]["MarketingName"])
                        worksheet.write(row, 2, "Unit image - ")
                        worksheet.write(row, 3, "Community - "+community)
                        worksheet.write(row, 4, "Company - "+company)
                        row += 1
                      rescue
                      end
                    end
                  end
                rescue => ex
                  puts "+++++++++++++"*100
                  puts "--company--"+company +"--community--"+ community +"--file--"+ file
                  worksheet.write(row, 0, "Exception")
                  worksheet.write(row, 1, "-------------")
                  worksheet.write(row, 2, "-------------")
                  worksheet.write(row, 3, "-------------")
                  worksheet.write(row, 4, "-------------")
                  worksheet.write(row, 5, "-------------")
                  worksheet.write(row, 6, "-------------")
                  worksheet.write(row, 7, "-------------")
                  worksheet.write(row, 8, "-------------")
                  worksheet.write(row, 9, "File - "+file)
                  worksheet.write(row, 10, "Community - "+community)
                  worksheet.write(row, 11, "Company - "+company)
                  row += 1
                end
                # ********************************************** Unit Plot **********************************
              end
              if file.to_s == "unitplot.xml"

                begin
                  o = File.read(filePath+company+'/'+community+'/'+file)
                  o.gsub!(/&(?!(?:amp|lt|gt|quot|apos);)/, '&amp;')
                  data = JSON.parse(Hash.from_xml(o).to_json)
                  if data["data"]["units"]["unit"].class == Array
                    data["data"]["units"]["unit"].each do |unit|

                      u = Unit.find_by(marketing_name: unit["unitNumber"],community_id: communityObj.id)
                      if u.present?
                        u.floor = unit["floor"]
                        u.x_plot = unit["Marker"]["XPos"]
                        u.y_plot = unit["Marker"]["YPos"]
                        u.save(validate: false)
                        worksheet.write(row, 0, "Unit Plot")
                        worksheet.write(row, 1, "Unit Name - "+unit["unitNumber"])
                        worksheet.write(row, 2, "Unit X position - "+unit["Marker"]["XPos"].to_s)
                        worksheet.write(row, 3, "Unit y Position - "+unit["Marker"]["YPos"].to_s)
                        worksheet.write(row, 4, "Community - "+community)
                        worksheet.write(row, 5, "Company - "+company)
                        row += 1
                      end

                    end
                  else
                    unit = data["data"]["units"]["unit"]
                    u = Unit.find_by(marketing_name: unit["unitNumber"],community_id: communityObj.id)
                    if u.present?
                      xpoint = unit["Marker"]["XPos"].to_f #* 1.26
                      u.x_plot = xpoint.to_i
                      ypoint = unit["Marker"]["YPos"] #- 80
                      u.y_plot = ypoint
                      u.save(validate: false)
                      worksheet.write(row, 0, "Unit Plot")
                      worksheet.write(row, 1, "Unit Name - "+unit["unitNumber"])
                      worksheet.write(row, 2, "Unit X position - "+unit["Marker"]["XPos"].to_s)
                      worksheet.write(row, 3, "Unit y Position - "+unit["Marker"]["YPos"].to_s)
                      worksheet.write(row, 4, "Community - "+community)
                      worksheet.write(row, 5, "Company - "+company)
                      row += 1
                    end
                  end
                rescue => ex
                  puts ex
                  puts "+++++++++++++"*100
                  puts "--company--"+company +"--community--"+ community +"--file--"+ file
                  worksheet.write(row, 0, "Exception")
                  worksheet.write(row, 1, "-------------")
                  worksheet.write(row, 2, "-------------")
                  worksheet.write(row, 3, "-------------")
                  worksheet.write(row, 4, "-------------")
                  worksheet.write(row, 5, "-------------")
                  worksheet.write(row, 6, "-------------")
                  worksheet.write(row, 7, "-------------")
                  worksheet.write(row, 8, "-------------")
                  worksheet.write(row, 9, "File - "+file)
                  worksheet.write(row, 10, "Community - "+community)
                  worksheet.write(row, 11, "Company - "+company)
                  row += 1
                end
              end
              # ********************************************** Gallery ***********************************
              if file.to_s == "gallery.xml"

                begin

                  g = nil
                  o = File.read(filePath+company+'/'+community+'/'+file)
                  o.gsub!(/&(?!(?:amp|lt|gt|quot|apos);)/, '&amp;')
                  data = JSON.parse(Hash.from_xml(o).to_json)
                  data["data"]["gallery"].each do |d|
                    if d.class == Hash
                      d["item"].each do |item|
                        begin
                          g = Gallery.find_by(name: item["groupID"],community_id: communityObj.id)
                          unless g.present?
                            g = Gallery.create(name: item["groupID"],community_id: communityObj.id)
                            worksheet.write(row, 0, "Gallery Created")
                            worksheet.write(row, 1, "Gallery Name - " + g.name)
                            worksheet.write(row, 2, "Community - "+community)
                            worksheet.write(row, 3, "Company - "+company)
                            row += 1
                          end

                          begin
                            img = File.open(imagePath+item["image"]["src"])
                            if File.extname(img) == ".swf"
                              begin
                                path = File.path(img)
                                img = File.open(path[0..path.length-5]+".png")
                              rescue
                                begin
                                  img = File.open(path[0..path.length-5]+".jpg")
                                rescue
                                  img = nil
                                end
                              end
                            end
                          rescue => e
                            img = nil
                          end
                          gi = GalleryImage.create(image: img, gallery_id: g.id, community_id: communityObj.id )

                          worksheet.write(row, 0, "Image Created")
                          worksheet.write(row, 1, "Image url - "+gi.name.to_s)
                          worksheet.write(row, 2, "Gallery Name - "+g.name)
                          worksheet.write(row, 3, "Community - "+community)
                          worksheet.write(row, 4, "Company - "+company)
                          row += 1
                        rescue

                        end
                      end
                    else
                      g = Gallery.find_by(name: "Interiors", community_id: communityObj.id )
                      unless g.present?
                        g = Gallery.create(name: "Interiors", community_id: communityObj.id )

                        worksheet.write(row, 0, "Gallery Created")
                        worksheet.write(row, 1, "Gallery Name - "+g.name)
                        worksheet.write(row, 2, "Community - "+community)
                        worksheet.write(row, 3, "Company - "+company)
                        row += 1

                        data["data"]["gallery"]["item"].each do |item|
                          begin
                            img = File.open(imagePath+item["image"]["src"])
                            if File.extname(img) == ".swf"
                              begin
                                path = File.path(img)
                                img = File.open(path[0..path.length-5]+".png")
                              rescue
                                begin
                                  img = File.open(path[0..path.length-5]+".jpg")
                                rescue
                                  img = nil
                                end
                              end
                            end
                          rescue => e
                            img = nil
                          end
                          gi = GalleryImage.create(image: img, gallery_id: g.id, community_id: communityObj.id )

                          worksheet.write(row, 0, "Image Created")
                          worksheet.write(row, 1, "Image url - "+gi.name.to_s)
                          worksheet.write(row, 2, "Gallery Name - "+g.name)
                          worksheet.write(row, 3, "Community - "+community)
                          worksheet.write(row, 4, "Company - "+company)
                          row += 1

                        end
                      end

                    end
                  end
                  Gallery.find_by(name: "default",community_id: communityObj.id).destroy rescue []
                  galleries = Gallery.where(community_id: communityObj.id)
                  galleries.each do |g|
                    if g.name == '1'
                      g.name = 'Interiors'
                    elsif g.name == '2'
                      g.name = 'Exterior'
                    elsif g.name == '3'
                      g.name = 'Apartments'
                    elsif g.name == '4'
                      g.name = 'Community'
                    elsif g.name == '5'
                      g.name = 'Neighborhood'
                    end
                    g.save
                  end
                rescue => ex
                  puts "+++++++++++++"*100
                  puts "--company--"+company +"--community--"+ community +"--file--"+ file
                  worksheet.write(row, 0, "Exception")
                  worksheet.write(row, 1, "-------------")
                  worksheet.write(row, 2, "-------------")
                  worksheet.write(row, 3, "-------------")
                  worksheet.write(row, 4, "-------------")
                  worksheet.write(row, 5, "-------------")
                  worksheet.write(row, 6, "-------------")
                  worksheet.write(row, 7, "-------------")
                  worksheet.write(row, 8, "-------------")
                  worksheet.write(row, 9, "File - "+file)
                  worksheet.write(row, 10, "Community - "+community)
                  worksheet.write(row, 11, "Company - "+company)
                  row += 1
                end

              end
              # ********************************************** Amenities ***********************************
              if file.to_s == "zamenities.xml"

                begin
                  o = File.read(filePath+company+'/'+community+'/'+file)
                  o.gsub!(/&(?!(?:amp|lt|gt|quot|apos);)/, '&amp;')
                  data = JSON.parse(Hash.from_xml(o).to_json)

                  if data["data"]["amenities"]["amenity"].class == Array
                    data["data"]["amenities"]["amenity"].each do |amenity|
                      begin
                        img = File.open(imagePath+amenity["image"]["src"])
                        if File.extname(img) == ".swf"
                          begin
                            path = File.path(img)
                            img = File.open(path[0..path.length-5]+".png")
                          rescue
                            begin
                              img = File.open(path[0..path.length-5]+".jpg")
                            rescue
                              img = nil
                            end
                          end
                        end
                      rescue => e
                        img = nil
                      end

                      a = Amenity.create(name: amenity["ID"],description: amenity["description"],image: img,community_id: communityObj.id)
                      worksheet.write(row, 0, "Amenity Created")
                      worksheet.write(row, 1, "Amenity Name - "+a.name)
                      worksheet.write(row, 2, "Image url - "+a.image.to_s)
                      worksheet.write(row, 3, "Community - "+community)
                      worksheet.write(row, 4, "Company - "+company)
                      row += 1
                    end
                  else

                    amenity = data["data"]["amenities"]["amenity"]
                    begin
                      img = File.open(imagePath+amenity["image"]["src"])
                      if File.extname(img) == ".swf"
                        begin
                          path = File.path(img)
                          img = File.open(path[0..path.length-5]+".png")
                        rescue
                          begin
                            img = File.open(path[0..path.length-5]+".jpg")
                          rescue
                            img = nil
                          end
                        end
                      end
                    rescue => e
                      img = nil
                    end

                    a = Amenity.create(name: amenity["ID"],description: amenity["description"],image: img,community_id: communityObj.id)
                    worksheet.write(row, 0, "Amenity Created")
                    worksheet.write(row, 1, "Amenity Name - "+a.name)
                    worksheet.write(row, 2, "Image url - "+a.image.to_s)
                    worksheet.write(row, 3, "Community - "+community)
                    worksheet.write(row, 4, "Company - "+company)
                    row += 1
                  end
                  if data["data"]["floorplans"].present?
                    if  data["data"]["floorplans"]["marker"].class == Array
                      data["data"]["floorplans"]["marker"].each do |marker|
                        a = Amenity.find_by(name: marker["amenityID"],community_id: communityObj.id)
                        if a.present?
                          a.amenityable_id = floorplanHash[marker["floorplanID"]].to_i
                          a.amenityable_type = "Floorplan"
                          a.x_plot = marker["XPos"]
                          a.y_plot = marker["YPos"]
                          a.save
                          worksheet.write(row, 0, "Amenity Plot")
                          worksheet.write(row, 1, "Amenity X Position - "+marker["XPos"].to_s)
                          worksheet.write(row, 2, "Amenity Y Position - "+marker["YPos"].to_s)
                          worksheet.write(row, 3, "Community - "+community)
                          worksheet.write(row, 4, "Company - "+company)
                          row += 1
                        end
                      end
                    else
                      marker = data["data"]["floorplans"]["marker"]
                      a = Amenity.find_by(name: marker["amenityID"],community_id: communityObj.id)
                      if a.present?
                        a.amenityable_id = floorplanHash[marker["floorplanID"]].to_i
                        a.amenityable_type = "Floorplan"
                        a.x_plot = marker["XPos"]
                        a.y_plot = marker["YPos"]
                        a.save
                        worksheet.write(row, 0, "Amenity Plot")
                        worksheet.write(row, 1, "Amenity X Position - "+marker["XPos"].to_s)
                        worksheet.write(row, 2, "Amenity Y Position - "+marker["YPos"].to_s)
                        worksheet.write(row, 3, "Community - "+community)
                        worksheet.write(row, 4, "Company - "+company)
                        row += 1
                      end
                    end
                  end
                  #______________________________ unit amenities__________________
                  if data["data"]["units"].present?
                    if  data["data"]["units"]["marker"].class == Array
                      data["data"]["units"]["marker"].each do |marker|
                        a = Amenity.find_by(name: marker["amenityID"])
                        if a.present?
                          a.amenityable_id = unitHash[marker["unitID"]].to_i
                          a.amenityable_type = "Unit"
                          a.x_plot = marker["XPos"]
                          a.y_plot = marker["YPos"]
                          a.save
                          worksheet.write(row, 0, "Amenity Plot")
                          worksheet.write(row, 1, "Amenity X Position - "+marker["XPos"].to_s)
                          worksheet.write(row, 2, "Amenity Y Position - "+marker["YPos"].to_s)
                          worksheet.write(row, 3, "Community - "+community)
                          worksheet.write(row, 4, "Company - "+company)
                          row += 1
                        end
                      end
                    else
                      marker = data["data"]["units"]["marker"]
                      a = Amenity.find_by(name: marker["amenityID"],community_id: communityObj.id)
                      if a.present?
                        a.amenityable_id = unitHash[marker["unitID"]].to_i
                        a.amenityable_type = "Unit"
                        a.x_plot = marker["XPos"]
                        a.y_plot = marker["YPos"]
                        a.save
                        worksheet.write(row, 0, "Amenity Plot")
                        worksheet.write(row, 1, "Amenity X Position - "+marker["XPos"].to_s)
                        worksheet.write(row, 2, "Amenity Y Position - "+marker["YPos"].to_s)
                        worksheet.write(row, 3, "Community - "+community)
                        worksheet.write(row, 4, "Company - "+company)
                        row += 1
                      end
                    end
                  end
                  #________________________________floorplate_____________________
                  if data["data"]["floorplates"].present?
                    if  data["data"]["floorplates"]["marker"].class == Array
                      data["data"]["floorplates"]["marker"].each do |marker|
                        a = Amenity.find_by(name: marker["amenityID"],community_id: communityObj.id)
                        if a.present?
                          a.amenityable_id = floorplateHash[marker["floorplateID"]].to_i
                          a.amenityable_type = "Floorplate"
                          a.x_plot = marker["XPos"]
                          a.y_plot = marker["YPos"]
                          a.save
                          worksheet.write(row, 0, "Amenity Plot")
                          worksheet.write(row, 1, "Amenity X Position - "+marker["XPos"].to_s)
                          worksheet.write(row, 2, "Amenity Y Position - "+marker["YPos"].to_s)
                          worksheet.write(row, 3, "Community - "+community)
                          worksheet.write(row, 4, "Company - "+company)
                          row += 1
                        end
                      end
                    else
                      marker = data["data"]["floorplates"]["marker"]
                      a = Amenity.find_by(name: marker["amenityID"],community_id: communityObj.id)
                      if a.present?
                        a.amenityable_id = floorplateHash[marker["floorplateID"]].to_i
                        a.amenityable_type = "Floorplate"
                        a.x_plot = marker["XPos"]
                        a.y_plot = marker["YPos"]
                        a.save
                        worksheet.write(row, 0, "Amenity Plot")
                        worksheet.write(row, 1, "Amenity X Position - "+marker["XPos"].to_s)
                        worksheet.write(row, 2, "Amenity Y Position - "+marker["YPos"].to_s)
                        worksheet.write(row, 3, "Community - "+community)
                        worksheet.write(row, 4, "Company - "+company)
                        row += 1
                      end
                    end
                  end

                rescue => ex
                  puts "+++++++++++++"*100
                  puts "--company--"+company +"--community--"+ community +"--file--"+ file
                  worksheet.write(row, 0, "Exception")
                  worksheet.write(row, 1, "-------------")
                  worksheet.write(row, 2, "-------------")
                  worksheet.write(row, 3, "-------------")
                  worksheet.write(row, 4, "-------------")
                  worksheet.write(row, 5, "-------------")
                  worksheet.write(row, 6, "-------------")
                  worksheet.write(row, 7, "-------------")
                  worksheet.write(row, 8, "-------------")
                  worksheet.write(row, 9, "File - "+file)
                  worksheet.write(row, 10, "Community - "+community)
                  worksheet.write(row, 11, "Company - "+company)
                  row += 1
                end

              end
              # ********************************************** G Map ***********************************
              if file.to_s == "gmap.xml"
                begin
                  o = File.open(filePath+company+'/'+community+'/'+file,"r:iso-8859-1:utf-8").read
                  # o = File.read(filePath+company+'/'+community+'/'+file)

                  o.gsub!(/&(?!(?:amp|lt|gt|quot|apos);)/, '&amp;')

                  data = JSON.parse(Hash.from_xml(o).to_json)

                  begin
                    img = File.open(imagePath+data["data"]["community"]["icon"])
                    if File.extname(img) == ".swf"
                      begin
                        path = File.path(img)
                        img = File.open(path[0..path.length-5]+".png")
                      rescue
                        begin
                          img = File.open(path[0..path.length-5]+".jpg")
                        rescue
                          img = nil
                        end
                      end
                    end
                  rescue => e
                    img = nil
                  end
                  com = Community.find(communityObj.id)


                  address = data["data"]["community"]["address"] # Address
                  addressDetails = address.split(',')
                  com.address = addressDetails[0]
                  com.zip = addressDetails[addressDetails.count-1]
                  com.state = addressDetails[addressDetails.count-2]
                  com.city = addressDetails[addressDetails.count-3]

                  com.latitude = data["data"]["community"]["lat"]
                  com.longitude = data["data"]["community"]["lng"]
                  com.logo = img
                  com.save
                  worksheet.write(row, 0, "Community Updated")
                  worksheet.write(row, 1, "Community logo url - "+com.logo.to_s)
                  worksheet.write(row, 2, "Community - "+community)
                  worksheet.write(row, 3, "Company - "+company)
                  row += 1

                  str = ""

                  if data["data"]["cat"].class == Array
                    data["data"]["cat"].each do |d|
                      if d["name"] == "dining"
                        str = str + "Dining,"
                      elsif d["name"] == "shopping"
                        str = str + "Shopping,"
                      elsif d["name"] == "entertainment"
                        str = str + "Entertainment,"
                      elsif d["name"] == "schools"
                        str = str + "Schools,"
                      elsif d["name"] == "banks"
                        str = str + "Banks,"
                      elsif d["name"] == "parks"
                        str = str + "Parks,"
                      end
                    end
                  else
                    if data["data"]["cat"]["name"] == "dining"
                      str = str + "Dining,"
                    elsif data["data"]["cat"]["name"] == "shopping"
                      str = str + "Shopping,"
                    elsif data["data"]["cat"]["name"] == "entertainment"
                      str = str + "Entertainment,"
                    elsif data["data"]["cat"]["name"] == "schools"
                      str = str + "Schools,"
                    elsif data["data"]["cat"]["name"] == "banks"
                      str = str + "Banks,"
                    elsif data["data"]["cat"]["name"] == "parks"
                      str = str + "Parks,"
                    end
                  end
                  str = str[0..str.length-2]
                  n = Neighborhood.create(community_id: communityObj.id, category: str )

                rescue => ex
                  puts "+++++++++++++"*100
                  puts "--company--"+company +"--community--"+ community +"--file--"+ file
                  worksheet.write(row, 0, "Exception")
                  worksheet.write(row, 1, "-------------")
                  worksheet.write(row, 2, "-------------")
                  worksheet.write(row, 3, "-------------")
                  worksheet.write(row, 4, "-------------")
                  worksheet.write(row, 5, "-------------")
                  worksheet.write(row, 6, "-------------")
                  worksheet.write(row, 7, "-------------")
                  worksheet.write(row, 8, "-------------")
                  worksheet.write(row, 9, "File - "+file)
                  worksheet.write(row, 10, "Community - "+community)
                  worksheet.write(row, 11, "Company - "+company)
                  row += 1
                end
              end
              # ********************************************** Site Map ***********************************
              if file.to_s == "sitemap.xml"

                o = File.read(filePath+company+'/'+community+'/'+file)
                begin
                  data = JSON.parse(Hash.from_xml(o).to_json)



                rescue => e

                end
              end
              # ********************************************** Floor plate ***********************************
              if file.to_s == "floorplates.xml"

                begin
                  o = File.read(filePath+company+'/'+community+'/'+file)
                  o.gsub!(/&(?!(?:amp|lt|gt|quot|apos);)/, '&amp;')
                  data = JSON.parse(Hash.from_xml(o).to_json)
                  begin
                    if data["data"]["floorplates"]["floorplate"].class == Array
                      data["data"]["floorplates"]["floorplate"].each do |d|
                        begin
                          img = File.open(imagePath+d["image"].to_s)
                          if File.extname(img) == ".swf"
                            begin
                              path = File.path(img)
                              img = File.open(path[0..path.length-5]+".png")
                            rescue
                              begin
                                img = File.open(path[0..path.length-5]+".jpg")
                              rescue
                                img = nil
                              end
                            end
                          end
                        rescue => e
                          img = nil
                        end

                        floorplateHash[d["ID"]] = d["name"]
                        floorplateHeightHash[d["name"]] = d["width"]
                        floorplateWidthHash[d["name"]] = d["height"]
                        f = Floorplate.new(name: d["name"],community_id: communityObj.id, range: d["range"],building: d["building"],width: d["width"],height: d["height"], number: d["number"], image: img)
                        f.save(validate: false)
                        worksheet.write(row, 0, "Floorplate Created")
                        worksheet.write(row, 1, "Floorplate Name"+d["name"])
                        worksheet.write(row, 2, "Floorplate image url - "+f.image.to_s)
                        worksheet.write(row, 3, "Community - "+community)
                        worksheet.write(row, 4, "Company - "+company)
                        row += 1
                        communityObj.is_sitemap = false
                        communityObj.save
                      end
                    else
                      d = data["data"]["floorplates"]["floorplate"]
                      begin
                        img = File.open(imagePath+d["image"].to_s)
                        if File.extname(img) == ".swf"
                          begin
                            path = File.path(img)
                            img = File.open(path[0..path.length-5]+".png")
                          rescue
                            begin
                              img = File.open(path[0..path.length-5]+".jpg")
                            rescue
                              img = nil
                            end
                          end
                        end
                      rescue => e
                        img = nil
                      end
                      floorplateHash[d["ID"]] = d["name"]
                      f = Floorplate.new(name: d["name"],community_id: communityObj.id, range: d["range"],building: d["building"],width: d["width"],height: d["height"], number: d["number"], image: img)
                      f.save(validate: false)
                      worksheet.write(row, 0, "Floorplate Created")
                      worksheet.write(row, 1, "Floorplate Name"+d["name"])
                      worksheet.write(row, 2, "Floorplate image url - "+f.image.to_s)
                      worksheet.write(row, 3, "Community - "+community)
                      worksheet.write(row, 4, "Company - "+company)
                      row += 1

                    end
                  rescue
                    worksheet.write(row, 0, "Exception")
                    worksheet.write(row, 1, "-------------")
                    worksheet.write(row, 2, "-------------")
                    worksheet.write(row, 3, "-------------")
                    worksheet.write(row, 4, "-------------")
                    worksheet.write(row, 5, "-------------")
                    worksheet.write(row, 6, "-------------")
                    worksheet.write(row, 7, "-------------")
                    worksheet.write(row, 8, "-------------")
                    worksheet.write(row, 9, "File - "+file)
                    worksheet.write(row, 10, "Community - "+community)
                    worksheet.write(row, 11, "Company - "+company)
                    row += 1
                  end
                  ###################### Unit plot ########################
                  if data["data"]["units"]["unit"].class == Array
                    data["data"]["units"]["unit"].each do |d|
                      begin
                        u = Unit.find_by(marketing_name: d["unitNumber"],community_id: communityObj.id)
                        if u.present?
                          fp = nil
                          if floorplateHash[d["floorplateID"]].present?
                            fp = Floorplate.find_by(name: floorplateHash[d["floorplateID"]],community_id: communityObj.id)
                            u.floorplate_id = fp.id
                          end
                          width = floorplateHeightHash[fp.name].to_f
                          height = floorplateWidthHash[fp.name].to_f
                          if width > 1412
                            heightTemp = width / 1412
                            xpoint = d["marker"]["XPos"].to_f / heightTemp
                          else
                            heightTemp = 1412 / width
                            xpoint = d["marker"]["XPos"].to_f * heightTemp
                          end
                          if height > 732
                            widthTemp = height / 732
                            ypoint = d["marker"]["YPos"].to_f / widthTemp
                          else
                            widthTemp = 703 / height
                            ypoint = d["marker"]["YPos"].to_f * widthTemp
                          end
                          u.floor = d["floor"]
                          # xpoint = d["marker"]["XPos"].to_f
                          u.x_plot = xpoint.to_i
                          # ypoint = d["marker"]["YPos"].to_i
                          u.y_plot = ypoint.to_i
                          u.save(validate: false)
                          worksheet.write(row, 0, "Unit Plot")
                          worksheet.write(row, 1, "Unit Name - "+d["unitNumber"].to_s)
                          worksheet.write(row, 2, "Unit X Position - "+u.x_plot.to_s)
                          worksheet.write(row, 3, "Unit Y Position - "+u.y_plot.to_s)
                          worksheet.write(row, 4, "Community - "+community.to_s)
                          worksheet.write(row, 5, "Company - "+company.to_s)
                          row += 1
                        end
                      rescue

                      end
                    end
                  else

                    d = data["data"]["units"]["unit"]
                    u = Unit.find_by(marketing_name: d["unitNumber"],community_id: communityObj.id)
                    fp = Floorplate.find_by(name: floorplateHash[d["floorplateID"]],community_id: communityObj.id)
                    u.floor = d["floor"]
                    u.floorplate_id = fp.id
                    u.x_plot = d["marker"]["XPos"]
                    u.y_plot = d["marker"]["YPos"]
                    u.save(validate: false)
                    worksheet.write(row, 0, "Unit Plot")
                    worksheet.write(row, 1, "Unit Name - "+d["unitNumber"].to_s)
                    worksheet.write(row, 2, "Unit X Position - "+u.x_plot.to_s)
                    worksheet.write(row, 3, "Unit Y Position - "+u.y_plot.to_s)
                    worksheet.write(row, 4, "Community - "+community.to_s)
                    worksheet.write(row, 5, "Company - "+company.to_s)
                    row += 1
                  end
                rescue
                  puts ex
                  puts "+++++++++++++"*100
                  puts "--company--"+company +"--community--"+ community +"--file--"+ file
                  worksheet.write(row, 0, "Exception")
                  worksheet.write(row, 1, "-------------")
                  worksheet.write(row, 2, "-------------")
                  worksheet.write(row, 3, "-------------")
                  worksheet.write(row, 4, "-------------")
                  worksheet.write(row, 5, "-------------")
                  worksheet.write(row, 6, "-------------")
                  worksheet.write(row, 7, "-------------")
                  worksheet.write(row, 8, "-------------")
                  worksheet.write(row, 9, "File - "+file)
                  worksheet.write(row, 10, "Community - "+community)
                  worksheet.write(row, 11, "Company - "+company)
                  row += 1
                end


              end

              ####################### Slide show ##############
              if file.to_s == "slideshow.xml"

                begin
                  o = File.read(filePath+company+'/'+community+'/'+file)
                  o.gsub!(/&(?!(?:amp|lt|gt|quot|apos);)/, '&amp;')
                  data = JSON.parse(Hash.from_xml(o).to_json)

                  if data["data"]["slides"]["item"].class == Array
                    begin
                      d = Design.create(community_id: communityObj.id)
                      data["data"]["slides"]["item"].each do |item|
                        begin
                          img = File.open(imagePath+item["image"]["src"].to_s)
                          if File.extname(img) == ".swf"
                            begin
                              path = File.path(img)
                              img = File.open(path[0..path.length-5]+".png")
                            rescue
                              begin
                                img = File.open(path[0..path.length-5]+".jpg")
                              rescue
                                img = nil
                              end
                            end
                          end
                        rescue => e
                          img = nil
                        end

                        HomePageImage.create(design_id: d.id,image: img)
                      end
                    rescue
                    end
                  else
                    begin
                      img = File.open(imagePath+data["data"]["sldies"]["item"]["image"]["src"].to_s)
                      if File.extname(img) == ".swf"
                        begin
                          path = File.path(img)
                          img = File.open(path[0..path.length-5]+".png")
                        rescue
                          begin
                            img = File.open(path[0..path.length-5]+".jpg")
                          rescue
                            img = nil
                          end
                        end
                      end
                    rescue => e
                      img = nil
                    end
                    HomePageImage.create(desgin_id: communityObj.design.id,image: img)

                  end

                rescue
                  puts ex
                  puts "+++++++++++++"*100
                  puts "--company--"+company +"--community--"+ community +"--file--"+ file
                  worksheet.write(row, 0, "Exception")
                  worksheet.write(row, 1, "-------------")
                  worksheet.write(row, 2, "-------------")
                  worksheet.write(row, 3, "-------------")
                  worksheet.write(row, 4, "-------------")
                  worksheet.write(row, 5, "-------------")
                  worksheet.write(row, 6, "-------------")
                  worksheet.write(row, 7, "-------------")
                  worksheet.write(row, 8, "-------------")
                  worksheet.write(row, 9, "File - "+file)
                  worksheet.write(row, 10, "Community - "+community)
                  worksheet.write(row, 11, "Company - "+company)
                  row += 1
                end


              end
              ######################################____Template.xml___##############

              if file.to_s == "template.xml"

                begin
                  o = File.read(filePath+company+'/'+community+'/'+file)
                  o.gsub!(/&(?!(?:amp|lt|gt|quot|apos);)/, '&amp;')
                  data = JSON.parse(Hash.from_xml(o).to_json)
                  communityObj.name = data["template"]["config"]["communityName"] # Community Name
                  FavoriteSetting.create(community_id: communityObj.id, email_bcc: data["template"]["config"]["bccEmail"].to_s, email_from: data["template"]["config"]["fromEmail"].to_s)
                  communityObj.email = data["template"]["config"]["fromEmail"].to_s
                  communityObj.save(validate: false)
                  # communityObj.favorite_setting.email_bcc = data["template"]["config"]["bccEmail"] # Community favorite_setting email_bcc
                  # communityObj.favorite_setting.email_from = data["template"]["config"]["fromEmail"] # Community favorite_setting email_from


                  begin
                    img = File.open(imagePath+"swoop/"+company+"/"+community+"/assets/nav/logo.png")
                  rescue => e
                    img = nil
                  end
                  if img == nil
                    begin
                      img = File.open(imagePath+"swoop/"+company+"/"+community+"/assets/home/logo.png")
                    rescue => e
                      img = nil
                    end
                  end
                  if img == nil
                    begin
                      img = File.open(imagePath+"swoop/"+company+"/"+community+"/assets/global/logo.png")
                    rescue => e
                      img = nil
                    end
                  end
                  communityObj.logo = img
                  communityObj.save

                    ###################### Unit plot ########################
                rescue
                  puts ex
                  puts "+++++++++++++"*100
                  puts "--company--"+company +"--community--"+ community +"--file--"+ file
                  worksheet.write(row, 0, "Exception")
                  worksheet.write(row, 1, "-------------")
                  worksheet.write(row, 2, "-------------")
                  worksheet.write(row, 3, "-------------")
                  worksheet.write(row, 4, "-------------")
                  worksheet.write(row, 5, "-------------")
                  worksheet.write(row, 6, "-------------")
                  worksheet.write(row, 7, "-------------")
                  worksheet.write(row, 8, "-------------")
                  worksheet.write(row, 9, "File - "+file)
                  worksheet.write(row, 10, "Community - "+community)
                  worksheet.write(row, 11, "Company - "+company)
                  row += 1
                end


              end

              ##########################################

            end
            ############# files area end
            begin
              imagepages = Dir.entries(filePath+"/"+company+"/"+community+"/assets/about")
              imgpg = Imagepage.create(name: "About",community_id: communityObj.id,is_slideshow: false)
              imagepages.each do |ip|
                unless ip == "." || ip == ".."
                  begin
                    img = File.open(filePath+"/"+company+"/"+community+"/assets/about/"+ip)
                  rescue
                    img = nil
                  end
                  AdditionalImage.create(imagepage_id: imgpg.id,image: img)
                end
              end
            rescue

            end
            ####################### if slides show not present ##################
            begin
              unless files.include? "slideshow.xml"
                slideImages = Dir.entries(filePath+company+"/"+community+"/assets/home")
                d = Design.create(community_id: communityObj.id)
                slideImages.each do |slideImage|
                  unless slideImage == "." || slideImage == ".."
                    if slideImage.include? "slide"
                      begin
                        begin
                          img = File.open(filePath+"/"+company+"/"+community+"/assets/home/"+slideImage)
                          if File.extname(img) == ".swf"
                            begin
                              path = File.path(img)
                              img = File.open(path[0..path.length-5]+".png")
                            rescue
                              begin
                                img = File.open(path[0..path.length-5]+".jpg")
                              rescue
                                img = nil
                              end
                            end
                          end
                        rescue => e
                          img = nil
                        end
                        HomePageImage.create(design_id: d.id,image: img)

                      rescue
                      end
                    end
                  end
                end
              end
            rescue

            end

          end
        end
        ################## Communities area end


      end
    end
    # Dir.entries('/your_dir').select {|entry| File.directory? File.join('/your_dir',entry) and !(entry =='.' || entry == '..') }
    workbook.close
  end
end