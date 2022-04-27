class PortalTourStopGallery < ApplicationRecord
  mount_uploader :image, AvatarUploader
  belongs_to :portal_tour_stop, class_name: "portal_tour_stop", foreign_key: "portal_tour_stop_id"
end
