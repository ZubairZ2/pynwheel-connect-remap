class Api::V2::GalleriesController < Api::V2::ApiApplicationController
  before_action :set_community

  def index
    @community = Community.find params[:community_id]
    render :json => {data: @community.as_json}
  end

  def create
    @gallery = @community.galleries.new(gallery_params)
    gallery_image_params = params[:gallery_image]
    if @gallery.save
      gallery_image_params[:image].each do |gallery_img|
        @gallery.gallery_images.create(image: gallery_img, community_id: @community.id) if gallery_img.present?
      end if gallery_image_params.present?
      @community.set_community_status(current_pynwheel_user)
      render :json => {:success => true, :message => "Gallery created succesfully.", data: @gallery.as_json}
    else
      render :json => {:success => false, :message => @gallery.errors.full_messages}
    end
  end

  def update
		@gallery = @community.galleries.find(params[:id])
    if @gallery.update_attributes(gallery_params)
			@community.set_community_status(current_pynwheel_user)
      render :json => {:success => true, :message => "Gallery updated succesfully.", data: @gallery.as_json}
    else
      render :json => {:success => false, :message => @gallery.errors.full_messages}
    end
	end

  private 

  def set_community
		@community = Community.find params[:community_id]
	end

	def gallery_params
		params.require(:gallery).permit!
	end
end
