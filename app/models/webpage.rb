class Webpage < ApplicationRecord
  belongs_to :community
  validates_uniqueness_of :name
  validates_presence_of :url, :name
  validates_length_of :name, :maximum => 12

  scope :active, -> { where(hide_page: false) }
end
