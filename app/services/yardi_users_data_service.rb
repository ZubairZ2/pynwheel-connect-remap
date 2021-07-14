class YardiUsersDataService < BaseService
  def perform
    property_ids = credentials.property_id.split(',') rescue []
    property_ids.each do |property_id|
      begin
        url = credentials.url
        arr = url.split('/')
        url = "#{arr[0]}/#{arr[1]}/#{arr[2]}/#{arr[3]}/#{arr[4]}/ItfResidentData.asmx"

        post = "#{arr[3]}/Webservices/itfResidentData.asmx HTTP/1.1"
        host = arr[2]
        soap_action = 'http://tempuri.org/YSI.Interfaces.WebServices/ItfResidentData/GetResidents'
        user_name = credentials.username
        password = credentials.password
        server_name = credentials.server_name
        database = credentials.database
        platform = credentials.platform
        property_id = property_id
        interface_entity = credentials.interface_entity
        license_key = YARDI_LICENSE_KEY
        response = HTTParty.post(
            url,
            :headers => {'POST'=>post,'HOST'=>host,'Content-Type'=>'text/xml; charset=utf-8','SOAPAction'=>soap_action},
            :body => '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
                        <soap:Body>
                          <GetResidents xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfResidentData">
                            <UserName>'+user_name+'</UserName>
                            <Password>'+password+'</Password>
                            <ServerName>'+server_name+'</ServerName>
                            <Database>'+database+'</Database>
                            <Platform>'+platform+'</Platform>
                            <YardiPropertyId>'+property_id+'</YardiPropertyId>
                            <InterfaceEntity>'+interface_entity+'</InterfaceEntity>
                            <InterfaceLicense>'+license_key+'</InterfaceLicense>
                          </GetResidents>
                        </soap:Body>
                      </soap:Envelope>')

        result = Ox.load(response.body, mode: :hash)
        resident_data = result[:"soap:Envelope"][1][:"soap:Body"][:GetResidentsResponse][1][:GetResidentsResult][:"MITS-ResidentData"][1][:PropertyResidents][1][:Residents][:Resident]
        if resident_data.present?
          import_resident_data(resident_data)
        end
      
      rescue => e
        e.message
      end
    end
  end

  def import_resident_data residents
    residents.each do |res|
      first_name = get_first_name(res)
      last_name = get_last_name(res)
      email = get_email(res)
      phone_number = "+1#{get_personal_phone_number(res) || get_other_phone_number(res)}"
      user_type = get_status(res)
      move_in_date = get_move_in_date(res)
      move_out_date = get_move_out_date(res)
      lease_in_date = get_lease_in_date(res)
      lease_out_date = get_lease_out_date(res)

      if email.present? && phone_number.present?
        pynwheel_access_user = PynwheelAccessUser.where(email: email, phone_number: phone_number)

        unless pynwheel_access_user.present?
          if first_name.present? && last_name.present? && email.present? && user_type.present? && (move_in_date.present? || lease_in_date.present?) && (move_out_date.present? || lease_out_date.present?)
            PynwheelAccessUser.create(
              name: "#{first_name} #{last_name}",
              community_id: credentials.community_id,
              first_name: first_name,
              last_name: last_name,
              email: email,
              phone_number: phone_number,
              user_type: user_type,
              move_in_date: date_formate(move_in_date),
              move_out_date: date_formate(move_out_date),
              lease_in_date: date_formate(lease_in_date),
              lease_out_date: date_formate(lease_out_date)  
            )
          end
        end
        
      end

    end
  end

  def date_formate date
    if date.present?
      date = date.split('/')
      "#{date[2]}-#{date[0]}-#{date[1]}"
    else
      nil
    end
  end

  def get_first_name res
    res[2][:FirstName] rescue nil
  end

  def get_last_name res
    res[3][:LastName] rescue nil
  end

  def get_email res
    res[4][:Email] rescue nil
  end

  def get_personal_phone_number res
    res[5][:Phone][2][:PhoneNumber] rescue nil
  end

  def get_other_phone_number res
    res[6][:Phone][2][:PhoneNumber] rescue nil
  end

  def get_lease_in_date res
    res[16][:LeaseFromDate] rescue nil
  end

  def get_lease_out_date res
    res[17][:LeaseToDate] rescue nil
  end

  def get_move_in_date res
    res[18][:MoveInDate] rescue nil
  end

  def get_move_out_date res
    res[19][:MoveOutDate] rescue nil
  end

  def get_status res
    "resident"
  end
end