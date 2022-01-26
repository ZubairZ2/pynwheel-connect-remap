class Api::V2::CommunityPropertyMapController < Api::V2::ApiApplicationController
  before_action :load_Community , only: [:show , :update]
  before_action :doorkeeper_authorize!

  def show
    if @community.is_sitemap
      property_map = @community.sitemap
    else
      property_map = @community.floorplates
    end
    if property_map
      render :json => {:success =>  true, data: property_map.as_json}
    else
      render :json => {:success => false , :message => "Record not found."}
    end
  end

  def set_community_floorplates

    if @community.is_sitemap
      if params["sitemap"]["id"].present?
        @community.sitemap.find_by_id(params["sitemap"]["id"])
      else
        @community.sitemap.create(site_params)
      end
    sitemap = @community.sitemap
      if sitemap.update(property_map_params)
        @property_map = sitemap
      end
    else
      params[:floorplate].values.each do |f|
        @community.floorplates.find_or_create_by!(id: f["id"],name: f["name"], range: f["range"], image: f["image"])
      end
      @property_map = @community.floorplates
    end
    @community.set_property_map_status(current_pynwheel_user)
    render json: {data: @property_map.as_json}

  end

  private
  def load_Community
    @community = Community.find(params[:id])
  end

  def property_map_params
    params.require(:sitemap).permit(:image)
  end
end
