class WebpagesController < ActionController::Base  
  include CommunitiesHelper

  before_action :set_community, except: [:update_session]
  before_action :set_webpages_session_id_cookies, only: [:index]

  after_action :maintain_session, except: [:update_session]
  before_action :set_timezone, except: [:update_session]
  protect_from_forgery :except => [:update_session]

  def index
    @floorplans = []

    units_ids_not_present = (cookies[:favorite_unit_ids] == nil || cookies[:favorite_unit_ids] == "[]")
    set_favorites_unit_ids_cookies(JSON.generate([]))  if units_ids_not_present

    Favorite.create(session_id: cookies[:webpages_session_id],unit_ids: []) if cookies[:webpages_session_id].nil?
    @scheduler_widget_link = get_scheduler_link
    @units_with_floorplan_info = []
    @community_info = Community.includes(:credential,:floorplans,{sitemap: [:amenities]},{floorplates: [:amenities]},{units: [:floorplate]}).find(params[:community_id])
    svg_enabled = @community_info.enable_svg_mode?
    svg_points_query = "pointer_data->>'tag' IS NOT NULL AND pointer_data->>'tag' <> ''"
    community_units = @community_info.units
    @amenities = @community_info.amenities

    unless @community_info.locked
      if @community_info.has_floorplates?
        @floorplates = @community_info.floorplates
        @floors = @floorplates.map{|f| f.floors}.flatten.sort_by { |f| -f }
        floorplates_units = []
        floorplates_amenities = []

        @community_info.floorplates.find_each do |fp|
          this_floorplate_units = community_units.where(floorplate_id: fp.id)
          this_floorplate_amenities = fp.amenities

          if svg_enabled && fp.svg_image_url.present?
            this_floorplate_units = this_floorplate_units.where(svg_points_query)
            this_floorplate_amenities = this_floorplate_amenities.where(svg_points_query)
          end

          floorplates_units << this_floorplate_units
          floorplates_amenities << this_floorplate_amenities
        end
        community_units = floorplates_units.flatten
        @amenities = floorplates_amenities.flatten
      elsif @community.sitemap.present?
        if svg_enabled && @community.sitemap.svg_image_url.present?
          community_units = community_units.where(svg_points_query)
          @amenities = @amenities.where(svg_points_query)
        end
      end

      community_units = Unit.where(id: community_units.map(&:id))
      @available_units_and_sold_units = community_units.available_units(@community.units_availability_over_120_days) #+ @community_info.units.are_sold
      if @available_units_and_sold_units.size > 0
        normalize_units
        if @units_with_floorplan_info.present?
          build_square_feet_range
          build_market_rent_range
          unit_bedrooms_for_webpages
          unit_availability_for_webpages
          @units_with_floorplan_info = @units_with_floorplan_info.to_json
        end
      end
      @amenities_data = []
      normalize_amenities
      @amenities_data = @amenities_data.to_json
    end

    response.headers.delete "X-Frame-Options"  
  end
  def get_scheduler_link
    community_code = get_community_code @community
    # base_url =  Rails.env.development? ? "http://localhost:3000/" : (ENV["RAILS_ENV"] == "staging" ? "https://pynwheel-staging.herokuapp.com/" : "https://pynwheelapp.com/")
    return "#{root_url}scheduler_widget/test_widget?community_id=#{@community.id}&community_code=#{community_code}&direct=true"
  end

  def normalize_amenities
    @amenities&.each do |amenity|
      struct = {
        id: amenity.id,
        name: amenity.name,
        image_url: amenity.standard_image_url,
        floor: amenity.floor,
        floorplate_id: amenity.amenityable_id,
        x_plot: amenity.x_plot,
        y_plot: amenity.y_plot,
        pointer_data: amenity.pointer_data,
        galleries: amenity.amenity_galleries,
        show_name: @community.show_amenity_name
      }

      @amenities_data << struct
    end
  end

  def normalize_units
    @floorplans = @community_info.floorplans
    @available_units_and_sold_units.each do |unit|
      if unit.effective_rent.present? && unit.effective_rent >= 1  && @floorplans.any? { |f| f.provider_floorplan_id == unit.floorplan_id }
        @units_with_floorplan_info << fetch_unit_info_struct_for_webpage(unit)
      end
    end
  end

  def unit_bedrooms_for_webpages
    units = @units_with_floorplan_info.pluck(:bedrooms).sort_by(&:to_i) rescue ""
    @unit_bedrooms = []
    units.present? && units.each do |unit|
      bedroom_number = unit.to_i
      if bedroom_number == 0 
        @unit_bedrooms << ["Studio", "0_bedrooms"] 
      elsif bedroom_number == 1 
        @unit_bedrooms << ["#{bedroom_number} Bedroom", "1_bedroom"] 
      else
        @unit_bedrooms << ["#{bedroom_number} Bedrooms", "#{bedroom_number}_bedrooms"]
      end
    end
    @unit_bedrooms = @unit_bedrooms.uniq
    @unit_bedrooms
  end

  def unit_availability_for_webpages
    @available_units = []
    today = DateTime.now.to_date
    thirty_days = today + 30.days;
    sixty_days = today + 60.days;
    ninty_days = today + 90.days;
    one_twenty_days = today + 120.days;

    @units_with_floorplan_info.each do |available_unit|
      available_date = available_unit[:available_date]
      if (available_date <= today)
        @available_units << ["Now", "now"]
      end
      if (available_date > today && available_date <= thirty_days) 
        @available_units << ["In the next 30 days","0-30"]
      end
      if (available_date >= thirty_days && available_date <= sixty_days)
        @available_units << ["In 31-60 days","31-60"]
      end
      if (available_date >= sixty_days && available_date <= ninty_days)
        @available_units << ["In 61-90 days","61-90"]
      end
      if (available_date >= ninty_days && available_date <= one_twenty_days)
        @available_units << ["In 91-120 days","91-120"]
      end
      if (available_date > one_twenty_days) && @community.units_availability_over_120_days
        @available_units << ["In 121+ days","121-"]
      end
    end

    @available_units = @available_units.uniq
  end

  def build_square_feet_range
    square_feet_list = @units_with_floorplan_info.map{|obj| obj[:square_feet].to_i}.uniq.sort()
    @square_feet =  square_feet_list.map{|sqft| [sqft, sqft]}
  end

  def build_market_rent_range
    rent_list = @units_with_floorplan_info.map{|obj| obj[:market_rent].to_i}.uniq.sort().reverse!
    @market_rent =  rent_list.map{|price| [price, price]}
  end

  def apply_now
    
  end

  def activity_tracking
  end

  def save_favorite
    array = cookies[:favorite_unit_ids].present? ? JSON.parse(cookies[:favorite_unit_ids]) : []

    @unit = Unit.find params[:unit_id]
    array << params[:unit_id] if params[:unit_id].present?

    set_favorites_unit_ids_cookies(JSON.generate(array))

    favorite = Favorite.find_or_create_by(session_id: cookies[:webpages_session_id]) 

    favorite.unit_ids.present? ? (favorite.unit_ids << params[:unit_id]) :  (favorite.unit_ids = [params[:unit_id]])
    fs = @community.favorite_stop.present? ? @community.favorite_stop : FavoriteStop.create(community_id: @community.id) 
    fs.favorite_unit << params[:unit_id] unless fs.favorite_unit.include?(params[:unit_id])
    fs.save
    favorite.save!
  end

  def delete_favorite
    array = cookies[:favorite_unit_ids].present? ? JSON.parse(cookies[:favorite_unit_ids]) : []
    @unit = Unit.find params[:unit_id]
    
    set_favorites_unit_ids_cookies(JSON.generate(array))

    favorite = Favorite.find_by_session_id(cookies[:webpages_session_id]) 
    fs = @community.favorite_stop if @community.favorite_stop.present?

    if fs.present?
      fs.favorite_unit = fs.favorite_unit - [params[:unit_id]] if fs.favorite_unit.include?(params[:unit_id])
      fs.save
    end

    favorite.unit_ids.delete params[:unit_id]
    favorite.save
    updated_unit_ids = []
    updated_unit_ids << favorite.unit_ids

    set_favorites_unit_ids_cookies(updated_unit_ids)
  end

  def favorites
    begin
      @scheduler_widget_link = get_scheduler_link
      @favorite = Favorite.find_by_session_id(cookies[:webpages_session_id])
      @units = Unit.where(id: JSON.parse(cookies[:favorite_unit_ids]),community_id: params[:community_id]).where.not(available_date: nil)
      @fav_units_info = @units.to_json 
      @floorplans = Floorplan.where(provider_floorplan_id: @units.map(&:floorplan_id),community_id: params[:community_id])
    rescue => ex
    end
  end

  def favorites_share_link
    @favorite = Favorite.find_by_session_id(params[:session_id])
    @units = Unit.where(id: @favorite&.unit_ids,community_id: params[:community_id]).where.not(available_date: nil)
    @fav_units_info = @units.to_json
    @floorplans = Floorplan.where(provider_floorplan_id: @units && @units.map(&:floorplan_id),community_id: params[:community_id])
  end

  def clear_favorites
    set_favorites_unit_ids_cookies(JSON.generate([]))

    favorite = Favorite.find_by_session_id(cookies[:webpages_session_id]) 
    if favorite.present?
      favorite.unit_ids = []
      favorite.save
      flash[:notice] = "Cleared successfully."
    else
      flash[:error] = "Nothing to remove."
    end
    redirect_back(fallback_location:"/")
  end

  def update_session
    begin
      track_session = TrackSession.where(session_id: cookies[:webpages_session_id]).last
      track_session.update_column(:end_datetime, return_community_datetime(session[:last_active_datetime])) if track_session.present?
      session[:last_active_datetime] = nil        
    rescue StandardError => e
      puts "\n----------------- #{e.message} --------------- \n"
    end
  end

  private

    def set_webpages_session_id_cookies
      if cookies[:webpages_session_id].blank?
        cookies[:webpages_session_id] = { 
          value: SecureRandom.hex(8), 
          expiry: 5.years.from_now, 
          same_site: :none,
          secure: true
        } 
      end
    end

    def set_favorites_unit_ids_cookies unit_ids = []
      cookies[:favorite_unit_ids] = {
        value: unit_ids, 
        expiry: 5.years.from_now, 
        same_site: :none,
        secure: true
      }
    end
  
    def get_community_code community
      (JWT.encode ({"community_id" => community.id}), ENV['SECRET_KEY_BASE_v2'], 'HS256')
    end

    def set_community
      @community = Community.find(params[:community_id])
    end

    def maintain_session
      begin
        Analytics::MapsAnalyticsService.new(@community, @timezone, session, cookies, params, (request.referer || request.url)).maintain_maps_session()
      rescue StandardError => e
        puts "\n----------------- #{e.message} --------------- \n"
      end
    end

    def set_timezone
      @timezone = @community.get_time_zone()
    end

    def return_community_datetime(datetime)
      datetime.in_time_zone(@timezone).to_datetime if datetime.present? && @timezone.present?
    end
end