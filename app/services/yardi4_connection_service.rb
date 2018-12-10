class Yardi4ConnectionService < BaseService
	def perform
    begin
      # property_ids = credentials.property_id.split(',') rescue []
	    # url = credentials.url
      # arr = url.split('/')
      # post = "/#{arr[3]}/Webservices/itfilsguestcard.asmx HTTP/1.1"
      # host = arr[2]
      # soap_action = 'http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard/UnitAvailability_Login'
      # user_name = credentials.username
      # password = credentials.password
      # server_name = credentials.server_name
      database = credentials.database
      platform = credentials.platform
      property_id = property_ids[0]
      interface_entity = credentials.interface_entity
      license_key = YARDI_LICENSE_KEY
      #############3


      require 'httparty'
      options = {
          timeout: 15,
          http_proxyaddr: 'us-east-static-06.quotaguard.com',
          http_proxyport: '9293',
          http_proxyuser: 'REDACTED',
          http_proxypass: 'REDACTED'
      }

      post = "/65320maa/Webservices/itfilsguestcard.asmx HTTP/1.1"
      host = "www.yardipca.com"
      soap_action = 'http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard/UnitAvailability_Login'

      soap_body =
          "<soap:Envelope
  xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'
  xmlns:xsd='http://www.w3.org/2001/XMLSchema'
  xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'>
  <soap:Body>
    <UnitAvailability_Login xmlns='http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard'>
      intpynMAAM@@pyn1PCA016DB43mpwobqbng_liveSQL Server170020PynwheelMIIBEAYJKwYBBAGCN1gDoIIBATCB/gYKKwYBBAGCN1gDAaCB7zCB7AIDAgABAgJoAQICAIAEAAQQlUC2PtFRQlHz4IxxAMxGUQSByNz3DoaVGqk4d9Gig0xuoRcw//nsZaT2WM9WHyAX4Tr/4EyUyQ2ynz2YgpfEHPUFgH7YTI1dlnsTL+HrBUJvv+Eu619vH0aB4l7sdymdklvagfjYoWBgWuT/m9v5fIFSQvl5YX46EsmWBMwDAyFL+lYF2W68auU+MxCasU5sli/hg9U/W4RfZmd3GsGBCebphM6Pv1PjoW+afqtztdO7VAtjGnXCwoiIwihLKtG590wZzxBQM/dbFAo0p6fzyvJAQzoYOiH1YFnw
    </UnitAvailability_Login>
  </soap:Body>
</soap:Envelope>"

      #options = {}
      options.merge!(headers: {
          'POST'=>post,
          'HOST'=>host,
          'Content-Type'=>'text/xml; charset=utf-8',
          'SOAPAction'=>soap_action
      },
                     body: soap_body )

      response = HTTParty.post( "https://www.yardipca.com/65320maa/webservices/itfilsguestcard.asmx", options)

      return response.body
      # puts response.code


      #############3
      # response = HTTParty.post(
      #   url,
      #   :headers => {'POST'=>post,'HOST'=>host,'Content-Type'=>'text/xml; charset=utf-8','SOAPAction'=>soap_action},
      #   :body => '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><UnitAvailability_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard"><UserName>'+user_name+'</UserName><Password>'+password+'</Password><ServerName>'+server_name+'</ServerName><Database>'+database+'</Database><Platform>'+platform+'</Platform><YardiPropertyId>'+property_id+'</YardiPropertyId><InterfaceEntity>'+interface_entity+'</InterfaceEntity><InterfaceLicense>'+license_key+'</InterfaceLicense></UnitAvailability_Login></soap:Body></soap:Envelope>')
      # return response.body
    rescue 
      false
    end
	end

end