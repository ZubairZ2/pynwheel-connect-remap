class FloorplansController < ApplicationController
  add_breadcrumb "Home", :root_path
  before_action :set_community
  before_action :check_community
  before_action :set_floorplan, only: [:edit,:update,:destroy]

  def index
    @floorplans = @community.floorplans.order(id: :desc)
    @communities = current_company.communities
    add_breadcrumb "Floor plans", community_floorplans_path(@community)
  end

  def new
    @floorplan = @community.floorplans.new
    add_breadcrumb "Floor plans", community_floorplans_path(@community)
    add_breadcrumb "Add Floor plan", new_community_floorplan_path(@community)
  end

  def create
    @floorplan = @community.floorplans.new(floorplan_params)
    if @floorplan.save
      flash[:notice] = "Floor plan created successfully."
      redirect_to community_floorplans_path(:community_id=>@community.id)
    else
      flash[:error] = @floorplan.errors.full_messages.join(',')
      render :new
    end
  end

  def edit
    add_breadcrumb "Floor plans", community_floorplans_path(@community)
    add_breadcrumb "Edit Floor plan", edit_community_floorplan_path(@community,@floorplan)
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

  def update
    byebug
    respond_to do |format|
      if @floorplan.update(floorplan_params)
        format.html { redirect_to community_floorplans_path(:community_id=>@community.id), notice: 'Floor plan updated successfully.' }
        message = '<div class="alert alert-success">'+@floorplan.name+' image uploaded successfully.</div>'
        format.js {render js: "$('#flash-message').html('#{message}')"}
      else
        format.html { render :edit }
        flash[:error] = @floorplan.errors.full_messages.join(',')
        message = '<div class="alert alert-warning">'+@floorplan.errors.full_messages.join(',')+'</div>'
        format.js {render js: "$('#flash-message').html('#{message}')"}
      end
    end
  end


  def destroy
    @floorplan.destroy
    flash[:notice] = "Floor plan deleted successfully."
    redirect_to community_floorplans_path(:community_id=>@community.id)
  end

  def add_description
    description = params[:description].to_s
    description = description.split('"')

    @community.floorplans.where(id: params[:floorplan_ids]).update_all(description:  description[1])
    flash[:notice] = "Description is updated for units successfully."
    redirect_to :back
  end
  private

  def set_floorplan
    @floorplan = Floorplan.find params[:id]
  end

  def floorplan_params
    params.require(:floorplan).permit!
  end

  def set_community
    @community = Community.find(params[:community_id])
  end
end