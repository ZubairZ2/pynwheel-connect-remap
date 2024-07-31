# == Schema Information
#
# Table name: tour_users
#
#  id                 :integer          not null, primary key
#  name               :string
#  email              :string
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  credit_card_number :string
#  card_expiry        :string
#  phone_number       :string
#  image              :string
#  id_card            :string
#  id_selfie_mismatch :boolean          default(TRUE)
#

class TourUser < ApplicationRecord
	# to include routes in here so we can send in email as link
	include Routeable

  has_many :visited_stops, dependent: :destroy
  has_many :tour_histories, dependent: :destroy
  has_many :schedual_tours, dependent: :destroy
  has_many :chatrooms, dependent: :destroy
  has_many :as_guests, dependent: :destroy
  has_many :igloo_guests, dependent: :destroy
  has_many :latch_guests, dependent: :destroy
  has_many :zerv_guests, dependent: :destroy
  has_many :igloohome_guests, dependent: :destroy
  has_many :lock_histories, dependent: :destroy
  has_many :prospects, dependent: :destroy
  has_many :user_stripes, dependent: :destroy
  has_many :tours, dependent: :destroy

  has_one :feedbacks
  
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :first_name, presence: true
  validates :last_name, presence: true
  validates :email, presence: true
  validates :phone_number, presence: true
  # validates :desired_bedroom, :numericality => { greater_than_or_equal_to: 0, less_than: 10 }

  after_update :crop_user_image
  after_update :set_tour_user_name, if: ->(obj){ obj.first_name_changed? ||  obj.last_name_changed? }

  mount_base64_uploader :image, AvatarUploader
  mount_base64_uploader :id_card, AvatarUploader

  def user_completed_tours
    self.tour_histories.where(tour_state: "completed", tour_site: "onsite")
  end

  def set_tour_user_name
    self.update_column :name, "#{self.first_name} #{self.last_name}"
  end

  def crop_user_image
    begin
      image.recreate_versions! if (image.present? and crop_image_bit and !crop_image_bit.nil)
      id_card.recreate_versions! if (id_card.present? and !crop_image_bit and !crop_image_bit.nil)
    rescue => exception
      
    end
  end
  
  attr_accessor :crop_image_bit

  def crop_image_bit
    @crop_image_bit
  end

  def is_virtual_tour?
    self&.tour_type&.downcase&.include?("virtual") rescue false
  end

  def check_code_expiry(community)
    access_code_generated_at = self.property_access_code_generated_at
    tour_length_stay_limit = community&.community_tour&.tour_setting&.length_stay_limit
    enabled_property_access = community&.community_tour&.tour_setting&.enable_restricted_property_access
    if enabled_property_access && (access_code_generated_at.nil? || Time.now > access_code_generated_at + tour_length_stay_limit.minutes)
      true
    else
      false
    end
  end

  def property_access_code_verification(access_code,is_property_access_enabled,tour_length_stay_limit)
    if access_code.present?
      if is_property_access_enabled
        if Time.now < self.property_access_code_generated_at + tour_length_stay_limit.minutes
          self.is_code_valid(access_code)
        else
          self.errors[:base] << "Access Code has been expired."
          false
        end
      else
        self.errors[:base] << "Please enable the property access restriction from tour settings."
        false
      end
    else
      self.errors[:base] << "Access code cannot be blank"
      false
    end
  end

  def is_code_valid(access_code)
    if self.property_access_code.to_s == access_code.to_s
      true
    else
      self.errors[:base] << "Please make sure code is valid and try again"
      false
    end
  end

  def customized_tour community
    ( (community.community_tour&.tour_setting&.enable_tour_customization) && (self.tours.where(community_id: community.id).last.present?) )
  end

  def get_latch_connected_elevator_bluetooth_ids community_id, stop
    bluetooth_ids = []

    if stop.stop_type.classify == "Elevator"
      guests = self.latch_guests.where(community_id: community_id, guest_of_stop_id: stop.stop_id, guest_of_stop_type: stop.stop_type.classify, status: "active")
      bluetooth_ids = (guests.present? && guests.count > 1) ? guests.pluck(:latch_link) : []
    end

    bluetooth_ids
  end


  def get_list_of_zerv_lock_ids tour, community, stop, new_stops_arr, counter, zev_mac_ids = [], current_stop_zerv_id
    return [] if community.is_sitemap
    begin
      zev_mac_ids << current_stop_zerv_id

      current_actual_elevator = stop.stop_type.classify.constantize.find_by_id stop.stop_id if (stop && stop&.stop_type && stop&.stop_id).present?

      if stop.stop_type.classify == "Elevator"
        next_stop = new_stops_arr[counter + 1]

        if !(next_stop.is_a? Tour) && ["unit", "amenity"].include?(next_stop.stop_type)
          next_actual_stop = next_stop.stop_type.classify.constantize.find_by_id next_stop.stop_id if (next_stop && next_stop&.stop_type && next_stop&.stop_id).present?
          floor = next_actual_stop&.floor  if next_actual_stop.present?
          building = next_actual_stop&.building if next_actual_stop.present?
        else
          if next_stop.is_a? Tour
            next_actual_stop = next_stop
          else
            next_actual_stop = next_stop.stop_type.classify.constantize.find_by_id next_stop.stop_id if (next_stop && next_stop&.stop_type && next_stop&.stop_id).present?          
          end
          
          building = current_actual_elevator.building
          floor = current_actual_elevator.floors[0]
        end

        if floor.present? && building.present?
          tour_stops = community.community_tour.tour_stops.plotted_stops.where(display_stop: true, stop_type: "elevator")
          # tour_stops = tour.tour_stops.where(display_stop: true, stop_type: "elevator")
          tour_stops.each do |elevator_stop|
            elevator = elevator_stop.stop_type.classify.constantize.find_by_id elevator_stop.stop_id if (elevator_stop && elevator_stop&.stop_type && elevator_stop&.stop_id).present?

            if elevator.present?
              if !(next_stop.is_a? Tour) && ["unit", "amenity"].include?(next_stop.stop_type)
                if (elevator.building == building) && ( elevator.floors.include?(floor) )
                  zrv = ShortestPath.return_stop_lock(elevator) if community.zerv.present?
                  if zrv.present?
                    zrv_guest = self.zerv_guests.find_by(community_id: community.id, guest_of_stop_type: elevator_stop.stop_type.classify, guest_of_stop_id: elevator_stop.stop_id, status: "active")
                    zev_mac_ids << zrv.mac_id if zrv_guest.present?
                  end
                end
              else
                if (elevator.floors.include?(floor) )
                  zrv = ShortestPath.return_stop_lock(elevator) if community.zerv.present?
                  if zrv.present?
                    zrv_guest = self.zerv_guests.find_by(community_id: community.id, guest_of_stop_type: elevator_stop.stop_type.classify, guest_of_stop_id: elevator_stop.stop_id, status: "active")
                    zev_mac_ids << zrv.mac_id if zrv_guest.present?
                  end
                end
              end
            end

          end
        end
      end

      zev_mac_ids&.compact&.uniq&.count > 1 ? zev_mac_ids&.compact&.uniq : []
    rescue => error
      puts "\n\n------------------------------------------ Multiple Zerver Response: \n #{error.inspect} -----------------------------\n\n"
      []
    end
  end
end
