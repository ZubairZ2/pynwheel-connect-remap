class Api::V2::CommunityPropertyMapController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_Community , only: [:index , :add_property_images, :delete_property_map, :delete_label_image, :change_property_type]

  def index
    if @community.is_sitemap
      property_map = @community.sitemap
      type = SITEMAP
    end
    if @community.has_floorplates?
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
    @status = params["status"]
    if property_type.eql?(SITEMAP)
      # @community.floorplates.delete_all if @community.floorplates.present?
      @community.is_sitemap = true
      @community.save
      property_map = add_sitemap_property(params)
      type = SITEMAP
    else
      if @community.is_sitemap
        @community.is_sitemap = false
        @community.save
      end
      property_map = add_floorplate_property(params, @errors)
      type = FLOORPLATE
    end
    if @errors.blank?
      previous_status = PynwheelLaunch::Communities::CommunityDetailForms.new(@community).check_status_of_specific_form(PROPERTY_MAP_IMAGES)
      @community.set_property_map_status(current_pynwheel_user, @status)
      FollowUpMailer.send_email_after_form_submission(@community, PROPERTY_MAP_IMAGES, previous_status)
      render json: {:success =>  true , data: render_property_maps(type , property_map)}
    else
      render json: {:success =>  false , data: @errors}
    end
  end

  def delete_property_map
    @type = params["property_type"]
    if @type.eql?(SITEMAP)
      if @community.sitemap.present?
        if @community.sitemap.remove_image!
          @community.sitemap.save
          @community.set_property_map_status(current_pynwheel_user, "in_progress")
          render :json => {:success => true, :error_code => 200, :message => "Garden style community deleted successfully", data: nil}
        end
      end
    elsif @type.eql?(FLOORPLATE)
      floorplate = @community.floorplates.find_by(id: params["property_id"])
      if floorplate.present?
        if floorplate.delete
          @community.set_property_map_status(current_pynwheel_user, "in_progress")
          render :json => {:success => true, :error_code => 200, :message => "Mid high rise community deleted successfully", data: nil}
        end
      end
    end
  end

  def delete_label_image
    @type = params["property_type"]
    if @type.eql?(SITEMAP)
      sitemap = @community.sitemap
      if sitemap.present?
        if sitemap.remove_label_image!
          sitemap.save
          @community.set_property_map_status(current_pynwheel_user, "in_progress")
          render :json => {:success => true, :error_code => 200, :message => "Garden style community label image deleted successfully", data: nil}
        end
      end
    else
      floorplate = @community.floorplates.find_by(id: params["property_id"])
      if floorplate.present?
        if floorplate.remove_label_image!
          floorplate.save
          @community.set_property_map_status(current_pynwheel_user, "in_progress")
          render :json => {:success => true, :error_code => 200, :message => "Mid high rise community label image deleted successfully", data: nil}
        end
      end
    end
  end

  def change_property_type
    type = params["property_type"]
    if type.eql?(SITEMAP)
      sitemap = @community.sitemap
      if sitemap.present?
        @community.is_sitemap = false
        @community.save
        render :json => {:success => true, :error_code => 200, :message => "Garden style community details deleted successfully", data: nil}
      end
    else
      if @community.floorplates.present?
        # @community.floorplates.delete_all
        @community.is_sitemap = true
        @community.save
        render :json => {:success => true, :error_code => 200, :message => "Mid high rise community details deleted successfully", data: nil}
      end
    end
  end

  private

  def add_sitemap_property(params)
    @sitemap = @community.sitemap || @community.create_sitemap
    if @sitemap.present?
      @sitemap.update(sitemap_params)
    end
    @property_map = @community.sitemap
  end

  def add_floorplate_property(params , errors)
    floorplates = params["floorplate"]
    @property_map = ""
    floorplates.values.each do |floorplate|
      if floorplate["id"].present?
        @floorplate = @community.floorplates.find_by_id(floorplate["id"])
        @floorplate.update_columns(name: floorplate["name"], range: floorplate["range"])
        @floorplate.update_columns(label_image: floorplate["label_image"]) if floorplate["label_image"].present?
      else
        if floorplate["image"].present?
          image = MiniMagick::Image.open(floorplate["image"].path)
          @floorplate = @community.floorplates.create(name: floorplate["name"] , image: floorplate["image"] , label_image: floorplate["label_image"] , range: floorplate["range"] , width: image.width , height: image.height)
        else
          @floorplate = @community.floorplates.create(name: floorplate["name"] , file: floorplate["file"] , label_image: floorplate["label_image"] , range: floorplate["range"] )

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
    @community = Community.find(params[:community_id])
  end

  def render_property_maps(type, property_map)
    { type => property_map.as_json }
  end

  def sitemap_params
    params.require(:sitemap).permit(:status)
    params.require(:sitemap).permit(:image , :label_image, :file)
  end

end
