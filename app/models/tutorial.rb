class Tutorial < ApplicationRecord
	has_paper_trail
	mount_uploader :video, VideoUploader
	process_in_background :video
  	belongs_to :community
end
