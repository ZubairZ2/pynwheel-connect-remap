# == Schema Information
#
# Table name: units
#
#  id                 :integer          not null, primary key
#  community_id       :integer
#  provider           :string
#  property_id        :string
#  provider_unit_id   :string
#  unit_type          :string
#  marketing_name     :string
#  floorplan_id       :string
#  market_rent        :float
#  effective_rent     :float
#  availability       :string
#  available_date     :date
#  building           :string
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  x_plot             :integer          default(0)
#  y_plot             :integer          default(0)
#  floorplate_id      :integer
#  image              :string
#  floor              :integer
#  standard_image_url :string
#  updated_by_admin   :boolean          default(FALSE)
#  available          :boolean
#  sold               :boolean          default(FALSE)
#  manually_updated   :boolean          default(FALSE)
#  manual_override    :boolean          default(FALSE)
#  square_feet        :float
#  description        :text
#  secondary_image    :string
#

class Unit < ApplicationRecord
  include StandardUrl
  mount_uploader :image, AvatarUploader
  mount_uploader :secondary_image, AvatarUploader
  belongs_to :community
  belongs_to :floorplan
  belongs_to :floorplate

  validates :effective_rent, :numericality => { :greater_than => 0, :less_than => 100000001 }, :length => { :maximum => 11}
  validates_uniqueness_of :provider_unit_id, scope: :community_id
  validates_uniqueness_of :marketing_name, scope: :community_id
  has_many :amenities, as: :amenityable

  scope :are_sold, -> { where("sold = ? and (x_plot > ? or y_plot > ?)", true, 0, 0) }
  #scope :are_available, -> { where("available = ? and sold = ?", true,false) }
  scope :past_available_units, -> { where("availability = ? and available_date <= ? and x_plot > ?", "Unoccupied", Date.today, 0) }
  scope :has_x_plot, -> { where("x_plot > ? and available_date > ? and available_date < ?", 0, Date.today, Date.today+2.year) }
  scope :has_y_plot, -> { where("y_plot > ? and available_date > ? and available_date < ?", 0, Date.today, Date.today+2.year) }
  scope :ploted_units, -> { has_x_plot.or(has_y_plot) }
  #scope :available_units, -> { ploted_units.or(past_available_units).where.not(available: true) }
  scope :available_units, -> { ploted_units.or(past_available_units).where.not(sold: true) } #Don't fetch units where are sold
  after_commit :populate_image_urls, on: [:create,:update]
  
  def floorplan
    Floorplan.find_by(provider_floorplan_id: self.floorplan_id, community_id: self.community_id)
  end

  def unit_image
    self.image.present? ? self.image.url : (self.floorplan.present? && self.floorplan.image.present? ? self.floorplan.image.url : "/assets/default.jpeg")
  end

  def unit_market
    if self.provider == "realpagesvc" || self.provider == "zaremba"
      if self.building.present?
        marketing_nameSplit = self.marketing_name.split('-')
        if marketing_nameSplit.count > 1
          marketing_name = marketing_nameSplit[1..marketing_nameSplit.length-1].map {|str| "#{str}"}.join('-')
          unit = Unit.where('community_id = ? AND marketing_name LIKE ? ', self.community_id, "%-#{marketing_name}")
          if unit.count == 1
            return marketing_name
          end
          if unit.count >= 2
            return self.marketing_name
          end
        else
          return self.marketing_name
        end
      else
        return self.marketing_name
      end
    else
      unit = Unit.where(community_id: self.community_id,marketing_name: self.marketing_name)
      if unit.count == 1
        return self.marketing_name
      end
      if unit.count >= 2
        if self.building.present?
          return self.building + "-" + self.marketing_name
        else
          return self.marketing_name
        end
      end
    end
    return self.marketing_name
  end

  def populate_image_urls
    if image.present?
      set_standard_url('Unit',id)
    end
  end
end
