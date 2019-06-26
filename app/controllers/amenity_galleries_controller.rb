class AmenityGalleriesController < ApplicationController
  def edit
    @community = Community.find params[:community_id]
    @amenity = Amenity.find params[:amenity_id]
    @amenity_gallery_image = AmenityGallery.find (params[:id])
  end
  def update
    @amenity = Amenity.find params[:amenity_id]
    @amenity_gallery_image = AmenityGallery.find(params[:id])
    if @amenity_gallery_image.update_attributes(amenity_gallery_params)
      # redirect_to "/communities/#{current_community.id}/amenities/#{@amenity}/edit"
      redirect_to edit_community_amenity_path(current_community,@amenity), notice: "Amenity updated successfully"
    else
      redirect_to edit_community_amenity_path(current_community,@amenity), error: @amenity.errors.full_messages.join(',')
    end
  end
  def destroy
    @amenity = Amenity.find (params[:amenity_id])
    @amenity_gallery = @amenity.amenity_galleries.find (params[:id])
    if @amenity_gallery.destroy
      redirect_to edit_community_amenity_path(current_community,@amenity), notice: "Amenity Gallery Image deleted successfully"
    else
      redirect_to edit_community_amenity_path(current_community,@amenity), error: @amenity_gallery.errors.full_messages.join(',')
    end
  end

  def amenity_gallery_params
    params.require(:amenity_gallery).permit!
  end

end
