class Credential < ApplicationRecord
  belongs_to :community
  
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
        unit.save(validate: false)
      end
    end
    floorplans = xlsx.sheet(1)

    floorplans.each_with_index do |f,index|
      unless index == 0
        floorplan = Floorplan.where(provider: "spreadsheet",community_id: community_id,provider_floorplan_id: f[0]).first_or_initialize  
        floorplan.name = f[0]
        floorplan.bedrooms = f[1].to_i
        floorplan.bathrooms = f[2].to_i
        floorplan.square_feet = f[3]
        floorplan.save(validate: false)
      end
    end
  end
end
