class Api::V2::CommunityFloorPlansController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community, only: [:index, :add_floorplan, :destroy, :delete_floorplan_amenity, :delete_floorplan_image]
  before_action :load_floorplan, only: [:destroy, :delete_floorplan_amenity, :delete_floorplan_image]

  def index
    floorplans = @community.floorplans.order(created_at: :desc)
    if floorplans.present?
      render json: { success: true, data: floorplans.as_json }
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
            if @floorplan.update(name: floorplan["name"], image: floorplan["image"])
              if floorplan["aminities"].present?
                floorplan["aminities"].values.each do |amenity|
                  if !amenity[:id].present?
                    @floorplan.amenities.create(image: amenity["image"])
                  end
                end
              end
              PaperTrail::Version.create(item_type: "Floorplan", item_id: @floorplan.id, event: "update", whodunnit: current_pynwheel_user.id, community_id: @community.id, company_id: @community.company.id, object: "name: '#{@floorplan.name}' community_id: '#{@community.id}'")
            end
          end
        else
          @floorplan = @community.floorplans.new(name: floorplan["name"])
          @floorplan.image = floorplan[:image] if floorplan[:image].present?
          if @floorplan.save
            if floorplan["aminities"].present?
              floorplan["aminities"].values.each do |aminity|
                @amenity = @floorplan.amenities.create(image: aminity["image"])
              end
            end
          end
          PaperTrail::Version.create(item_type: "Floorplan", item_id: @floorplan.id, event: "create", whodunnit: current_pynwheel_user.id, community_id: @community.id, company_id: @community.company.id, object: "name: '#{@floorplan.name}' community_id: '#{@community.id}'")
        end
      end
      @community.set_floorplan_status(current_pynwheel_user)
      email = PynwheelLaunch::Communities::FollowUpEmails.new(@community).send_emails
      email[:data].each do |mail|
        if mail[:name].eql?(FLOORPLAN_IMAGES) && mail[:status].eql?("Submitted")
          FollowUpMailer.send_submitted_form(@community, FLOORPLAN_IMAGES, email[:data]).deliver_later
        end
      end
      floorplans = @community.floorplans
      render json: { success: true, message: "floorplan has been updated successfully.", data: floorplans.as_json }
    rescue => ex
      render json: { success: false, error_code: 400, message: "#{ex.message}, please verify and try again." }, status: 400
    end
  end

  def delete_floorplan_image
    if @load_floorplan.present?
      @load_floorplan.remove_image!
      @load_floorplan.standard_image_url = nil
      if @load_floorplan.save
        @community.set_floorplan_status(current_pynwheel_user)
        render :json => {:success => true, :error_code => 200, :message => "Floorplan images deleted successfully", data: nil}
      else
        render :json => {:success => false, :error_code => 500, :message => @load_floorplan.errors.full_messages}
      end
    else
      render :json => {:success => false, :error_code => 400, :message => "Floorplan not found"}
    end
  end

  def delete_floorplan_amenity
    if @load_floorplan.present?
      @amenity = @load_floorplan.amenities.find_by(id: params[:amenity_id])
      if @amenity.destroy!
        @community.set_floorplan_status(current_pynwheel_user)
        render :json => {:success => true, :error_code => 200, :message => "Floorplan amenity deleted successfully", data: nil}
      else
        render :json => {:success => false, :error_code => 500, :message => @load_floorplan.errors.full_messages}
      end
    else
      render :json => {:success => false, :error_code => 400, :message => "Floorplan not found"}
    end
  end

  def destroy
    if @load_floorplan.present?
      if @load_floorplan.destroy!
        @community.set_floorplan_status(current_pynwheel_user)
        render :json => {:success => true, :error_code => 200, :message => "Floorplan deleted successfully", data: nil}
      else
        render :json => {:success => false, :error_code => 500, :message => @load_floorplan.errors.full_messages}
      end
    else
      render :json => {:success => false, :error_code => 400, :message => "Floorplan not found"}
    end
  end

  private

  def load_floorplan
    @load_floorplan = @community.floorplans.find_by(id: params[:id])
    rescue ActiveRecord::RecordNotFound
    render json: {success: false, error_code: 400, message: 'Floorplan not found', data: nil}, status: :not_found
  end

  def load_community
    @community = Community.find params[:community_id]
    rescue ActiveRecord::RecordNotFound
      render json: {success: false, error_code: 400, message: 'Community not found', data: nil}, status: :not_found
  end
end
