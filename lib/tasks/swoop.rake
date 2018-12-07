namespace :read do

  desc 'read spreadsheet units'
  task :spreadsheet_units => :environment do
    xlsx = Roo::Spreadsheet.open('public/Pynwheel_Floor_Plan_Spreadsheet-_EBD.xlsx')
    #puts '-----------------', xlsx.sheets.inspect
    units = xlsx.sheet(0)
    # floorplates = xlsx.sheet(2)
    units.each_with_index do |u,index|
      # puts 'uuuuuuuuuuuuuuuuuuuu' , u
      unless index == 0
        unit = Unit.new(provider: "swoop",community_id: 6)
        unit.provider_unit_id = u[0].split("#")[1]
        unit.name = u[1]
        unit.save
      end
    end
    puts "*** Units Imported from Spreadsheet ***"
  end

  desc 'read spreadsheet floorplans'
  task :spreadsheet_floorplans => :environment do
    xlsx = Roo::Spreadsheet.open('public/Pynwheel_Floor_Plan_Spreadsheet-_EBD.xlsx')
    #puts '-----------------', xlsx.sheets.inspect
    floorplans = xlsx.sheet(1)

    floorplans.each_with_index do |f,index|
      # puts 'ffffffffffffffff' , f
      unless index == 0
        floorplan = Floorplan.new(provider: "swoop",community_id: 6)
        floorplan.provider_floorplan_id = f[0]
        floorplan.bedrooms = f[1].to_i
        floorplan.bathrooms = f[2].to_i
        floorplan.square_feet = f[3]
        floorplan.save
      end
    end
    puts "*** Floorplans Imported from Spreadsheet ***"
  end
end