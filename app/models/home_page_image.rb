# == Schema Information
#
# Table name: home_page_images
#
#  id                 :integer          not null, primary key
#  image              :string
#  name               :string
#  design_id          :integer
#  crop_x             :float
#  crop_y             :float
#  crop_w             :float
#  crop_h             :float
#  sort               :integer
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  standard_image_url :string
#  thumb_image_url    :string
#  large_image_url    :string
#  do_crop            :boolean          default(FALSE)
#

class HomePageImage < ApplicationRecord
  has_paper_trail on: [:create, :destroy]
  include StandardUrl
  include RailsSortable::Model
  set_sortable :sort
  #mount_base64_uploader :image, ImageUploader
  # mount_uploader :image, ImageUploader
  mount_base64_uploader :image, AvatarUploader
  process_in_background :image
  belongs_to :design
  has_one :status, as: :statusable
  before_create :set_image_name
  after_update :crop_image
  after_commit :populate_image_urls, on: [:create, :update]

  def crop_image
    image.recreate_versions! if (crop_x.present? && do_crop)
  end

  def set_image_name
    self.name = image.file.filename rescue ""
  end

  def populate_image_urls
    if image.present?
      set_standard_url('HomePageImage', id)
    end
  end

  def as_json options = {}
    super(:only => [:id, :name, :image])
  end
end
