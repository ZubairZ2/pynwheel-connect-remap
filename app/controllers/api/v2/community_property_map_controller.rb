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
      render :json => {:success =>  true, data: render_property_maps(type , property_map), svg_settings: svg_settings}
    else
      render :json => {:success => false , :message => "No property images found.", svg_settings: svg_settings}
    end
  end

  def add_property_images
    @errors = []
    property_type = params["community"]["property_type"]
    @status = params["status"]
    # SVGs are checked before anything is written, so a bad file leaves the
    # property's maps as they were.
    @svg_docs = read_uploaded_svgs(property_type, @errors)
    return render(json: {:success => false, data: @errors}) if @errors.present?

    background_svg = params.dig("community", "background_svg_image")
    @community.update(background_svg_image: background_svg) if background_svg.present?

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
      @community.submit_launch_form(PROPERTY_MAP_IMAGES, current_pynwheel_user, @status)
      render json: {:success =>  true , data: render_property_maps(type , property_map), svg_settings: svg_settings}
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
      svg_doc = @svg_docs[:sitemap]
      if svg_doc
        @sitemap.svg_metadata = svg_dimensions(svg_doc)
        @sitemap.is_ocr_enabled = false
      end
      @sitemap.update(sitemap_params)
      # Same as Connect: drop only the plots whose shapes the new artwork lacks.
      SvgPlotRevalidator.call(@community, svg_doc) if svg_doc
    end
    @property_map = @community.sitemap
  end

  def add_floorplate_property(params , errors)
    floorplates = params["floorplate"]
    @property_map = ""
    floorplates.values.each_with_index do |floorplate, index|
      if floorplate["id"].present?
        @floorplate = @community.floorplates.find_by_id(floorplate["id"])
        @floorplate.update(name: floorplate["name"], range: floorplate["range"])
        @floorplate.update(label_image: floorplate["label_image"]) if floorplate["label_image"].present?
      else
        if floorplate["image"].present?
          image = MiniMagick::Image.open(floorplate["image"].path)
          @floorplate = @community.floorplates.create(name: floorplate["name"] , image: floorplate["image"] , label_image: floorplate["label_image"] , range: floorplate["range"] , width: image.width , height: image.height)
        elsif floorplate["svg_image"].present?
          @floorplate = @community.floorplates.create(name: floorplate["name"] , svg_image: floorplate["svg_image"] , svg_metadata: svg_dimensions(@svg_docs[index]) , label_image: floorplate["label_image"] , range: floorplate["range"])
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

  # What the Launch form needs to know about how this property's maps are drawn.
  def svg_settings
    {
      enable_svg_mode: @community.enable_svg_mode?,
      is_beans_svg: @community.is_beans_svg?,
      background_svg_image: @community.background_svg_image&.url
    }
  end

  # Parses every SVG in the request, keyed :sitemap or by floorplate position,
  # adding a message to `errors` for each one that can't be used.
  def read_uploaded_svgs(property_type, errors)
    docs = {}
    if property_type.eql?(SITEMAP)
      file = params.dig("sitemap", "svg_image")
      docs[:sitemap] = read_svg(file, "Property map", errors, min_size: true) if file.present?
    else
      (params["floorplate"]&.values || []).each_with_index do |floorplate, index|
        next if floorplate["id"].present? || floorplate["svg_image"].blank?

        docs[index] = read_svg(floorplate["svg_image"], "Floor #{floorplate['name']} map", errors)
      end
    end

    background = params.dig("community", "background_svg_image")
    read_svg(background, "Background map", errors) if background.present?
    docs
  end

  # Mirrors the checks Connect runs on an SVG upload (SvgUploadHelper), which
  # the site map also holds to a minimum size.
  def read_svg(file, label, errors, min_size: false)
    unless file.respond_to?(:content_type) && file.content_type == "image/svg+xml"
      errors << "#{label} must be an SVG file."
      return nil
    end

    doc = Nokogiri::XML(File.read(file.path)) { |config| config.strict }
    if min_size && svg_too_small?(doc)
      errors << "#{label} is too small; it must be at least #{SvgUploadHelper::MIN_WIDTH}x#{SvgUploadHelper::MIN_HEIGHT}."
      return nil
    end
    doc
  rescue Nokogiri::XML::SyntaxError => ex
    Rails.logger.error "SVG parse failed: #{ex.message}"
    errors << "#{label} is not a valid SVG file."
    nil
  end

  def svg_too_small?(doc)
    width, height = svg_dimensions(doc).values_at(:width, :height)
    width < SvgUploadHelper::MIN_WIDTH && height < SvgUploadHelper::MIN_HEIGHT
  end

  # Exported SVGs often carry only a viewBox, so fall back to its size.
  def svg_dimensions(doc)
    root = doc&.root
    return { width: 0, height: 0 } unless root

    _x, _y, box_width, box_height = root["viewBox"].to_s.split(/[\s,]+/).map(&:to_f)
    {
      width: root["width"].to_i.nonzero? || box_width.to_i,
      height: root["height"].to_i.nonzero? || box_height.to_i
    }
  end

  def render_property_maps(type, property_map)
    { type => property_map.as_json }
  end

  def sitemap_params
    params.require(:sitemap).permit(:status)
    params.require(:sitemap).permit(:image , :label_image, :file, :svg_image)
  end

end
