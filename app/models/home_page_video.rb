class HomePageVideo < ApplicationRecord
	mount_uploader :video, VideoUploader
	process_in_background :video
	belongs_to :design
end
