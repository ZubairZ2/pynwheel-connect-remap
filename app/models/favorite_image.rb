class FavoriteImage < ApplicationRecord
  mount_uploader :image, AvatarUploader
  belongs_to :favorite_setting
  include RailsSortable::Model
  set_sortable :sort
  def is_video?
    image.file.extension.downcase == 'mp4' 
  end
end
