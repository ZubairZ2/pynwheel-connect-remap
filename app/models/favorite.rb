class Favorite < ApplicationRecord
	belongs_to :community
	belongs_to :unit
end
