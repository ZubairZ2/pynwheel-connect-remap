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
  # has_paper_trail
  mount_uploader :image, AvatarUploader
  belongs_to :favorite_setting
  include RailsSortable::Model
  set_sortable :sort
  def is_video?
    image.file.extension.downcase == 'mp4' 
  end
end
