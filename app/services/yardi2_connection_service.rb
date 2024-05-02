class Yardi2ConnectionService < BaseService
	def perform
    begin
      property_ids = credentials.property_id.split(',') rescue []
      url = credentials.url
      arr = url.split('/')
      post = "#{arr[3]}/Webservices/itfilsguestcard20.asmx HTTP/1.1"
      host = arr[2]
      soap_action = 'http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard20/UnitAvailability_Login'
      user_name = credentials.username
      password = credentials.password
      server_name = credentials.server_name
      database = credentials.database
      platform = credentials.platform
      property_id = property_ids[0]
      property_id = property_id&.strip
      interface_entity = credentials.interface_entity
      license_key = YARDI_LICENSE_KEY
      response = HTTParty.post(
        url,
        :headers => {'POST'=>post,'HOST'=>host,'Content-Type'=>'text/xml; charset=utf-8','SOAPAction'=>soap_action},
        :body => '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><UnitAvailability_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard20"><UserName>'+user_name+'</UserName><Password>'+password+'</Password><ServerName>'+server_name+'</ServerName><Database>'+database+'</Database><Platform>'+platform+'</Platform><YardiPropertyId>'+property_id+'</YardiPropertyId><InterfaceEntity>'+interface_entity+'</InterfaceEntity><InterfaceLicense>'+license_key+'</InterfaceLicense></UnitAvailability_Login></soap:Body></soap:Envelope>')
      return response.body
    rescue
      false
    end  
	end
end