# == Schema Information
#
# Table name: credentials
#
#  id                  :integer          not null, primary key
#  community_id        :integer
#  password            :string
#  username            :string
#  property_id         :string
#  pmc_id              :string
#  licence_key         :string
#  server_name         :string
#  database            :string
#  platform            :string
#  interface_entity    :string
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  url                 :string
#  site_id             :string
#  c_code              :string
#  p_code              :string
#  apply_now           :boolean          default(FALSE)
#  file                :string
#  api_token           :string
#  resman_apikey       :string
#  resman_partner_id   :string
#  resman_account_id   :string
#  resman_property_id  :string
#  zaremba_username    :string
#  zaremba_password    :string
#  zaremba_filename    :string
#  zaremba_property_id :string
#

class Credential < ApplicationRecord
  belongs_to :community
  before_save :set_https_in_url
  
  def import_data_from_spreadsheet(file)
    xlsx = Roo::Spreadsheet.open(file.open)
    units = xlsx.sheet(0)
    units.each_with_index do |u,index|
      unless index == 0 
        unit = Unit.where(provider: "spreadsheet",community_id: community_id,provider_unit_id: u[0]).first_or_initialize
        unit.provider_unit_id = u[0]
        unit.marketing_name = u[0]
        unit.unit_type = u[0]
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

  def swap_data_from_spreadsheet(file)
    xlsx = Roo::Spreadsheet.open(file.open)
    units = xlsx.sheet(0)
    units.each_with_index do |u,index|
      unless index == 0
        unit = Unit.where(community_id: community_id,marketing_name: u[0]).first
        if unit.present?
          unit.provider_unit_id = u[0]
          unit.provider = "spreadsheet_new"
          unit.unit_type = u[0]
          unit.floorplan_id = u[1]
          unit.floor = u[3]
          unit.availability = u[4] == true ? "Unoccupied" : "Occupied"
          unit.available_date = u[5]
          unit.market_rent = u[6]
          unit.effective_rent = u[6]
          unit.save(validate: false)
        else
          dup = Unit.find_by(community_id: community_id, provider_unit_id: u[0])
          if dup.present?
            dup.destroy
          end
          unit = Unit.new
          unit.community_id = community_id
          unit.marketing_name = u[0]
          unit.provider_unit_id = u[0]
          unit.provider = "spreadsheet_new"
          unit.unit_type = u[0]
          unit.floorplan_id = u[1]
          unit.floor = u[3]
          unit.availability = u[4] == true ? "Unoccupied" : "Occupied"
          unit.available_date = u[5]
          unit.market_rent = u[6]
          unit.effective_rent = u[6]
          unit.save(validate: false)
        end
      end
    end
    unit = Unit.where(community_id: community_id)
    unit.each do |d|
      unless d.provider == "spreadsheet_new"
        d.destroy
      end
    end
    unit = Unit.where(community_id: community_id)
    unit.each do |d|
      if d.provider == "spreadsheet_new"
        d.provider = "spreadsheet"
      end
    end

    floorplans = xlsx.sheet(1)

    floorplans.each_with_index do |f,index|
      unless index == 0
        floorplan = Floorplan.where(community_id: community_id,name: f[1]).first
        if floorplan.present?
          floorplan.provider = "spreadsheet_new"
          floorplan.provider_floorplan_id = f[0]
          floorplan.square_feet = f[2]
          floorplan.bedrooms = f[3]
          floorplan.bathrooms = f[4]
          floorplan.manual_override = false
          floorplan.save(validate: false)
        else
          dup = Floorplan.find_by(community_id: community_id, provider_floorplan_id: f[0])
          if dup.present?
            dup.destroy
          end
          floorplan = Floorplan.new
          floorplan.community_id = community_id
          floorplan.name = f[1]
          floorplan.provider = "spreadsheet_new"
          floorplan.provider_floorplan_id = f[0]
          floorplan.square_feet = f[2]
          floorplan.bedrooms = f[3]
          floorplan.bathrooms = f[4]
          floorplan.save(validate: false)
        end
      end
    end
    fp = Floorplan.where(community_id: community_id)
    fp.each do |d|
      unless d.provider == "spreadsheet_new"
        d.destroy
      end
    end
    fp = Floorplan.where(community_id: community_id)
    fp.each do |d|
      if d.provider == "spreadsheet_new"
        d.provider = "spreadsheet"
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
