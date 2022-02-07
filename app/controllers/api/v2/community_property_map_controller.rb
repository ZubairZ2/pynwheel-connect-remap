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
    @errors = []
    property_type = params["community"]["property_type"]
    if property_type.eql?(SITEMAP)
      property_map = add_sitemap_property(params)
      type = SITEMAP
    else
      property_map = add_floorplate_property(params , @errors)
      type = FLOORPLATE
    end
    if @errors.blank?
      @community.set_property_map_status(current_pynwheel_user)
      render json: {:success =>  true , data: render_property_maps(type , property_map)}
    else
      render json: {:success =>  false , data: @errors}
    end
  end

  private

  def add_sitemap_property(params)
    sitemap_id = params["sitemap"]["id"]
    if sitemap_id.present?
      @sitemap = Sitemap.find_by_id(sitemap_id)
      @sitemap.update(sitemap_params)
      PaperTrail::Version.create(item_type: "Sitemap",item_id: @sitemap.id,event: "update",whodunnit: current_pynwheel_user.id,community_id: @community.id, company_id: @community.company.id,object: "id: '#{@sitemap.id}' community_id: '#{@community.id}'")
    else
      @community.create_sitemap(sitemap_params)
      PaperTrail::Version.create(item_type: "Sitemap",item_id: @community.sitemap.id,event: "create",whodunnit: current_pynwheel_user.id,community_id: @community.id, company_id: @community.company.id,object: "id: '#{@community.sitemap.id}' community_id: '#{@community.id}'")
    end
    @property_map = @community.sitemap
  end

  def add_floorplate_property(params , errors)
    floorplates = params["floorplate"]
    @property_map =
    floorplates.values.each do |floorplate|
      image = MiniMagick::Image.open(floorplate["image"].path)
      if floorplate["id"].present?
        @floorplate = @community.floorplates.find_by_id(floorplate["id"])
        if @floorplate.update_attributes(name: floorplate["name"] , image: floorplate["image"] , label_image: floorplate["label_image"] , range: floorplate["range"] , width: image.width , height: image.height)
          PaperTrail::Version.create(item_type: "Floorplate", item_id: @floorplate.id, event: "update", whodunnit: current_user.id, community_id: @community.id, company_id: @community.company.id, object: "name:#{@floorplate.name} community_id:#{@floorplate.community_id}")
        else
          errors.push(@floorplate.errors.full_messages)
        end
      else
        @floorplate = @community.floorplates.create(name: floorplate["name"] , image: floorplate["image"] , label_image: floorplate["label_image"] , range: floorplate["range"] , width: image.width , height: image.height)
        if @floorplate.persisted?
          PaperTrail::Version.create(item_type: "Floorplate", item_id: @floorplate.id, event: "create", whodunnit: current_user.id, community_id: @community.id, company_id: @community.company.id, object: "name:#{@floorplate.name} community_id:#{@floorplate.community_id}")
        else
          errors.push(@floorplate.errors.full_messages)
        end
      end
    end
    if errors.blank?
      @property_map = @community.floorplates
    else
      return errors
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

end
