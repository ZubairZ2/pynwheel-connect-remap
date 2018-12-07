class FloorValidator < ActiveModel::Validator
  def validate(record)
    community_floors = record.community_floors
    record.floors.each do |floor|
    	if community_floors.include?(floor)
    		record.errors[:base] << "Floor already exists"
    	end
    end
  end
end