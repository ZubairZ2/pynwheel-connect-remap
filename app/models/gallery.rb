# == Schema Information
#
# Table name: galleries
#
#  id           :integer          not null, primary key
#  name         :string
#  community_id :integer
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  sort         :integer
#

class Gallery < ApplicationRecord
	include RailsSortable::Model
	set_sortable :sort

	has_many :gallery_images, dependent: :destroy
	belongs_to :community
	has_one :status, as: :statusable
	validates :name, presence: true, uniqueness: {scope: :community}

	# def as_json
  #   super(
  #     :only => [:id, :name, :community_id], :include => {
  #       :gallery_images => {:only => [:id, :name, :image, :video]}
  #     }
  #   )
  # end

  def as_json
    super(
      :only => [:id, :name, :community_id], :methods => [:media]
    )
  end

  def media
    media_arr = []
    self.gallery_images.each do |gallery_img|
      media_arr << {
        id: gallery_img.id,
        name: gallery_img.name,
        image: get_gallery_image(gallery_img),
        video: get_gallery_video(gallery_img)
      }
    end
    media_arr
  end

  def get_gallery_image(gallery_img)
    return "" if gallery_img.image.blank?
    {url: gallery_img.image.url, thumb: gallery_img.image.thumb}
  end

  def get_gallery_video(gallery_img)
    return "" if gallery_img.video.blank?
    gallery_img.video
  end

	def delete_gallery
		DeleteGalleryJob.perform_async self
	end
end
