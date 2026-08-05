# == Schema Information
#
# Table name: imagepages
#
#  id                  :integer          not null, primary key
#  name                :string
#  is_slideshow        :boolean
#  community_id        :integer
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  hide_page           :boolean          default(FALSE)
#  display_on_homepage :boolean          default(FALSE)
#  position            :integer
#  sort                :integer
#

class Imagepage < ApplicationRecord
  belongs_to :community

  include RailsSortable::Model
  set_sortable :sort

  include LaunchStatusable

  has_many :additional_images, dependent: :destroy
  has_many :additional_files, dependent: :destroy
  validates_uniqueness_of :name, scope: :community_id
  validates_presence_of :name
  validates_length_of :name, :maximum => 50
  validates_with NameValidator
  scope :active, -> { where(hide_page: false) }
  validates_with WebAndImageValidator

  def as_json options = {}
    super(
      :only => [:id, :name], :methods => [:media, :file]
    )
  end

  def media
    media_arr = []
    self.additional_images.each do |gallery_img|
      media_arr << {
        id: gallery_img.id,
        name: gallery_img.name,
        image: gallery_img.image
      }
    end
    media_arr
  end

  def file
    file_arr = []
    self.additional_files.each do |file|
      file_arr << {
        id: file.id,
        name: file.name,
        file: file.file
      }
    end
    file_arr
  end

  # Launch: an additional image page is complete once it is named.
  def derive_launch_status
    launch_status_from(name.present?)
  end
end
