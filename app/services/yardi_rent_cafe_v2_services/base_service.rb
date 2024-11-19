module YardiRentCafeV2Services
  class BaseService
    def initialize scheduled_tour
      @scheduled_tour = scheduled_tour
      @tour_user = @scheduled_tour.tour_user
      @community = @scheduled_tour.community
      @credential = @community.credential
      @c_time_zone = @community.get_time_zone()
      return unless is_user_authorized?
    end

    protected

      def is_user_authorized?
        if (@community.use_yardi_as_lead? && DataProviders::RentCafe::V2ApisService.new(@community.id).is_user_authorized?)
          @credential = Credential.where(community_id: @community.id).last
          true
        else
          false
        end
      end

      def api_token
        @credential&.api_token&.strip
      end

      def company_code
        @credential&.c_code&.strip
      end

      def property_code
        property_code = @credential&.p_code&.split(',')[0] rescue nil
        property_code&.strip
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

      def get_scheduled_tour_type
        (@scheduled_tour.tour_type == 'self_tour') ? "1" : "0"
      end

      def zip_code
       @community&.zip
      end

      def city
       @community&.city
      end

      def state
       @community&.state.length > 4 ?  @community&.state.slice(0, 4) :  @community&.state
      end

      def address_1
       @community&.address
      end

      def address_2
       ""
      end

      def secondary_source
        @schedule_tour&.rentcafe_discover_source || "Pynwheel"
      end

      def source
        @schedule_tour&.rentcafe_discover_source || "Pynwheel"
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

      def update_yardi_scheduled_tour yardirentcafe_prospect_id = nil, yardirentcafe_appointment_id = nil
        @scheduled_tour.update(yardirentcafe_prospect_id: yardirentcafe_prospect_id, yardirentcafe_appointment_id: yardirentcafe_appointment_id)
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

      def length_of_tour start_time, end_time
        ((end_time - start_time)/60.0 ).round
      end

      def create_access_log(payload, response)
        AccessLogsService.new.create_crm_logs(
          @tour_user&.id, @community&.id, payload, response
        )
      end
  end
end