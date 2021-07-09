class TutorialsController < ApplicationController
  # include Error::ErrorHandler
  def index
    @tutorials = get_all_tutorials(  (@community.touchscreen_app.present? ? (@community.touchscreen_app) : false) , (@community.show_map.present? ? (true) : true) ,(@community.self_tour.present? ? (@community.self_tour) : false)  )
    # @tutorials = Tutorial.where('pynwheel_touch = ? OR pynwheel_maps = ? OR self_tour = ?', (@community.touchscreen_app.present? ? (@community.touchscreen_app) : false) , (@community.show_map.present? ? (@community.show_map) : false) ,(@community.self_tour.present? ? (@community.self_tour) : false))
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
      redirect_to edit_community_tutorial_path(@community,@tutorial), :notice => "Tutorial has been updated"
    else
      redirect_to edit_community_tutorial_path(@community,@tutorial), :notice => @tutorial.errors
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
      redirect_to edit_community_tutorial_path(@community,@tutorial), :notice => "Tutorial has been updated"
    else
      render "new"
    end
  end
  def destroy
    @tutorial = Tutorial.find params[:id]
    @tutorial.destroy
    redirect_to community_tutorials_path(current_community)
    
  end
  def get_all_tutorials(touchscreen_app, show_map, self_tour)
    if touchscreen_app and show_map and self_tour
      Tutorial.where('pynwheel_touch = ? OR pynwheel_maps = ? OR self_tour = ?', touchscreen_app , show_map , self_tour)
    elsif touchscreen_app and show_map
      Tutorial.where('pynwheel_touch = ? OR pynwheel_maps = ?', touchscreen_app , show_map)
    elsif show_map and self_tour
      Tutorial.where('pynwheel_maps = ? OR self_tour = ?', show_map , self_tour)
    elsif touchscreen_app and self_tour
      Tutorial.where('pynwheel_touch = ? OR self_tour = ?', touchscreen_app , self_tour)
    elsif touchscreen_app
      Tutorial.where('pynwheel_touch = ?', touchscreen_app)
    elsif self_tour
      Tutorial.where('self_tour = ?', self_tour)
    elsif show_map
      Tutorial.where('pynwheel_maps = ?', show_map)
    else
      []
    end
  end
  def tutorial_params
    params.require(:tutorial).permit!
  end
end
