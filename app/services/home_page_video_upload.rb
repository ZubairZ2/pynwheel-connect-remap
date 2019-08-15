class HomePageVideoUpload < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(params,com)
    if com.design.home_page_video.present?
      com.design.home_page_video.update_attribute(:video,params[:file])
    else
      com.design.create_home_page_video(video: params[:file])
    end
    return true
  end
end
