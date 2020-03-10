class GroupDesignController < ApplicationController
  def index
    @community_group = CommunityGroup.find(params[:community_group_id])
    @group_design = @community_group.group_design
  end
  def update
# byebug
    @group_design = GroupDesign.find params[:id]
    if @group_design.update(group_design_params)
      redirect_to company_community_groups_path(@company), :notice => "Design updated successfully."
    else
      flash[:error] = @community_group.errors.full_messages.join(',')
      render "edit"
    end
  end
  def save_home_page_images

  end

  private

  def group_design_params
    params.require(:group_design).permit!  end
  def set_community
    @community = Community.find params[:id]
  end
end
