# == Schema Information
#
# Table name: home_page_videos
#
#  id               :integer          not null, primary key
#  video            :string
#  name             :string
#  design_id        :integer
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  vid_file_name    :string
#  vid_content_type :string
#  vid_file_size    :bigint(8)
#  vid_updated_at   :datetime
#  url              :string
#

class HomePageVideo < ApplicationRecord
	has_paper_trail
	mount_uploader :video, VideoUploader
	process_in_background :video
	belongs_to :design
	# amoeba do
	# 	enable
	# 	# customize(lambda { |original_object,new_object|
	# 	# 	new_object.video = original_object.video
	# 	# })
	# end
end
