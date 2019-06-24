class Api::V1::CommunitiesController < ActionController::Base
  #before_action :set_community, only: [:data,:ios_data,:email_favorites]
  before_action :set_community, only: :email_favorites
  def login
    begin
      str = params[:community_string]
      community = Community.where(code: str)
      if community.present?
        company = community.first.company
        if company.inactivate == false && !(community.first.locked == true)
          render :json=> {:success=>true, :community => community.first.id, :message => "success", :operation => "login"}      
        else
          render :json=> {:success=>false, :message => "Your application is inactive. Please contact support@pynwheel.com for help. Thank you!", :operation => "login"}
        end
      else
        render :json=> {:success=>false, :message => "Community not found"}
      end
    rescue Exception => e   
      render :json=> {:success=>false, :message => e.message}, :status=>500
    end
  end

  def data
    include_application_data
  end

  def ios_data
    include_application_data
    if !(@community.locked == true) && @community.company.inactivate == false
      render 'data'
    else
      render :json=> {:success=>false, :message => "Your application is inactive. Please contact support@pynwheel.com for help. Thank you!", :operation => "login"}
    end
  end

  def minimum_data
    include_application_data
    render json: {:ui_settigs=>UiPresenter.minimal_hash(@community),:homescreen=>HomescreenPresenter.minimal_hash(@community),:apartments=>ApartmentsPresenter.minimal_hash(@community,params[:action]),:neighborhood=>NeighborhoodPresenter.minimal_hash(@community),:favorite=>FavoritePresenter.minimal_hash(@community),:gallery=>GalleryPresenter.minimal_hash(@community,params[:action]),:additional_pages=>AdditionalPagesPresenter.minimal_hash(@community)}.to_json
    #render json: {:ui_settigs=>UiPresenter.minimal_hash(@community),:homescreen=>HomescreenPresenter.minimal_hash(@community),:apartments=>ApartmentsPresenter.minimal_hash(@community,params[:action]),:neighborhood=>NeighborhoodPresenter.minimal_hash(@community),:favorite=>FavoritePresenter.minimal_hash(@community),:additional_pages=>AdditionalPagesPresenter.minimal_hash(@community)}
  end

  def email_favorites
    begin
      if !@community.favorite_setting.present? || @community.favorite_setting.email_from.blank?
        render :json=> {:success=>false, :message => "Please specify sender email address in CMS first. Email from can't be empty.", :operation => "email favorites"}
      else
        if @community.email_favorites(params)
          render :json=> {:success=>true, :message => "success", :operation => "email favorites"}
        else
          render :json=> {:success=>false, :message => "No valid favorites present"}
        end
      end
    rescue Exception => e   
      ExceptionNotifier.notify_exception(e,data: {community_id: @community.id})
      render :json=> {:success=>false, :message => e.message}, :status=>500
    end
  end
  
  def update_version
    app_version = AppVersion.first
    if app_version.version != params[:version]
      app_version.update_attribute(:version,params[:version])
    end
    render :json=> {:success=>true, :message => "success", :operation => "update version"}
  end

  def list_communities
    @communities = Community.select(:id,:name,:company_id,:locked,:latitude,:longitude,:address,:logo).includes(:company)
  end
  def community_tours
    @community = Community.find params[:id]
    @tours = Tour.where(community_id: params[:id])
  end
  def user_saved_tour
    @tour_user = TourUser.find params[:id]
    @tours = VisitedStop.where(tour_user_id: @tour_user.id,device_id: params[:device_id]).group('tour_id').group('tour_key').count
  end
  def include_application_data
    @version = AppVersion.first.version
    @community = Community.includes(:imagepages,:webpages,:galleries,{floorplans: [:amenities]},:favorite_setting,{sitemap: [:amenities]},{floorplates: [:amenities]},{units: [:floorplate]},{gallery_images: [:gallery]},{neighborhood: [:locations]},{design: [:home_page_images,:home_page_video,:gable,:menu,:expressionist,:filter_panel]}).find(params[:id])
  end

  private

  def set_community
    @community = Community.find(params[:id])
  end
end