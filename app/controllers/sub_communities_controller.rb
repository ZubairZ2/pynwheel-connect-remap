# app/controllers/sub_communities_controller.rb

class SubCommunitiesController< ApplicationController
  def update_marker_colors
    params[:sub_communities]&.each do |_id, sc_params|
      if (sub = SubCommunity.find_by(id: sc_params[:id]))
        sub.update(map_marker_color: sc_params[:map_marker_color])
      end
    end

    redirect_back fallback_location: root_path, notice: "Multi-Property marker colors updated successfully."
  end
end
