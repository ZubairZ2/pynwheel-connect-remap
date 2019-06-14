class AmenityGalleriesController < ApplicationController
  def edit
    @amenity = Amenity.find params[:id]
    @amenity_gallery_image = AmenityGallery.find (params[:amenity_id])
  end
  def update

  end
  def destroy
    @amenity = current_community.amenities.find (params[:amenity_id])
    @amenity_gallery = @amenity.amenity_galleries.find (params[:id])
    if @amenity_gallery.destroy
      redirect_to edit_community_amenity_path(current_community,@amenity), notice: "Amenity Gallery Image deleted successfully"
    else
      redirect_to edit_community_amenity_path(current_community,@amenity), error: @amenity_gallery.errors.full_messages.join(',')
    end
  end
end
