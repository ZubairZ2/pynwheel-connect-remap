class Api::V2::PynwheelTouchHomepageController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community, only: [:index, :add_homepage_design, :all_design, :delete_homepage_video, :delete_home_page_image]

  def index
    @media = all_design if @community.present?

    if @media.any?
      render json: { success: true, data: @media.as_json }
    else
      render json: { success: false, message: "Image or video not found for this community." }
    end
  end

  def add_homepage_design
    begin
      homepage_params = params["homepage_design"]
      @type = params["homepage_type"]
      homepage_params.values.each do |homepage|
        homepage_id = homepage["id"]
        if @type.eql?(HOMEPAGE_VIDEO)
          homevideo = HomePageVideo.where(design_id: @community.design.id).first
          homevideo.destroy if homevideo.present?
          @uploader = HomePageVideo.new
          if @uploader.save
            @uploader.video = homepage["file"]
            @uploader.name = homepage["name"]
            @uploader.design_id = @community.design.id
            @uploader.save
          end
        else
          if !homepage_id.present?
            @community.design.home_page_images.create(image: homepage["file"])
          end
        end
      end
      media = all_design
      @community.set_touch_vidoes_status(current_pynwheel_user)
      email = PynwheelLaunch::Communities::FollowUpEmails.new(@community).send_emails
        email[:data].each do |mail|
          if mail[:name].eql?(TOUCH_HOME_PAGE_MEDIA) && mail[:status].eql?("Submitted")
            FollowUpMailer.send_submitted_form(@community, TOUCH_HOME_PAGE_MEDIA, email[:data]).deliver_later
          end
        end
      render json: { success: true, data: media.as_json }
    rescue => ex
      render json: { success: false, message: ex.message }
    end
  end

  def delete_homepage_video
    if @community.present?
      @homevideo = HomePageVideo.where(design_id: @community.design.id).first
      if @homevideo.present?
        if @homevideo.destroy!
          @community.set_touch_vidoes_status(current_pynwheel_user)
          render :json => {:success => true, :error_code => 200, :message => "Homepage video deleted successfully", data: nil}
        else
          render :json => {:success => false, :error_code => 500, :message => @homevideo.errors.full_messages}
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
            @community.set_touch_vidoes_status(current_pynwheel_user)
            render :json => {:success => true, :error_code => 200, :message => "Homepage image deleted successfully", data: nil}
          else
            render :json => {:success => false, :error_code => 500, :message => @home_page_image.errors.full_messages}
          end
        end
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
    if images.any?
      media << { images: images.as_json, type: type }
    end
    if video.present?
      media << { video: video.as_json, type: type }
    end
    media
  end

  def load_community
    @community = Community.find(params[:community_id])
    rescue ActiveRecord::RecordNotFound
    render json: {success: false, error_code: 400, message: 'Community not found', data: nil}, status: :not_found
  end

  def render_homepage_design(type, homepage_design)
    { type => homepage_design.as_json }
  end

  def community_params
    params.require(:homepage).permit(:community_id)
  end
  
end
