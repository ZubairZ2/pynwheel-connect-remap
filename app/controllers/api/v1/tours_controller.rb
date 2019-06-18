class Api::V1::ToursController < ActionController::Base
  #before_action :set_community, only: [:data,:ios_data,:email_favorites]
  # before_action :set_community, only: :email_favorites
  def save_user_data

    puts "++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++"
    puts params
    puts "++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++"
    tempFile = params[:image]
    puts tempFile.path
    # image_base = Base64.encode64(File.read(tempFile))
    vs = VisitedStop.create(tour_user_id: "1",tour_stop_id: "4",image: tempFile, description: "ffef")

    puts "*"*200
    puts params

  end
  private

  def set_community
    @community = Community.find(params[:id])
  end
end