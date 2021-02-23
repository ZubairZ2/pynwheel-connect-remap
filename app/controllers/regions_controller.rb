class RegionsController < ApplicationController

  before_action :find_region, only: [:show, :edit, :update, :destroy]

  def index
    @regions = alphabetical_sort(Region.where(company_id: current_company.id))
  end

  def show
  
  end
  
  def new
    @region = Region.new
    @not_assigned_communities = current_company.communities.where(region_id: nil).collect{|c| [c.name,c.id]}
  end

  def create
    params[:region][:name].strip!
    ids = params[:region][:communities].reject(&:blank?).map(&:to_i)
    @region = current_company.regions.new(region_params)
    if @region.save
      Community.where(id: ids).update_all(region_id: @region.id) if ids.present?
      redirect_to company_regions_path(current_company.id), notice: 'Region created successfully.'
    else
      flash[:error] = @region.errors.full_messages.join(',')
      render "new"
    end
  end

  def edit
    @not_assigned_communities = current_company.communities.where(region_id: [nil, @region.id]).collect{|c| [c.name,c.id]}
  end

  def update
    params[:region][:name].strip!
    old_communities_ids = @region.communities.pluck(:id)
    new_communities_ids = params[:region][:communities].reject(&:blank?).map(&:to_i)
    new_updated_ids = new_communities_ids - old_communities_ids
    nill_updated_ids = old_communities_ids - new_communities_ids
    if @region.update(region_params)
      Community.where(id: new_updated_ids).update_all(region_id: @region.id) if new_updated_ids.present?
      Community.where(id: nill_updated_ids).update_all(region_id: nil) if nill_updated_ids.present?
      redirect_to company_regions_path(current_company.id), notice: 'Region updated successfully.'
    else
      flash[:error] = @region.errors.full_messages.join(',')
      render "edit"
    end
  end

  def destroy
    @region.destroy
    @company = Company.find @region.company_id
    redirect_to company_regions_path(@company), notice: 'Region deleted successfully.'
  end

  def remove_community
    @region = Region.find params[:id]
    community = Community.find params[:community]
    community.update_column(:region_id, nil)
    @company = Company.find @region.company_id
    redirect_to company_region_path(@company.id,@region), notice: 'Community removed from region successfully.'
  end

  private

  def region_params
    params.require(:region).permit(:name, :contact, :phone, :email)
  end

  def find_region
    @region = Region.find(params[:id])    
  end

end
