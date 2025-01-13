class Api::V2::PynwheelTouchHomepageController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community, only: [:index, :add_homepage_design, :all_design, :delete_homepage_video, :delete_home_page_image, :change_default_design]

  def index
    @media = all_design if @community.present?

    if @media.any?
      render json: { success: true, data: @media.as_json }
    else
      render json: { success: false, message: 'Image or video not found for this community.' }
    end
  end

  def add_homepage_design
    homepage_params = params['homepage_design']
    @status = params["status"]
    @type = params['homepage_type']
    homepage_params.values.each do |homepage|
      homepage_id = homepage['id']
      if @type.eql?(HOMEPAGE_VIDEO)
        homevideo = HomePageVideo.where(design_id: @community.design.id).first
        homevideo.destroy if homevideo.present? && homepage['file'].present?
        if homepage['file'].present?
          @uploader = HomePageVideo.new
          if @uploader.save
            @uploader.video = homepage['file']
            @uploader.name = homepage['name']
            @uploader.design_id = @community.design.id
            @uploader.save
          end
        end
      elsif !homepage_id.present?
        @community.design.home_page_images.create(image: homepage['file'])
      end
    end
    media = all_design
    previous_status = PynwheelLaunch::Communities::CommunityDetailForms.new(@community).check_status_of_specific_form(TOUCH_HOME_PAGE_MEDIA)
    @community.set_touch_vidoes_status(current_pynwheel_user, @status)
    FollowUpMailer.send_email_after_form_submission(@community, TOUCH_HOME_PAGE_MEDIA, previous_status)
    render json: { success: true, data: media.as_json }
  rescue StandardError => e
    render json: { success: false, message: e.message }
  end

  def delete_homepage_video
    if @community.present?
      @homevideo = HomePageVideo.where(design_id: @community.design.id).first
      if @homevideo.present?
        if @homevideo.destroy!
          @community.set_touch_vidoes_status(current_pynwheel_user, "in_progress")
          render json: { success: true, error_code: 200, message: 'Homepage video deleted successfully',
                         data: nil }
        else
          render json: { success: false, error_code: 500, message: @homevideo.errors.full_messages }
        end
      end
    end
  end

  def delete_home_page_image
    if @community.present?
      design = @community.design
      if design.present?
        @home_page_image = design.home_page_images.find_by(id: params[:homepage_image_id])
        if @home_page_image.present?
          if @home_page_image.destroy!
            @community.set_touch_vidoes_status(current_pynwheel_user, "in_progress")
            render json: { success: true, error_code: 200, message: 'Homepage image deleted successfully', data: nil }
          else
            render json: { success: false, error_code: 500, message: @home_page_image.errors.full_messages }
          end
        end
      end
    end
  end

  def change_default_design
    @design = @community.design
    value = params["changeType"]
    if  value.present?
      if @design.update(loop_type: value)
        render :json => {success: true, message: "Default design changed"}
      else
        render :json => {success: false, message: "Failed to change default design"}
      end
    end
  end

  private

  def all_design
    @design = @community.design || @community.create_design
    images = @design.home_page_images
    video = @design.home_page_video
    type = @design.loop_type
    media = []
    media << { images: images.as_json, type: type } if images.any?
    media << { video: video.as_json, type: type } if video.present?
    media
  end

  def load_community
    @community = Community.find(params[:community_id])
  rescue ActiveRecord::RecordNotFound
    render json: { success: false, error_code: 400, message: 'Community not found', data: nil }, status: :not_found
  end

  def render_homepage_design(type, homepage_design)
    { type => homepage_design.as_json }
  end

  def community_params
    params.require(:homepage).permit(:community_id)
  end
end
