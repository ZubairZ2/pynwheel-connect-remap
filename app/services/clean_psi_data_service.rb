class CleanPsiDataService < BaseService
  def perform
    property_ids = credentials.property_id.split(',') rescue []
    property_ids.each do |property_id|
      begin

        if credentials.entrata_url.include?('https://') || credentials.entrata_url.include?('http://')
          url = credentials.entrata_url
        else
          url = "https://"+credentials.entrata_url+".entrata.com/api/v1/propertyunits"
        end

        password = credentials.password
        username = credentials.username

        response = HTTParty.post(url,
                                 :body => {
                                     "auth": {
                                         "type": "basic",
                                         "password": password,
                                         "username": username
                                     },
                                     "method": {
                                         "name": "getMitsPropertyUnits",
                                         "params": {
                                             "propertyIds": property_id,
                                             "availableUnitsOnly": "0",
                                             "showUnitSpaces": "1"
                                         }
                                     }
                                 }.to_json,
                                 :headers => { 'Content-Type' => 'application/json' } )
        response =  JSON.parse(response.body)
        if response["response"]["code"] == 200
          units = []
          response['response']['result']["PhysicalProperty"]["Property"].each do |pro|
            pro["ILS_Unit"].each do |ils|
              units << ils
            end
          end
          clean_psi_data(units,property_id)
        end
      rescue => e
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
  end

  def clean_psi_data(units,property_id)
    units.each do |u|

            
      puts "----------------------------"*20
      puts "******************psi clean data*******************"
      
      new_units = Unit.where("community_id = ? AND provider_unit_id LIKE ? ", credentials.community_id, "#{u["Units"]["Unit"]["Identification"]["IDValue"].to_s}%")
      f_units = units.map{|x| x["Units"]["Unit"]["Identification"]["IDValue"].to_s == "#{u["Units"]["Unit"]["Identification"]["IDValue"].to_s}"  ? x : nil}.compact
      m_units = []
      u_ids = []

      # binding.pry
      if new_units.count > f_units.count
        m_units = new_units.limit(f_units.count)
        temp_units = new_units.where.not(id: m_units.pluck(:id))
        temp_units.delete_all if temp_units.present?
      else
        m_units = new_units
      end

      # binding.pry
      if f_units.present? && f_units.count > 0 
        if f_units.count == 1
          if new_units.present? && new_units.count > 0
            unit = new_units.where.not(x_plot: [0, '0', nil], y_plot: [0, '0', nil]).first || new_units.first
            temp_units = new_units.where.not(id: unit.id)
            temp_units.dele te_all if temp_units.present?
            puts "----------------------------"*20
            puts "****************** Single units clean data*******************"
            unit.marketing_name = u["Units"]["Unit"]["MarketingName"]
            unit.provider_unit_id = u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Identification"]["IDValue"].to_s
            unit.save(validate: false)
          else
            # unit = Unit.new
          end
        else
          f_units.each_with_index do |new_u, s|
            # p_id = ["#{new_u["Units"]["Unit"]["Identification"]["IDValue"].to_s}", "#{new_u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ new_u["Units"]["Unit"]["MarketingName"]}","#{new_u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ new_u["Identification"]["IDValue"].to_s}"]
            m_units = m_units.where.not(id: u_ids)

            if m_units.present? && m_units.count > 0 
              puts "----------------------------"*20
              puts "****************** Multiple units clean data*******************"
              # binding.pry
              unit = m_units.first
              u_ids << unit.id
              if unit.present?
                unit.marketing_name = new_u["Units"]["Unit"]["MarketingName"]
                unit.provider_unit_id = new_u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ new_u["Identification"]["IDValue"].to_s
                unit.save(validate: false)
              end
            end
          end
      end
      end
    end
  end
end