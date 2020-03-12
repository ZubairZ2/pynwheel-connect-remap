class GroupHomepageVideo < ApplicationRecord
  mount_uploader :video, VideoUploader
  process_in_background :video
  belongs_to :group_design
end
