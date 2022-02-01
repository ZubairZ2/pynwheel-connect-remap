class Api::V2::CommunityFloorPlansController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community, only: [:index , :add_floorplan]

  def index
    floorplans = @community.floorplans.order(created_at: :desc)
    if floorplans.present?
      render json: { succcess: true, data: floorplans.as_json }
    else
      render json: { success: false, data: "No floorplans found" }
    end
  end

  def add_floorplan
    begin
      floorplans_params = params["floorplan"]
      floorplans_params.values.each do |floorplan|
        floorplan_id = floorplan["id"]
        if floorplan_id.present?
          @floorplan = @community.floorplans.find_by_id(floorplan_id)
          if @floorplan.present?
            if @floorplan.update(floorplan_params)
              PaperTrail::Version.create(item_type: "Floorplan", item_id: @floorplan.id, event: "update", whodunnit: current_pynwheel_user.id, community_id: @community.id, company_id: @community.company.id, object: "name: '#{@floorplan.name}' community_id: '#{@community.id}'")
            end
          end
        else
          @floorplan = @community.floorplans.create(floorplan_params)
          PaperTrail::Version.create(item_type: "Floorplan", item_id: @floorplan.id, event: "update", whodunnit: current_pynwheel_user.id, community_id: @community.id, company_id: @community.company.id, object: "name: '#{@floorplan.name}' community_id: '#{@community.id}'")
        end
      end
      floorplans = @community.floorplans
      render json: { success: true, message: "floorplan has been updated successfully."  , data: floorplans.as_json}
    rescue => ex
      render json: { success: false, error_code: 400, message: "#{ex.message}, please verify and try again."}, status: 400
    end
  end

  private

  def load_community
    @community = Community.find params[:community_id]
  end

  def floorplan_params
    params.require(:floorplan).permit(:name , :image , :secondary_image)
  end
end
