class Api::V2::CommunityFloorPlansController < Api::V2::ApiApplicationController
  before_action :load_community, only: [:index, :show, :check_floorplan]
  before_action :doorkeeper_authorize!

  def index
    floorplans = @community.floorplans.order(id: :desc)
    if floorplans.present?
      render json: {succcess: true, data: floorplans.as_json}
    else
      render json: {success: false, data: "No floorplans found"}
    end
  end

  def show
    floorplan = @community.floorplans.find_by_id(params[:id])
    if floorplan.present?
      render json: {succcess: true, data: floorplan.as_json}
    else
      render json: {success: false, data: "No floorplan found"}
    end
  end

  def check_floorplan
    if params["floorplan"]["id"].nil? || params["floorplan"]["id"] == ""
      create_floorplan
    else
      update_floorplan
    end
  end

  def create_floorplan
    if params["floorplan"]["name"].nil?
      data = "Required field: name* must be filled."
    elsif params["floorplan"]["image"].nil?
      data = "Required field: image* must be selected."
    else
      if @community.floorplans.where(name: params["floorplan"]["name"]).present?
        data = "Required field: name* must be unique."
      elsif @community.floorplans.where(provider_floorplan_id: params["floorplan"]["provider_floorplan_id"]).present?
        data = "Required Field: provider floorplan id => #{params["floorplan"]["provider_floorplan_id"]} is already used."
      else
        floorplan = @community.floorplans.create!(floorplan_post_params)
        data = floorplan.as_json
      end
    end
    render json: {success: true, data: data}
  end

  def update_floorplan
    floorplan = @community.floorplans.where(id: params["floorplan"]["id"])
    if floorplan.present?
      if floorplan.update(floorplan_post_params)
        render json: {success: true, data: floorplan.as_json}
      end
    else
      render json: {success: false, data: "Id not found! Please try again."}
    end
  end


  private
  def load_community
    @community = Community.find params[:community_id]
  end

  def floorplan_post_params
    params.require(:floorplan).permit(:id, :name, :image, :secondary_image, :market_rent, :provider_floorplan_id)
  end

  def floorplan_params
    params.require(:floorplan).permit(:id)
  end
end
