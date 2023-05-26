class WebpagesController < ActionController::Base
  before_action :set_community, except: [:update_session]
  #after_action :maintain_session, except: [:update_session]
  before_action :set_timezone, except: [:update_session]
  protect_from_forgery :except => [:update_session]
  def index
    @floorplans = []
    units_ids_not_present = (cookies[:favorite_unit_ids] == nil || cookies[:favorite_unit_ids] == "[]")
    is_cookies_session_nil = cookies[:webpages_session_id].nil?
    cookies.permanent[:favorite_unit_ids] = JSON.generate([]) if units_ids_not_present
    cookies.permanent[:webpages_session_id] = SecureRandom.hex(8) if is_cookies_session_nil
    Favorite.create(session_id: cookies[:webpages_session_id],unit_ids: []) if is_cookies_session_nil
    @scheduler_widget_link = get_scheduler_link
    @units_with_floorplan_info = []
    @community_info = Community.includes(:credential,:floorplans,{sitemap: [:amenities]},{floorplates: [:amenities]},{units: [:floorplate]}).find(params[:community_id])
    unless @community_info.locked
      if @community_info.has_floorplates?
        @floorplates = @community_info.floorplates
        @floors = @floorplates.map{|f| f.floors}.flatten.sort_by { |f| -f }
        @amenities =  @community_info.floorplates.collect{|c| c.amenities}
        @amenities = @amenities.flatten
      else
        @amenities = @community_info.sitemap.amenities if @community.sitemap.present?
      end
      @available_units_and_sold_units = @community_info.units.available_units #+ @community_info.units.are_sold
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
    @amenities.each do |amenity|
      struct = {
        id: amenity.id,
        floor: amenity.floor,
        floorplate_id: amenity.amenityable_id
      }
      @amenities_data << struct
    end
  end

  def normalize_units
    @floorplans = @community_info.floorplans
    @available_units_and_sold_units.each do |unit|
      if unit.effective_rent.present? && unit.effective_rent >= 1  && @floorplans.any?{|f| f.provider_floorplan_id == unit.floorplan_id}
        floorplan = @floorplans.select{|f| f.provider_floorplan_id == unit.floorplan_id}.first
        
        struct = {
          id: unit.id,
          marketing_name: unit.marketing_name,
          market_rent: unit.effective_rent,
          building: unit.building,
          bedrooms: floorplan.bedrooms,
          bathrooms: floorplan.bathrooms,
          square_feet: (unit.square_feet.present? && unit.square_feet != 0) ? unit.square_feet : (floorplan.present? ? floorplan.square_feet : 0),
          availability: unit.availability,
          available_date: unit.available_date,
          x_plot: unit.x_plot,
          y_plot: unit.y_plot,
          floor: unit.floor,
          sold: unit.sold,
          available: unit.available,
          provider_floorplan_id: unit&.floorplan&.provider_floorplan_id,
          community_property_id: unit&.community&.credential&.property_id,
          lease_term: unit.lease_term,
          availability_url: unit&.availability_url || unit&.floorplan&.availability_url,
          floorplan_image: unit.standard_image_url || unit&.floorplan&.standard_image_url || '/assets/default.jpeg',
          is_fav: unit&.community&.favorite_stop&.favorite_unit&.include?(unit.id.to_s),
          floorplan_name: unit&.floorplan.name,
          lease_pricing: (unit.lease_pricing.present? && unit.community.display_pricing_options) ? unit.lease_pricing : "",
          description: unit.description || unit&.floorplan&.description
        }
        @units_with_floorplan_info << struct
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
      if (available_date > one_twenty_days)
        @available_units << ["In 121+ days","121-"]
      end
    end
    @available_units = @available_units.uniq
  end

  def build_square_feet_range
    maximum_square_feet = @units_with_floorplan_info.max_by{|k| k[:square_feet] }[:square_feet]
    minimum_square_feet = @units_with_floorplan_info.min_by{|k| k[:square_feet] }[:square_feet]
    @square_feet = []
    square_feet_range = minimum_square_feet.to_i..maximum_square_feet.to_i
    square_feet_range_hash = {}
    slice = 100 #square_feet_range.last/4 > 0 ? square_feet_range.last/4 : 1
    starting_value = minimum_square_feet
    while starting_value <= maximum_square_feet
      square_feet_range_hash[starting_value.to_i.to_s+'-'+maximum_square_feet.to_f.ceil.to_s] = starting_value.to_i
      starting_value += slice
    end
    square_feet_range_hash = square_feet_range_hash.invert
    square_feet_range_hash.each do |v|
      @square_feet << v
    end
  end

  def build_market_rent_range
    rent_list = @units_with_floorplan_info.map{|obj| obj[:market_rent].to_i}.uniq.sort().reverse!
    @market_rent =  rent_list.map{|price| [price, "#{rent_list.min}-#{price}"]}
  end

  def apply_now
    
  end

  def save_favorite
    array = cookies[:favorite_unit_ids].present? ? JSON.parse(cookies[:favorite_unit_ids]) : []
    @unit = Unit.find params[:unit_id]
    array << params[:unit_id] if params[:unit_id].present?
    cookies[:favorite_unit_ids] = { value: JSON.generate(array), expiry: 5.years.from_now, same_site: :none}
    favorite = Favorite.find_or_create_by(session_id: cookies[:webpages_session_id]) 
    favorite.unit_ids.present? ? (favorite.unit_ids << params[:unit_id]) :  (favorite.unit_ids = [params[:unit_id]])
    fs = @community.favorite_stop.present? ? @community.favorite_stop : FavoriteStop.create(community_id: @community.id) 
    fs.favorite_unit << params[:unit_id] unless fs.favorite_unit.include?(params[:unit_id])
    fs.save
    favorite.save!
    # redirect_back(fallback_location: root_path)
  end

  def sent_favorite
    
  end

  def price_opened

  end

  def apply_now_count

  end

  def delete_favorite
    array = cookies[:favorite_unit_ids].present? ? JSON.parse(cookies[:favorite_unit_ids]) : []
    @unit = Unit.find params[:unit_id]
    cookies[:favorite_unit_ids] = { value: JSON.generate(array), expiry: 5.years.from_now, same_site: :none}
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
    cookies[:favorite_unit_ids] = { value: updated_unit_ids, expiry: 5.years.from_now, same_site: :none}
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
    @floorplans = Floorplan.where(provider_floorplan_id: @units && @units.map(&:floorplan_id),community_id: params[:community_id])
  end

  def clear_favorites
    cookies[:favorite_unit_ids] = { value: JSON.generate([]), expiry: 5.years.from_now, same_site: :none}
    favorite = Favorite.find_by_session_id(cookies[:webpages_session_id]) 
    if favorite.present?
      favorite.unit_ids = []
      favorite.save
      flash[:notice] = "Cleared successfully."
    else
      flash[:error] = "Nothing to remove."
    end
    redirect_back(fallback_location:"/")
    #redirect_to favorites_community_webpages_path(@community.id)
  end

  def update_session
    track_session = TrackSession.where(session_id: cookies[:webpages_session_id]).last
    track_session.update_column(:end_datetime, return_community_datetime(session[:last_active_datetime])) if track_session.present?
    session[:last_active_datetime] = nil
    puts " ---------------------- Track Session Completed --------------------------------"
  end

  private
  def get_community_code community
    (JWT.encode ({"community_id" => community.id}), ENV['SECRET_KEY_BASE_v2'], 'HS256')
  end

  def set_community
    @community = Community.find(params[:community_id])
  end

  def maintain_session
    session = return_last_maps_session
    manage_session_info(session)
    session.save
  end

  def return_last_maps_session
    # every time you close browser new session id will create
    if session[:last_active_datetime].nil?
      session[:last_active_datetime] = fetch_datetime
      session_nil = true
    end
    # Make a new session if not found or session limit expire otherwise retrurn last session 
    if !TrackSession.where(session_id: cookies[:webpages_session_id]).any? || session_nil
      session_nil = false
      if TrackSession.where(session_id: cookies[:webpages_session_id]).any? && TrackSession.where(session_id: cookies[:webpages_session_id]).last.end_datetime.nil?
        last_session = TrackSession.where(session_id: cookies[:webpages_session_id]).last
        last_date_time = cookies[:coo_last_active_datetime].present? ? return_community_datetime(cookies[:coo_last_active_datetime]) + 1.minutes : return_community_datetime(last_session.start_datetime.to_s) + 10.minutes
        last_session.update_column(:end_datetime, last_date_time)
        track_session = return_new_session 
      else
        track_session = return_new_session
      end
    elsif TrackSession.where(session_id: cookies[:webpages_session_id]).last.end_datetime.present? 
        track_session = return_new_session 
    elsif session_datetime_not_in_limit?(return_community_datetime(session[:last_active_datetime]))
      if TrackSession.where(session_id: cookies[:webpages_session_id]).last.end_datetime.nil?
        last_session = TrackSession.where(session_id: cookies[:webpages_session_id]).last
        last_session.update_column(:end_datetime, (return_community_datetime(session[:last_active_datetime]) + 10.minutes) )
        track_session = return_new_session 
      else
        track_session = return_new_session
      end
    else
      track_session = TrackSession.where(session_id: cookies[:webpages_session_id]).last
    end
    session[:last_active_datetime] = fetch_datetime
    cookies.permanent[:coo_last_active_datetime] = fetch_datetime
    track_session
  end

  def return_new_session
    TrackSession.new(start_datetime: (fetch_datetime), track_session_type: "maps", community_id: @community.id, community_time_zone: @timezone,session_id: cookies[:webpages_session_id])
  end

  def manage_session_info(session)
    visited_pages = session.visited_pages
    if params[:action] == "index"
      visited_pages << "Webpage main page" unless visited_pages.include?("Webpage main page")
    elsif params[:action] == "favorites"
      visited_pages << "View favorites page" unless visited_pages.include?("View favorites page")
    elsif params[:action] == "save_favorite"
      session.favorite_saved_counter += 1
    elsif params[:action] == "sent_favorite"
      session.favorite_sent_counter += 1
    elsif params[:action] == "price_opened"
      session.price_opened_counter += 1
    elsif params[:action] == "apply_now_count"
      session.apply_click_counter += 1
    end
    session.visited_pages = visited_pages
  end

  def session_datetime_not_in_limit?(session_datetime)
   current_datetime = fetch_datetime
   (current_datetime - session_datetime) > 10.minutes # return true to make a new record
  end

  def set_timezone
    @timezone = @community.get_time_zone()
  end

  def fetch_datetime
    Time.zone.now.utc.in_time_zone(@timezone)
  end

  def return_community_datetime(datetime)
    Time.zone.parse(datetime).in_time_zone(@timezone).to_datetime if datetime.present? && @timezone.present?
  end
end