class TutorialsController < ApplicationController
  def index
  	@tutorials = Tutorial.where('pynwheel_touch = ? OR pynwheel_maps = ? OR self_tour = ?', (@community.touchscreen_app.present? ? (@community.touchscreen_app) : false) , (@community.show_map.present? ? (@community.show_map) : false) ,(@community.self_tour.present? ? (@community.self_tour) : false))
  end
  def new
  	@tutorial = Tutorial.new
  	@uploader = Tutorial.new.video
    @uploader.success_action_redirect = upload_video_direct_community_tutorials_url(@community, @tutorial)
  end
  def edit
  	@tutorial = Tutorial.find params[:id]
  	@uploader = @tutorial.video
    @uploader.success_action_redirect = upload_video_direct_community_tutorials_url(@community, @tutorial)
  end
  def update
  	@tutorial = Tutorial.find params[:id]
    # @tutorial.video_type = ([params[:video_type1].present? ? "pynwheel_touch" : nil ] + [params[:video_type2].present? ? "pynwheel_maps" : nil ] + [ params[:video_type3].present? ? "self_tour" : nil]).join(',') 
  	if @tutorial.update(tutorial_params)
  		redirect_to community_tutorials_path(current_community), :notice => "Tutorial has been updated"
  	else
  		redirect_to community_tutorials_path(current_community), :notice => @tutorial.errors
  	end
  	
  end
  def upload_video_direct
  	
   	if params[:format].present?
   		@uploader =  Tutorial.find params[:format]
   	else
   		@uploader =  Tutorial.new()
   	end
    @uploader.filename = params[:key].split('/').last
    if @uploader.save
    	@uploader.community_id = current_community.id	
      @uploader.remote_video_url = @uploader.video.direct_fog_url + params[:key]

      @uploader.save
      redirect_to community_tutorials_path(current_community), notice: 'Video has been uploaded'
    else
      render action: "index"
    end
  end
  def create
  	@tutorial = Tutorial.new(tutorial_params)
    # @tutorial.video_type = ([params[:video_type1].present? ? "pynwheel_touch" : nil ] + [params[:video_type2].present? ? "pynwheel_maps" : nil ] + [ params[:video_type3].present? ? "self_tour" : nil]).join(',') 
  	if @tutorial.save
  		redirect_to community_tutorials_path(current_community), :notice => "Tutorial has been updated"
  	else
  		render "new"
  	end
  	
  end
  def destroy
  	@tutorial = Tutorial.find params[:id]
  	@tutorial.destroy
  	redirect_to community_tutorials_path(current_community)
  	
  end
  def tutorial_params
    params.require(:tutorial).permit!
  end
end
