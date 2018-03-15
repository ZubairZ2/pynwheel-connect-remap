class HomePageController < ApplicationController
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

  def save_home_page_video
    if current_community.design.home_page_video.present?
      current_community.design.home_page_video.update_attribute(:video,params[:file])
    else
      current_community.design.create_home_page_video(video: params[:file])
    end 
    render :json=>{"status"=>"sucdess"}
  end

  def delete_home_page_video
    @home_page_video = HomePageVideo.find(params[:home_page_video_id])
    @home_page_video.destroy
    flash[:notice] = "Video deleted successfully."
    redirect_to community_home_page_index_path(current_community,tab: "videos")
  end

  private

  def home_page_image_params
    params.require(:home_page_image).permit!
  end

  def home_page_video_params
    params.require(:home_page_video).permit!
  end
end