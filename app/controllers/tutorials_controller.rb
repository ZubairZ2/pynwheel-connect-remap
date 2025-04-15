class TutorialsController < ApplicationController
  before_action :set_tutorial, :except => [:index, :new, :create]

  def index
    @tutorials = get_all_tutorials(  (@community.touchscreen_app.present? ? (@community.touchscreen_app) : false) , (@community.show_map.present? ? (true) : true) ,(@community.self_tour.present? ? (@community.self_tour) : false)  )
  end

  def new
    @tutorial = Tutorial.new
  end

  def edit
    @uploader = @tutorial
  end

  def update
    if @tutorial.update(tutorial_params)
      redirect_to edit_community_tutorial_path(@community, @tutorial), :notice => "Tutorial has been updated"
    else
      redirect_to edit_community_tutorial_path(@community, @tutorial), :notice => @tutorial.errors
    end
  end

  def upload_video_direct
    if @tutorial.update(tutorial_video_params)
      # Extract the filename from the uploaded file
      uploaded_file = params[:tutorial][:video]
      @tutorial.filename = uploaded_file.original_filename if uploaded_file.present?
  
      @tutorial.community_id = current_community.id
  
      if @tutorial.save
        @tutorial.remote_video_url = @tutorial.video.url
        @tutorial.save
  
        redirect_to community_tutorials_path(current_community), notice: 'Video has been uploaded'
      else
        render action: "index"
      end
    else
      render action: "index"
    end
  end

  def create
    @tutorial = Tutorial.new(tutorial_params)

    if @tutorial.save
      redirect_to edit_community_tutorial_path(@community,@tutorial), :notice => "Tutorial has been updated"
    else
      render "new"
    end
  end

  def destroy
    @tutorial.destroy
    redirect_to community_tutorials_path(current_community)
  end

  private

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

    def set_tutorial
      @tutorial = Tutorial.find params[:id]
    end

    def tutorial_params
      params.require(:tutorial).permit!
    end

    def tutorial_video_params
      params.require(:tutorial).permit(:video)
    end
end
