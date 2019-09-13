class CommunityGroupsController < ApplicationController
  def index
    @community_groups = CommunityGroup.all
  end
  def new
    @community_group = CommunityGroup.new
  end
  def create
    @community_group = CommunityGroup.new(community_group_params)
    if @community_group.save
      @company = Company.find @community_group.company_id
      redirect_to company_community_groups_path(@company)
    else
      flash[:error] = @community_group.errors.full_messages.join(',')
      render "new"
    end
  end
  def edit
    @community_group = CommunityGroup.find params[:id]
  end
  def update
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
          community.community_group_id = @community_group.id
          community.save
        end
      end
      @company = Company.find @community_group.company_id
      redirect_to company_community_group_path(@company.id,@community_group)
    end
  end

  def show
    @community_group = CommunityGroup.find params[:id]
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
  end
end