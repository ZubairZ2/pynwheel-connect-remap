# == Schema Information
#
# Table name: gallery_images
#
#  id                 :integer          not null, primary key
#  image              :string
#  crop_x             :float
#  crop_y             :float
#  crop_w             :float
#  crop_h             :float
#  sort               :integer
#  community_id       :integer
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  gallery_id         :integer
#  name               :string
#  standard_image_url :string
#  ios_image_url      :string
#  large_image_url    :string
#  video              :string
#  do_crop            :boolean          default(FALSE)
#  url                :string
#

class GalleryImage < ApplicationRecord
	include RailsSortable::Model
  belongs_to :gallery
  has_one :status, as: :statusable
  set_sortable :sort  
	mount_base64_uploader :image, GalleryUploader
	# mount_uploader :image, GalleryUploader
	mount_uploader :video, VideoUploader
	process_in_background :video
	process_in_background :image
	before_create :set_image_name
	# before_save :populate_image_urls
	after_update :crop_image, if: ->(obj) { obj.image_changed? }
  after_commit :populate_image_urls, on: :create


	def crop_image
    image.recreate_versions! if (crop_x.present? && do_crop)
  end

  def is_video?
		begin
			image.file.extension.downcase == 'mp4'
		rescue => ex
			true
		end
	end

	def set_image_name
  	self.name = image.file.filename if image.present?
  end

  def populate_image_urls
  	if self.image.present? && !(self.standard_image_url.present?)
  		self.standard_image_url = self.image.url
  		self.large_image_url = self.image.url(:large)
  		self.ios_image_url = self.image.url(:ios)
      self.save
  	end
  end

	def get_gallery_media
    return {} if self.blank?
    if self.is_video?
      self.video
    else
			{url: self.standard_image_url, thumb: self.image.thumb}
    end    
  end
end
