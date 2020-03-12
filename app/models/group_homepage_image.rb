class GroupHomepageImage < ApplicationRecord
  belongs_to :group_design
  mount_uploader :image, ImageUploader
end
