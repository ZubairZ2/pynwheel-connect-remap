class HomePageVideo < ApplicationRecord
	mount_base64_uploader :video, VideoUploader
	belongs_to :design
end
