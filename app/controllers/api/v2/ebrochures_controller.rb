class Api::V2::EbrochuresController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community
  before_action :load_favorite, only: [:add_favorite_ebrochure, :delete_ebrochure_weblink, :delete_ebrouchure_image]
  def index
    favorite = @community.favorite_setting || @community.create_favorite_setting
    if favorite.present?
      render json: {success: true, data: favorite.as_json}
    else
      render json: {success: false, data: nil, message: "Favorite Settings not found!"}
    end
  end

  def add_favorite_ebrochure
    begin
      if @favorite_setting.present?
        @status = params['status'] || ""
        ebrochure_params = params['ebrochure']
        add_favorite_image(ebrochure_params['images']) if ebrochure_params['images'].present?
        add_ebrochure_weblink(ebrochure_params['weblink']) if ebrochure_params['weblink'].present?
      end
      @community.submit_launch_form(EBROCHURE, current_pynwheel_user, @status)
      render json: { success: true, data: @favorite_setting.as_json }
    rescue => e
      render json: { success: false, message: e.message }
    end
  end

  def delete_ebrochure_weblink
    if @favorite_setting.present?
      weblink_id = params['weblink_id']
      if weblink_id.present?
        @weblink = EbrochureMenuButton.find weblink_id
        if @weblink.destroy!
          @community.set_ebrochure_status(current_pynwheel_user, "in_progress")
          render json: { success: true, message: "Weblink deleted successfully!", data: @favorite_setting.as_json }
        else
          render json: { success: false, message: "Failed to delete weblink!", data: nil }
        end
      end
    end
  end

  def delete_ebrouchure_image
    if @favorite_setting.present?
      image_id = params['image_id']
      delete_image = FavoriteImage.find image_id
      if delete_image.present?
        if delete_image.destroy!
          @community.set_ebrochure_status(current_pynwheel_user, "in_progress")
          render json: {success: true, data: @favorite_setting.as_json}
        else
          render json: {success: false, data: nil, message: "Failed to delete image!"}
        end
      else
        render json: {success: false, data: nil, message: "Image not found!"}
      end
    end
  end

  private

  def add_ebrochure_weblink(weblinks)
    weblinks.each_value do |weblink|
      if weblink['id'].present?
        weblink_update = EbrochureMenuButton.find weblink['id']
        weblink_update.update(name: weblink['name'], url: weblink['url'])
      else
        @favorite_setting.ebrochure_menu_buttons.create(name: weblink['name'], url: weblink['url'])
      end
    end
  end

  def add_favorite_image(images)
    images.each_value do |image|
      if image['image'].present?
        @favorite_setting.favorite_images.delete_all if @favorite_setting.favorite_images.present?
        @favorite_setting.favorite_images.create(image: image['image'])
      end
    end
  end

  def load_favorite
    @favorite_setting = FavoriteSetting.find params[:ebrochure_id]
  rescue ActiveRecord::RecordNotFound
    render json: { success: false, error_code: 400, message: 'Community not found', data: nil }, status: :not_found
  end

  def load_community
    @community = Community.find params[:community_id]
  rescue ActiveRecord::RecordNotFound
    render json: { success: false, error_code: 400, message: 'Community not found', data: nil }, status: :not_found
  end

end
