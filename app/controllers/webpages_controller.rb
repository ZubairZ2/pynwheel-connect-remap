class WebpagesController < ActionController::Base
  # include Error::ErrorHandler
  before_action :set_community

  def index
    @floorplans = []
    if cookies[:favorite_unit_ids] == nil || cookies[:favorite_unit_ids] == "[]"
      cookies[:favorite_unit_ids] = { value: JSON.generate([]), expiry: 5.years.from_now, same_site: :none}
      cookies[:webpages_session_id] = { value: SecureRandom.hex(8), expiry: 5.years.from_now, same_site: :none}
      Favorite.create(session_id: cookies[:webpages_session_id],unit_ids: [])
    end
    
    @scheduler_widget_link = get_scheduler_link
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
  def get_scheduler_link
    community_code = get_community_code @community
    base_url =  Rails.env.development? ? "http://localhost:3000/" : (ENV["RAILS_ENV"] == "staging" ? "https://pynwheel-staging.herokuapp.com/" : "https://pynwheelconnect.com/")
    return "#{base_url}scheduler_widget/test_widget?community_id=#{@community.id}&community_code=#{community_code}&direct=true"
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
      @scheduler_widget_link = get_scheduler_link
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

  private
  def get_community_code community
    (JWT.encode ({"community_id" => community.id}), ENV['SECRET_KEY_BASE_v2'], 'HS256')
  end

  def set_community
    @community = Community.find(params[:community_id])
  end
end