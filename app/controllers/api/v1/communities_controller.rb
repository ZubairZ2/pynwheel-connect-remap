class Api::V1::CommunitiesController < ActionController::Base
  #before_action :set_community, only: [:data,:ios_data,:email_favorites]
  before_action :set_community, only: :email_favorites
  @@counter = 0

  def test_panzoom
    puts '<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<'
    puts params["keyCode"]
    puts '>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>'
    render :json=> {:success=>true, :message => "#{params['id']}", :operation => "zoom"}
  end

  def login
    begin
      str = params[:community_string]
      community = Community.where(code: str)
      unless community.present?
        community_group = CommunityGroup.where(code: str)
      end
      if community_group.present?
        
        community_group = community_group.first
        if community_group.inactivate == true
          render :json=> {:success=>true, :community => community_group.id,:name => community_group.name,:community_name => (Company.find community_group.company_id).name,:type => "community_group",:link => "/api/v1/communities/#{community_group.id}/data_group.json", :message => "success", :operation => "login"}
        else
          render :json=> {:success=>false, :message => "Your application is inactive. Please contact support@pynwheel.com for help. Thank you!", :operation => "login"}
        end
      else
        if community.present?
          company = community.first.company
          group = CommunityGroup.find_by id: community.first.community_group_id if community.first.community_group_id.present?
          if company.inactivate == false && !(community.first.locked == true)
            group_link = group.present? ? "/api/v1/communities/#{group.id}/data_group.json" : nil
            render :json=> {:success=>true, :community => community.first.id,:name => community.first.name,:community_name => company.name,:type => "community",:link =>  group.present? ? group_link : "/api/v1/communities/#{community.first.id}/data.json",:is_group => group.present?, :message => "success", :operation => "login"}
          else
            render :json=> {:success=>false, :message => "Your application is inactive. Please contact support@pynwheel.com for help. Thank you!", :operation => "login"}
          end
        else
          render :json=> {:success=>false, :message => "Community not found"}
        end
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
  def portico_list_communities
    @communities = Community.select(:id,:name,:company_id,:locked,:latitude,:longitude,:address,:logo).includes(:company).self_tour_enabled_only
  end
  def community_tours
    @community = Community.find params[:id]
    @tours = Tour.where(community_id: params[:id])
  end
  def user_saved_tour
    @device_id = params[:device_id]
    @tour_user = TourUser.find params[:id]
    @tours = VisitedStop.where(tour_user_id: @tour_user.id,device_id: @device_id).group('tour_id').group('tour_key').count
  end
  def include_application_data
    @version = AppVersion.first.version
    @community = Community.includes(:imagepages,:webpages,:galleries,{floorplans: [:amenities]},:favorite_setting,{sitemap: [:amenities]},{floorplates: [:amenities]},{units: [:floorplate]},{gallery_images: [:gallery]},{neighborhood: [:locations]},{design: [:home_page_images,:home_page_video,:gable,:menu,:expressionist,:filter_panel]}).find(params[:id])
  end
  def data_group
    @version = AppVersion.first.version
    @community_group = CommunityGroup.find params[:id]
    @communities = []

    @community_group.communities.each do |com|
      community = Community.includes(:imagepages,:webpages,:galleries,{floorplans: [:amenities]},:favorite_setting,{sitemap: [:amenities]},{floorplates: [:amenities]},{units: [:floorplate]},{gallery_images: [:gallery]},{neighborhood: [:locations]},{design: [:home_page_images,:home_page_video,:gable,:menu,:expressionist,:filter_panel]}).find(com.id)
      @communities << community
    end
  end
  def get_neighbourhood_data
    # @@counter = @@counter + 1
    app_version = AppVersion.first
    unless app_version.neighborhood_counter.present?
      app_version.neighborhood_counter = 0
    end
    app_version.neighborhood_counter = app_version.neighborhood_counter + 1
    result = nil
    if app_version.neighborhood_counter < 500
      NeighbourhoodLog.create(from_ip: request.ip,cat: params[:cat])
      begin
        if app_version.neighborhood_counter == 200
          com = Community.find params[:id]
          com.neighbourhood_counter_mail_200
          # NeighbourhoodMailer.email_counter_200("muhammad.umer@intagleo.com","umersani47@gmail.com","","Testing api calls 200").deliver
        end
        if app_version.neighborhood_counter == 400
          com = Community.find params[:id]
          com.neighbourhood_counter_mail_400
          # NeighbourhoodMailer.email_counter_400("test@gmail.com","umersani47@gmail.com","","Testing api calls 200").deliver
        end
      rescue => ex

      end
      @client = GooglePlaces::Client.new(ENV['GOOGLE_API_KEY'])
      results = []
      cata = []
      cata << params[:cat]
      result = @client.spots(params[:latitude].to_f, params[:longitude].to_f,:radius => params[:radius].to_i, :types => cata)

      if result.last.nextpagetoken.present?
        results << result
        begin
        result = @client.spots_by_pagetoken(result.last.nextpagetoken)
        rescue  => ex
        end
      end
      results << result
      render :json=> {:success=>true,:counter => app_version.neighborhood_counter, :message => results}, :status=>200
    else
      render :json=> {:success=>true,:counter => app_version.neighborhood_counter, :message => results}, :status=>200
    end
    app_version.save
  end
  def reset_counter
    # @@counter = 0
    app_version = AppVersion.first
    app_version.neighborhood_counter = 0
    app_version.save
    render :json=> {:success=>true,:counter => app_version.neighborhood_counter}, :status=>200
  end

  private

  def set_community
    @community = Community.find(params[:id])
  end
end