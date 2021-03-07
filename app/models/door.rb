class Door < ApplicationRecord
    belongs_to :community
    belongs_to :attached_with, polymorphic: true

    after_save :re_arrange_door_names
    after_destroy :re_arrange_door_names

    def re_arrange_door_names
        doors = Door.where(attached_with_type: self.attached_with_type, attached_with_id: self.attached_with_id).order(:id).includes(:attached_with)
        doors.each_with_index do |door, index|
            building_name = door.attached_with.building.present? ? door.attached_with.building + '-' : '' rescue ''
            attached_with_name = building_name + door.attached_with.name + " (door " + (index + 1).to_s + ")" rescue "door " + index.to_s
            door.update_column(:name, attached_with_name)
        end
    end
end
