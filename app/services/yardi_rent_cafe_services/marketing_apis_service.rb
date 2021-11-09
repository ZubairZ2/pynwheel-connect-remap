module YardiRentCafeServices
  class MarketingApisService < YardiRentCafeServices::BaseService
    
    def initialize community
      @community = community
      @api_key = @community&.crm_credential&.yardirentcafe_marketing_api_key
      @company_code =@community&.crm_credential&.yardirentcafe_company_code
      @property_code = @community&.crm_credential&.yardirentcafe_property_code
    end

    def available_slots
      yardi_rent_cafe_callback "/AvailableSlots?#{shared_query_params}"
    end

    def schedule_tour schedule_tour, tour_user, desired_move_in_date
      yardi_rent_cafe_callback "/createleadwithappointment?#{shared_query_params}&FirstName=#{tour_user.name.split(" ")[0]}&LastName=#{tour_user.name.split(" ")[1]}&Email=#{tour_user.email}&Phone=#{tour_user.phone_number}&ApptDate=#{schedule_tour.tour_date.strftime("%m/%d/%Y")}&ApptTime=#{schedule_tour.tour_time.strftime("%I:%M%p")}&Source=Website&DesiredMoveinDate=#{desired_move_in_date}&DesiredBedrooms=#{schedule_tour.desired_bedroom}&To u c h Po i n t=Appointment"
    end

    def cancel_tour schedule_tour
      yardi_rent_cafe_callback "/cancelappointment?#{shared_query_params}&VoyProspectId=#{schedule_tour.yardirentcafe_prospect_id}&VoyApptId=#{schedule_tour.yardirentcafe_appointment_id}&ApptDate=#{schedule_tour.tour_date.strftime("%m/%d/%Y")}&ApptTime=#{schedule_tour.tour_time.strftime("%I:%M%p")}"
    end

    def lead_attribution
      yardi_rent_cafe_callback "/AvailableSlots?#{shared_query_params}"
    end

    private

    def https_callback endpoint_url
      response = HTTParty.post((ENV['YARDI_MARKETING_API_BASE_URL'] + url), :body => {}, :headers => { 'Content-Type' => 'application/json' } )
      JSON.parse(response.body)
    end

    def shared_query_params
      "MarketingAPIKey=#{@api_key}&CompanyCode=#{@company_code}&PropertyCode=#{@property_code}"
    end

  end
end