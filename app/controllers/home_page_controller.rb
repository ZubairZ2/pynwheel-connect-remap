class HomePageController < ApplicationController
  # before_action :check_community
  add_breadcrumb "Home", :root_path
  before_action :check_community
  add_breadcrumb "Home Page", :community_home_page_index_path
  def index
    @design = current_community.design || current_community.create_design
      @home_page_images = @design.home_page_images.order(:sort).all
  end

  def save_home_page_image
    current_community.design.home_page_images.create(image: params[:file])
    #@home_page_images = current_community.design.home_page_images.order(:sort).all
    render :json=>{"status"=>"sucdess"}
  end

  def show_image_in_modal
    @home_page_image = HomePageImage.find(params[:home_page_image_id])
  end

  def update_home_page_image
    @home_page_image = HomePageImage.find(params[:home_page_image_id])
    @home_page_image.update(home_page_image_params)
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
  def check_community
    unless current_user.is_super_admin?
      if params[:community_id].present?
        all_ids = []
        current_user.communities.each do |c|
          # all_ids.insert(c.id)
          all_ids << c.id
        end
        # byebug
        # puts '+++++++++++++++', all_ids[0]
        if all_ids.include? params[:community_id].to_i

        else
          redirect_to root_path
        end
      end
    end
  end

  def save_home_page_video
    puts "video",params[:file]
    if current_community.design.home_page_video.present?
      current_community.design.home_page_video.update_attribute(:video,params[:file])
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

  private

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