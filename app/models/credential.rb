# == Schema Information
#
# Table name: credentials
#
#  id               :integer          not null, primary key
#  community_id     :integer
#  password         :string
#  username         :string
#  property_id      :string
#  pmc_id           :string
#  licence_key      :string
#  server_name      :string
#  database         :string
#  platform         :string
#  interface_entity :string
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  url              :string
#  site_id          :string
#  c_code           :string
#  p_code           :string
#  apply_now        :boolean          default(FALSE)
#  file             :string
#  api_token        :string
#

class Credential < ApplicationRecord
  belongs_to :community
  before_save :set_https_in_url
  
  def import_data_from_spreadsheet(file)
    xlsx = Roo::Spreadsheet.open(file.open)
    units = xlsx.sheet(0)
    units.each_with_index do |u,index|
      unless index == 0 
        unit = Unit.where(provider: "spreadsheet",community_id: community_id,provider_unit_id: u[0].split("#")[1]).first_or_initialize
        unit.provider_unit_id = u[0].split("#")[1]
        unit.marketing_name = u[0].split("#")[1]
        unit.unit_type = u[0].split("#")[1]
        unit.floorplan_id = u[1]
        unit.floor = u[3]
        unit.availability = u[4] == true ? "Unoccupied" : "Occupied"
        unit.available_date = u[5]
        unit.market_rent = u[6]
        unit.effective_rent = u[6]
        unit.save(validate: false)
      end
    end
    floorplans = xlsx.sheet(1)

    floorplans.each_with_index do |f,index|
      unless index == 0
        floorplan = Floorplan.where(provider: "spreadsheet",community_id: community_id,provider_floorplan_id: f[0]).first_or_initialize  
        floorplan.name = f[1]
        floorplan.square_feet = f[2]
        floorplan.bedrooms = f[3]
        floorplan.bathrooms = f[4]
        floorplan.save(validate: false)
      end
    end
  end
  
  def set_https_in_url
    if self.url.present?
      unless url.include?('https')
        self.url = url.gsub('http','https')
      end
    end
  end
end
