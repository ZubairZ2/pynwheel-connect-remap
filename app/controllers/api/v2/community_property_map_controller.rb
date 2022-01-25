class Api::V2::CommunityPropertyMapController < Api::V2::ApiApplicationController
  before_action :load_Community

  def index
    if @community.is_sitemap
      property_map = @community.sitemap
    else
      property_map = @community.floorplates
    end
    render :json => {data: property_map, type: @community.is_sitemap ? "Garben" : "Floorplates"}

  end

  # def update_community_property_map
  #   if @community.is_sitemap
  #     redirect_to api_v2_community_property_map_url(@community.sitemap.id)
  #   end
  # end

  def update
    community = Community.find_by_id(params[:id])
    sitemap = community.sitemap
    if sitemap.update(property_map_params)
      render json: sitemap
    end
  end

  private
  def load_Community
    @community = Community.find(params[:id])
  end

  def property_map_params
    params.require(:sitemap).permit(:image)
  end
end
