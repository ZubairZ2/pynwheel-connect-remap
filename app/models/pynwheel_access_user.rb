class PynwheelAccessUser < ApplicationRecord
  enum user_type: [ :resident, :staff ]

  belongs_to :community
  has_many :resident_access_points, dependent: :destroy

  after_create :assign_common_access_points
end

def assign_common_access_points
  plotted_amenities = self.community.amenities.where("x_plot + y_plot > ?", 0).collect {|amenity| {access_point_id: amenity.id, access_point_type: "amenity"} }
  self.resident_access_points.create(plotted_amenities)
end