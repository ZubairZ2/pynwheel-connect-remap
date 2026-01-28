# == Schema Information
#
# Table name: units
#
#  id                                :integer          not null, primary key
#  community_id                      :integer
#  provider                          :string
#  property_id                       :string
#  provider_unit_id                  :string
#  unit_type                         :string
#  marketing_name                    :string
#  floorplan_id                      :string
#  market_rent                       :float
#  effective_rent                    :float
#  availability                      :string
#  available_date                    :date
#  building                          :string
#  created_at                        :datetime         not null
#  updated_at                        :datetime         not null
#  x_plot                            :integer          default(0)
#  y_plot                            :integer          default(0)
#  floorplate_id                     :integer
#  image                             :string
#  floor                             :integer
#  standard_image_url                :string
#  updated_by_admin                  :boolean          default(FALSE)
#  available                         :boolean
#  sold                              :boolean          default(FALSE)
#  manually_updated                  :boolean          default(FALSE)
#  manual_override                   :boolean          default(FALSE)
#  square_feet                       :float
#  description                       :text
#  secondary_image                   :string
#  availability_url                  :string
#  lease_pricing                     :string
#  name_is_updated                   :boolean
#  floorplan_id_is_updated           :boolean
#  effective_rent_is_updated         :boolean
#  available_date_is_updated         :boolean
#  available_is_updated              :boolean
#  sold_is_updated                   :boolean
#  floor_is_updated                  :boolean
#  building_is_updated               :boolean
#  availability_is_updated           :boolean
#  stop_description                  :string
#  display_virtual_tour_button_label :boolean          default(FALSE)
#  virtual_tour_button_label         :string           default("3D Tour")
#  virtual_tour_url                  :string
#  max_effective_rent                :float
#  min_effective_rent                :float
#  avg_effective_rent                :float
#

class Unit < ApplicationRecord
  include StandardUrl
  include ::S3Acceleration

  mount_uploader :image, AvatarUploader
  mount_uploader :secondary_image, AvatarUploader
  belongs_to :community
  belongs_to :floorplan
  belongs_to :floorplate

  AVAILABILITY_SCOPED_STATUSES = [
    "occupied",
    "occupied no notice",
    "notice rented",
    "occupied on notice",
    "notice unrented",
    "vacant",
    "available",
    "unoccupied",
    "vacant unrented not ready",
    "vacant lease",
    "vacant rented ready",
    "vacant rented not ready",
    "vacant unrented ready"
  ]

  validates :effective_rent, :numericality => { :greater_than => 0, :less_than => 100000001 }, :length => { :maximum => 11}
  validates_uniqueness_of :provider_unit_id, scope: :community_id
  # validates_uniqueness_of :marketing_name, scope: :community_id
  has_many :amenities, as: :amenityable

  has_many :paths, as: :map_path
  has_many :path_points, through: :paths
  # has_many :remote_locks,  -> { for_units }, class_name: 'RemoteLock', foreign_key: 'stop_id', dependent: :destroy  # was being handled manually
  has_many :remote_locks, as: :stop     # remove it only after confirm refactoring, as it is being used
  has_many :edgestate_locks, -> { where(dwelo_id: nil) },  class_name: 'RemoteLock', as: :stop
  has_many :dwelo_locks, -> { where(edge_state_id: nil) },  class_name: 'RemoteLock', as: :stop
  has_many :latch_locks, as: :stop
  has_many :zerv_locks, as: :stop
  has_many :latch_guests, as: :guest_of_stop, dependent: :destroy
  has_many :zerv_guests, as: :guest_of_stop, dependent: :destroy
  has_many :igloohome_locks, as: :stop, dependent: :destroy
  has_many :igloohome_guests, as: :guest_of_stop, dependent: :destroy

  has_one :door, as: :attached_with, dependent: :destroy
  has_one :tour_stop, as: :stop, dependent: :destroy
  
  scope :visible_units, -> {where(visible: true)}
  
  scope :has_pointer_x_plot, -> { where("pointer_data->>'x_plot' IS NOT NULL AND (pointer_data->>'x_plot')::integer > ?", 0) }
  scope :has_pointer_y_plot, -> { where("pointer_data->>'y_plot' IS NOT NULL AND (pointer_data->>'y_plot')::integer > ?", 0) }
  scope :svg_pointed, -> { has_pointer_x_plot.or(has_pointer_y_plot) }

  scope :are_sold, ->(svg_enabled = false) { 
    sold_units_query = where(sold: true)

    if svg_enabled
      sold_units_query.svg_pointed
    else
      sold_units_query.where("x_plot > ? or y_plot > ?", 0, 0)
    end
  }

  scope :past_available_units, ->(svg_enabled = false) { 
    available_units_query = where("availability = ? and available_date <= ?", "Unoccupied", Date.today)

    if svg_enabled
      available_units_query.svg_pointed
    else
      available_units_query.where("x_plot > ? or y_plot > ?", 0, 0)
    end
  }

  scope :has_x_plot, ->(svg_enabled = false) {
    available_units_query = where("available_date > ? and available_date < ? and available = ?", Date.today, Date.today + 2.year,true)

    if svg_enabled
      available_units_query.has_pointer_x_plot
    else
      available_units_query.where("x_plot > ?", 0)
    end
  }

  scope :has_y_plot, ->(svg_enabled = false) {
    available_units_query = where("available_date > ? and available_date < ? and available = ?", Date.today, Date.today + 2.year,true)

    if svg_enabled
      available_units_query.has_pointer_y_plot
    else
      available_units_query.where("y_plot > ?", 0)
    end
   }
  scope :plotted_units, ->(svg_enabled = false) {
    has_x_plot(svg_enabled).or(has_y_plot(svg_enabled))
  }

  scope :are_plotted_units, ->(svg_enabled = false) { 
    if svg_enabled
      svg_pointed
    else
      where("x_plot > ? or y_plot > ?", 0, 0)
    end
  }

  scope :vacant_and_available, ->(svg_enabled = false) {
    past_available_units(svg_enabled).where("LOWER(unit_status) IN (?)", UNIT_STATUSES)
  }

  scope :available_units, ->(svg_enabled = false, availability_over_120_days = false) { 
    if availability_over_120_days
      plotted_units(svg_enabled).or(past_available_units(svg_enabled)).where.not(sold: true)
    else
      plotted_units(svg_enabled).or(past_available_units(svg_enabled))
                               .where.not(sold: true)
                               .where("available_date <= ?", Date.today + 120.days)
    end
  }

  scope :status_scoped, ->(availability_over_120_days = false) {
    result = where("LOWER(unit_status) IN (?) OR modal_unit = ?", AVAILABILITY_SCOPED_STATUSES.map(&:downcase), true)
    unless availability_over_120_days
      result = result.where(available_date: [nil, '']).or(where.not("available_date > ?", Date.today + 120.days))
    end
    result
  }
  
  scope :visible_on_map_for, ->(community) {
    begin
      return all unless SHOW_ON_MAP.include?(community.data_provider)

      case community.data_provider
      when "psi"
        community.credential&.entrata_available_units_only ? where(show_on_map: true) : all
      when "yardirentcafe"
        community.credential&.limit_result ? where(show_on_map: true) : all
      else
        all
      end
      
    rescue
      all
    end
  }

  scope :sorted_by_marketing_name, -> {
    order(
      Arel.sql("REGEXP_REPLACE(marketing_name, '[^A-Za-z]', '')"),  # Sort by alphabetic part first
      Arel.sql("CASE WHEN REGEXP_REPLACE(marketing_name, '[^0-9]', '') = '' THEN 0 ELSE REGEXP_REPLACE(marketing_name, '[^0-9]', '')::integer END")  # Then by numeric part, fallback to 0 if no numeric part
    )
  }

  scope :map_units, -> (community, show_ops_map = false) {
    svg_enabled = community.enable_svg_mode?

    if community.data_provider === "beans"
      community.units
    elsif community.turn_availability_on && !show_ops_map
      are_plotted_units(svg_enabled)
    elsif show_ops_map
      are_plotted_units(svg_enabled).status_scoped(true)
    else
      available_units(svg_enabled, community.units_availability_over_120_days)
        .visible_on_map_for(community)
    end
  }

  after_commit :populate_image_urls, on: [:create,:update]
  after_update :crop_unit_image, if: ->(obj) { obj.image_changed? }
  after_update :crop_unit_secondary_image, if: ->(obj) { obj.secondary_image_changed? }
  after_update :remove_doors_plotting, if: Proc.new { x_plot == 0 and y_plot == 0 }
  before_destroy :destroy_associated_stops

  def stop_description_text
    description
  end

  def stop_directional_text
    stop_description
  end

  def name
    api_unit_marketing_name()
  end

  def fetch_unit_plotting_name
    append_property_code = voyager_property_code.present? ? "#{voyager_property_code}-" : (property_id.present? ? "#{property_id}-" : "")
    
    if building != nil && building != ""
      "#{append_property_code}#{building}-#{marketing_name}"
    elsif community.data_provider == "yardi"
      provider_unit_id
    else 
      "#{append_property_code}#{marketing_name}"
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

  def get_schedule_tour_label
    if self&.scheduler_label.present?
      self.scheduler_label
    elsif self&.floorplan&.scheduler_label.present?
      self.floorplan.scheduler_label
    else
      "Scheduled Tour"
    end
  end

  def get_schedule_tour_url
    if self&.scheduler_url.present?
      self.scheduler_url
    elsif self&.floorplan&.scheduler_url.present?
      self.floorplan.scheduler_url
    else
      ""
    end
  end

  def get_additional_button_label
    if self&.additional_button.present?
      self.additional_button
    elsif self&.floorplan&.additional_button.present?
      self.floorplan.additional_button
    else
      "Additional Button"
    end
  end

  def get_additional_button_url
    if self&.additional_url.present?
      self.additional_url
    elsif self&.floorplan&.additional_url.present?
      self.floorplan.additional_url
    else
      ""
    end
  end

  def get_virtual_tour_label
    if self&.virtual_tour_button_label.present?
      self.virtual_tour_button_label
    elsif self&.floorplan&.virtual_tour_button_label.present?
      self.floorplan.virtual_tour_button_label
    else
      "3D Tour"
    end
  end

  def get_virtual_tour_url
    if self&.virtual_tour_url.present?
      self.virtual_tour_url
    elsif self&.floorplan&.virtual_tour_url.present?
      self.floorplan.virtual_tour_url
    else
      ""
    end
  end

  def link1_open_in_new_tab?
    if self&.virtual_tour_url.present?
      self.link1_open_new_tab
    elsif self&.floorplan&.virtual_tour_url.present?
      self&.floorplan&.link1_open_new_tab
    else
      false
    end
  end

  def link2_open_in_new_tab?
    if self&.additional_url.present?
      self.link2_open_new_tab
    elsif self&.floorplan&.additional_url.present?
      self&.floorplan&.link2_open_new_tab
    else
      false
    end
  end

  def link3_open_in_new_tab?
    if self&.scheduler_url.present?
      self.link3_open_new_tab
    elsif self&.floorplan&.scheduler_url.present?
      self&.floorplan&.link3_open_new_tab
    else
      false
    end
  end

  def get_unit_leasing_price
    lease_pricing = []

    if self.lease_pricing.present? && self.community.display_pricing_options
      str_split = self.lease_pricing.split(';')

      str_split.each do |ss|
        str = ss.split(':')
        if str[1].to_i > 0
          pricing_str = str[0]+" Month - #{self.community.get_currency_symbol}"+str[1].to_i.to_s
          lease_pricing << pricing_str
        end  
      end

      lease_pricing = lease_pricing.sort_by {|x| x[0..1].to_i}
      lease_pricing2 = []

      lease_pricing.each do |lp|
        lease_pricing2 << {"pricing_option" => lp}
      end

      lease_pricing = lease_pricing2

    else
      h = {"pricing_option" => self.community.get_currency_symbol+ self.effective_rent.to_i.to_s}
      lease_pricing << h
    end

    lease_pricing
  end

  def get_lease_term_pricing_matrix
    lease_pricing = []
    begin
      if self.lease_pricing.present? && self.community.display_pricing_options
        str_split = self.lease_pricing.split(';')
        str_split.each do |ss|
          str = ss.split(':')
          pricing_str = []

          if str[1].to_i > 0
                  pricing_str[0] = str[0]+" Month"
                  pricing_str[1] = self.community.get_currency_symbol+str[1].to_i.to_s
                  # h = {"pricing_option" => pricing_str}
                  lease_pricing << pricing_str
          end

        end
        
        lease_pricing = lease_pricing.sort_by {|x| x[0][0..1].to_i}
        lease_pricing2 = []

        lease_pricing.each do |lp|
          lease_pricing2 << {"pricing_month" => lp[0],"pricing_rent" => lp[1]}
        end

        lease_pricing = lease_pricing2
      end
    rescue => ex
    end

    lease_pricing
  end

  def get_market_rent
    if self.lease_pricing.present? && self.community.display_pricing_options
      parts = self.lease_pricing.split(";").reject(&:empty?)
      prices = parts.map do |item|
        segments = item.split(":")
        segments[1].to_f
      end

      prices.min
    else
      self.effective_rent
    end
  end

  def get_availability_url fp = nil, url = ""
    fp = fp.present? ? fp : floorplan
    
    if self&.community&.credential.present? and self&.community&.credential&.apply_now.to_s == "separate_link"
      url = self&.community&.credential.separate_link
    elsif self&.community&.data_provider == "psi"
      url = (self.availability_url_deep_linking.present? ? self.availability_url_deep_linking : self.availability_url.present? ? self.availability_url : fp&.availability_url)
    else
      url = self.availability_url.present? ? self.availability_url : fp&.availability_url
    end

    url
  end

  def get_unit_virtual_tour_url
    if self.virtual_tour_url.present?
      if self.virtual_tour_url.include? '</iframe>'
        iframe_url = self.virtual_tour_url.split('height')
        if iframe_url[1][3] == '"'
          iframe_url[1][2] = '1' + '0' + '0' + '%'
        elsif iframe_url[1][4] == '"'
          iframe_url[1][2] = '1'
          iframe_url[1][3] = '0' + '0' + '%'
        elsif iframe_url[1][5] == '"'
          iframe_url[1][2] = '1'
          iframe_url[1][3] = '0'
          iframe_url[1][4] = '0' + '%'
        else
          iframe_url[1][2] = '1'
          iframe_url[1][3] = '0'
          iframe_url[1][4] = '0'
          iframe_url[1][5] = '%'
        end
        
        iframe_url[0] + 'height' + iframe_url[1]
      else
        self.virtual_tour_url
      end
    else
      ""
    end
  end


  def crop_unit_secondary_image
    secondary_image.recreate_versions! if (crop_x_secondary.present? && !image_bit && do_crop_secpndary)
    self.update(do_crop_secpndary: false)
  end
  def crop_unit_image
    image.recreate_versions! if (crop_x.present? && image_bit && do_crop)
    self.update(do_crop: false)
  end

  def destroy_associated_stops
    begin
      res = TourStop.where(stop_id: self.id, stop_type: "unit").destroy_all
      VisitedStop.where(tour_stop_id: res.pluck(:id)).destroy_all
    rescue => ex
    end
  end

  def floorplan
    Floorplan.find_by(provider_floorplan_id: self.floorplan_id, community_id: self.community_id)
  end

  def unit_image
    self.image.present? ? self.image.url : (self.floorplan.present? && self.floorplan.image.present? ? self.floorplan.image.url : "/assets/default.jpeg")
  end

  def unit_market
    (self.building.present?) ?  (self.building.to_s + "-" + self.marketing_name) :  self.marketing_name
  end

  def api_unit_marketing_name
    (self.building.present? && self.community.display_building) ?  (self.building.to_s + "-" + self.marketing_name) :  self.marketing_name
  end

  def unit_check_like_marketname(unitObj)
    marketing_nameSplit = unitObj.marketing_name.split('-')
    if marketing_nameSplit.count > 1
      marketing_name = marketing_nameSplit[1..marketing_nameSplit.length-1].map {|str| "#{str}"}.join('-')
      unit = Unit.where('community_id = ? AND marketing_name LIKE ? ', unitObj.community_id, "%-#{marketing_name}")
      if unit.count == 1
        return marketing_name
      end
      if unit.count >= 2
        return unitObj.marketing_name
      end
    else
      return unit_check_same_marketname(self)
    end
  end

  def unit_check_same_marketname(unitObj)
    unit = Unit.where(community_id: self.community_id,marketing_name: unitObj.marketing_name)
    if unit.count == 1
      return unitObj.marketing_name
    end
    if unit.count >= 2
      if unitObj.building.present?
        return unitObj.building + "-" + unitObj.marketing_name
      else
        return unitObj.marketing_name
      end
    end
  end

  def populate_image_urls
    if image.present?
      set_standard_url('Unit',id)
    end
  end

  def show_integer_rent
    self.effective_rent.to_i
  end

  def name
    self.marketing_name
  end


  def self.path_data
    [{x: 1025, y: 503}, {x: 1000, y: 603}, {x: 980, y: 300}]
  end

  def remove_doors_plotting
    door.destroy if door.present?
  end

  def digital_lock_provider?
    self.lock_provider.present? and self.lock_provider != "" and self.lock_provider != "Manual"
  end

  def unit_type_or_name
    unit_type_name = "other unit"
    if self.unit_type.present?
      unit_type_name = self.unit_type
    elsif self.marketing_name.present?
      unit_type_name = self.marketing_name
    end
    unit_type_name
  end

  def svg_coordinates
    pointer_data.is_a?(Hash) ? pointer_data.values_at('x_plot', 'y_plot').map(&:to_i) : [0, 0]
  end
end
