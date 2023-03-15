require 'savon'

namespace :dataprovider do

  desc 'fetch floorplans data from realpage scv'
  task :yardi2 => :environment do
    url = "https://www.yardiasp14.com/34255rdmerrill/webservices/itfilsguestcard20.asmx"
    post = '34255rdmerrill/Webservices/itfilsguestcard20.asmx HTTP/1.1'
    host = 'www.yardiasp14.com'
    soap_action = 'http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard20/UnitAvailability_Login'
    user_name = "Pynwheel"
    password = "Pynwheel"
    server_name = "VNSQL41_2K12"
    database = "bexedqvjz_live"
    platform = 'SQL Server'
    property_id = "000161"
    interface_entity = "Pynwheel"
    license_key = "MIIBEAYJKwYBBAGCN1gDoIIBATCB/gYKKwYBBAGCN1gDAaCB7zCB7AIDAgABAgJo
AQICAIAEAAQQnfAySgqwPMdhHb1iJd95EgSByDKj+CmyfBfUL7Qhit2NcOp+3in1
KSEHomH7eFp/el4OgiuJpY/oMdhtAuPF1aY+MQdv4J8Q2Mf3plIjRCmfT3A1lHCs
oSs6PDY2Ee6JUtDu8JZsF79OSsJqo5aHh5iVacBPxEFTv9Il4QPB8BLWE0PjRjZE
cgNVisG7LcOH8pbd8zDLyyTnlsHhpBSFH3r47s2HNpIY3F1M9QwRqhWiQOC/Bsvr
ODNi09KobeykeYuHsR2EgZH79PgzhT29IgszCykEgBy4QqbZ"
    response = HTTParty.post(
        url,
        :headers => {'POST'=>post,'HOST'=>host,'Content-Type'=>'text/xml; charset=utf-8','SOAPAction'=>soap_action},
        :body => '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><UnitAvailability_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard20"><UserName>'+user_name+'</UserName><Password>'+password+'</Password><ServerName>'+server_name+'</ServerName><Database>'+database+'</Database><Platform>'+platform+'</Platform><YardiPropertyId>'+property_id+'</YardiPropertyId><InterfaceEntity>'+interface_entity+'</InterfaceEntity><InterfaceLicense>'+license_key+'</InterfaceLicense></UnitAvailability_Login></soap:Body></soap:Envelope>')
    result = Hash.from_xml(response.body)
    ils_units = result["Envelope"]["Body"]["UnitAvailability_LoginResponse"]["UnitAvailability_LoginResult"]["PhysicalProperty"]["Property"]["ILS_Unit"]
    floorplans = result["Envelope"]["Body"]["UnitAvailability_LoginResponse"]["UnitAvailability_LoginResult"]["PhysicalProperty"]["Property"]["Floorplan"]
    @prop_id =  result["Envelope"]["Body"]["UnitAvailability_LoginResponse"]["UnitAvailability_LoginResult"]["PhysicalProperty"]["Property"]["PropertyID"]["Identification"]["PrimaryID"]
    save_yardi2_units(ils_units)
    save_yardi2_floorplans(floorplans)
  end

  def save_yardi2_units(ils_units)
    ils_units.each do |u|
      unit = Unit.new(provider: "yardi2",community_id: 4)
      unit.property_id = @prop_id
      unit.provider_unit_id = u["Id"]
      unit.marketing_name = u["Id"]
      unit.unit_type = u["Id"]
      unit.floorplan_id = u["Unit"]["Information"]["UnitType"]
      # unit.avg_rent = 0 #TODO u.AvgRent = Number(o.Units.Unit.MarketRent.toString());
      # unit.min_rent = u["EffectiveRent"]["Min"]
      # unit.max_rent = u["EffectiveRent"]["Max"]
      unit.effective_rent = u["EffectiveRent"]["Min"]
      #if (rentType == "EffectiveRent")
      # {
      # u.MinRent=Number(o.EffectiveRent.@Min.toString());
      #  }
      #     if (rentType == "MarketRent")
      #     {
      # u.MinRent=Number(o..MarketRent.toString());
      #    }
      #TODO rentType is currently saved in template.xml file. Where will save this information ? and how ?
      is_available = false
      vacate_date = Date.today
      if u["Availability"].present?
        if u["Availability"]["VacateDate"]["Year"].present?
          vacate_date = Date.parse("#{u["Availability"]["VacateDate"]["Year"]}-#{u["Availability"]["VacateDate"]["Month"]}-#{u["Availability"]["VacateDate"]["Day"]}")
        end
        if u["Availability"]["MadeReadyDate"]["Year"].present?
          vacate_date = Date.parse("#{u["Availability"]["MadeReadyDate"]["Year"]}-#{u["Availability"]["MadeReadyDate"]["Month"]}-#{u["Availability"]["MadeReadyDate"]["Day"]}")
        end
        if vacate_date >= Date.today && u["Availability"]["VacancyClass"] == "Occupied"
          is_available = true
        else
          is_available = false
          vacate_date = Date.parse("2099-1-1")
        end
      else
        is_available = false
        vacate_date = Date.parse("2099-1-1") #set a newer date 1/1/2099
      end
      unit.availability = is_available ? "Unoccupied" : "Occupied"
      unit.available_date = vacate_date
      unit.save
    end
  end

  def save_yardi2_floorplans(floorplans)
    floorplans.each do |f|
      fp = Floorplan.new(provider: "yardi2",community_id: 4)
      fp.provider_floorplan_id = f["Id"]
      rooms = f["Room"]
      rooms.each do |room|
          if room["Type"] == "Bedroom"
            fp.bedrooms = room["Count"]
          else
            fp.bathrooms = room["Count"]
          end
        end
      fp.name = f["Name"]
      if f["MarketRent"]["Min"].to_f > 0
         fp.market_rent = f["MarketRent"]["Min"]
      else
        fp.market_rent = f["MarketRent"]["Max"]
      end
      if f["SquareFeet"]["Min"].to_f > 0
        fp.square_feet = f["SquareFeet"]["Min"]
      else
        fp.square_feet = f["SquareFeet"]["Max"]
      end
      fp.unit_count = f["UnitCount"]
      fp.units_available = -1
      #puts '------------------------', f["Deposit"]
      #puts '-************************' , f["File"]
      #fp.deposit =  f["Deposit"]["Amount"]["Value"] rescue 0.0
      #fp.file_url = f["File"]["Src"]
      fp.save
    end
  end


end