# == Schema Information
#
# Table name: amenity_galleries
#
#  id               :integer          not null, primary key
#  amenity_id       :integer
#  image            :string
#  description      :string
#  name             :string
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  directional_text :string
#

class AmenityGallery < ApplicationRecord
  has_paper_trail
  belongs_to :amenity
  mount_base64_uploader :image, AvatarUploader
  amoeba do
    enable
    customize(lambda { |original_object,new_object|
      new_object.image = original_object.image
    })
  end
end
