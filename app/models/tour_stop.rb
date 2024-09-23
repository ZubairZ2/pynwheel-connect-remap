# == Schema Information
#
# Table name: tour_stops
#
#  id         :integer          not null, primary key
#  tour_id    :integer
#  latitude   :decimal(, )
#  longitude  :decimal(, )
#  stop_id    :integer
#  stop_type  :string
#  sort       :integer
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  name       :string
#

class TourStop < ApplicationRecord
  belongs_to :tour
  belongs_to :stop, polymorphic: true

  include StandardUrl
  include RailsSortable::Model
  set_sortable :sort
  has_many :stop_details, dependent: :destroy
  has_many :stop_galleries, dependent: :destroy
  attr_accessor :building
  attr_accessor :floor
  # attr_accessor :status

  has_one :path, as: :map_path
  has_many :path_points, through: :paths
  belongs_to :unit, dependent: :destroy
  has_one :status, as: :statusable
  
  before_destroy :remove_associated_stops

  scope :visible, -> { where(display_stop: true) }
  scope :visible, -> { where(display_stop: true) }
  scope :plotted_stops, -> { where.not(latitude: [0, nil]).or(where.not(longitude: [0, nil])).or(where.not(stop_type: ["unit", "amenity"])) }

  def stop_description_text
    return "" unless (self.stop_id && self.stop_type).present?
    stop = self.stop_type.classify.constantize.find_by_id self.stop_id
    return "" unless stop.present?
    stop.description
  end

  def stop_directional_text
    return "" unless (self.stop_id && self.stop_type).present?
    stop = self.stop_type.classify.constantize.find_by_id self.stop_id
    return "" unless stop.present?
    (self.stop_type == "unit") ? stop.stop_description : stop.directional_text
  end

  def check_unit_occupied
    if self.stop_type == "unit"
      u = Unit.find self.stop_id
      return (u.available || u.modal_unit) ? false : true
    else
      return false
    end
  end

  def get_unit_navigation_title navigation_title
    navigation_title = navigation_title.split(":")
    "#{navigation_title[0]}: ##{navigation_title[1]}"
  end

  def path_data
  	self.stop_type.classify.constantize.path_data
  end

  def remove_associated_stops
    scheduled_tours = SchedualTour.where(community_id: self.tour.community_id) rescue []
    scheduled_tours&.find_each do |scheduled_tour|
      if scheduled_tour.stops_list.present?
        scheduled_tour.stops_list.delete(self.id)
        scheduled_tour.save!
      end
    end
  end

  def fetch_lock_stop_provider
    stop_lock_provider = ""
    actual_stop = (self.stop_type.classify.constantize.find_by_id self.stop_id)
    have_door = (actual_stop.class.name == "Unit" &&  actual_stop.door.present?) || (actual_stop.class.name == "Amenity" &&  actual_stop.ordered_doors.any?)
    
    if have_door
      if actual_stop.class.name == "Unit"
        stop_lock_provider = actual_stop.door.lock_provider
      elsif actual_stop.class.name == "Amenity"
        stop_lock_provider = actual_stop.ordered_doors.first.lock_provider
      end
    else
      stop_lock_provider = actual_stop.lock_provider
    end

    stop_lock_provider
  end

  def get_latitude
    actual_stop = self.stop_type.classify.constantize.find self.stop_id
    actual_stop.x_plot
  end
  
  def get_longitude
    actual_stop = self.stop_type.classify.constantize.find self.stop_id
    actual_stop.y_plot
  end
  
  def get_stop_directional_text directional_text
    return directional_text if directional_text.present?

    actual_stop = self.stop_type.classify.constantize.find(self.stop_id)
    return unless actual_stop

    case actual_stop
    when Unit, Amenity, Elevator, BuildingStartingPoint
      get_stop_formatted_directional_text(actual_stop, actual_stop.respond_to?(:stop_description) ? actual_stop.stop_description : actual_stop.directional_text)
    end
  end

  def stop_description_formatting stop_description
    return "" unless stop_description.present?

    begin
      if stop_description.match?(/<ul\b.*?>|<ol\b.*?>/)
        doc = Nokogiri::HTML(stop_description)
        items = doc.css('ul li, ol li').map(&:text)
        list_text = items.join(", ")
        list_text = " #{list_text} "
        formatted_string = stop_description.gsub(/<ul\b.*?>.*?<\/ul>|<ol\b.*?>.*?<\/ol>/, list_text)
        ActionView::Base.full_sanitizer.sanitize(formatted_string)
      else
        ActionView::Base.full_sanitizer.sanitize(stop_description)
      end
    rescue
      ActionView::Base.full_sanitizer.sanitize(stop_description)
    end
  end

  # Floorplate name
  def stop_floor_name actual_stop
    handle_floor_display(actual_stop, false)
  end

  private

  def get_stop_formatted_directional_text(actual_stop, stop_directional_text)
    return stop_directional_text if stop_directional_text.present?
      default_text = "Follow the map below"

    if actual_stop.is_a?(Elevator)
      "#{default_text}#{actual_stop_text(actual_stop)}."
    else
      "#{default_text}#{stop_building_text(actual_stop)}#{actual_stop_text(actual_stop)}#{stop_floor_text(actual_stop)}."
    end
  end

  def stop_building_text actual_stop
    return "" unless actual_stop&.building.present?
    building_list = Buildings.new(actual_stop.community).get_community_buildings()

    if building_list.size > 1
      " to go to Building #{actual_stop.building}"
    else
      ""
    end
  end

  def stop_floor_text actual_stop
    return "" unless actual_stop&.floor.present?
    " on the #{handle_floor_display(actual_stop, true)} floor"
  end

  def actual_stop_text actual_stop
    if actual_stop.is_a?(Unit)
      " and proceed to ##{actual_stop.marketing_name}"
    elsif actual_stop.is_a?(Elevator)
      " and proceed to #{actual_stop.name}"
    else
      " and proceed to the #{actual_stop.name}"
    end
  end

  def handle_floor_display(actual_stop, formatted)
    return number_to_ordinal_form(actual_stop&.floor.to_i, formatted) if actual_stop.community.is_sitemap
  
    case actual_stop
    when Unit, Amenity, BuildingStartingPoint
      display_floorplate_info(actual_stop, formatted)
    else
      number_to_ordinal_form(actual_stop.floor.to_i, formatted)
    end
  end
  
  def display_floorplate_info(actual_stop, formatted)
    floorplate = get_floorplate(actual_stop)

    return number_to_ordinal_form(actual_stop.floor.to_i, formatted) unless floorplate.present?
  
    if floorplate_has_multiple_floors?(floorplate)
      number_to_ordinal_form(actual_stop.floor.to_i, formatted)
    elsif floorplate_name_added?(floorplate)
      floorplate.floor_name
    else
      number_to_ordinal_form(actual_stop.floor.to_i, formatted)
    end
  end
  
  def get_floorplate(actual_stop)
    community = actual_stop.community
    return unless community

    community.floorplates.all.find { |floorplate| floorplate.contains_floor?(actual_stop.floor) }
  end

  def find_floorplate_by_floor floor
  end
  
  def floorplate_has_multiple_floors?(floorplate)
    floorplate&.floors&.count.to_i > 1
  end
  
  def floorplate_name_added?(floorplate)
    floorplate&.floor_name_added && floorplate.floor_name.present?
  end
  

  def number_to_ordinal_form(number, formatted)
    return number unless formatted

    "#{number}" + case number % 100
                 when 11, 12, 13 then 'th'
                 else
                   case number % 10
                   when 1 then 'st'
                   when 2 then 'nd'
                   when 3 then 'rd'
                   else 'th'
                   end
                 end
  end

end
