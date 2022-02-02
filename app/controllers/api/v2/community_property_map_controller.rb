class Api::V2::CommunityPropertyMapController < Api::V2::ApiApplicationController
  before_action :load_Community , only: [:show , :add_property_images]
  before_action :doorkeeper_authorize!

  def show
    if @community.is_sitemap
      property_map = @community.sitemap
      type = SITEMAP
    else
      property_map = @community.floorplates
      type = FLOORPLATE
    end
    if property_map
      render :json => {:success =>  true, data: render_property_maps(type , property_map)}
    else
      render :json => {:success => false , :message => "No property images found."}
    end
  end

  def add_property_images
    property_type = params["community"]["property_type"]
    if property_type.eql?(SITEMAP)
      property_map = add_sitemap_property(params)
      type = SITEMAP
    else
      property_map = add_floorplate_property(params)
      type = FLOORPLATE
    end
    @community.set_property_map_status(current_pynwheel_user)
    render json: {:success =>  true , data: render_property_maps(type , property_map)}
  end

  private

  def add_sitemap_property(params)
    sitemap_id = params["sitemap"]["id"]
    if sitemap_id.present?
      @sitemap = Sitemap.find_by_id(sitemap_id)
      @sitemap.update(sitemap_params)
    else
      @community.create_sitemap(sitemap_params)
    end
    @property_map = @community.sitemap
  end

  def add_floorplate_property(params)
    available_floorplates = {}
    floorplates = params["floorplate"]
    @property_map =
    floorplates.each do |floorplate|
      image = MiniMagick::Image.open(params[:floorplate][:image].path)
      if floorplate["id"].present?
        @floorplate = @community.floorplates.find_by_id(floorplate["id"])
        check_floorplate_validations(image)
        @floorplate = @floorplate.update(floorplate_params)
      else
        check_floorplate_validations(image)
        @floorplate = @community.floorplates.create(floorplate_params)
      end
      @available_floorplates << @floorplate
    end
    @property_map = available_floorplates
  end

  def check_floorplate_validations(image)
    if image.width < 1000 && image.height < 700 && image.type != "SVG"
      flash[:error] = "Too small property map image"
      render :new
    else
      @floorplate.width = (image.width rescue 0)
      @floorplate.height = (image.height rescue 0)
      if @floorplate.save
        flash[:notice] = "Floorplate created successfully."
        PaperTrail::Version.create(item_type: "Floorplate", item_id: @floorplate.id, event: "create", whodunnit: current_user.id, community_id: current_community.id, company_id: current_company.id, object: "name:#{@floorplate.name} community_id:#{@floorplate.community_id}")
        redirect_to community_floorplates_path(current_community)
        PaperTrail::Version.create(item_type: "Floorplate", item_id: @floorplate.id, event: "create", whodunnit: current_user.id, community_id: current_community.id, company_id: current_company.id, object: "name:#{@floorplate.name} community_id:#{@floorplate.community_id}")
      else
        add_breadcrumb "Floor plates", community_floorplates_path(current_community)
        add_breadcrumb "Add Floor plate", new_community_floorplate_path(current_community)
        flash[:error] = @floorplate.errors.full_messages.join(',')
        render :new
      end
    end
  end


  def load_Community
    @community = Community.find(params[:id])
  end

  def render_property_maps(type , property_map)
    {type => property_map.as_json}
  end

  def sitemap_params
    params.require(:sitemap).permit(:image , :label_image)
  end

  def floorplate_params
    params.require(:floorplate).permit(:name , :range , :image , :label_image)
  end


end
