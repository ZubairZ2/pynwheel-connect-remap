class Neighborhood < ApplicationRecord
  belongs_to :community
  has_many :locations
  before_save do
	  self.category.gsub!(/[\[\]\"]/, "") if attribute_present?("category")
	end
end
