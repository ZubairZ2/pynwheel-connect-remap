# == Schema Information
#
# Table name: neighborhoods
#
#  id                               :integer          not null, primary key
#  community_id                     :integer
#  address                          :string
#  latitude                         :decimal(, )
#  longitude                        :decimal(, )
#  radius                           :float
#  created_at                       :datetime         not null
#  updated_at                       :datetime         not null
#  category                         :string           default("Dining,Shopping,Entertainment,Schools,Banks,Parks,Errands")
#  zoom                             :integer
#  show_neighborhood                :boolean          default(TRUE)
#  neighborhood_name                :string           default("Neighborhood")
#  listing                          :text
#  display_neighborhood_on_homepage :boolean          default(TRUE)
#

class Neighborhood < ApplicationRecord
  belongs_to :community
  has_many :locations, dependent: :destroy
  before_save do
	  self.category.gsub!(/[\[\]\"]/, "") if attribute_present?("category")
	end
  validate :validate_page_position


  def validate_page_position
	positions = Imagepage.where(community_id: self.community_id).map(&:position) +  Webpage.where(community_id: self.community_id).map(&:position)
	if positions.include?(3) && attributes['display_neighborhood_on_homepage']
	  errors[:base] << "Position 3 has already been taken."
	end
  end
end
