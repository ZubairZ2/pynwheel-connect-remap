class Door < ApplicationRecord
    belongs_to :community
    belongs_to :attached_with, polymorphic: true

    has_one :edgestate_lock, -> { where(dwelo_id: nil) },  class_name: 'RemoteLock', as: :stop
    has_one :dwelo_lock, -> { where(edge_state_id: nil) },  class_name: 'RemoteLock', as: :stop
    has_one :latch_lock,  as: :stop
    has_one :zerv_lock,   as: :stop
    has_one :igloohome_lock, as: :stop

    # after_create    :snatch_lock,             if: Proc.new { attached_with_type == "Unit" or attached_with_type == "Amenity" and lock_provider.blank? }          # To be on secure side for other developers, but I am not using Door.create any where
    after_save      :snatch_lock,             if: Proc.new { attached_with_type == "Unit" or attached_with_type == "Amenity" and lock_provider.blank? }
    before_destroy  :throw_back_lock,         if: Proc.new { attached_with_type == "Unit" or attached_with_type == "Amenity" and lock_provider.present? }

    # after_create    :re_arrange_door_names,   if: Proc.new { attached_with_type != "Sitemap" and attached_with_type != "Floorplate" }                            # To be on secure side for other developers, but I am not using Door.create any where
    after_save      :re_arrange_door_names,   if: Proc.new { attached_with_type != "Sitemap" and attached_with_type != "Floorplate" }
    after_destroy   :re_arrange_door_names,   if: Proc.new { attached_with_type != "Sitemap" and attached_with_type != "Floorplate" }

    # after_create    :ordinalize_access_point, if: Proc.new { (attached_with_type == "Sitemap") or (attached_with_type == "Floorplate" and floor.present?) }      # To be on secure side for other developers, but I am not using Door.create any where
    after_save      :ordinalize_access_point, if: Proc.new { (attached_with_type == "Sitemap") or (attached_with_type == "Floorplate" and floor.present?) }
    after_destroy   :ordinalize_access_point, if: Proc.new { (attached_with_type == "Sitemap") or (attached_with_type == "Floorplate" and floor.present?) }

    # after_destroy :unplot_crossponding_unit

    def re_arrange_door_names
        doors = Door.where(attached_with_type: self.attached_with_type, attached_with_id: self.attached_with_id, name_overrided: false).order(:id).includes(:attached_with)
        doors.each_with_index do |door, index|
            building_name = door.attached_with.building.present? ? door.attached_with.building + '-' : '' rescue ''
            attached_with_name = building_name + door.attached_with.name + " (door " + (index + 1).to_s + ")" rescue "door " + (index + 1).to_s
            door.update_column(:name, attached_with_name)
        end
    end

    def ordinalize_access_point
        if self.attached_with_type == "Sitemap"
            self.community.access_points.where(attached_with_type: self.attached_with_type, name_overrided: false).order(:id).each_with_index do |access_point, index|
                access_point.update_column(:name, (index+1).ordinalize + " access point")
            end
        else
            self.community.access_points.where(attached_with_type: self.attached_with_type, attached_with_id: self.attached_with_id, floor: self.floor, name_overrided: false).order(:id).each_with_index do |access_point, index|
                access_point.update_column(:name, (index+1).ordinalize + " access point at " + self.floor.to_i.ordinalize + " floor")
            end
        end
    end

    def snatch_lock
        if attached_with.digital_lock_provider?
            lock = attached_with.public_send(attached_with.lock_provider.downcase + "_locks").first
            if lock.present?
                lock.update(stop_id: self.id, stop_type: self.class.name)
                self.update(lock_provider: attached_with.lock_provider, access_code: attached_with.access_code) 
            end
            attached_with.update(lock_provider: "", access_code: "")
        elsif attached_with.lock_provider == "Manual"
            self.update(lock_provider: attached_with.lock_provider, access_code: attached_with.access_code) 
            attached_with.update(lock_provider: "", access_code: "")
        end
    end

    def throw_back_lock
        if digital_lock_provider?
            lock = self.public_send(lock_provider.downcase + "_lock")
            if lock.present?
                lock.update(stop_id: attached_with_id, stop_type: attached_with_type)
                attached_with.update(lock_provider: lock_provider, access_code: access_code)
            end
        elsif lock_provider == "Manual"
            attached_with.update(lock_provider: lock_provider, access_code: access_code)
        end
    end

    def unplot_crossponding_unit
        self.attached_with.update(x_plot: 0, y_plot: 0, floorplate_id: nil)
        modal_unit = self.attached_with.modal_unit rescue false
        tour_stop = self.attached_with.tour_stop

        if modal_unit ==  false and tour_stop.present?
            VisitedStop.where(tour_stop_id: tour_stop.id).destroy_all
            tour_stop.destroy
        elsif tour_stop.present?
            tour_stop.update(latitude: 0, longitude: 0)
        end
    end

    def digital_lock_provider?
        self.lock_provider.present? and self.lock_provider != "" and self.lock_provider != "Manual"
    end

end
