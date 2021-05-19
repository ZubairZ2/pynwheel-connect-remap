class WebpagesController < ActionController::Base
  before_action :set_community, except: [:update_session]
  after_action :maintain_session, except: [:update_session]
  before_action :set_timezone, except: [:update_session]
  protect_from_forgery :except => [:update_session]
  def index
    @floorplans = []
    units_ids_not_present = (cookies[:favorite_unit_ids] == nil || cookies[:favorite_unit_ids] == "[]")
    is_cookies_session_nil = cookies[:webpages_session_id].nil?
    cookies.permanent[:favorite_unit_ids] = JSON.generate([]) if units_ids_not_present
    cookies.permanent[:webpages_session_id] = SecureRandom.hex(8) if is_cookies_session_nil
    Favorite.create(session_id: cookies[:webpages_session_id],unit_ids: []) if is_cookies_session_nil
    @units_with_floorplan_info = []
    @community_info = Community.includes(:credential,:floorplans,{sitemap: [:amenities]},{floorplates: [:amenities]},{units: [:floorplate]}).find(params[:community_id])
    unless @community_info.locked
      if @community_info.has_floorplates?
        @floorplates = @community_info.floorplates
        @floors = @floorplates.map{|f| f.floors}.flatten.sort
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
          @units_with_floorplan_info = @units_with_floorplan_info.to_json
        end
      end
    end
    response.headers.delete "X-Frame-Options"  
  end

  def normalize_units
    @floorplans = @community_info.floorplans
    @available_units_and_sold_units.each do |unit|
      if unit.effective_rent.present? && unit.effective_rent >= 1  && @floorplans.any?{|f| f.provider_floorplan_id == unit.floorplan_id}
        floorplan = @floorplans.select{|f| f.provider_floorplan_id == unit.floorplan_id}.first
        
        struct = {
          marketing_name: unit.marketing_name,
          market_rent: unit.effective_rent,
          bedrooms: floorplan.bedrooms,
          bathrooms: floorplan.bathrooms,
          square_feet: (unit.square_feet.present? && unit.square_feet != 0) ? unit.square_feet : (floorplan.present? ? floorplan.square_feet : 0),
          availability: unit.availability,
          available_date: unit.available_date,
          x_plot: unit.x_plot,
          y_plot: unit.y_plot,
          floor: unit.floor,
          sold: unit.sold,
          available: unit.available
        }
        @units_with_floorplan_info << struct
      end
    end
  end

  def build_square_feet_range
    maximum_square_feet = @units_with_floorplan_info.max_by{|k| k[:square_feet] }[:square_feet]
    minimum_square_feet = @units_with_floorplan_info.min_by{|k| k[:square_feet] }[:square_feet]
    @square_feet = []
    square_feet_range = minimum_square_feet.to_i..maximum_square_feet.to_i
    square_feet_range_hash = square_feet_range.each_slice((square_feet_range.last/4 > 0 ? square_feet_range.last/4 : 1)).with_index.with_object({}) { |(a,i),h| h[a.first.to_i.to_s+'-'+maximum_square_feet.to_f.ceil.to_s]=a.first }
    square_feet_range_hash = square_feet_range_hash.invert
    square_feet_range_hash.each do |v|
      @square_feet << v
    end
  end

  def build_market_rent_range
    maximum_market_rent = @units_with_floorplan_info.max_by{|k| k[:market_rent] }[:market_rent]
    minimum_market_rent = @units_with_floorplan_info.min_by{|k| k[:market_rent] }[:market_rent]
      
    @market_rent = []
    market_rent_range = minimum_market_rent.to_i..maximum_market_rent.to_i
    market_rent_range_hash = market_rent_range.each_slice((market_rent_range.last/4 > 0 ? market_rent_range.last/4 : 1)).with_index.with_object({}) { |(a,i),h| h[minimum_market_rent.to_i.to_s+'-'+a.last.to_s]=a.last }
    market_rent_range_hash = market_rent_range_hash.invert
    market_rent_range_hash.each do |v|
      @market_rent << v
    end
  end

  def apply_now
    
  end

  def save_favorite
    array = cookies[:favorite_unit_ids].present? ? JSON.parse(cookies[:favorite_unit_ids]) : []
    @unit = Unit.find params[:unit_id]
    array << params[:unit_id]
    cookies[:favorite_unit_ids] = { value: JSON.generate(array), expiry: 5.years.from_now, same_site: :none}
    favorite = Favorite.find_by_session_id(cookies[:webpages_session_id]) 
    favorite.unit_ids << params[:unit_id]
    fs = @community.favorite_stop.present? ? @community.favorite_stop : FavoriteStop.create(community_id: @community.id) 
    fs.favorite_unit << params[:unit_id] unless fs.favorite_unit.include?(params[:unit_id])
    fs.save
    favorite.save
  end

  def sent_favorite
    
  end

  def price_opened

  end

  def apply_now_count

  end

  def delete_favorite
    array = JSON.parse(cookies[:favorite_unit_ids])
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
      @favorite = Favorite.find_by_session_id(cookies[:webpages_session_id])
      @units = Unit.where(id: JSON.parse(cookies[:favorite_unit_ids]),community_id: params[:community_id]).where.not(available_date: nil)
      @floorplans = Floorplan.where(provider_floorplan_id: @units.map(&:floorplan_id),community_id: params[:community_id])
    rescue => ex
    end
  end

  def favorites_share_link
    @favorite = Favorite.find_by_session_id(params[:webpages_session_id])
    @units = Unit.where(id: @favorite.unit_ids,community_id: params[:community_id]).where.not(available_date: nil)
    @floorplans = Floorplan.where(provider_floorplan_id: @units.map(&:floorplan_id),community_id: params[:community_id])
  end

  def clear_favorites
    cookies[:favorite_unit_ids] = { value: JSON.generate([]), expiry: 5.years.from_now, same_site: :none}
    favorite = Favorite.find_by_session_id(cookies[:webpages_session_id]) 
    favorite.unit_ids = []
    favorite.save
    flash[:notice] = "Favorites cleared successfully."
    redirect_to :back
  end

  def update_session
    track_session = TrackSession.where(session_id: cookies[:webpages_session_id]).last
    track_session.update_column(:end_datetime, return_community_datetime(session[:last_active_datetime]))
    reset_session
    session[:last_active_datetime] = nil
    puts " ---------------------- Track Session Completed --------------------------------"
  end

  private

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
    TrackSession.new(start_datetime: (fetch_datetime), track_session_type: "maps", community_id: @community.id,session_id: cookies[:webpages_session_id])
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
  
  def get_community_time_zone(community)
    tz = Ziptz.new
    timezone = nil

    if community.latitude.present? and community.longitude.present?
      time_zone = Timezone.lookup(community.latitude, community.longitude)
      timezone = time_zone.name
    end

    if timezone.nil? and community.zip.present?
      timezone = tz.time_zone_name(community.zip)
    end

    return timezone
  rescue
    return "UTC"
  end

  def set_timezone
    @timezone = get_community_time_zone(@community)
  end

  def fetch_datetime
    Time.zone.now.utc.in_time_zone(@timezone)
  end

  def return_community_datetime(datetime)
    Time.zone.parse(datetime).in_time_zone(@timezone).to_datetime
  end
end