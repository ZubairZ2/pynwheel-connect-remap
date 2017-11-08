class HomePageVideo < ApplicationRecord
	mount_uploader :video, VideoUploader
	belongs_to :design
end
