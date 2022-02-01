class Api::V2::CommunityFloorPlansController < Api::V2::ApiApplicationController
  before_action :load_community, only: [:index, :show, :add_floorplan]
  before_action :doorkeeper_authorize!

  def index
    floorplans = @community.floorplans.order(id: :desc)
    if floorplans.present?
      render json: { succcess: true, data: floorplans.as_json }
    else
      render json: { success: false, data: "No floorplans found" }
    end
  end

  def show
    floorplan = @community.floorplans.find_by_id(params[:id])
    if floorplan.present?
      render json: { success: true, data: floorplan.as_json }
    else
      render json: { success: false, data: "No floorplan found" }
    end
  end

  def add_floorplan
    begin
      floorplans_params = params["floorplan"].values
      floorplans_params.each do |floorplan|
        if floorplan["id"].present? && @community.floorplans.find_by_id(floorplan["id"]).present?
          find_floorplan = @community.floorplans.find_by_id(floorplan["id"])
          if find_floorplan.update(name: floorplan["name"], image: floorplan["image"], secondary_image: floorplan["secondary_image"])
            PaperTrail::Version.create(item_type: "Floorplan", item_id: find_floorplan.id, event: "update", whodunnit: current_pynwheel_user.id, community_id: @community.id, company_id: @community.company.id, object: "name: '#{find_floorplan.name}' community_id: '#{@community.id}'")
          end
        else
          @community.floorplans.create!(name: floorplan["name"], image: floorplan["image"], secondary_image: floorplan["secondary_image"])
          PaperTrail::Version.create(item_type: "Floorplan", item_id: new_floorplan.id, event: "create", whodunnit: current_pynwheel_user.id, community_id: @community.id, company_id: @community.company.id, object: "name: '#{new_floorplan.name}' community_id: '#{@community.id}'")
        end
      end
      render json: { success: true, message: "floorplan has been updated successfully." }
    rescue => ex
      render json: { success: false, error_code: 400, message: "#{ex.message}, please verify and try again.", data: nil }, status: 400
    end
  end

  private

  def load_community
    @community = Community.find params[:community_id]
  end

  def floorplan_post_params
    params.require(:floorplan).permit!
  end

  def floorplan_params
    params.require(:floorplan).permit(:id)
  end
end
