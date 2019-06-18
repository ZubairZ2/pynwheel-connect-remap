class AmenitiesController < ApplicationController
  before_action :authenticate_user!
  before_action :check_community
  add_breadcrumb "Home", :root_path

  def index
    @amenities = current_community.amenities.order(id: :desc)
    add_breadcrumb "Amenity Images", community_amenities_path(current_community)
  end

  def create
    if params[:amenityId].present?
      @amenity = Amenity.find params[:amenityId]
      @amenity.image = params[:src]
      @amenity.save
      redirect_to edit_community_amenity_path(current_community,@amenity)
    else
      current_community.amenities.create(image: params[:src],name: params[:name])
      @amenities = current_community.amenities.order(id: :desc)
    end
  end

  def edit
    @amenity = current_community.amenities.find (params[:id])
  end

  def update
    @amenity = current_community.amenities.find(params[:id])
    if @amenity.update_attributes(amenity_params)
      if params[:amenity][:access_code].present? || params[:amenity][:stop_description].present?
        redirect_to edit_community_amenity_path(current_community,@amenity), notice: "Amenity updated successfully"
      else
        redirect_to community_amenities_path(current_community), notice: "Amenity updated successfully"
      end
    else
      redirect_to community_amenities_path(current_community), error: @amenity.errors.full_messages.join(',')
    end
  end
  def saveAmenityGallery
    @community = Community.find params[:community_id]
    @amenity = Amenity.find params[:amenityId]
    AmenityGallery.create(name: params[:name],image: params[:src], amenity_id: @amenity.id)
  end
  def edit_amenity_gallery_image
    @community = current_community
    @amenity = Amenity.find params[:community_id]
    @amenity_gallery_image = AmenityGallery.find (params[:format])
  end

  def destroy
    @amenity = current_community.amenities.find (params[:id])
    if @amenity.destroy
      redirect_to community_amenities_path(current_community), notice: "Amenity deleted successfully"
    else
      redirect_to community_amenities_path(current_community), error: @amenity.errors.full_messages.join(',')
    end
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
  private

  def amenity_params
    params.require(:amenity).permit!
  end

end