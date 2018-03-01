class SitemapsController < ApplicationController
  before_action :set_community
  add_breadcrumb "Home", :root_path

  def map
    add_breadcrumb "Property Map", map_community_sitemaps_path(current_community)
    add_breadcrumb "Add Site Map", map_community_sitemaps_path
    @sitemap = @community.sitemap || @community.build_sitemap
  end

  def create
    @sitemap = @community.build_sitemap(sitemap_params)
    if @sitemap.save
      flash[:notice] = "Sitemap created successfully."
      redirect_to map_community_sitemaps_path
    else
      flash[:error] = @sitemap.errors.full_messages.join(',')
      render :map
    end
  end

  def update
    if @community.sitemap.update(sitemap_params)
      flash[:notice] = "Sitemap updated successfully."
      # redirect_to map_community_sitemaps_path
    else
      flash[:error] = @community.sitemap.errors.full_messages.join(',')
      # render :new
    end
  end

  def plotexp
    add_breadcrumb "Property Map", map_community_sitemaps_path(current_community)
    add_breadcrumb "Plot Property Map Units", plotexp_community_sitemaps_path
    @sitemap = @community.sitemap || @community.build_sitemap
    unless @community.units.size > 0
      flash[:error] = "Please import unit data first"
    end
    @units = @community.units.where(floorplate_id: nil).order(:building, :unit_type)
    # get member(:plotexp) do
    #   authorize! :plot, Sitemap
    #   @map = @sitemap
    #   @units = Unit.all :community_id => @sitemap.community_id, :order => [:building, :number]
            
    #   if params[:unit_id].to_i != 0
    #     @unit = @sitemap.community.units.get params[:unit_id].to_i
    #   end
      
    #   # get pre-selected units
    #   session[:before] = []
    #   @sitemap.community.units.sort! { |x, y| x["number"].to_s <=> y["number"].to_s }
    #   @sitemap.community.units.each do |u|
    #     session[:before] << u.id
    #   end
      
    #   marker = Marker.first :community_id => @sitemap.community_id, :type => "sitemap_bdr_1"
    #   @marker_tag = "<i class='icon-screenshot'></i>"
			
    #   erb :'sitemap/plotexp'
    # end
  end

  def list_amenities
    @sitemap = @community.sitemap
    @amenities = @sitemap.amenities
  end

  def plot_amenities
    add_breadcrumb "Property Map", map_community_sitemaps_path(current_community)
    add_breadcrumb "Plot Property Map Amenities", plot_amenities_community_sitemaps_path(current_community) 
    @sitemap = @community.sitemap
    @amenities = @sitemap.amenities
  end
    
  private

  def set_community
    @community = Community.find(params[:community_id])
  end

  def sitemap_params
    params.require(:sitemap).permit!
  end

end

