class WebpagesController < ActionController::Base  
  include CommunitiesHelper

  before_action :set_community, except: [:update_session]
  before_action :set_webpages_session_id_cookies, only: [:index]
  after_action :maintain_session, except: [:update_session]
  before_action :set_timezone, except: [:update_session]
  before_action :set_map_type, only: [:index]
  before_action :set_map_configuration, only: [:index]
  protect_from_forgery :except => [:update_session]

  def index
    units_ids_not_present = (cookies[:favorite_unit_ids] == nil || cookies[:favorite_unit_ids] == "[]")
    set_favorites_unit_ids_cookies(JSON.generate([]))  if units_ids_not_present
    Favorite.create(session_id: cookies[:webpages_session_id],unit_ids: []) if cookies[:webpages_session_id].nil?
    @scheduler_widget_link = @community.schedule_tour_url
    @units_with_floorplan_info = []
    @community_info = Community.includes(
                                          :credential,
                                          :sub_communities,
                                          :floorplans,
                                          {
                                            sitemap: [:amenities],
                                            floorplates: [:amenities, :units],
                                            amenities: [:amenityable, :amenity_galleries],
                                            units: [:floorplan, :floorplate]
                                          }
                                        ).find(params[:community_id])


    @floorplans = @community_info.floorplans
    @floorplans_map = @floorplans.index_by(&:provider_floorplan_id)
    @svg_enabled = @community_info.enable_svg_mode?
    community_units = @community_info.units
    @amenities = @community_info.amenities.plotted_amenities(@svg_enabled).includes(:amenityable, :amenity_galleries)
    @have_multi_property_ids = @community_info.have_multi_property_ids? && @community_info.credential&.allow_sub_communities?
    @multi_properties = @community_info.fetch_multi_properties()
    @map_filter = @community_info&.map_filter&.get_filter_list(@show_ops_map)
    @all_filters_disabled = @community_info&.map_filter&.all_filters_disabled?(@show_ops_map)
    @font_family = @svg_enabled ? @community_info&.font_setting&.svg_labels_font_family : nil

    unless @community_info.locked
      if @community_info.has_floorplates?
        @floorplates = @community_info.floorplates
        @floors = @floorplates.map {|f| f.floors }.flatten.sort_by { |f| -f }
        @show_floors_panel =  @community_info.show_floors_panel_on_map?(params[:floor]&.to_i, @floors)
        @amenities = @amenities.where(amenityable: @floorplates).includes(:amenity_galleries)

        @floorplate_by_floor = {}
        @floorplates.each do |fp|
          fp.floors.each { |floor| @floorplate_by_floor[floor] = fp }
        end

        # For Floor Level Map
        if params[:floor].present? && @floors.include?(params[:floor].to_i)
          selected_floor = params[:floor].to_i
          selected_fp    = @floorplate_by_floor[selected_floor]

          @floorplates = [selected_fp]
          @floors      = [selected_floor]
          @floorplate_by_floor = { selected_floor => selected_fp }
        end

        @dimensions_by_floorplate = {}
        @floorplate_by_floor.each do |floor, fp|
          @dimensions_by_floorplate[fp.id] = image_original_dimensions(fp)
        end
      end

      @units = if @community.turn_availability_on && !@show_ops_map # for studen housing properties.
        community_units.are_plotted_units(@svg_enabled)
      elsif @show_ops_map
        community_units.are_plotted_units(@svg_enabled).status_scoped(true)
      else
        community_units.available_units(@svg_enabled, @community.units_availability_over_120_days).visible_on_map_for(@community)
      end

      if @units.length > 0
        normalize_units

        if @units_with_floorplan_info.present?
          build_square_feet_range
          build_market_rent_range
          unit_bedrooms_for_webpages
          unit_availability_for_webpages
          @units_with_floorplan_info = @units_with_floorplan_info.to_json
        end
      end

      @min_floor = get_min_floor( community_info: @community_info, units_with_floorplan_info_json: @units_with_floorplan_info, floors: @floors )
      @amenities_data = []
      normalize_amenities
      @amenities_data = @amenities_data.to_json
    end
    
    response.headers.delete "X-Frame-Options"
  end

  def normalize_amenities
    @amenities.find_each do |amenity|
      struct = {
        id: amenity.id,
        name: amenity.name,
        image_url: amenity.validated_image_url,
        floor: amenity.floor,
        floorplate_id: amenity.amenityable_id,
        x_plot: amenity.x_plot,
        y_plot: amenity.y_plot,
        pointer_data: amenity.pointer_data,
        galleries: amenity.amenity_galleries,
        show_name: @community.show_amenity_name,
        data_attributes: { "data-amenity-id": amenity.id, "data-floor": amenity.floor },
        config: @map_config
      }

      @amenities_data << struct
    end
  end

  def normalize_units
    @units.find_each do |unit|
      floorplan = @floorplans_map[unit.floorplan_id]
      if unit.effective_rent.present? && unit.effective_rent >= 1  && floorplan.present?
        @units_with_floorplan_info << fetch_unit_info_struct_for_webpage(unit, floorplan, @show_ops_map)
      end
    end
  end

  def unit_bedrooms_for_webpages
    bedroom_values = @units_with_floorplan_info.map do |unit|
      bedrooms = unit.try(:[], :bedrooms).to_s.strip.downcase rescue ""
      if bedrooms.blank? || bedrooms == "studio" || bedrooms == "0"
        0
      else
        bedrooms.to_i
      end
    end

    sorted_unique_bedrooms = bedroom_values.uniq.sort

    @unit_bedrooms = sorted_unique_bedrooms.map do |bedroom_count|
      if bedroom_count == 0
        ["Studio", "0_bedrooms"]
      elsif bedroom_count == 1
        ["1 Bedroom", "1_bedroom"]
      else
        ["#{bedroom_count} Bedrooms", "#{bedroom_count}_bedrooms"]
      end
    end

    @unit_bedrooms
  end

  def unit_availability_for_webpages
    @available_units = []
    today = DateTime.now.to_date
    thirty_days = today + 30.days;
    sixty_days = today + 60.days;
    ninty_days = today + 90.days;
    one_twenty_days = today + 120.days;

    units_ids = @units.ids
    @units_with_floorplan_info.each do |available_unit|
      unit_id = available_unit[:id]
      next unless units_ids.include?(unit_id)

      available_date = available_unit[:available_date] || Date.new(0)
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


    updated_unit_ids = []
    if (favorite)
      favorite.unit_ids.delete params[:unit_id]
      favorite.save
      updated_unit_ids << favorite.unit_ids
    end

    set_favorites_unit_ids_cookies(updated_unit_ids)
  end

  def favorites
    @scheduler_widget_link = @community.schedule_tour_url
    @favorite = Favorite.find_by_session_id(cookies[:webpages_session_id])
    @units = Unit.where(id: JSON.parse(cookies[:favorite_unit_ids]),community_id: params[:community_id]).where.not(available_date: nil)
    @fav_units_info = @units.to_json 
    @floorplans = Floorplan.where(provider_floorplan_id: @units.map(&:floorplan_id),community_id: params[:community_id])
  rescue => e
    puts e.message
    puts e.backtrace
    flash[:error] = "Error while loading the favorites."
    redirect_back(fallback_location:"/")
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

    def set_map_configuration
      @map_config = map_configuration(@community, @show_ops_map)
    end

    def  set_map_type
      @show_ops_map = params[:ops_map] == "true"
    end

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

    def set_community
      @community = Community.find(params[:community_id])

    rescue ActiveRecord::RecordNotFound
      flash[:alert] = "Community not found."
      redirect_to root_path
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