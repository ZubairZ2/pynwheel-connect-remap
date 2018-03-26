class Imagepage < ApplicationRecord
  belongs_to :community
  has_many :additional_images, dependent: :destroy
  validates_uniqueness_of :name
  validates_presence_of :name
	validates_length_of :name, :maximum => 12

  scope :active, -> { where(hide_page: false) }
end
