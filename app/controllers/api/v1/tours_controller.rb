class Api::V1::ToursController < ActionController::Base
  #before_action :set_community, only: [:data,:ios_data,:email_favorites]
  # before_action :set_community, only: :email_favorites
  def save_user_data

    tempFile = params[:image]
    tempFile = tempFile.path
    # image_base = Base64.encode64(File.read(tempFile.path))

    unless params[:tour_user_id].present? && params[:tour_stop_id].present?
      render :json=> {:success=>false, :message => "Please enter tour user id or tour stop id"}
    else
      vs = VisitedStop.create(tour_user_id: params[:tour_user_id],tour_stop_id: params[:tour_stop_id],image: tempFile.open, description: params[:description])
      if vs.present?
        render :json=> {:success=>true, :message => "success"}
      else
        render :json=> {:success=>false, :message => "failed"}
      end
    end

  end
  private

  def set_community
    @community = Community.find(params[:id])
  end
end