class CommunityGroupsController < ApplicationController
  # include Error::ErrorHandler
  def index
    @community_groups = alphabetical_sort(CommunityGroup.where(company_id: current_company.id)) rescue []
  end
  def new
    @community_group = CommunityGroup.new
    @all_regions = current_company.regions.all.order(:name).collect {|p| [ p.name, p.id ] } rescue []
  end
  def create
    @community_group = CommunityGroup.new(community_group_params)
    @community_group.company_id = params[:company_id]
    @community_group.name = CommunityConstants::DWELO_TAG + @community_group.name if current_user.is_dwelo_admin?
    if @community_group.save
      @company = Company.find current_company.id
      redirect_to company_community_groups_path(@company)
    else
      flash[:error] = @community_group.errors.full_messages.join(',')
      render "new"
    end
  end
  def edit
    @uploader = HomePageVideo.new.video
    @uploader.success_action_redirect = root_path

    @community_group = CommunityGroup.find params[:id]
    @community_group.group_design.present? ? nil : @community_group.create_group_design
    @company = Company.find @community_group.company_id
    @all_regions = current_company.regions.order(:name).collect {|p| [ p.name, p.id ] } rescue []
  end
  def update
    # params[:community_group][:background_image]
    # byebug
    if params[:community_group][:name].present?
      @community_group = CommunityGroup.find params[:id]
      if @community_group.update(community_group_params)
        @company = Company.find @community_group.company_id
        redirect_to company_community_groups_path(@company), :notice => "Community group updated successfully."
      else
        flash[:error] = @community_group.errors.full_messages.join(',')
        render "edit"
      end
    else
      @community_group = CommunityGroup.find params[:format]
      listed_communities = @community_group.communities.collect{|c| c.id}
      communities = params[:community_group][:communities]
      listed_communities.each do |com|
        if com.present? && !communities.include?(com)
          community = Community.find com
          community.community_group_id = nil
          community.save
        end
      end
      communities.each do |com|
        if com.present? && !listed_communities.include?(com)
          community = Community.find com
          community.master_community = false
          community.community_group_id = @community_group.id
          community.save
        end
      end
      if params[:master].present?
        master_com = Community.find_by(name: params[:master])
        master_com.master_community = true
        master_com.save
      end
      @company = Company.find @community_group.company_id
      redirect_to company_community_group_path(@company.id,@community_group)
    end
  end

  def show
    @community_group = CommunityGroup.find params[:id]
    @company = Company.find @community_group.company_id
  end
  def destroy
    @community_group = CommunityGroup.find params[:id]
    @community_group.destroy
    @company = Company.find @community_group.company_id
    redirect_to company_community_groups_path(@company), notice: 'Community group deleted successfully.'
  end
  def add_community
    @community_group = CommunityGroup.find params[:format]
    @company = Company.find @community_group.company_id
    @selected = Community.find_by(community_group_id: @community_group.id,master_community: true)
    unless @selected.present?
      @selected = Community.new
    end
    @not_assigned_communities = @company.communities.where(region_id: [nil, @community_group.region_id]).collect{|c| [c.name,c.id]}
  end
  def remove_community
    @community_group = CommunityGroup.find params[:id]
    community = Community.find params[:community]
    community.community_group_id = nil
    community.save
    @company = Company.find @community_group.company_id
    redirect_to company_community_group_path(@company.id,@community_group)

  end
  private
  def community_group_params
    params.require(:community_group).permit!
    # params.require(:community_group).permit(:name,:address,:code,:page_type,:page_name,:logo,:inactivate,:company_id,:menu_button_shade, :group_design_attributes => [:id,:logo_position,:button_border_color,
    # :button_shape, :button_width, :button_height, :button_spacing, :background_image, :button_color, :button_opacity, :button_border_side, :button_border_color, :button_border_opacity,
    # :button_border_thickness, :button_font_family, :button_font_size, :button_font_color,:bouncing_effecting, :video])
  end
end