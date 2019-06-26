# == Schema Information
#
# Table name: floorplans
#
#  id                     :integer          not null, primary key
#  community_id           :integer
#  provider               :string
#  property_id            :string
#  provider_floorplan_id  :string
#  name                   :string
#  unit_count             :integer
#  units_available        :integer
#  bedrooms               :string
#  bathrooms              :float
#  market_rent            :float
#  square_feet            :float
#  deposit                :float
#  comment                :text
#  description            :text
#  availability_url       :string
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  image                  :string
#  virtual_tour_url       :string
#  standard_image_url     :string
#  updated_by_admin       :boolean          default(FALSE)
#  manual_override        :boolean          default(FALSE)
#  secondary_image        :string
#  name_is_updated        :boolean
#  square_feet_is_updated :boolean
#  bedroom_is_updated     :boolean
#  bathroom_is_updated    :boolean
#  market_rent_is_updated :boolean
#

class Floorplan < ApplicationRecord
  include StandardUrl
  mount_base64_uploader :image, AvatarUploader
  mount_base64_uploader :secondary_image, AvatarUploader
  belongs_to :community
  has_many :amenities, as: :amenityable
  validates_uniqueness_of :name, scope: :community, on: :create
  validates_uniqueness_of :provider_floorplan_id, scope: :community
  after_commit :populate_image_urls, on: [:create,:update]

  def populate_image_urls
    if image.present?
      set_standard_url('Floorplan',id)
    end
  end
end
