class ElevatorGalleriesController < ApplicationController
  # include Error::ErrorHandler
  def edit
    @community = Community.find params[:community_id]
    @elevator = Elevator.find params[:elevator_id]
    @elevator_gallery_image = ElevatorGallery.find (params[:id])
  end
  def update
    @elevator = Elevator.find params[:elevator_id]
    @elevator_gallery_image = ElevatorGallery.find(params[:id])
    if @elevator_gallery_image.update(elevator_gallery_params)
      # redirect_to "/communities/#{current_community.id}/amenities/#{@elevator}/edit"
      redirect_to edit_community_elevator_path(current_community,@elevator), notice: "Elevator Gallery updated successfully"
    else
      redirect_to edit_community_elevator_path(current_community,@elevator), error: @elevator.errors.full_messages.join(',')
    end
  end
  def destroy
    @elevator = Elevator.find (params[:elevator_id])
    @elevator_gallery = @elevator.elevator_galleries.find (params[:id])
    if @elevator_gallery.destroy
      redirect_to edit_community_elevator_path(current_community,@elevator), notice: "Elevator Gallery Image deleted successfully"
    else
      redirect_to edit_community_elevator_path(current_community,@elevator), error: @elevator_gallery.errors.full_messages.join(',')
    end
  end

  def elevator_gallery_params
    params.require(:elevator_gallery).permit!
  end

end
