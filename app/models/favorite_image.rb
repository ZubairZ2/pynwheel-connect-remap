# == Schema Information
#
# Table name: favorite_images
#
#  id                  :integer          not null, primary key
#  image               :string
#  favorite_setting_id :integer
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  name                :string
#  sort                :integer
#

class FavoriteImage < ApplicationRecord
  has_paper_trail
  mount_uploader :image, AvatarUploader
  belongs_to :favorite_setting
  include LaunchStatusable

  include RailsSortable::Model
  set_sortable :sort
  def is_video?
    image.file.extension.downcase == 'mp4' 
  end

  # Launch: an e-brochure image is complete once the artwork is in.
  def derive_launch_status
    launch_status_from(image&.url.present?)
  end
end
