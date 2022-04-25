class PortalTour < ApplicationRecord
  belongs_to :community
  has_one :status, as: :statusable
  has_many :portal_tour_stops

  def as_json
    super(
      :only => [:id, :start_tour, :max_tour] ,
      :include => {
        :portal_tour_stops => {:only => [:id, :stop_type, :name, :description, :starting_point, :direction, :video_link] ,
          :include => {
            :portal_tour_stop_galleries => {:only => [:id , :image , :description] }
          }
        }
      },
    )
  end
end