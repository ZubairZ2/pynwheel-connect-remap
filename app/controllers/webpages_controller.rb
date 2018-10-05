class WebpagesController < ActionController::Base
  before_action :set_community
  before_action :check_community

  def index
    @floorplans = []
    if cookies[:favorite_unit_ids] == nil
      cookies.permanent[:favorite_unit_ids] = JSON.generate([]) 
      cookies.permanent[:session_id] = SecureRandom.hex(8)
      Favorite.create(session_id: cookies[:session_id],unit_ids: [])
    end
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
      @available_units_and_sold_units = @community_info.units.available_units + @community_info.units.are_sold 
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
  def check_community
    unless current_user.is_super_admin?
      if params[:community_id].present?
        all_ids = []
        current_user.communities.each do |c|
          # all_ids.insert(c.id)
          all_ids << c.id
        end
        # byebug
        # puts '+++++++++++++++', all_ids[0]
        if all_ids.include? params[:community_id].to_i

        else
          redirect_to root_path
        end
      end
    end
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
          square_feet: unit.square_feet.present? ? unit.square_feet : (floorplan.present? ? floorplan.square_feet : 0),
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
    array = JSON.parse(cookies[:favorite_unit_ids])
    @unit = Unit.find params[:unit_id]
    array << params[:unit_id]
    cookies.permanent[:favorite_unit_ids] = JSON.generate(array)
    favorite = Favorite.find_by_session_id(cookies[:session_id]) 
    favorite.unit_ids << params[:unit_id]
    favorite.save
  end

  def delete_favorite
    array = JSON.parse(cookies[:favorite_unit_ids])
    @unit = Unit.find params[:unit_id]
    cookies.permanent[:favorite_unit_ids] = JSON.generate(array) 
    favorite = Favorite.find_by_session_id(cookies[:session_id]) 
    favorite.unit_ids.delete params[:unit_id]
    favorite.save
  end

  def favorites
    @favorite = Favorite.find_by_session_id(cookies[:session_id])
    @units = Unit.where(id: JSON.parse(cookies[:favorite_unit_ids]),community_id: params[:community_id]).where.not(available_date: nil)
    @floorplans = Floorplan.where(provider_floorplan_id: @units.map(&:floorplan_id),community_id: params[:community_id])
  end

  def favorites_share_link
    @favorite = Favorite.find_by_session_id(params[:session_id])
    @units = Unit.where(id: @favorite.unit_ids,community_id: params[:community_id]).where.not(available_date: nil)
    @floorplans = Floorplan.where(provider_floorplan_id: @units.map(&:floorplan_id),community_id: params[:community_id])
  end

  def clear_favorites
    cookies.permanent[:favorite_unit_ids] = JSON.generate([]) 
    favorite = Favorite.find_by_session_id(cookies[:session_id]) 
    favorite.unit_ids = []
    favorite.save
    flash[:notice] = "Favorites cleared successfully."
    redirect_to :back
  end

  private

  def set_community
    @community = Community.find(params[:community_id])
  end
end