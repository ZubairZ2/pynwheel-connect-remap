
namespace :dataprovider do

  desc 'fetch floorplans data from yardi4'
  task :yardi4 => :environment do
    response = HTTParty.post(
        "http://voyageraz1.picerneaz.com/voyager60/webservices/itfilsguestcard.asmx?wsdl",
        :headers => {'POST'=>'/voyager60/Webservices/itfilsguestcard.asmx HTTP/1.1','HOST'=>'voyageraz1.picerneaz.com','Content-Type'=>'text/xml; charset=utf-8','SOAPAction'=>'http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard/UnitAvailability_Login'},
        :body => '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><UnitAvailability_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard"><UserName>pynwheel</UserName><Password>pynwheel</Password><ServerName>yardiaz1</ServerName><Database>arizona</Database><Platform>SQL Server</Platform><YardiPropertyId>SWFLO</YardiPropertyId><InterfaceEntity>Pynwheel</InterfaceEntity><InterfaceLicense>MIIBEAYJKwYBBAGCN1gDoIIBATCB/gYKKwYBBAGCN1gDAaCB7zCB7AIDAgABAgJoAQICAIAEAAQQb2bdpX8B3jHdPljSivbiuASByOvAt9PkhRChGWsa5YG3AL9BJALXDVPHpDmcs0H+kJNxj3/BusZJQ5xAehvRVRxtU2fZvQ7KR2RMavloRYvMX4yDMDfCKGiiBUcHgwXMXArK1clII0o1gNYu+NcrCGxFC5EqDY6os308AssprSKJ6c4qbtw2lNE1SgYdHsEQFpetjRj8Ps8QIseOWA9M0s1FLABpdm3dGODEB9VXjswmM7qNzZyNTN5MSKBgIAjDQ3tmz2eEzgYxD9NxCZwB/eOvCJVq8ZZ+MoM4</InterfaceLicense></UnitAvailability_Login></soap:Body></soap:Envelope>
')
    result = Hash.from_xml(response.body)

     ils_units = result["Envelope"]["Body"]["UnitAvailability_LoginResponse"]["UnitAvailability_LoginResult"]["PhysicalProperty"]["Property"]["ILS_Unit"]
     floorplans = result["Envelope"]["Body"]["UnitAvailability_LoginResponse"]["UnitAvailability_LoginResult"]["PhysicalProperty"]["Property"]["Floorplan"]
     @prop_id =  result["Envelope"]["Body"]["UnitAvailability_LoginResponse"]["UnitAvailability_LoginResult"]["PhysicalProperty"]["Property"]["PropertyID"]["Identification"]["PrimaryID"]
     save_yardi4_units(ils_units)
     save_yardi4_floorplans(floorplans)
  end

  def save_yardi4_units(ils_units)
    ils_units.each do |u|
      unit = Unit.new(provider: "yardi4",community_id: 4)
      unit.property_id = @prop_id
      unit.provider_unit_id = u["Units"]["Unit"]["Identification"]["IDValue"]
      unit.name = u["Units"]["Unit"]["Identification"]["IDValue"]
      unit.number = u["Units"]["Unit"]["Identification"]["IDValue"]
      unit.floorplan_id = u["Units"]["Unit"]["UnitType"]
      unit.avg_rent = 0 #TODO u.AvgRent = Number(o.Units.Unit.MarketRent.toString());
      unit.min_rent = u["Units"]["Unit"]["MarketRent"]
      unit.max_rent = u["Units"]["Unit"]["MarketRent"]
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

  def save_yardi4_floorplans(floorplans)
    floorplans.each do |f|
      fp = Floorplan.new(provider: "yardi4",community_id: 4)
      fp.provider_floorplan_id = f["IDValue"]
      rooms = f["Room"]
      rooms.each do |room|
        if room["RoomType"] == "Bedroom"
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
      #fp.deposit =  f["Deposit"]["Amount"]["Value"]
      #fp.file_url = f["File"]["Src"]
      fp.save
    end
  end


end