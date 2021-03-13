class Door < ApplicationRecord
    belongs_to :community
    belongs_to :attached_with, polymorphic: true

    after_save :re_arrange_door_names
    after_destroy :re_arrange_door_names
    # after_destroy :unplot_crossponding_unit

    def re_arrange_door_names
        doors = Door.where(attached_with_type: self.attached_with_type, attached_with_id: self.attached_with_id).order(:id).includes(:attached_with)
        doors.each_with_index do |door, index|
            building_name = door.attached_with.building.present? ? door.attached_with.building + '-' : '' rescue ''
            attached_with_name = building_name + door.attached_with.name + " (door " + (index + 1).to_s + ")" rescue "door " + (index + 1).to_s
            door.update_column(:name, attached_with_name)
        end
    end

    def unplot_crossponding_unit
        self.attached_with.update_columns(x_plot: 0, y_plot: 0, floorplate_id: nil)
        modal_unit = self.attached_with.modal_unit rescue false
        tour_stop = self.attached_with.tour_stop

        if modal_unit ==  false and tour_stop.present?
            VisitedStop.where(tour_stop_id: tour_stop.id).destroy_all
            tour_stop.destroy
        elsif tour_stop.present?
            tour_stop.update_columns(latitude: 0, longitude: 0)
        end
    end
end
