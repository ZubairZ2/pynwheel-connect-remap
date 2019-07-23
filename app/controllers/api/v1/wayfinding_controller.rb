class Api::V1::WayfindingController < ActionController::Base
	def floorplate_path_points
    @floorplate = Floorplate.includes(path_points: [:neighbour_units]).find_by_id(params[:floorplate_id])
    @existing_path_points = @floorplate.path_points
  end
end