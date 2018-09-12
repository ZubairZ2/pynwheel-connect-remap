class Webpage < ApplicationRecord
  belongs_to :community
  validates_uniqueness_of :name, scope: :community_id
  validates_presence_of :url, :name
  validates_length_of :name, :maximum => 50
  validates_with NameValidator
  validates_with WebAndImageValidator
  scope :active, -> { where(hide_page: false) }
end
