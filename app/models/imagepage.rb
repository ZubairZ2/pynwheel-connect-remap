class Imagepage < ApplicationRecord
  belongs_to :community
  has_many :additional_images, dependent: :destroy
  validates_uniqueness_of :name, scope: :community_id
  validates_presence_of :name
  validates_length_of :name, :maximum => 50
  validates_with NameValidator
  scope :active, -> { where(hide_page: false) }
  validates_with WebAndImageValidator

 
end
