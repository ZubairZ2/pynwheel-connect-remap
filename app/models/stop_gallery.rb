# == Schema Information
#
# Table name: stop_galleries
#
#  id           :integer          not null, primary key
#  tour_stop_id :integer
#  image        :string
#  name         :string
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#

class StopGallery < ApplicationRecord
  mount_uploader :image, AvatarUploader
  amoeba do
    enable
    customize(lambda { |original_object,new_object|
      new_object.image = original_object.image
    })
  end
end
