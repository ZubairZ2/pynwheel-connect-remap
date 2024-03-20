module YardiRentCafeServices
  class LeadsApiService < YardiRentCafeServices::BaseService

    def upload_leads_data visited_stops, tour_history, is_tour_abandoned
      return unless check_credentials
      message = get_message(visited_stops, tour_history, is_tour_abandoned)
      HTTParty.get( url(message) )
    end

    private

    def check_credentials
      (@community.present? && @tour_user.present? && @crm_credential.present? && (@crm_credential&.yardirentcafe_property_id.present? || @crm_credential&.yardirentcafe_property_code.present?) && @crm_credential&.yardirentcafe_marketing_api_key.present?)
    end

    def url message
      "#{@community.credential.yardi_rent_cafe_api_url}/rentcafeapi.aspx?requestType=#{request_type}&firstName=#{first_name}&lastName=#{last_name}&phone=#{phone}&message=#{message}&email=#{email}&source=#{source}&secondarySource=#{secondary_source}&addr1=#{address_1}&addr2=#{address_2}&city=#{city}&state=#{state}&ZIPCode=#{zip_code}&#{get_credentials_query_params}"
    end

    def request_type
      "lead"
    end

    def first_name
      @tour_user&.first_name
    end

    def last_name
      @tour_user&.last_name
    end

    def phone
      @tour_user&.phone_number
    end

    def get_message visited_stops, tour_history, is_tour_abandoned
      "Type of Tour: #{ @scheduled_tour.tour_type } \n 
       Arrival Time: #{ arrival_time(tour_history) } \n 
       Departure Time: #{ departure_time(tour_history) } \n 
       Length of Tour: #{ length_of_tour( arrival_time(tour_history), departure_time(tour_history) ) } mins \n 
       Abandoned Tour at: #{ abandoned_tour_at(tour_history, is_tour_abandoned) } \n 
       Stops Visited: #{visited_stops.count}"
    end

    def abandoned_tour_at tour_history, is_tour_abandoned
      return "" unless is_tour_abandoned

      tour_stop = TourStop.find_by_id tour_history.abandoned_tour_at_stop
      tour_stop.present? ?  (tour_stop.stop_type.classify.constantize.find_by_id tour_stop.stop_id)&.name : ""  rescue ""
    end

    def arrival_time tour_history
      tour_history&.arrived&.in_time_zone(@c_time_zone)
    end

    def departure_time tour_history
      if tour_history.left.present? and !tour_history.is_left
        tour_history&.left&.in_time_zone(@c_time_zone)
      else
        Time.now.in_time_zone(@c_time_zone)
      end
    end

    def get_credentials_query_params
      if api_token.present?
        if property_id.present?
          "propertyId=#{property_id}&apiToken=#{api_token}"
        elsif property_code.present?
          "propertyCode=#{property_code}&apiToken=#{api_token}"
        end
      end
    end

    def length_of_tour start_time, end_time
      ( (end_time - start_time)/60.0 ).round
    end

    def email
      @tour_user&.email
    end

    def property_id
      @crm_credential&.yardirentcafe_property_id
    end

    def property_code
      @crm_credential&.yardirentcafe_property_code
    end

    def api_token
      @crm_credential&.yardirentcafe_marketing_api_key
    end

    def zip_code
      @community&.zip
    end

    def city
      @community&.city
    end

    def state
      @community&.state
    end

    def address_1
      @community&.address
    end

    def address_2
      ""
    end

    def source
      "Pynwheel"
    end

    def secondary_source
      "Pynwheel"
    end

  end
end