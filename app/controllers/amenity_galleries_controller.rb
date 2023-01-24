class AmenityGalleriesController < ApplicationController
  before_action :set_community
  before_action :set_amenity
  before_action :set_gallery_image
  
  def edit
  end

  def update
    if @amenity_gallery_image.update_attributes(amenity_gallery_params)
      if @amenity&.amenityable_type&.downcase == "floorplan"
        FloorplanAmenitiesService.new(get_floorplan(), @amenity, @community).update_floorplan_amenity_gallery_info(@amenity_gallery_image.id, amenity_gallery_params )
        redirect_to "/communities/#{@community.id}/floorplans/#{@amenity.amenityable_id}/amenities/#{@amenity.id}/edit", notice: "Amenity updated successfully"
      elsif @amenity&.amenityable_type&.downcase == "unit"
        redirect_to "/communities/#{@community.id}/amenities/#{@amenity.id}/edit?from=#{@amenity.amenityable_type.downcase}&#{@amenity.amenityable_type.downcase}=#{@amenity.amenityable_id}", notice: "Amenity updated successfully"
      else
        redirect_to edit_community_amenity_path(@community, @amenity), notice: "Amenity updated successfully"
      end
    else
      redirect_to edit_community_amenity_path(@community,@amenity), error: @amenity.errors.full_messages.join(',')
    end
  end

  def destroy
    if @amenity_gallery_image.destroy
      redirect_to edit_community_amenity_path(@community, @amenity), notice: "Amenity Gallery Image deleted successfully"
    else
      redirect_to edit_community_amenity_path(@community, @amenity), error: @amenity_gallery_image.errors.full_messages.join(',')
    end
  end

  private

  def set_community
    @community = Community.find params[:community_id]
  end

  def set_amenity
    @amenity = Amenity.find params[:amenity_id]
  end

  def set_gallery_image
    @amenity_gallery_image = AmenityGallery.find (params[:id])
  end

  def get_floorplan
    Floorplan.find @amenity.amenityable_id
  end

  def amenity_gallery_params
    params.require(:amenity_gallery).permit!
  end

end
