class IgloohomeIglooworksService < BaseService
  include AllowedTourStopsHelper

  def initialize(community_id, current_time = Time.now, tour_user_id = nil)
    @community = Community.find_by_id community_id
    @igloohome_account = find_or_create_igloohome_account(community_id) if @community.present?
    @current_time = current_time
    @tour_user = TourUser.find_by_id tour_user_id

    return unless @igloohome_account.present?
  end

  def get_locks
    HTTParty.get(
      "#{api_base_url}/locks?page=#{page}&perPage=#{per_page}", 
      :headers => api_request_header
    ) 
  end

  def generate_hourly_pin(lock_id, access_name, start_time, end_time)
    HTTParty.post(
      "#{api_base_url}/departments/#{department_id}/locks/#{lock_id}/pin/hourly",
      headers: api_request_header,
      body: hourly_pin_params(access_name, start_time, end_time).to_json
    )
  end

  def generate_accesses
    return unless @tour_user.present?
    allowed_stops = igloohome_allowed_stops(@community, @tour_user)
    igloohome_locks = IgloohomeLock.where(igloohome_id: @igloohome_account.id, stop_id: allowed_stops)
    assign_pin_codes(igloohome_locks) if igloohome_locks.present?
  end

  private
  
    def assign_pin_codes igloohome_locks
      IgloohomeGuest.where(community_id: @community.id, tour_user_id: @tour_user.id).delete_all

      igloohome_locks.each do |lock|
        if lock.device_id.present?
          pin_code = get_device_pin_code(lock)
          update_igloohome_guest_pin(pin_code, lock)
        end
      end
    end

    def get_device_pin_code lock
      access = lock.stop_type.classify.constantize.find_by_id lock.stop_id
      access_name = access&.name&.gsub(/[^a-zA-Z0-9 ]/, '')
      device_id = lock.device_id
      start_time = @current_time.strftime("%Y-%m-%dT%H:00:00%:z")
      end_time = (@current_time + 3.hours).strftime("%Y-%m-%dT%H:00:00%:z")
      response = generate_hourly_pin(device_id, access_name, start_time, end_time)
      response["pin"]
    end

    def update_igloohome_guest_pin guest_pin, lock
      IgloohomeGuest.create!(guest_pin: guest_pin, tour_user_id: @tour_user.id, community_id: @community.id, stop_id: lock.stop_id, stop_type: lock.stop_type)
    end

    def find_or_create_igloohome_account community_id
      Igloohome.find_or_create_by(community_id: community_id) do |igloohome|
        igloohome.username = "Username"
        igloohome.password = "Password"
      end
    rescue StandardError => e
      Rails.logger.error("Error finding or creating Igloohome account: #{e.message}")
      nil
    end

    def hourly_pin_params access_name, start_time, end_time
      {
        'variance' => 1,
        'startDate' => start_time,
        'endDate' => end_time,
        'accessName' => access_name
      }
    end

    def api_request_header
      { 
        'X-IGLOOWORKS-APIKEY' => iglooworks_api_key,
        'Content-Type' => 'application/json' 
      }
    end

    def iglooworks_api_key
      @igloohome_account.iglooworks_api_key
    end

    def department_id
      @igloohome_account.iglooworks_department_id
    end

    def api_base_url
      ENV["IGLOOHOME_IGLOOWORKS_API_BASE_URL"]
    end

    def page
      1
    end

    def per_page
      1000
    end
  end