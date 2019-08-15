# == Schema Information
#
# Table name: home_page_videos
#
#  id         :integer          not null, primary key
#  video      :string
#  name       :string
#  design_id  :integer
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

class HomePageVideo < ApplicationRecord
	mount_uploader :video, VideoUploader
	process_in_background :video
	belongs_to :design

	def upload_video(para,com)
		HomePageVideoUpload.perform_async para,com
	end
end
