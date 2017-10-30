class Amenity < ApplicationRecord
	belongs_to :amenityable, polymorphic: true
end
