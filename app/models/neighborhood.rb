class Neighborhood < ApplicationRecord
  belongs_to :community
  before_save do
	  self.category.gsub!(/[\[\]\"]/, "") if attribute_present?("category")
	end
end
