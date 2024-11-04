class GroupDesignController < ApplicationController
  def index
    @community_group = CommunityGroup.find(params[:community_group_id])
    @group_design = @community_group.group_design

    @uploader = GroupHomepageVideo.new.video
    @uploader.success_action_redirect = upload_video_direct_community_group_group_design_url(@community_group.id,@group_design.id)
  end

  def update
    @community_group = CommunityGroup.find params[:community_group_id]
    @group_design = GroupDesign.find params[:id]
    if @group_design.update(group_design_params)
      redirect_to edit_community_group_path(@community_group), :notice => "Design updated successfully."
    else
      flash[:error] = @community_group.errors.full_messages.join(',')
      render "edit"
    end
  end

  def delete_home_page_video
    @homepage_video = GroupHomepageVideo.find params[:home_page_video_id].to_i
    @homepage_video.destroy
    redirect_to community_group_group_design_index_path(@community_group.id)
  end

  def destroy
    @community_group = CommunityGroup.find params[:community_group_id]
    @homepage_video = GroupHomepageVideo.find params[:home_page_video_id].to_i
    @homepage_video.destroy
    redirect_to community_group_group_design_index_path(@community_group.id)
  end

  def save_home_page_images
    @group_design = GroupDesign.find params[:id].to_i
    image = MiniMagick::Image.open(params[:file].path)
    @group_design.group_homepage_images.create(image: params[:file],is_small: (image.width < 800 && image.height < 600) ? true : false)
    render :json=>{"status"=>"sucdess"}
  end

  def update_home_page_images
    @community_group = CommunityGroup.find params[:community_group_id]
    @homepage_image = GroupHomepageImage.find params[:home_page_image_id].to_i
    @homepage_image.update(name: params[:group_homepage_image][:name])
    redirect_to community_group_group_design_index_path(@community_group.id)
  end

  def show_image_in_modal
    @community_group = CommunityGroup.find params[:community_group_id]
    @group_design = GroupDesign.find params[:id]
    @group_homepage_image = GroupHomepageImage.find(params[:home_page_image])
  end

  def delete_home_page_image
    @community_group = CommunityGroup.find params[:community_group_id]
    @homepage_image = GroupHomepageImage.find params[:home_page_image_id].to_i
    @homepage_image.destroy
    redirect_to community_group_group_design_index_path(@community_group.id)
  end

  def set_loop_type
    @group_design = GroupDesign.find params[:id]
    @group_design.loop_type = (params['loop_type'] == "true" ? "images" : "videos")
    @group_design.save
    render :json=>{"status"=>"sucdess"}
  end
  def upload_video_direct
    @uploader =  GroupHomepageVideo.new(params[:home_page_video])
    @group_design = GroupDesign.find params[:id]
    @group_design.group_homepage_video.destroy if @group_design.group_homepage_video.present?

    if @uploader.save
      @uploader.remote_video_url = @uploader.video.direct_fog_url + params[:key]
      @uploader.group_design_id = @group_design.id
      @uploader.save
      redirect_to community_group_group_design_index_path, notice: 'Video has been uploaded'
    else
      render action: "index"
    end
  end

  private

    def group_design_params
      params.require(:group_design).permit!  
    end
    
    def set_community
      @community = Community.find params[:id]
    end
end
