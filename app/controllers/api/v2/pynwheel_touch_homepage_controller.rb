class Api::V2::PynwheelTouchHomepageController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community, only: [:index, :add_homepage_design]

  def index
    @design = @community.design || @community.create_design
    images = @design.home_page_images
    video = @design.home_page_video
    if images.any?
      render json: { success: true, data: render_homepage_design(HOMEPAGE_IMAGE, images) }
    elsif video.present?
      render json: { success: true, data: render_homepage_design(HOMEPAGE_VIDEO, video) }
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
          if homevideo.present?
            homevideo.destroy
          end
          @uploader =  HomePageVideo.new
          if @uploader.save
            @uploader.video = homepage["file"]
            @uploader.design_id = @community.design.id
            @uploader.save
          end
        else
          if homepage_id.present?
            @community.design.home_page_images.update(image: homepage["file"])
          else
            @community.design.home_page_images.create(image: homepage["file"])
          end
        end
      end
      type = @type.eql?(HOMEPAGE_VIDEO) ? HOMEPAGE_VIDEO : HOMEPAGE_IMAGE
      data = @type.eql?(HOMEPAGE_VIDEO) ? @community.design.home_page_video : @community.design.home_page_images
      @community.set_touch_vidoes_status(current_pynwheel_user)
      render json: { success: true, data: render_homepage_design(type, data) }
    rescue => ex
      render json: { success: false, message: ex.message }
    end
  end

  private

  def load_community
    @community = Community.find(params[:community_id])
  end

  def render_homepage_design(type, homepage_design)
    { type => homepage_design.as_json }
  end

  def community_params
    params.require(:homepage).permit(:community_id)
  end
end
