# == Schema Information
#
# Table name: amenities
#
#  id                  :integer          not null, primary key
#  provider_amenity_id :string
#  amenty_type         :string
#  description         :text
#  unit_id             :integer
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  name                :string
#  image               :string
#  x_plot              :integer
#  y_plot              :integer
#  amenityable_type    :string
#  amenityable_id      :integer
#  community_id        :integer
#  standard_image_url  :string
#  sort                :integer
#  access_code         :string
#  directional_text    :string
#

class Amenity < ApplicationRecord
  has_paper_trail on: [:create,:destroy]
  include RailsSortable::Model
  set_sortable :sort
  include StandardUrl
  mount_base64_uploader :image, AvatarUploader
  belongs_to :amenityable, polymorphic: true
  belongs_to :community
  
  has_many :amenity_galleries, dependent: :destroy
  has_one :status, as: :statusable
  
  has_many :paths, as: :map_path
  has_many :path_points, through: :paths
  # has_many :remote_locks,  -> { for_amenties }, class_name: 'RemoteLock', foreign_key: 'stop_id', dependent: :destroy  # was being handled manually
  has_many :remote_locks, as: :stop     # remove it only after confirm refactoring, as it is being used
  has_many :edgestate_locks, -> { where(dwelo_id: nil) },  class_name: 'RemoteLock', as: :stop
  has_many :dwelo_locks, -> { where(edge_state_id: nil) },  class_name: 'RemoteLock', as: :stop
  has_many :latch_locks, as: :stop
  has_many :zerv_locks, as: :stop
  has_many :latch_guests, as: :guest_of_stop, dependent: :destroy
  has_many :zerv_guests, as: :guest_of_stop, dependent: :destroy
  has_many :igloohome_locks, as: :stop, dependent: :destroy
  has_many :igloohome_guests, as: :guest_of_stop, dependent: :destroy

  
  has_many :doors, as: :attached_with, dependent: :destroy
  has_one :tour_stop, as: :stop, dependent: :destroy
  
  scope :has_pointer_x_plot, -> { where("pointer_data->>'x_plot' IS NOT NULL AND (pointer_data->>'x_plot')::integer > ?", 0) }
  scope :has_pointer_y_plot, -> { where("pointer_data->>'y_plot' IS NOT NULL AND (pointer_data->>'y_plot')::integer > ?", 0) }
  scope :svg_pointed, -> { has_pointer_x_plot.or(has_pointer_y_plot) }

  scope :plotted_amenities, ->(svg_enabled = false) {
    if svg_enabled
      svg_pointed
    else
      where("x_plot > ? or y_plot > ?", 0, 0)
    end
  }
  validates :image, :presence => {message: "cannot be blank. Please upload Amenity image first."}, if: -> { image.present? }
  after_commit :populate_image_urls, on: [:create,:update]
  after_update :crop_amenity_image
  after_update :remove_doors_plotting, if: Proc.new { x_plot == 0 and y_plot == 0 }
  after_update :sort_associated_unit_amenities, if: Proc.new { amenityable_id.present? && amenityable_type == "Floorplan" }
  before_destroy :destroy_associated_stops

  # validate :url_validity
  # validate :image_size
  AMENITY_TYPE = [["Select an amenity type",""],["Leasing Center", "Leasing Center"],["Fitness Center", "Fitness Center"],["Pool", "Pool"], ["Yoga Studio / Fitness Studio","Yoga Studio / Fitness Studio"],["Dog Park","Dog Park"],
    ["Playground","Playground"],["Clubhouse / Resident Lounge","Clubhouse / Resident Lounge"],["Game Room","Game Room"],["Dog Wash","Dog Wash"],["Package Locker","Package Locker"],["Mail Room","Mail Room"],
    ["Conference Room","Conference Room"],["Business Center / Lounge","Business Center / Lounge"], ["Other", "Other"]]

  def as_json options = {}
    super(
      :only => [:id, :name, :video_link, :amenity_type, :description],
      :methods => [:amenity_image],
      :include => {
        :amenity_galleries => {
          :only => [:id, :name, :image, :description]
        }
      }
    )
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

  def amenity_image
    image&.url.present? ? image : nil
  end

  def stop_description_text
    description
  end

  def stop_directional_text
    directional_text
  end

  def get_amenity_galleries galler_obj = []
    galler_obj << {
      image: self.image
    }

    self&.amenity_galleries&.each do |gallery|
      galler_obj << {
        image: gallery.image
      }
    end

    galler_obj
  end

  def crop_amenity_image
    image.recreate_versions! if (crop_x.present?  && do_crop)
    self.update_columns(do_crop: false)
  end

  def url_validity
    require 'uri'
    if video_link.present?
      result = URI.open(video_link).status rescue ""
      unless result.present?
        errors[:base] << "Invalid URL."
      end
    end

  end
  
  def image_size
    if image.size > 1.megabytes
      errors[:base] << "File can not be greater than 5MB"
    end
  end

  def populate_image_urls
    if image.present?
      set_standard_url('Amenity',id)
    end
  end

  def self.path_data
    [{x: 120, y: 455}, {x: 165, y: 655}, {x: 400, y: 155}]
  end

  def remove_doors_plotting
    doors.destroy_all
  end

  def digital_lock_provider?
    self.lock_provider.present? and self.lock_provider != "" and self.lock_provider != "Manual"
  end

  def destroy_associated_stops
    begin
      res = TourStop.where(stop_id: self.id, stop_type: "amenity").destroy_all
      VisitedStop.where(tour_stop_id: res.pluck(:id)).destroy_all
    rescue => ex
    end
  end

  def ordered_doors
    community = self.community

    if community.auto_wayfinding
      self.doors.order("sort ASC")
    else
      self.doors.order("created_at ASC")
    end
  end

  def filter_amenities_for_plot_removal(amenities, svg_deletion = false)
    if svg_deletion
      pointer_x_plot, pointer_y_plot = pointer_data.is_a?(Hash) ? pointer_data.values_at('x_plot', 'y_plot') : [0, 0]

      result = amenities.where("pointer_data->>'x_plot' = ? AND pointer_data->>'y_plot' = ?",
                               pointer_x_plot, pointer_y_plot)
      if result.none?
				tag, tag_id, selector = pointer_data.is_a?(Hash) ? pointer_data.values_at('tag', 'id', 'selector') : [0, 0]
				key , value = if tag_id.present?
												['id', tag_id]
											elsif selector.present?
												['selector', selector]
											end

        result = amenities.where("pointer_data->>'tag' = ?", tag)
                          .where("pointer_data->>'#{key}' = ?", value)
			end

      result
    else
      amenities.where(x_plot: x_plot, y_plot: y_plot)
    end
  end

  def svg_coordinates
    pointer_data.is_a?(Hash) ? pointer_data.values_at('x_plot', 'y_plot').map(&:to_i) : [0, 0]
  end

  private

  def sort_associated_unit_amenities
    if sort_changed?
      floorplan =  Floorplan.find self.amenityable_id
      community = floorplan.community
      FloorplanAmenitiesService.new(floorplan, self, community).handle_amenity_sorting()
    end
  end
end
