class Api::V2::OpeningHoursController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community, only: %i[index create_opening_hours delete_opening_hours check_visiting_hour]

  def index
    if check_visiting_hour
      visiting_hours = get_all_hours
      if visiting_hours.any?
        render json: { success: true, data: visiting_hours.as_json }
      else
        render json: { success: false, message: "Visiting hours are not decided yet!" }
      end
    else
      render json: { success: false, message: "Pynwheel Tour product is not enabled yet!" }
    end
  end

  def create_opening_hours
    begin
      if check_visiting_hour
        values = params["data"]
        @status = params["status"]
        tour_params = JSON.parse(values)
        if tour_params.present?
          tour_params.values.each_with_index do |tour, index|
            self_tour_method(tour) if tour_params.keys[index].eql?(SELF_TOUR)
            guided_tour_method(tour) if tour_params.keys[index].eql?(GUIDED_TOUR)
          end
        end
      end
      visiting_hours = get_all_hours
      @community.submit_launch_form(VISITING_HOURS, current_pynwheel_user, @status)
      if visiting_hours.any?
        render json: { success: true, data: visiting_hours.as_json }
      end
    rescue => exception
      render json: { success: false, message: exception.message }
    end
  end

  def delete_opening_hours
    begin
      if check_visiting_hour
        tour_params = params["tours"]
        if tour_params.present?
          delete_self_visiting_hours(tour_params["hours_id"]) if tour_params["type"].eql?(SELF_TOUR)
          delete_guided_visiting_hours(tour_params["hours_id"]) if tour_params["type"].eql?(GUIDED_TOUR)
        end
      end
      @community.set_visiting_hours_status(current_pynwheel_user, "")
      render json: { success: true, message: "Visiting hour deleted successfully!" }
    rescue => exception
      render json: { success: false, message: exception.message }
    end
  end

  private

  def check_visiting_hour
    self_tour = false
    if @community.product_options.nil?
      self_tour = @community.self_tour
    else
      product_options = JSON.parse(@community.product_options)
      self_tour = product_options["product_options"]["self_tour"]["is_enabled"]
    end
    self_tour
  end

  def delete_self_visiting_hours(tour)
    delete_hour = OpeningHour.find_by(id: tour)
    delete_hour.destroy
  end

  def delete_guided_visiting_hours(tour)
    delete_hour = GuidedOpeningHour.find_by(id: tour)
    delete_hour.destroy
  end

  def get_all_hours
    visiting_hours = {}
    self_visit = @community.opening_hours
    guided_visit = @community.guided_opening_hours
    visiting_hours.merge!({ SELF_TOUR: self_visit }) if self_visit.present?
    visiting_hours.merge!({ GUIDED_TOUR: guided_visit }) if guided_visit.present?
    visiting_hours
  end

  def guided_tour_method(tour_hours)
    tour_hours.values.each_with_index do |tour_hour, index|
      tour_hour_id = tour_hour["id"]
      if tour_hour_id.present?
        update_hour = @community.guided_opening_hours.find_by(id: tour_hour_id)
        if tour_hour["opening_time"].eql?("Invalid Date")
          delete_guided_visiting_hours(tour_hour_id)
        else
          if update_hour.present?
            update_hour.update(day: tour_hours.keys[index], opening_time: time_24_hours(tour_hour["opening_time"]), closing_time: time_24_hours(tour_hour["closing_time"]))
          end
        end
      else
        if !tour_hour["opening_time"].eql?("Invalid Date")
          @community.guided_opening_hours.create(day: tour_hours.keys[index], opening_time: time_24_hours(tour_hour["opening_time"]), closing_time: time_24_hours(tour_hour["closing_time"]))
        end
      end
    end
  end

  def self_tour_method(tour_hours)
    tour_hours.values.each_with_index do |tour_hour, index|
      tour_hour_id = tour_hour["id"]
      if tour_hour_id.present?
        update_hour = @community.opening_hours.find_by(id: tour_hour_id)
        if tour_hour["opening_time"].eql?("Invalid Date")
          delete_self_visiting_hours(tour_hour_id)
        else
          if update_hour.present?
            update_hour.update(day: tour_hours.keys[index], opening_time: time_24_hours(tour_hour["opening_time"]), closing_time: time_24_hours(tour_hour["closing_time"]))
          end
        end
      else
        if !tour_hour["opening_time"].eql?("Invalid Date")
          @community.opening_hours.create(day: tour_hours.keys[index], opening_time: time_24_hours(tour_hour["opening_time"]), closing_time: time_24_hours(tour_hour["closing_time"]))
        end
      end
    end
  end

  def time_24_hours(time)
    Time.strptime(time, "%I:%M %p").strftime("%H:%M")
  end

  def load_community
    @community = Community.find params[:community_id]
  rescue ActiveRecord::RecordNotFound
    render json: { success: false, error_code: 400, message: 'Community not found', data: nil },
        status: :not_found
  end
end
