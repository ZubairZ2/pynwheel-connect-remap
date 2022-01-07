module YardiRentCafeServices
  class MarketingApisService < YardiRentCafeServices::BaseService

    def available_slots
      return unless @community.use_yardi_as_lead?
      response = https_callback "/AvailableSlots?#{shared_query_params}"
    end

    def schedule_tour previous_tour = nil
      return unless @community.use_yardi_as_lead?
      cancel_tour previous_tour
      response = https_callback "/createleadwithappointment?#{shared_query_params}&FirstName=#{prospect_first_name}&LastName=#{prospect_last_name}&Email=#{prospect_email}&Phone=#{prospect_phone}&ApptDate=#{get_scheduled_tour_date}&ApptTime=#{get_scheduled_tour_time}&Source=Website&DesiredMoveinDate=#{prospect_move_in_date}&DesiredBedrooms=#{prospect_desired_bedroorms}&To u c h Po i n t=Appointment"
      yardi_scheduled_tour_response response      
    end

    def cancel_tour previous_tour = nil
      return unless @community.use_yardi_as_lead? && @scheduled_tour.yardirentcafe_prospect_id.present? && @scheduled_tour.yardirentcafe_appointment_id.present?
      https_callback "/cancelappointment?#{shared_query_params}&VoyProspectId=#{prospect_id}&VoyApptId=#{appointment_id}&ApptDate=#{get_scheduled_tour_cancel_date(previous_tour)}&ApptTime=#{get_scheduled_tour_cancel_time(previous_tour)}"
      update_yardi_scheduled_tour
    end

    def lead_attribution
      return unless @community.use_yardi_as_lead?
      https_callback "/AvailableSlots?#{shared_query_params}"
    end

    private

    def https_callback endpoint_url
      response = HTTParty.post((ENV['YARDI_MARKETING_API_BASE_URL'] + endpoint_url), :body => {}, :headers => { 'Content-Type' => 'application/json' } )
      JSON.parse(response.body)
    end

    def shared_query_params
      "MarketingAPIKey=#{@api_key}&CompanyCode=#{@company_code}&PropertyCode=#{@property_code}"
    end

    def yardi_scheduled_tour_response yardi_scheduled_tour
      yardirentcafe_prospect_id = yardi_scheduled_tour["Response"][0]["VoyProspectId"] rescue nil
      yardirentcafe_appointment_id = yardi_scheduled_tour["Response"][0]["VoyProspectApptId"] rescue nil
      update_yardi_scheduled_tour(yardirentcafe_prospect_id, yardirentcafe_appointment_id)
    end

    def update_yardi_scheduled_tour yardirentcafe_prospect_id = nil, yardirentcafe_appointment_id = nil
      @scheduled_tour.update(yardirentcafe_prospect_id: yardirentcafe_prospect_id, yardirentcafe_appointment_id: yardirentcafe_appointment_id)
    end

    def prospect_first_name
      @tour_user&.name&.split(" ")[0]
    end

    def prospect_last_name
      @tour_user&.name&.split(" ")[1]
    end

    def prospect_email
      @tour_user&.email
    end

    def prospect_phone
      @tour_user&.phone_number
    end

    def prospect_move_in_date
      @scheduled_tour&.desired_move_in_date
    end

    def prospect_desired_bedroorms
      @scheduled_tour&.desired_bedroom
    end

    def prospect_id
      @scheduled_tour.yardirentcafe_prospect_id
    end

    def appointment_id
      @scheduled_tour.yardirentcafe_appointment_id
    end

    def get_scheduled_tour_date
      @scheduled_tour&.tour_date&.strftime("%m/%d/%Y")
    end

    def get_scheduled_tour_time
      @scheduled_tour&.tour_time&.strftime("%I:%M%p")
    end

    def get_scheduled_tour_cancel_date previous_tour
      if previous_tour.present? && previous_tour[:tour_date].present?
        previous_tour[:tour_date]&.strftime("%m/%d/%Y")
      else
        @scheduled_tour&.tour_date&.strftime("%m/%d/%Y")
      end
    end

    def get_scheduled_tour_cancel_time previous_tour
      if previous_tour.present? && previous_tour[:tour_time].present?
        previous_tour[:tour_time]&.strftime("%I:%M%p")
      else
        @scheduled_tour&.tour_time&.strftime("%I:%M%p")
      end
    end

  end
end