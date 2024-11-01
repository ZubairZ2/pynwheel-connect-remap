class HomePageController < ApplicationController
  # include Error::ErrorHandler
  add_breadcrumb "Home", :root_path
  before_action :check_community
  add_breadcrumb "Home Page", :community_home_page_index_path
  # before_action :set_s3_direct_post, only: [:index]

  def index
    @uploader = HomePageVideo.new.video
    @uploader.success_action_redirect = upload_video_direct_community_home_page_index_url

    @design = current_community.design || current_community.create_design
      @home_page_images = @design.home_page_images.order(:sort).all
  end

  def save_home_page_image
    image = MiniMagick::Image.open(params[:file].path)
    current_community.design.home_page_images.create(image: params[:file],is_small: (image.width < 800 && image.height < 600) ? true : false)
    #@home_page_images = current_community.design.home_page_images.order(:sort).all
    render :json=>{"status"=>"sucdess"}
  end

  def upload_video_direct

    home = HomePageVideo.where(design_id: current_community.design.id).first
    if home.present?
      home.destroy
    end
    @uploader =  HomePageVideo.new(params[:home_page_video])
    # "https://images-pynwheel-cms-v2.s3.amazonaws.com/uploads/home_page_video/video/11/1565361189-1565352260-Short_funny_clips.mp4"
    # file_key = "uploads/home_page_video/video/1403/#{SecureRandom.uuid}-#{params[:doc][:video]}"
    # @document = HomePageVideo.create(video: params[:doc][:video])
    # byebug
    # render :json => {
    #     :policy => s3_upload_policy_document(file_key),
    #     :signature => s3_upload_signature(file_key),
    #     :key => file_key,
    #     :success_action_redirect => upload_video_direct_community_home_page_index_url
    # }
    if @uploader.save
      # binding.pry
      # Resque.enqueue(AvatarProcessor, @uploader.id, params[:key])
      @uploader.remote_video_url = @uploader.video.direct_fog_url + params[:key]
      @uploader.design_id = current_community.design.id

      @uploader.save
      redirect_to community_home_page_index_path, notice: 'Video has been uploaded'
    else
      render action: "index"
    end
  end
  def show_image_in_modal
    @home_page_image = HomePageImage.find(params[:home_page_image_id])
  end

  def update_home_page_image
    @home_page_image = HomePageImage.find(params[:home_page_image_id])
    if @home_page_image.crop_x == params[:home_page_image][:crop_x].to_f
      @home_page_image.do_crop = false
    else
      @home_page_image.do_crop = true
    end
    if params[:home_page_image][:crop_h].to_f == 0 && params[:home_page_image][:crop_w].to_f == 0
      @home_page_image.do_crop = false
    else
      @home_page_image.is_small = (params[:home_page_image][:crop_w].to_f < 800 && params[:home_page_image][:crop_h].to_f < 600) ? true : false
    end
    @home_page_image.update(home_page_image_params)
    #PaperTrail::Version.create(item_type: "HomePageImage",item_id: @home_page_image.id,event: "update",whodunnit: current_user.id,community_id: current_community.id, company_id: current_company.id,object: "name: #{@home_page_image.name} community_id: #{@home_page_image.design.community_id}")
    flash[:notice] = "Image is edited successfully."
    redirect_back(fallback_location: root_path)
  end

  def delete_home_page_image
    @home_page_image = HomePageImage.find(params[:home_page_image_id])
    @home_page_image.destroy
    flash[:notice] = "Image deleted successfully."
    redirect_back(fallback_location: root_path)
  end

  def show_home_page_video
       
  end

  def save_home_page_video
    if current_community.design.home_page_video.present?
      current_community.design.home_page_video.update_column(:video,params[:file])
    else
      current_community.design.create_home_page_video(video: params[:file])
    end
    render :json=>{"status"=>"success"}
  end

  def delete_home_page_video
    @home_page_video = HomePageVideo.find(params[:home_page_video_id])
    @home_page_video.destroy
    flash[:notice] = "Video deleted successfully."
    redirect_to community_home_page_index_path(current_community,tab: "videos")
  end

  def update_animation
    @design = Design.find params[:design_id]
    @design.animation = params[:animation]
    if @design.save
      message = '<div class="alert alert-success">Animation updated successfully.</div>'
      render js: "$('#flash-message').html('#{message}')"
    else
      message = '<div class="alert alert-warning">Unable to update Animation.</div>'
      render js: "$('#flash-message').html('#{message}')"
    end
  end

  def s3_confirm
    head :ok
  end
  private

  # def s3_upload_policy_document(file_key)
  #   return @policy if @policy
  #   ret = {"expiration" => 5.minutes.from_now.utc.xmlschema,
  #          "conditions" =>  [
  #              {"bucket" =>  ENV['S3_BUCKET_NAME']},
  #              ["starts-with", "$key", file_key],
  #              {"acl" => "private"},
  #              {"success_action_status" => "200"},
  #              ["content-length-range", 0, 1048576]
  #          ]
  #   }
  #   @policy = Base64.encode64(ret.to_json).gsub(/\n/,'')
  #   @policy
  # end
  #
  # # sign our request by Base64 encoding the policy document.
  # def s3_upload_signature(file_key)
  #   signature = Base64.encode64(OpenSSL::HMAC.digest(OpenSSL::Digest::Digest.new('sha1'), ENV['AWS_SECRET_ACCESS_KEY'], s3_upload_policy_document(file_key))).gsub("\n","")
  # end
  # def set_s3_direct_post
  #   @s3_direct_post = S3_BUCKET.presigned_post(key: "uploads/#{SecureRandom.uuid}/${filename}", success_action_status: '201', acl: 'public-read')
  # end

  def home_page_image_params
    params.require(:home_page_image).permit!
  end

  def home_page_video_params
    params.require(:home_page_video).permit!
  end

  def iframe
    render :layout => false
  end
end