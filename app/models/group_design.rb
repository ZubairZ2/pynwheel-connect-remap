class GroupDesign < ApplicationRecord
  has_paper_trail
  belongs_to :community_group
  has_many :group_homepage_images, dependent: :destroy
  has_one :group_homepage_video, dependent: :destroy
  mount_base64_uploader :background_image, AvatarUploader
  def has_images_loop_type?
    loop_type == "images"
  end

  def has_video_loop_type?
    loop_type == "video"
  end
end
