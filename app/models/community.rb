class Community < ApplicationRecord
  include LockedTourStopHelper

  mount_base64_uploader :logo, AvatarUploader
  mount_base64_uploader :email_logo, AvatarUploader
  mount_base64_uploader :secondary_logo, AvatarUploader
  mount_base64_uploader :self_tour_logo, AvatarUploader
  mount_base64_uploader :brand_details_pdf , PdfUploader
  mount_base64_uploader :file, DesignUploader

  belongs_to :company
  belongs_to :community_group
  belongs_to :region

  has_many :pynwheel_access_users
  has_many :community_users, dependent: :destroy
  has_many :users ,through: :community_users, dependent: :destroy
  has_many :units, dependent: :destroy
  has_many :floorplans, dependent: :destroy
  has_many :floorplates, -> { order("number DESC") }, dependent: :destroy
  has_many :allowed_emails, dependent: :destroy
  has_many :galleries, dependent: :destroy
  has_many :gallery_images, -> { order(:sort) }, dependent: :destroy
  has_many :temporary_images, dependent: :destroy
  has_many :webpages, dependent: :destroy
  has_many :imagepages, dependent: :destroy
  has_many :amenities, dependent: :destroy
  has_many :prospects, dependent: :destroy
  has_many :as_guests, dependent: :destroy
  has_many :igloo_guests, dependent: :destroy
  has_many :latch_guests, dependent: :destroy
  has_many :zerv_guests, dependent: :destroy
  has_many :igloohome_guests, dependent: :destroy
  has_many :opening_hours, dependent: :destroy
  has_many :guided_opening_hours, dependent: :destroy
  has_many :schedual_tours, dependent: :destroy
  has_many :building_starting_point, dependent: :destroy
  has_many :tutorials, dependent: :destroy
  has_many :elevators, dependent: :destroy
  has_many :doors, dependent: :destroy
  has_many :access_points, -> { where("attached_with_type = 'Floorplate' OR attached_with_type = 'Sitemap'") }, class_name: 'Door', dependent: :destroy
  has_many :other_locks, dependent: :destroy


  has_one :credential, dependent: :destroy
  has_one :crm_credential, dependent: :destroy
  has_one :design, dependent: :destroy
  has_one :favorite_stop, dependent: :destroy
  has_one :sitemap, dependent: :destroy
  has_one :favorite_setting, dependent: :destroy
  has_one :neighborhood, dependent: :destroy
  has_one :tour, dependent: :destroy
  has_one :edge_state, dependent: :destroy
  has_one :dwelo, dependent: :destroy
  has_one :latch, dependent: :destroy
  has_one :zerv, dependent: :destroy
  has_one :igloohome, dependent: :destroy
  has_one :three_d_maps_configuration, dependent: :destroy
  has_many :comments , as: :commentable
  has_one :hardware_spec
  has_one :status, as: :statusable
  has_one :yale
  has_one :schlage
  has_one :launch_remote
  has_one :design_direction

  accepts_nested_attributes_for :credential
  accepts_nested_attributes_for :design

  validates_uniqueness_of :name, scope: :company_id
  validate :apartment_page_name_length_validate
  validate :gallery_page_name_length_validate
  validate :validate_page_position
  validates_with CodeValidatorOnUpdate , on: [:update]
  validates_with CodeValidatorOnCreate , on: [:create]

  after_create :set_default_theme
  after_create :create_default_gallery
  after_create :create_sms_email_content

  attr_accessor :default_community_id
  after_update :crop_image
  after_update :crop_secondary_image
  after_create :create_tour_also
  after_create :change_touchscreen_app_for_dwelo
  # after_create :set_company_level_settings_yes
  before_save :turn_off_chat, if: Proc.new { chat_control == false }
  after_save :set_community_time_zone, if: ->(obj) { obj.latitude_changed? || obj.longitude_changed? }
  after_save :set_country_code, if: ->(obj) { obj.latitude_changed? || obj.longitude_changed? || obj.city_changed? || obj.state_changed? || obj.address_changed? || obj.zip_changed? }

  after_save :create_default_credential
  after_update :set_default_provider

  enum alert_contact: [:email, :phone, :both]
  scope :active_communities, -> { where(locked: false) }
  scope :self_tour_enabled_only, -> { where('self_tour = ?', true) }
  scope :desc_created_at, -> { order(created_at: :desc) }
  scope :without_test_properties, -> {where.not(company_id: [44, 728, 730])}
  scope :active_properties, -> {where(locked: [false, nil])}
  scope :active_client_properties, -> { active_properties.where.not(company_id: [44, 728, 730]) }

  scope :count_properties_in_each_state, -> {active_client_properties&.where.not(state: [nil, ""]).distinct.group(:state).count} 
  scope :count_properties_in_each_state, -> {active_client_properties&.where.not(state: [nil, ""]).distinct.group(:state).count} 
  scope :active_touch_properties, -> {active_client_properties&.where(touchscreen_app: true)}
  scope :launch_properties, -> {where(pynwheel_launch_access: true).where.not(company_id: [44, 728, 730])}
  scope :touch_and_launch_properties, -> { active_touch_properties | launch_properties }
  
  scope :test_properties, -> { 
    joins(:company)
      .where("companies.name IN (?)", ['Test Company 123']) 
  }

  amoeba do
    include_association :design
  end

  def as_json(options = {})
    data = super(
      :only => [:id , :name , :logo , :file, :address , :city , :longitude, :latitude, :state , :email , :phone , :zip, :web_map_type, :is_sitemap, :display_building ,:property_manager_name,:property_manager_phone,:property_manager_email ,:enable_three_d_maps , :website , :number_of_units, :production_started_date, :released_date, :submitted_final_approval_date, :product_options, :use_company_level_data_settings, :country_code], :methods => [:schedule_tour_url, :community_code],include: { company: {except: [:created_at]}})
    check_brand_access = options[:brand_pdf_feature]
    if check_brand_access == true
      data.merge!(:brand_feature_access => true , :brand_details_pdf => brand_details())
    else
      data.merge!(:brand_feature_access => false)
    end
  end

  def available_unit_for_self_tour
    return [] unless customization_enabled?

    units_query = if SELF_TOUR_PROVIDERS.include?(self.data_provider)
                    self.units.vacant_and_available
                  else
                    self.units.available_units
                  end

    if self.is_sitemap
      units_query
    else
      units_query.where.not(floor: [nil], building: ["", nil, "N/A"])
    end
  end

  def amenities_available_for_tour?
    return false unless customization_enabled?
    
    property_availbale_amenities.exists?

  rescue => ex
    false
  end

  def property_availbale_amenities
    plotted_amenities_query = self.amenities.plotted_amenities

    if self.is_sitemap
      amenities_count = plotted_amenities_query
    else
      amenities_count = plotted_amenities_query.where.not(floor: [nil], building: ["", nil, "N/A"])
    end
  end

  def amenities_left_for_tour?(tour_id)
    return false unless customization_enabled?
    property_amenities_ids = property_availbale_amenities.ids
    stop_amenities_ids = TourStop.where(display_stop: true, tour_id: tour_id, stop_type: "amenity").pluck(:stop_id)
    (property_amenities_ids - stop_amenities_ids).present?
  end

  def customization_enabled?
    self.community_tour&.tour_setting&.enable_tour_customization
  end

  def plotted_units
    # self&.units&.are_ploted_units
    self&.units - self&.community_tour&.unit_tour_stops rescue []
  end

  def plotted_amenities
    # self&.amenities&.plotted_amenities 
    self&.amenities - self&.community_tour&.amenity_tour_stops rescue []
  end

  def community_code
    (JWT.encode ({"community_id" => self.id}), ENV['SECRET_KEY_BASE_v2'], 'HS256') if self.present?
  end

  def schedule_tour_url
    community_code = self.community_code
    return "#{ENV['HOST_URL']}/scheduler_widget/test_widget?community_id=#{self.id}&community_code=#{community_code}&schedule_tours_page=true&direct=true"
  end
  
  def unit_bedrooms_filters floorplans, unit_bedrooms = []

    if self&.community_tour&.tour_setting&.enable_tour_customization
      int = 1

      floorplans.each do |f|

        unit_bedrooms << {
          id: int,
          title: (f.bedrooms.present? ? (f.bedrooms.to_i == 0 ? "Studio" : f.bedrooms.to_i) : ""),
          value: f.bedrooms.present? ? f.bedrooms.to_i : "",
          is_selected: false
        }

        int = int + 1

      end
    end

    unit_bedrooms
  end

  def property_map_width map
    if map&.present?
      if map&.width.to_i > 0
        map.width.to_f
      elsif map&.image&.url.present?
        image = MiniMagick::Image.open(get_map_url(map))
        image[:width].to_f
      else
        0.0
      end
    else
      0.0
    end
  end

  def property_map_height map
    if map&.present?
      if map&.height.to_i > 0
        map.height.to_f
      elsif map&.image.url.present?
        image = MiniMagick::Image.open(get_map_url(map))
        image[:height].to_f
      else
        0.0
      end
    else
      0.0
    end
  end

  def get_map_url map
    if Rails.env.development?
      "https://images-pynwheel-cms-v2.s3.amazonaws.com#{map.image.url}"
    else
      map.image.url
    end
  end

  def community_tour
    Tour.where(community_id: self&.id, tour_user_id: nil).last
  end

  def get_community_favorite_stop
    self.favorite_stop.present? ? self.favorite_stop : FavoriteStop.new
  end

  def brand_details
    self.brand_details_pdf
  end

  def update_floorplans_form_status current_pynwheel_user = nil, form_status = ""
    previous_status = PynwheelLaunch::Communities::CommunityDetailForms.new(self).check_status_of_specific_form(FLOORPLAN_IMAGES)
    self.set_floorplan_status(current_pynwheel_user, form_status)
    FollowUpMailer.send_email_after_form_submission(self, FLOORPLAN_IMAGES, previous_status)
  end

  def check_all_floorplans_form_status_is_submitted
    self.floorplans.all? { |f| f&.status&.status == SUBMITTED }
  end

  def update_property_management_form_status current_pynwheel_user = nil, form_status = nil
    previous_status = PynwheelLaunch::Communities::CommunityDetailForms.new(self).check_status_of_specific_form(PROPERTY_MANAGEMENT_SYSTEM)
    self.set_data_provider_status(current_pynwheel_user, form_status)
    FollowUpMailer.send_email_after_form_submission(self, PROPERTY_MANAGEMENT_SYSTEM, previous_status)
  end

  def update_community_details_form_status current_pynwheel_user = nil, form_status = nil
    previous_status = PynwheelLaunch::Communities::CommunityDetailForms.new(self).check_status_of_specific_form(COMMUNITY_DETAILS)
    self.set_community_details_status(current_pynwheel_user, form_status)
    FollowUpMailer.send_email_after_form_submission(self, COMMUNITY_DETAILS, previous_status)
  end

  def update_status_and_remarks form_type, form_status, form_remarks = ""
    PynwheelLaunch::Communities::CommunityDetailForms.new(self).update_status_and_remarks(form_type, form_status, form_remarks)

    unless disregard_forms(form_type)
      if form_status.eql?(APPROVED)
        application_approved = PynwheelLaunch::Communities::FollowUpEmails.new(self).move_to_production_auto_email
        
        if application_approved
          self.production_started_date = DateTime.now
          self.save
          FollowUpMailer.application_approved(self)
        end
      end
    end
  end

  def disregard_forms form_type
    ([ADDITIONAL_PAGES, EBROCHURE, HARDWARE_SPECS, AMENITY_IMAGES, DESIGN_DIRECTION, COMPANY_DETAILS].include?(form_type))
  end

  def set_community_status(current_user)
    return if self.blank?

    # set_community_details_status(current_user)
    # set_property_map_status(current_user)
    # set_floorplan_status(current_user)
    # set_gallery_images_status(current_user)
    # set_touch_vidoes_status(current_user)
    # set_data_provider_status(current_user)
    # touch_installation_specification(current_user)
    # set_lock_providers_status(current_user)
    # set_tour_stops_status(current_user)
    # set_visiting_hours_status(current_user)
  end

  def set_community_details_status(current_user, status)
    return if self.blank?
    if status.nil?
      community_status = status_string(check_community_requirments(self))
    else
      community_status = status
    end

    set_status_for_all(self,community_status,current_user)
  end

  def set_property_map_status(current_user, status)
    return if self.sitemap.blank? && self.floorplates.blank?

    if self.is_sitemap
      sitemap = self.sitemap
      unless status.present?
        property_sitemap_status = status_string(self.sitemap&.image&.url.present? || self.sitemap&.file&.url.present?)
      else
        property_sitemap_status = "in_progress"
      end
      set_status_for_all(sitemap,property_sitemap_status,current_user)
    elsif self.floorplates.any?
      floorplates = self.floorplates
      floorplates.each do |floorplate|
        unless status.present?
          property_floorplate_status = status_string(floorplate&.image&.url.present? || floorplate&.file&.url.present?)
        else
          property_floorplate_status = "in_progress"
        end
        set_status_for_all(floorplate,property_floorplate_status,current_user)
      end
    end
  end

  def set_floorplan_status(current_user, status)
    return if self.floorplans.blank?
    self.floorplans.each do |floorplan|
      unless status.present?
        floorplan_status = status_string(floorplan&.image&.url.present? || floorplan&.file&.url.present?)
      else
        floorplan_status = status
      end
    
      set_status_for_all(floorplan,floorplan_status,current_user)
    end
    
  end

  def set_gallery_images_status(current_user, status)
    return if self.galleries.blank?

    self.galleries.each do |gallery|
      unless status.present?
        gallery_images_status = status_string(gallery.name.present? && gallery&.gallery_images.present?)
      else
        gallery_images_status = status
      end
      set_status_for_all(gallery,gallery_images_status,current_user)
    end
  end

  def set_touch_vidoes_status(current_user, status)
    return if self.design.blank?
    design = self.design
    home_page_image_status(design,current_user, status)
    home_page_video_status(design,current_user, status)
  end

  def home_page_image_status(design,current_user, status)
    return if design.home_page_images.blank?

    design.home_page_images.each do |touch_img|
      unless status.present?
        touch_img_status = status_string(touch_img.name.present? & touch_img.image&.url.present?)
      else
        touch_img_status = status
      end
      set_status_for_all(touch_img,touch_img_status,current_user)
    end
  end

  def home_page_video_status(design,current_user, status)
    return if design.home_page_video.blank?

    hp_video = design.home_page_video
    unless status.present?
      touch_video_status = status_string(hp_video.video.url.present?)
    else
      touch_video_status = status
    end
    set_status_for_all(hp_video,touch_video_status,current_user)
  end

  def set_data_provider_status(current_user, status)
    return if self.data_provider.blank? || self.credential.blank?
    
    provider_credential = self.credential
    required_fields = check_required_fields_for_providers

    unless status.present?
      status_attr = status_string(required_fields)
    else
      status_attr = status
    end
    set_status_for_all(provider_credential,status_attr,current_user)
    if self&.credential&.use_different_crm_provider
      set_crm_status(current_user)
    end
  end

  def set_design_direction_status(current_user, status)
    return if self&.design_direction&.blank?
    unless status.present?
      design_direction = status_string(self&.design_direction&.image&.url.present? || self&.design_direction&.file&.url.present?)
    else
      design_direction = status
    end
    set_status_for_all(self&.design_direction,design_direction,current_user)
  end

  def set_community_amenity_status(current_user, status)
    return if self.amenities.blank?

    self.amenities.each do |amenity|
      unless status.present?
        amenity_status = status_string(amenity&.image&.url.present?)
      else
        amenity_status = status
      end
      set_status_for_all(amenity,amenity_status,current_user)
    end
  end

  def set_additional_pages_status(current_user, status)
    return if self.webpages.blank? && self.imagepages.blank?
    webpages = self.webpages
    webpages.each do |webpage|
      unless status.present?
        webpage_status = status_string(webpage&.name.present? && webpage&.url.present?)
      else
        webpage_status = status
      end
      set_status_for_all(webpage,webpage_status,current_user)
    end
    imagepages = self.imagepages
    imagepages.each do |imagepage|
      unless status.present?
        imagepage_status = status_string(imagepage&.name.present?)
      else
        imagepage_status = status
      end
      set_status_for_all(imagepage,imagepage_status,current_user)
    end
  end

  def set_ebrochure_status(current_user, status)
    return if self.favorite_setting.blank?
    weblinks = self.favorite_setting.ebrochure_menu_buttons
    if weblinks.present?
      weblinks.each do |weblink|
        unless status.present?
          weblink_status = status_string(weblink&.name.present? && weblink&.url.present?)
        else
          weblink_status = status
        end
        set_status_for_all(weblink,weblink_status,current_user)
      end
    end
    images = self.favorite_setting.favorite_images
    if images.present?
      images.each do |image|
        unless status.present?
          image_status = status_string(image&.image&.url.present?)
        else
          image_status = status
        end
        set_status_for_all(image,image_status,current_user)
      end
    end
  end

  def check_required_fields_for_providers
    credential = self.credential

    case data_provider
      when "psi"
        credential.entrata_url.present? && credential.username.present? && credential.password.present? && credential.property_id.present?
      when "yardirentcafe"
        (credential.c_code.present? || credential.api_token.present?) && credential.p_code.present?
      when "rentmanager"
        (credential.rentmanager_username.present? && credential.rentmanager_password.present? && credential.rentmanager_property_id.present? && credential.rentmanager_base_url.present?)
      when "realpagesvc"
        credential.site_id.present? && credential.pmc_id.present?
      when "yardi"
        credential.url.present? && credential.username.present? && credential.password.present? && credential.property_id.present? && credential.server_name.present? && credential.database.present?
      when "resman"
        credential.resman_api_version.present? && credential.resman_account_id.present? && credential.resman_property_id.present?
      when "zaremba"
        credential.zaremba_username.present? && credential.zaremba_password.present? && credential.zaremba_filename.present? && credential.zaremba_property_id.present?
      when "xml"
        credential.xml_filename.present? && credential.xml_domain.present?
      when "other"
        credential.new_requested_data_provider.present?
    end
  end

  def set_crm_status(current_user)
    return if self.crm_credential.blank?
    crm_credential = self.crm_credential
    required_fields = check_crm_required_fields
    status_attr = status_string(required_fields)
    set_status_for_all(crm_credential,status_attr,current_user)
  end

  def check_crm_required_fields
    return if self.crm_credential.crm_provider.blank?
    crm_credential = self.crm_credential

    case crm_credential.crm_provider
      when "psi"
        crm_credential.entrata_domain.present? && crm_credential.entrata_username.present? && crm_credential.entrata_password.present? && crm_credential.entrata_property_id.present?
      when "yardirentcafe"
        check_rent_cafe_crm_credentials()
      when "realpagesvc"
        crm_credential.realpage_site_id.present? && crm_credential.realpage_pmc_id.present?
      when "salesforce"
        crm_credential.salesforce_username.present? && crm_credential.salesforce_password.present? && crm_credential.salesforce_client_id.present? && crm_credential.salesforce_secret_id.present? && crm_credential.salesforce_property_id.present?
      when "knock"
        crm_credential.knock_api_key.present? && crm_credential.knock_community_id.present? && crm_credential.knock_sms_consent_url.present?
      when "funnel"
        crm_credential.funnel_api_key.present? && crm_credential.funnel_community_id.present?
    end
  end

  def check_rent_cafe_crm_credentials
    if credential.rentcafe_api_version == "RentCafe V2"
      true
    else
      crm_credential.yardirentcafe_marketing_api_key.present? && (crm_credential.yardirentcafe_property_id.present? || crm_credential.yardirentcafe_property_code.present?)
    end
  end

  def set_visiting_hours_status(current_user, status)
    @tour = self.community_tour
    return unless self.self_tour
    # self_tour_visiting_hours(current_user) if @tour&.tour_setting&.allow_self_tour # commented this code so that the status shold be changed based on Pynwheel Tour in community setting
    # guided_visiting_hours(current_user) if @tour&.tour_setting&.allow_guided_tour # commented this code so that the status shold be changed based on Pynwheel Tour in community setting
    self_tour_visiting_hours(current_user, status)
    guided_visiting_hours(current_user, status)
  end

  def self_tour_visiting_hours(current_user, status)
    return if self.opening_hours.blank?
    self_visiting_hours = self.opening_hours
    self_visiting_hours.each do |oh|
      unless status.present?
        status_attr = status_string(oh.day.present? && oh.opening_time.present? && oh.closing_time.present?)
      else
        status_attr = status
      end
      set_status_for_all(oh,status_attr,current_user)
    end
  end

  def guided_visiting_hours(current_user, status)
    return if self.guided_opening_hours.blank?
    guided_visiting_hours = self.guided_opening_hours
    guided_visiting_hours.each do |gh|
      unless status.present?
        status_attr = status_string(gh.day.present? && gh.opening_time.present? && gh.closing_time.present? )
      else
        status_attr = status
      end
      set_status_for_all(gh,status_attr,current_user)
    end
  end

  def touch_installation_specification(current_user, status)
    return if self.hardware_spec.nil?
    hardware_spec = self.hardware_spec
    unless status.present?
      status_attr = status_string(hardware_spec&.name.present? && hardware_spec&.phone.present? && hardware_spec&.image.present? )
    else
      status_attr = status
    end
    set_status_for_all(self.hardware_spec, status_attr, current_user)
  end

  def check_community_requirments(community)
    (community.name && community.email && community.phone && community.address && community.city && community.state && community.zip).present?
  end

  def check_required_hardware(product_options)
    products_json = JSON.parse product_options
    products_json['product_options']['pynwheel_touch']['options']['hardware'].present?
  end

  def set_tour_stops_status(current_user, status)
    return if self.community_tour&.tour_stops.blank?
    tour_stops = self.community_tour.tour_stops.compact
    tour_stops.each do |ts|
      unless status.present?
        status_attr = status_string(ts.name.present?)
      else
        status_attr = status
      end
      set_status_for_all(ts,status_attr,current_user)
    end
  end

  def set_lock_providers_status(current_user, status)
    if self.zerv.blank? && self.latch.blank? && self.dwelo.blank? && self.edge_state.blank? && self&.launch_remote.blank?  && self&.yale.blank? && self.other_locks.nil?
      return
    else
      pynwheel_access_status(current_user, status)
      latch_locks_status(current_user, status)
      dwelo_locks_status(current_user, status)
      remote_lock_status(current_user, status)
      yale_lock_status(current_user, status)
      set_other_lock_status(current_user, status)
      schlage_lock_status(current_user, status)
      igloohome_lock_status(current_user, status)
    end
  end

  def igloohome_lock_status(current_user, status)
    return if igloohome.blank?
    
    unless status.present?
      if igloohome.is_auth_code
        status_attr = status_string(igloohome.home_name && (igloohome.refresh_token.present? || igloohome.is_authorized_with_pynwheel) )
      elsif igloohome.is_client_auth
        status_attr = status_string(igloohome.home_name && igloohome.client_id.present? && igloohome.client_secret.present?)
      else
        status_attr = status
      end
    else
      status_attr = status
    end

    set_status_for_all(igloohome,status_attr,current_user)
  end

  def yale_lock_status(current_user, status)
    return if self.yale.blank?
    yale_locks = self.yale
    status_attr = status.present? ? status : status_string(yale_locks.present?)
    set_status_for_all(yale_locks,status_attr,current_user)
  end

  def schlage_lock_status(current_user, status)
    return if self.schlage.blank?
    schlage_locks = self&.schlage
    status_attr = status.present? ? status : status_string(schlage_locks.present?)
    set_status_for_all(schlage_locks,status_attr,current_user)
  end

  def set_other_lock_status(current_user, status)
    return unless self.other_locks.present?
    other_locks = self.other_locks
    other_locks.each do |lock|
      unless status.present?
        status_attr = status_string(lock.description.present?)
      else
        status_attr = status
      end
      set_status_for_all(lock,status_attr,current_user)
    end
  end

  def pynwheel_access_status(current_user, status)
    return if self.zerv.blank?
    zerv_lock = self.zerv
    unless status.present?
      status_attr = status_string(zerv_lock.facility_id.present? && zerv_lock.badge_id.present? && zerv_lock.card_format.present?)
    else
      status_attr = status
    end
    set_status_for_all(zerv_lock,status_attr,current_user)
  end

  def latch_locks_status(current_user, status)
    return if self.latch.blank?
    latch = self.latch

    unless status.present?
      status_attr = status_string(latch.latch_property_name.present? && latch.is_building_name_added && latch.is_integration_submitted && latch.is_mission_control_setup)
    else
      status_attr = status
    end
    set_status_for_all(latch,status_attr,current_user)
  end

  def dwelo_locks_status(current_user, status)
    return if self.dwelo.blank?
    dwelo = self.dwelo
    unless status.present?
      status_attr = status_string(dwelo.community_id.present? && dwelo.client_id.present? && dwelo.client_secret.present?)
    else
      status_attr = status
    end
    set_status_for_all(dwelo,status_attr,current_user)
  end

  def remote_lock_status(current_user, status)
    return if self.launch_remote.blank?
    remote_locks = self.launch_remote
    status_attr = status.present? ? status : status_string(remote_locks.present?)
    set_status_for_all(remote_locks,status_attr,current_user)
  end

  def status_string(present_required_fields)
    present_required_fields ? SUBMITTED : IN_PROGRESS
  end

  def set_status_for_all(status_entity, status_attribute, current_user)
    status_entity.build_status unless status_entity.status
    status_entity.status.update_attributes(status: status_attribute, whodunnit: current_user&.id)
  end

  def show_apply_now
    self.credential.apply_now == "true" || self.credential.apply_now == "separate_link"
  end

  def logo_for_email
    if self&.email_logo.present? && self&.email_logo&.url.present?
      self&.email_logo&.url
    elsif self&.self_tour_logo.present? && self&.self_tour_logo&.url.present?
      self&.self_tour_logo&.url
    elsif self&.logo.present? && self&.logo&.url.present?
      self&.logo&.url
    else
      base_url = Rails.env.development? ? "http://localhost:3000" : (ENV["RAILS_ENV"] == "staging" ? "https://pynwheel-staging.herokuapp.com" : "https://pynwheelapp.com")
      "#{base_url}/assets/#{Rails.application.assets.find_asset('pynwheel-default-logo.png').try(:digest_path)}"
    end
  end

  def set_community_time_zone
    if self.latitude.present? && self.longitude.present?
      time_zone = Timezone.lookup(self.latitude, self.longitude)&.name rescue "UTC"
      self.update_column :time_zone, time_zone if time_zone.present? 
    end
  end

  def set_country_code
    c_code = fetch_country_code
    update_column(:country_code, c_code) if c_code.present?
  end

  def fetch_country_code
    begin
      addr = Geocoder.search([latitude, longitude]) || Geocoder.search(address)

      if addr.present? && addr.first&.data&.dig("address", "country_code").present?
        addr.first.data["address"]["country_code"].upcase
      else
        "US"
      end
    rescue StandardError
      "US"
    end
  end


  def community_data_updated_on
    self.update(data_provider_updated_on: Time.now.to_s)
  end

  def community_website
    return unless self.website.present?

    if self.website.include?("http" || "https")
      self.website
    else
      "https://#{self.website}"
    end
  end

  def get_igloohome_lock stop
    igloohome_stop = get_door_or_stop_lock(stop, "Igloohome")
    IgloohomeLock.where(igloohome_id: self.igloohome.id, stop_id: igloohome_stop.id, stop_type: igloohome_stop.class.name).last if self.igloohome.present?
  end

  def get_igloohome_guest stop, tour_user_id
    igloohome_stop = get_door_or_stop_lock(stop, "Igloohome")
    IgloohomeGuest.where(tour_user_id: tour_user_id, community_id: self.id, stop_id: igloohome_stop.id, stop_type: igloohome_stop.class.name).last if self.igloohome.present?
  end

  def create_tour_also
    tour = self.create_tour if self&.community_tour.nil?
    tour.create_tour_setting if tour.present? and tour.tour_setting.nil?
  end

  def change_touchscreen_app_for_dwelo
    self.update_columns(touchscreen_app: false)
  end

  # def set_company_level_settings_yes
  #   if self.company.credential.present?
  #     self.update_columns(use_company_level_data_settings: true)
  #   end
  # end
  def set_default_provider
    return unless credential.present?

    current_company = self.company
    if self.use_company_level_data_settings == true
      unless current_company.data_providers.include?(self.data_provider)
        if current_company.data_providers.present?
          self.update_columns(data_provider: current_company.data_providers.first )
        else
          self.update_columns(data_provider: nil )
        end
      end
    end
  end

  def create_default_credential
    if self.credential.present?
      current_company = self.company
      if current_company.credential.present? && (self.use_company_level_data_settings == true)
        credential_attributes = [
          "yardi_rent_cafe_api_url", "entrata_available_units_only", "url",
          "entrata_url","pmc_id", "server_name", "database", "platform", "interface_entity",
          "c_code", "api_token", "resman_apikey", "resman_account_id", "resman_api_version", "rentcafe_api_version"
        ]
        company_credential_attributes = current_company.credential&.attributes&.keys.map(&:to_sym)
        company_credential_attributes = current_company.credential&.attributes&.slice(*credential_attributes)
        community_credential = self.credential
        if self.data_provider == 'yardi'
          company_credential_attributes["username"] = current_company.credential.yardi_username
          company_credential_attributes["password"] = current_company.credential.yardi_password
        else
          company_credential_attributes["username"] = current_company.credential.username
          company_credential_attributes["password"] = current_company.credential.password
        end
        community_credential.update(company_credential_attributes)
      end
    end
  end

  def crop_image
    logo.recreate_versions! if (crop_x.present? && image_bit && do_crop)
  end

  def crop_secondary_image
    secondary_logo.recreate_versions! if (crop_x_secondary.present? && !image_bit && do_crop_secondary)
    self.update_columns(do_crop_secondary: false)
  end

  def is_futurist?
    theme_name == "futurist"
  end

  def is_cubist?
    theme_name == "cubist"
  end

  def is_modernist?
    theme_name == "modernist"
  end

  def is_expressionist?
    theme_name == "expressionist"
  end

  def is_gables_organic?
    theme_name == "gables_organic"
  end

  def is_gables_refined?
    theme_name == "gables_refined"
  end

  def is_gables_energetic?
    theme_name == "gables_energetic"
  end

  def is_gables_natural?
    theme_name == "gables_natural"
  end

  def is_gables_custom?
    theme_name == "gables_custom"
  end

  def any_gables_theme?
    theme_name == "gables_organic" || theme_name == "gables_refined" || theme_name == "gables_energetic" || theme_name == "gables_natural" || theme_name == "gables_custom"
  end

  def is_panther?
    theme_name == "panther"
  end

  def has_floorplates?
    !is_sitemap
  end
  #Below method is temporary. Don't forget to remove it.
  def temporary_theme_name
    if theme_name == "gables_custom"
      "gables_organic"
    else
      theme_name
    end
  end
  def clone_a_community(community)
    CloneCommunityJob.perform_async community
  end

  def get_time_zone default_time_zone = "UTC"
    self.time_zone.eql?("UTC") ? default_time_zone : self.time_zone
  end

  def has_temporary_images?
    temporary_images.size > 0
  end
  def delete_community
    PropertyDestroyWorker.perform_async self.id
  end

  def clean_psi_data_provider
    case data_provider
      when "psi"
        clean_data_psi
    end
  end

  def get_time_in_24_hours_format time
    arr = time.split(" ")
    arr = arr[0].split(":")
    hours = arr[0].to_i
    minutes = arr[1]

    if time.include?("pm") || time.include?("PM")
      hours = (hours == 12) ? hours : (hours + 12)
      "#{hours.to_s}:#{minutes}"
    else
      hours = (hours == 12) ? "00" : hours
      "#{hours.to_s}:#{minutes}"
    end
  end

  def data_is_imported
    case data_provider
      when "psi"
        import_psi_data
      when "yardirentcafe"
        import_yardirentcafe_data
      when "rentmanager"
        import_rentmanager_data
      when "realpagesvc"
        import_realpage_svc_data
      when "yardi"
        select_yardi_provider
      when "resman"
        select_resman_provider
      when "zaremba"
        import_zaremba_provider
      when "xml"
        import_xml_provider
    end
  end

  def data_is_swaped
    case data_provider
    when "psi"
      swap_psi_data
    when "yardirentcafe"
      swap_yardirentcafe_data
    when "realpagesvc"
      swap_realpage_svc_data
    when "yardi"
      select_swap_yardi_provider
    when "resman"
      swap_resman_data
    when "zaremba"
      swap_zaremba_data
    when "xml"
      swap_xml_data
    end

  end

  def community_crm_provider
    if self.credential.present? && self.credential.use_different_crm_provider && self.crm_credential.present? && self.crm_credential.crm_provider.present?
      self.crm_credential.crm_provider
    else
      ""
    end
  end

  def use_crm_credentials?
    if self.credential.present? && self.credential.use_different_crm_provider && self.crm_credential.present? && self.crm_credential.credential_present?
      (true)
    else
      (false)
    end
  end
  
  def update_community_provider_data
    case data_provider
    when "psi"
      EntrataDataUpdateWorker.perform_async self.id
    when "yardirentcafe"
      YardirentcafeDataUpdateWorker.perform_async self.id
    when "rentmanager"
      RentManagerDataImportWorker.perform_async self.id
    when "realpagesvc"
      RealPageDataUpdateWorker.perform_async self.id
    when "yardi"
      YardiDataUpdateWorker.perform_async self.id
    when "resman"
      ResmanDataUpdateWorker.perform_async self.id
    when "zaremba"
      ZarembaDataUpdateWorker.perform_async self.id
    when "xml"
      XmlDataUpdateWorker.perform_async self.id
    end
  end

  def use_yardi_as_lead?
    return unless credential.present?

    if credential.rentcafe_api_version == "RentCafe V2"
      use_rent_cafe_v2_as_lead
    else
      use_rent_cafe_v1_as_lead
    end
  end

  def use_rent_cafe_v1_as_lead
    self.credential.present? && self.credential.use_different_crm_provider && self.crm_credential.present? && self.crm_credential.crm_provider == "yardirentcafe" && self.crm_credential.yardirentcafe_marketing_api_key.present?
  end

  def use_rent_cafe_v2_as_lead
    self.credential.present? && self.credential.use_different_crm_provider && self.crm_credential.crm_provider == "yardirentcafe"
  end

  def is_funnel_community?
    self.credential.present? && self.credential.use_different_crm_provider && self.crm_credential.present? && self.crm_credential&.crm_provider === "funnel" && self.crm_credential&.funnel_community_id.present? && self.crm_credential&.funnel_api_key.present?
  end

  def is_knock_community?
    self.credential.present? && self.credential.use_different_crm_provider && self.crm_credential.present? && self.crm_credential&.crm_provider === "knock" && self.crm_credential&.knock_community_id.present? && self.crm_credential&.knock_api_key.present?
  end

  def is_salesforce_community?
    self.credential.present? && self.credential.use_different_crm_provider && self.crm_credential.present? && self.crm_credential.salesforce_username.present? && self.crm_credential.crm_provider === "salesforce"
  end

  def select_yardi_provider
    credential.url[credential.url.length-10..credential.url.length-1].include?("20") ? import_yardi2_data : import_yardi4_data
  end
  def select_swap_yardi_provider
    credential.url[credential.url.length-10..credential.url.length-1].include?("20") ? swap_yardi2_data : swap_yardi4_data
  end
  def apartment_page_name_length_validate
    if attributes['apartment_page_name'].present?
      words = attributes['apartment_page_name'].split(" ")
      if words.size > 3
        errors[:base] << "You can add upto three words and each word must be 15 characters long."
      end

      words.each do |w|
        if w.size > 15
          errors[:base] << "You can add upto three words and each word must be 15 characters long."
        end
      end
    end
  end
  def gallery_page_name_length_validate
    if attributes['gallery_page_name'].present?
      words = attributes['gallery_page_name'].split(" ")
      if words.size > 3
        errors[:base] << "You can add upto three words and each word must be 15 characters long."
      end

      words.each do |w|
        if w.size > 15
          errors[:base] << "You can add upto three words and each word must be 15 characters long."
        end
      end
    end
  end
  def unique_community_code_on_create
    unless attributes["code"] == "" || attributes["code"] == nil
      com = Community.where(code: attributes["code"])
      if com.count < 1
        true
      else
        errors[:base] << "Community code has already been taken."
      end
    end
  end
  def unique_community_code_on_update
    unless attributes["code"] == "" || attributes["code"] == nil
      com = Community.where(code: attributes["code"])
      if com.count == 0
        true
      elsif com.count < 2
        unless com.first.id == attributes["id"]
          errors[:base] << "Community code has already been taken."
        end
      else
        errors[:base] << "Community code has already been taken."
      end
    end
  end
  
  def check_credentials
    psi_static_service = CredentialsValid.new(JSON.parse(credential.attributes.to_json))
    psi_static_service.perform
  end

  def import_psi_data
    # ImportPsiStaticDataJob.perform_async credential
    EntrataDataImportWorker.perform_async self.id
  end

  def clean_data_psi
    CleanPsiDataJob.perform_async credential.attributes.to_json
  end

  def import_zaremba_provider
    ImportZarembaStaticDataJob.perform_async credential.attributes.to_json
  end

  def import_xml_provider
    ImportXmlStaticDataJob.perform_async credential.attributes.to_json
s  end

  def swap_psi_data
    ImportPsiSwapDataJob.perform_async credential
  end
  def swap_resman_data
    ((credential.resman_api_version === "GetMarketing4_0") ? swap_resman4_data : swap_resman2_data)
  end

  def swap_resman2_data
    ImportResmanSwapDataJob.perform_async credential.attributes.to_json
  end

  def swap_resman4_data
    ImportResman4SwapDataJob.perform_async credential.attributes.to_json
  end

  def swap_zaremba_data
    ImportZarembaSwapDataJob.perform_async credential.attributes.to_json
  end
  def swap_xml_data
    ImportXmlSwapDataJob.perform_async credential.attributes.to_json
  end
  
  def import_yardirentcafe_data
    RentCafeDataImportWorker.perform_async self.id
  end

  def import_rentmanager_data
    RentManagerDataImportWorker.perform_async self.id
  end

  def swap_yardirentcafe_data
    RentCafeDataSwapWorker.perform_async self.id
  end

  def import_yardi2_data
    ImportYardi2StaticDataJob.perform_async credential.attributes.to_json
  end

  def import_yardi_users_data
    puts "--------"*50
    puts "Import yardi users data"
    ImportYardiUsersDataJob.perform_async credential.attributes.to_json
  end

  def swap_yardi2_data
    ImportYardi2SwapDataJob.perform_async credential.attributes.to_json
  end

  def import_yardi4_data
    ImportYardi4StaticDataJob.perform_async credential.attributes.to_json
  end

  def swap_yardi4_data
    ImportYardi4SwapDataJob.perform_async credential.attributes.to_json
  end
  
  def import_realpage_svc_data
    ImportRealpageSvcStaticDataJob.perform_async credential.attributes.to_json
  end

  def realpage_insert_prospect(tour_user, appointment_time, marketing_source, desired_move_in_date)
    RealPageInsertProspectJob.perform_async credential.attributes.to_json, tour_user, appointment_time, marketing_source, desired_move_in_date, self
  end

  def real_page_get_marketing_sources
    RealPageMarketingSourcesWorker.perform_async self.id
  end

  def entrata_send_mits_leads(tour_user, tour_time, end_time, visited_stops)
    PsiSendMitsLeadsJob.perform_async credential.attributes.to_json, tour_user, tour_time, end_time, visited_stops, self
  end

  def select_resman_provider
    ((credential.resman_api_version === "GetMarketing4_0") ? resman4_static_data_import : resman2_static_data_import)
  end

  def resman2_static_data_import
    ImportResmanStaticDataJob.perform_async credential.attributes.to_json
  end

  def resman4_static_data_import
    ImportResman4StaticDataJob.perform_async credential.attributes.to_json
  end

  def swap_realpage_svc_data
    ImportRealpageSvcSwapDataJob.perform_async credential.attributes.to_json
  end

  def experimental_data
    ImportExperimentalYardi4DataJob.perform_async credential.attributes.to_json
  end

  def send_feedback_to_salesforce(tour_user, tour_history)
    SalesforceSendFeedbackJob.perform_async self, tour_user, tour_history
  end

  def available_slots scheduled_tour
    if credential&.rentcafe_api_version == "RentCafe V2"
      YardiRentCafeV2Services::MarketingApisV2Service.new(scheduled_tour).available_slots
    else
      YardiRentCafeServices::MarketingApisService.new(scheduled_tour).available_slots
    end
  end

  def credentials_are_present?
    credential.present?
  end

  def pynwheel_access_users_data

    case self.data_provider
      when "psi"
        puts "------------- PSI -------------"
      when "yardirentcafe"
        puts "--------- yardirentcafe -------"
      when "realpagesvc"
        puts "--------- realpagesvc -------"
      when "yardi"
        puts "--------- yardi -------"
        import_yardi_users_data
      when "resman"
        puts "--------- resman -------"
    end
  end

  def connect_to_provider
    case data_provider
      when "psi"
        connect_to_psi
      when "yardirentcafe"
        connect_to_yardirentcafe
      when "rentmanager"
        connect_to_rentmanager
      when "realpagesvc"
        connect_to_realpagesvc
      when "yardi"
        connect_to_yardi
      when "resman"
        connect_to_resman
      when "zaremba"
        connect_to_zaremba
      when "xml"
        connect_to_xml
    end
  end

  def connect_to_pricing(com)
    case data_provider
      when "psi"
        connect_pricing_to_psi
      when "realpagesvc"
        connect_to_realpagesvc_pricing
    end

  end
  def connect_to_pricing_with_space_configuration(com)
    case data_provider
    when "psi"
      connect_space_configuration_psi
    end

  end

  def connect_to_rentmanager
    rentmanager_connection_service = DataProviders::RentManager::V1::TestConnectionService.new(self.id)
    rentmanager_connection_service.perform
  end

  def connect_pricing_to_psi
    psi_pricing_connection_service = PsiPricingConnectionService.new(credential.attributes)
    psi_pricing_connection_service.perform
  end
  def connect_space_configuration_psi
    psi_space_configuration_connection_service = PsiSpaceConfigurationConnectionService.new(credential.attributes)
    psi_space_configuration_connection_service.perform
  end
  def connect_to_realpagesvc_pricing
    psi_space_configuration_connection_service = RealPageSvcPricingConnectionService.new(credential.attributes)
    psi_space_configuration_connection_service.perform
    # if com.realpage_pricing_data.present?
    #   return com.realpage_pricing_data
    # end
    # real_page_svc_pricing_connection_service = RealPageSvcPricingConnectionService.new(credential.attributes)
    # real_page_svc_pricing_connection_service.perform
  end
  def connect_to_psi
    psi_connection_service = PsiConnectionService.new(credential.attributes)
    psi_connection_service.perform
  end
  def connect_to_resman
    resman_connection_service = ResmanConnectionService.new(credential.attributes)
    resman_connection_service.perform
  end

  def connect_to_zaremba
    zaremba_connection_service = ZarembaConnectionService.new(credential.attributes)
    zaremba_connection_service.perform
  end
  def connect_to_xml
    xml_connection_service = XmlConnectionService.new(credential.attributes)
    xml_connection_service.perform
  end

  def connect_to_yardirentcafe
    if credential.rentcafe_api_version == "RentCafe V2"
      yardi_rent_cafe_connection_service = DataProviders::RentCafe::V2::TestConnectionService.new(self.id)
    else
      yardi_rent_cafe_connection_service = DataProviders::RentCafe::V1::TestConnectionService.new(self.id)
    end

    yardi_rent_cafe_connection_service.perform
  end

  def connect_to_realpagesvc
    real_page_svc_connection_service = RealPageSvcConnectionService.new(credential.attributes)
    real_page_svc_connection_service.perform
    # RealPageSvcPricingJob.perform_async credential.attributes.to_json
    # real_page_svc_pricing_connection_service = RealPageSvcPricingConnectionService.new(credential.attributes)
    # real_page_svc_pricing_connection_service.perform
  end

  def connect_to_yardi
    credential.url[credential.url.length-10..credential.url.length-1]&.include?("20") ? yardi2_service : yardi4_service
  end

  def yardi2_service
    yardi2_connection_service = Yardi2ConnectionService.new(credential.attributes)
    yardi2_connection_service.perform
  end

  def yardi4_service
    yardi4_connection_service = Yardi4ConnectionService.new(credential.attributes)
    yardi4_connection_service.perform
  end

  def delete_plots
    self.units.where(floorplate_id: nil).update_all(x_plot: 0, y_plot: 0)
  end

  def delete_plots_from_floorplate(floorplate_id)
    floorplate = Floorplate.find floorplate_id
    units = Unit.where(community_id: id,floor: floorplate.floors)
    units.update_all(x_plot: 0, y_plot: 0)
  end

  def set_default_theme
    self.theme_name = "futurist"
    self.save
  end

  def create_default_gallery
    default_galleries = ["Apartments", "Community"]
    default_galleries.each do |gallery_name|
      self.galleries.create(name: gallery_name, is_default: true)
    end
    # self.galleries.create(name: 'default')
  end

  def create_sms_email_content
    self.sms_text = CommunityConstants::SMS_TEXT
    self.email_text = CommunityConstants::EMAIL_TEXT
    self.save
  end

  # def gen_uuid
  #   self.uuid = SecureRandom.uuid
  # end

  def make_address
    address = ""
    address = self.address if self.address.present?
    address = (address.present? ? ( address + " , " + self.city ) : ( self.city )) if self.city.present?
    address = (address.present? ? ( address + " , " + self.state ) : ( self.state )) if self.state.present?
    address = (address.present? ? ( address + " , " + self.zip ) : ( self.zip )) if self.zip.present?
    
    if address.present?
      return address
    else
      return nil
    end
  end

  def get_propery_address
    com_address = if self.make_address
      self.make_address
    elsif self.latitude.present? && self.longitude.present?
      "#{self.latitude},#{self.longitude}"
    else 
      ""
    end
    
    URI.escape(com_address, Regexp.new("[^#{URI::PATTERN::UNRESERVED}]"))
  end

  def submit_crm_leads email_to, favorites
    return unless use_yardi_as_lead?

    case data_provider
      when "yardirentcafe"
        LeadsUploader::YardiRentCafe.new(self.id, email_to, favorites).leads_uploader() if favorites.present?
    end
  end

  def email_favorites(params)
    email_to = params[:favorites][:email_to]
    result = populate_favorites(params[:favorites][:items],email_to)
    favorites = result[0]
    units = result[1]
    
    submit_crm_leads(email_to, favorites)

    email_bcc = self.favorite_setting.present? ? self.favorite_setting.email_bcc : nil
    email_from = self.favorite_setting.present? ? self.favorite_setting.email_from : nil
    email_body = self.favorite_setting.present? ? self.favorite_setting.email_body : nil
    ios = params[:favorites][:device_type].present? && params[:favorites][:device_type] == "iOS" ? true : false

    if favorites.present?
      begin
        FavoriteMailer.email_favorites(email_from,email_to,email_bcc,email_body,favorites,units,ios,self).deliver
      rescue => ex
        FavoriteMailer.email_favorites_text(email_from,email_to,email_bcc,email_body,favorites,units,ios,self).deliver
      end
      return true
    else
      return false
    end
  end
  def neighbourhood_counter_mail_200
    NeighbourhoodMailer.email_counter_200(ENV["PYNWHEEL_DEV_EMAIL"],ENV["PYNWHEEL_DEV_EMAIL"],"",self).deliver
  end
  def neighbourhood_counter_mail_400
    NeighbourhoodMailer.email_counter_400(ENV["PYNWHEEL_DEV_EMAIL"],ENV["PYNWHEEL_DEV_EMAIL"],"",self).deliver
  end

  def image_src
    if sitemap.image.present?
      sitemap.image.url
      # sitemap.image.url(:svg_for_metro).present? ? sitemap.image.url(:svg_for_metro) : sitemap.image.url
    else
      "/assets/default.jpeg"
    end
  end

  def creator
    User.find_by(id: self.creator_id)
  end

  def favorites_page_name
    self&.favorite_setting&.favorite_name&.titleize || "Favorites"
  end
  
  def get_currency_symbol
    iso_numeric_code = self&.credential&.currency || "840"
    Money::Currency.find_by_iso_numeric(iso_numeric_code).symbol || "$"
  end

  def all_currencies(hash)
    hash.inject([]) do |array, (id, attributes)|
      priority = attributes[:priority]
      if (MAJOR_CURRENCIES.include?(attributes[:iso_numeric]))
        array ||= []
        array << ["#{attributes[:name]} (#{attributes[:iso_code]})", attributes[:iso_numeric]]
      end

      array
    end.compact
  end

  def filter_final_stops tour_stops
    amenity_stops = []
    filtered_stops = []
    if tour_stops.present?
      tour_stops.map do |x|
        if !(x.is_a? Tour) && x.stop_type == "amenity"
          amenity_stops << x
        end
      end
    end

    non_visible_stops_ids = amenity_stops.present? ? Amenity.where(id: amenity_stops.pluck(:stop_id), breezway_lock_visible: false).pluck(:id) : []

    tour_stops.map do |x|
      if (x.is_a? Tour)
        filtered_stops << x
      else
        unless non_visible_stops_ids.include?(x.stop_id)
          filtered_stops << x
        end
      end
    end

    filtered_stops
  end

  def get_stops_with_floor_and_buildings(new_stops_arr)
    stops = []

    unless self.is_sitemap
      new_stops_arr.each do |stop|
        unless (stop.is_a? Tour)
          if stop.stop_type === "unit" || stop.stop_type === "amenity"
            actual_stop = stop.stop_type.classify.constantize.find_by_id(stop.stop_id)

            if actual_stop.present? && actual_stop.floor.present? && actual_stop.building.present?
              stops << stop  
            end
          else
            stops << stop
          end
        else
          stops << stop
        end
      end

    else
      stops = new_stops_arr
    end

    stops
  end
  
  def lock_options(locks_present_hash)
    options = [["Select an option",""],["Manual", "Manual"]]
    locks_present_hash.each do |key,value|
      if value
        options << (key == "Zerv" ? ["Pynwheel Access", key] : [key, key])
      end
    end
    options
  end


  def community_tour_available_stops tour_user, tour
    scheduled_tour = MaxDateScheduledTourService.new(tour_user, self, false).get_scheduled_tour

    if scheduled_tour.present? && scheduled_tour.stops_list.present?
      stops = tour.tour_stops.plotted_stops.where(id: scheduled_tour.stops_list).order(:sort)
      stops = stops.where()
    else
      nil
    end
  end

  def is_virtual_permission_on
    if self&.community_tour&.tour_setting.present?
      self&.community_tour.tour_setting.allow_virtual_tour
    else
      false
    end
  end

  def is_any_tour_type_selected
    if self&.community_tour&.tour_setting.present?
      toue_setting = self&.community_tour.tour_setting
      return toue_setting.allow_virtual_tour || toue_setting.allow_self_tour || toue_setting.allow_guided_tour
    else
      return false
    end
  end

  def collect_disable_days
    disable_days_of_week = []

    if self&.community_tour&.tour_setting.present?
      tour_setting = self&.community_tour.tour_setting
      allow_self_tour = tour_setting.allow_self_tour
      allow_guided_tour = tour_setting.allow_guided_tour
      week_days = {"Sunday" => 0, "Monday" => 1, "Tuesday" => 2, "Wednesday" => 3, "Thursday" => 4, "Friday" => 5, "Saturday" => 6}
      self_tour_week_days = (allow_self_tour && self.opening_hours.present?) ? self.opening_hours.pluck(:day) : []
      guided_tour_week_days = (allow_guided_tour && self.guided_opening_hours.present?) ? self.guided_opening_hours.pluck(:day) : []
      enable_days = self_tour_week_days.present? && guided_tour_week_days.present? ? (self_tour_week_days | guided_tour_week_days) : (self_tour_week_days + guided_tour_week_days)
      enable_indexes = enable_days.any? ? (enable_days.map {|day| week_days[day]}) : []
      disable_days = week_days.values - enable_indexes
      
      return disable_days
    end

    disable_days_of_week
  end

  def collect_time_slots(stepping)
    time_slots = {}
    self_time_slots_hash = {}
    guided_time_slots_hash = {}
    week_days = {"Sunday" => 0, "Monday" => 1, "Tuesday" => 2, "Wednesday" => 3, "Thursday" => 4, "Friday" => 5, "Saturday" => 6}
    if self&.community_tour&.tour_setting.present?
      tour_setting = self&.community_tour.tour_setting
      allow_self_tour = tour_setting.allow_self_tour
      allow_guided_tour = tour_setting.allow_guided_tour

      self_tour_data = (allow_self_tour && self.opening_hours.present?) ? self.opening_hours.pluck(:day, :opening_time, :closing_time) : []
      if self_tour_data.present?
        self_tour_data.each do |data|
          self_time_slots_hash[week_days[data[0]]] = self_time_slots_hash[week_days[data[0]]].present? ? (self_time_slots_hash[week_days[data[0]]] + return_slots_hash(data[1], data[2])) : (return_slots_hash(data[1], data[2]))
        end
      end
      guided_tour_data = (allow_guided_tour && self.guided_opening_hours.present?) ? self.guided_opening_hours.pluck(:day, :opening_time, :closing_time) : []
      if guided_tour_data.present?
        guided_tour_data.each do |data|
          guided_time_slots_hash[week_days[data[0]]] = guided_time_slots_hash[week_days[data[0]]].present? ? (guided_time_slots_hash[week_days[data[0]]] + return_slots_hash(data[1], data[2])) : (return_slots_hash(data[1], data[2]))
        end
      end
    end
    merged_slots = merge_both_self_and_guided_slots(self_time_slots_hash, guided_time_slots_hash)
    slots = return_final_slots(merged_slots, stepping)
    slots.each {|date,two_d_array| slots[date] = two_d_array.flatten }
    keys_which_have_no_slot = (slots.map { |date, arr| unless arr.any?; date; end } ).compact
    slots.delete_if { |k,v| keys_which_have_no_slot.include?(k) }
    time_slots = slots
    time_slots.each {|key, value_arr| time_slots[key] = value_arr.uniq}
    time_slots
  end

  def collect_time_slots_for_rechedule_tours(stepping,tour_type)
    time_slots = {}
    self_time_slots_hash = {}
    guided_time_slots_hash = {}
    week_days = {"Sunday" => 0, "Monday" => 1, "Tuesday" => 2, "Wednesday" => 3, "Thursday" => 4, "Friday" => 5, "Saturday" => 6}
    if self&.community_tour&.tour_setting.present?
      tour_setting = self&.community_tour.tour_setting
      allow_self_tour = tour_setting.allow_self_tour
      allow_guided_tour = tour_setting.allow_guided_tour
      self_tour_data = (allow_self_tour && self.opening_hours.present?) ? self.opening_hours.pluck(:day, :opening_time, :closing_time) : []
      if self_tour_data.present? && tour_type == "self_tour"
        self_tour_data.each do |data|
          time_slots[week_days[data[0]]] = time_slots[week_days[data[0]]].present? ? (time_slots[week_days[data[0]]] + return_time_slots(data[1], data[2], stepping)) : (return_time_slots(data[1], data[2], stepping))
        end
      end
      guided_tour_data = (allow_guided_tour && self.guided_opening_hours.present?) ? self.guided_opening_hours.pluck(:day, :opening_time, :closing_time) : []
      if guided_tour_data.present? && tour_type == "guided_tour"
        guided_tour_data.each do |data|
          time_slots[week_days[data[0]]] = time_slots[week_days[data[0]]].present? ? (time_slots[week_days[data[0]]] + return_time_slots(data[1], data[2], stepping)) : (return_time_slots(data[1], data[2], stepping))
        end
      end
    end

    time_slots.each {|key, value_arr| time_slots[key] = value_arr.uniq}
    time_slots
  end


  def return_slots_hash(opening_interval_time,closing_interval_time)
    slots = []
    slots << [opening_interval_time,closing_interval_time]
  end

  def merge_both_self_and_guided_slots(yardi_self_time_slots_hash, yardi_guided_time_slots_hash)
    self_time_slots_keys = yardi_self_time_slots_hash.keys
    guided_time_slots_keys = yardi_guided_time_slots_hash.keys
    conflicting_slots_keys = self_time_slots_keys & guided_time_slots_keys
    not_conflicting_self_slots_keys = self_time_slots_keys - guided_time_slots_keys
    not_conflicting_guided_slots_keys = guided_time_slots_keys - self_time_slots_keys
    merge_both_slots = {}
    not_conflicting_self_slots_keys.each do |key|
      merge_both_slots[key] = yardi_self_time_slots_hash[key]
    end
    not_conflicting_guided_slots_keys.each do |key|
      merge_both_slots[key] = yardi_guided_time_slots_hash[key]
    end
    free_slot_of_guided = make_guided_free_slot_hash(conflicting_slots_keys, yardi_guided_time_slots_hash)
    if free_slot_of_guided.present?
      conflicting_slots_keys.each do |date|
        current_date_time_slots = yardi_self_time_slots_hash[date]
        guided_start_time = Time.strptime(free_slot_of_guided[date]['start_time'], "%H:%M")
        guided_end_time = Time.strptime(free_slot_of_guided[date]['end_time'], "%H:%M")
        missing_slots = free_slot_of_guided[date]['missing_slots']

        end_time_covered = nil
        unshift_times = 0
        one_time_pass = true
        current_date_time_slots.each do |arr|
          self_start_time = Time.strptime(arr[0], "%H:%M")
          self_end_time = Time.strptime(arr[1], "%H:%M")
          missing_slots.each do |missing_slot_arr|
            missing_start_time = Time.strptime(missing_slot_arr[0], "%H:%M")
            missing_end_time = Time.strptime(missing_slot_arr[1], "%H:%M")
            if self_end_time <= missing_start_time || (!end_time_covered.nil? && missing_end_time < end_time_covered) #ignore condition after OR for now
              end_time_covered = self_end_time
              next
            else
              if (missing_start_time >= self_start_time) && ( missing_end_time <= self_end_time )
                missing_slots = missing_slots - [missing_slot_arr]
              elsif self_start_time <= missing_start_time && (self_end_time > missing_start_time && self_end_time <= missing_end_time) # for left between slot
                missing_slots = missing_slots - [missing_slot_arr]
                missing_slots.unshift( [arr[1], missing_slot_arr[1]] )
                unshift_times += 1
              elsif self_start_time > missing_start_time && (self_start_time < missing_end_time && self_end_time >= missing_end_time) # for right between slot
                missing_slots = missing_slots - [missing_slot_arr]
                missing_slots.unshift( [missing_slot_arr[0], arr[0]] )
                unshift_times += 1
              elsif ( self_start_time >= missing_start_time && self_start_time <= missing_end_time) && ( self_end_time <= missing_end_time && self_end_time > missing_start_time) # for between slot
                missing_slots = missing_slots - [missing_slot_arr]
                missing_slots.unshift( [missing_slot_arr[0], arr[0]] )
                missing_slots.unshift( [arr[1], missing_slot_arr[1]] )
                if one_time_pass
                  unshift_times += 2
                  one_time_pass = false
                else
                  unshift_times += 1
                end
              end
              end_time_covered = self_end_time
              break
            end
          end
        end
        slots_from_missing_slots = make_slots_from_missing_time_slots(unshift_times, free_slot_of_guided[date]['start_time'], free_slot_of_guided[date]['end_time'], missing_slots, current_date_time_slots, yardi_guided_time_slots_hash[date])
        merge_both_slots[date] = slots_from_missing_slots

      end
    end
    merge_both_slots
  end

  def collect_time_slots_for_yardi(stepping, yardi_self_time_slots, yardi_guided_time_slots)
    if credential.rentcafe_api_version == "RentCafe V2"
      filter_rent_cafe_slots_v2(stepping, yardi_self_time_slots, yardi_guided_time_slots)
    else
      filter_rent_cafe_slots_v1(stepping, yardi_self_time_slots, yardi_guided_time_slots)
    end
  end

  def filter_rent_cafe_slots_v2 stepping, yardi_self_time_slots, yardi_guided_time_slots
    time_slots = {}
    
    if self&.community_tour&.tour_setting.present?
      tour_setting = self&.community_tour.tour_setting
      allow_self_tour = tour_setting.allow_self_tour
      allow_guided_tour = tour_setting.allow_guided_tour
      if allow_self_tour && yardi_self_time_slots.any? && allow_guided_tour && yardi_guided_time_slots.any?
        self_tour_slots = process_slots_data(yardi_self_time_slots)
        guided_tour_slots = process_slots_data(yardi_guided_time_slots)
        time_slots = self_tour_slots.merge(guided_tour_slots)
      else
        if allow_self_tour && yardi_self_time_slots.any?
          time_slots = process_slots_data(yardi_self_time_slots)
        end

        if allow_guided_tour && yardi_guided_time_slots.any?
          time_slots = process_slots_data(yardi_guided_time_slots)
        end
      end
    end

    time_slots
  end

  def filter_rent_cafe_slots_v1 stepping, yardi_self_time_slots, yardi_guided_time_slots
    time_slots = {}
    
    if self&.community_tour&.tour_setting.present?
      tour_setting = self&.community_tour.tour_setting
      allow_self_tour = tour_setting.allow_self_tour
      allow_guided_tour = tour_setting.allow_guided_tour
      allow_virtual_tour = tour_setting.allow_virtual_tour
      self_tour_data = (allow_self_tour && self.opening_hours.present?) ? self.opening_hours.pluck(:day, :opening_time, :closing_time) : []
      guided_tour_data = (allow_guided_tour && self.guided_opening_hours.present?) ? self.guided_opening_hours.pluck(:day, :opening_time, :closing_time) : []
      if allow_virtual_tour
        each_day_slots = return_time_slots("0:00", "23:59",stepping)
        ((0..6).to_a).each do |day|
          time_slots[day] = each_day_slots
        end
      elsif allow_self_tour && yardi_self_time_slots.any? && allow_guided_tour && yardi_guided_time_slots.any? && self_tour_data.present? && guided_tour_data.present?
        yardi_self_time_slots = maintain_datetime_according_to_yardi(yardi_self_time_slots)
        yardi_guided_time_slots = maintain_datetime_according_to_yardi(yardi_guided_time_slots)
        yardi_self_time_slots_hash = fetch_hash_from_slots(yardi_self_time_slots)
        yardi_self_time_slots_hash = remove_slots_according_to_pynwheel(yardi_self_time_slots_hash, self_tour_data)
        yardi_guided_time_slots_hash = fetch_hash_from_slots(yardi_guided_time_slots)
        yardi_guided_time_slots_hash = remove_slots_according_to_pynwheel(yardi_guided_time_slots_hash, guided_tour_data)
        # Now For Testing purpose merge self into guided
        merged_slots = merge_both_self_and_guided_slots(yardi_self_time_slots_hash, yardi_guided_time_slots_hash)
        slots = return_final_slots(merged_slots, stepping)
        slots.each {|date,two_d_array| slots[date] = two_d_array.flatten }
        keys_which_have_no_slot = (slots.map { |date, arr| unless arr.any?; date; end } ).compact
        slots.delete_if { |k,v| keys_which_have_no_slot.include?(k) }
        time_slots = slots
      else
        if allow_self_tour && yardi_self_time_slots.any? && self_tour_data.any?
          yardi_self_time_slots = maintain_datetime_according_to_yardi(yardi_self_time_slots)
          yardi_self_time_slots_hash = fetch_hash_from_slots(yardi_self_time_slots)
          yardi_self_time_slots_hash = remove_slots_according_to_pynwheel(yardi_self_time_slots_hash, self_tour_data)
          slots = return_final_slots(yardi_self_time_slots_hash, stepping)
          slots.each {|date,two_d_array| slots[date] = two_d_array.flatten }
          keys_which_have_no_slot = (slots.map { |date, arr| unless arr.any?; date; end } ).compact
          slots.delete_if { |k,v| keys_which_have_no_slot.include?(k) }
          time_slots = slots
        end
        if allow_guided_tour && yardi_guided_time_slots.any? && guided_tour_data.any?
          yardi_guided_time_slots = maintain_datetime_according_to_yardi(yardi_guided_time_slots)
          yardi_guided_time_slots_hash = fetch_hash_from_slots(yardi_guided_time_slots)
          yardi_guided_time_slots_hash = remove_slots_according_to_pynwheel(yardi_guided_time_slots_hash, guided_tour_data)
          slots = return_final_slots(yardi_guided_time_slots_hash, stepping)
          slots.each {|date,two_d_array| slots[date] = two_d_array.flatten }
          keys_which_have_no_slot = (slots.map { |date, arr| unless arr.any?; date; end } ).compact
          slots.delete_if { |k,v| keys_which_have_no_slot.include?(k) }
          time_slots = slots
        end
      end
    end
    time_slots
  end


  def process_slots_data(data)
    result_hash = {}

    data.each do |date_str, start_time_str, end_time_str|
      result_hash[date_str] ||= []
      result_hash[date_str] << start_time_str
    end

    result_hash
  end

  def fetch_tour_type_according_to_time(day, tour_time)
    tour_type = []
    if self&.community_tour&.tour_setting.present?
      tour_setting = self&.community_tour.tour_setting
      allow_self_tour = tour_setting.allow_self_tour
      allow_guided_tour = tour_setting.allow_guided_tour
      week_days = {"Sunday" => 0, "Monday" => 1, "Tuesday" => 2, "Wednesday" => 3, "Thursday" => 4, "Friday" => 5, "Saturday" => 6}
     
      if allow_self_tour && self.opening_hours.present?
        hours_hash ||= []
        self_tour_week_days = self.opening_hours.pluck(:day, :opening_time, :closing_time)
        if self_tour_week_days.present?
          self_tour_week_days.each do |arr|
            hours_hash << {"#{week_days[arr[0]]}": ["#{arr[1]}","#{arr[2]}"]}
          end
          merged_intervals = hours_hash.each_with_object({}) { |h, o| h.each { |k,v| (o[k] ||= []) << v } }
          time_range = []
          merged_intervals.each do |k,v|
            time_range << v if k[0].to_i == day.to_i
          end
          merged_time_range = time_range.flatten(1)
          if merged_time_range.present?
            merged_time_range.each do |time_range_obj|
              opening_time, closing_time = Time.parse(time_range_obj[0]), Time.parse(time_range_obj[1])
              tour_time_parsed = Time.parse(tour_time)
              if tour_time_parsed >= opening_time && tour_time_parsed <= closing_time
                tour_type << ["self_tour","Self Tour"]
              end
            end
          end
        end
      end
      if allow_guided_tour && self.guided_opening_hours.present?
        guided_hours_hash ||= []
        guided_tour_week_days = self.guided_opening_hours.pluck(:day, :opening_time, :closing_time)
        if guided_tour_week_days.present?
          guided_tour_week_days.each do |arr|
            guided_hours_hash << {"#{week_days[arr[0]]}": ["#{arr[1]}","#{arr[2]}"]}
          end
          merged_intervals = guided_hours_hash.each_with_object({}) { |h, o| h.each { |k,v| (o[k] ||= []) << v } }
          guided_time_range = []
          merged_intervals.each do |k,v|
            guided_time_range << v if k[0].to_i == day.to_i
          end
          merged_time_range = guided_time_range.flatten(1)
          if merged_time_range.present?
            merged_time_range.each do |time_range_obj|
              opening_time, closing_time = Time.parse(time_range_obj[0]), Time.parse(time_range_obj[1])
              tour_time_parsed = Time.parse(tour_time)
              if tour_time_parsed >= opening_time && tour_time_parsed <= closing_time
                tour_type << ["guided_tour","Guided Tour"]
              end
            end
          end
        end
      end
    end
    tour_type
  end

  def fetch_tour_type_according_to_time_for_yardi(scheduled_tour, date_str, tour_time)
    if credential.rentcafe_api_version == "RentCafe V2"
      filter_rent_cafe_tour_types_v2(scheduled_tour, date_str, tour_time)
    else
      filter_rent_cafe_tour_types_v1(scheduled_tour, date_str, tour_time)
    end
  end

  def filter_rent_cafe_tour_types_v2 scheduled_tour, date_str, tour_time
    tour_type = []
    yardi_time_slots = self.available_slots(scheduled_tour)

    if yardi_time_slots.present?
      yardi_self_time_slots = yardi_time_slots.map{|x| [x["startTime"].split(' ')[0],"#{x["startTime"].split(' ')[1]} #{x["startTime"].split(' ')[2]}","#{x["endTime"].split(' ')[1]} #{x["endTime"].split(' ')[2]}" ] if x['slotType'] == "SelfTour"}.compact
      yardi_guided_time_slots = yardi_time_slots.map{|x| [x["startTime"].split(' ')[0],"#{x["startTime"].split(' ')[1]} #{x["startTime"].split(' ')[2]}","#{x["endTime"].split(' ')[1]} #{x["endTime"].split(' ')[2]}" ] if x['slotType'] == "AgentGuided"}.compact
      tour_type << ["self_tour","Self Tour"] if yardi_self_time_slots.present?
      tour_type << ["guided_tour","Guided Tour"] if yardi_guided_time_slots.present?
    end

    tour_type
  end

  def filter_rent_cafe_tour_types_v1 scheduled_tour, date_str, tour_time
        tour_type = []
    yardi_time_slots = self.available_slots(scheduled_tour)
    if yardi_time_slots["Response"].present?
      yardi_self_time_slots = yardi_time_slots["Response"][0]["AvailableSlots"].map{|x| [x["dtStart"].split(' ')[0],x["dtStart"].split(' ')[1],x["dtEnd"].split(' ')[1]  ] if x['TypeofSlot'] == "SelfTour"}.compact
      yardi_guided_time_slots = yardi_time_slots["Response"][0]["AvailableSlots"].map{|x| [x["dtStart"].split(' ')[0],x["dtStart"].split(' ')[1],x["dtEnd"].split(' ')[1]  ] if x['TypeofSlot'] == "GuidedTour"}.compact
      if self&.community_tour&.tour_setting.present?
        tour_setting = self&.community_tour.tour_setting
        stepping = tour_setting.time_intervel == '15 min' ? 15 : (tour_setting.time_intervel == '30 min' ? 30 : (tour_setting.time_intervel == '1 hr') ? 60 : (tour_setting.time_intervel == '2 hrs') ? 120 : 15) rescue 15
        allow_self_tour = tour_setting.allow_self_tour
        allow_guided_tour = tour_setting.allow_guided_tour
        allow_virtual_tour = tour_setting.allow_virtual_tour
        self_tour_data = (allow_self_tour && self.opening_hours.present?) ? self.opening_hours.pluck(:day, :opening_time, :closing_time) : []
        guided_tour_data = (allow_guided_tour && self.guided_opening_hours.present?) ? self.guided_opening_hours.pluck(:day, :opening_time, :closing_time) : []
        if allow_virtual_tour
          tour_type << ["virtual_tour","Virtual Tour"]
        end

        if allow_self_tour && yardi_self_time_slots.any? && self_tour_data.any?
          yardi_self_time_slots = maintain_datetime_according_to_yardi(yardi_self_time_slots)
          yardi_self_time_slots_hash = fetch_hash_from_slots(yardi_self_time_slots)
          yardi_self_time_slots_hash = remove_slots_according_to_pynwheel(yardi_self_time_slots_hash, self_tour_data)
          selected_day_slot = yardi_self_time_slots_hash[date_str]
          unless selected_day_slot.nil?
            selected_day_slot.each do |arr|
              if Time.parse(tour_time) >= Time.parse(arr[0]) && Time.parse(tour_time) <= Time.parse(arr[1])
                tour_type << ["self_tour","Self Tour"]
                break
              end
            end
          end
        end

        if allow_guided_tour && yardi_guided_time_slots.any? && guided_tour_data.any?
          yardi_guided_time_slots = maintain_datetime_according_to_yardi(yardi_guided_time_slots)
          yardi_guided_time_slots_hash = fetch_hash_from_slots(yardi_guided_time_slots)
          yardi_guided_time_slots_hash = remove_slots_according_to_pynwheel(yardi_guided_time_slots_hash, guided_tour_data)
          selected_day_slot = yardi_guided_time_slots_hash[date_str]
          unless selected_day_slot.nil?
            selected_day_slot.each do |arr|
              if Time.parse(tour_time) >= Time.parse(arr[0]) && Time.parse(tour_time) <= Time.parse(arr[1])
                tour_type << ["guided_tour","Guided Tour"]
                break
              end
            end
          end
        end
      end
    end

    tour_type
  end

  def unit_floorplate_image_url(community, tour, unit)
    if community.is_sitemap
      floorplate = tour.image.present? ? tour : (community.is_sitemap ? community.sitemap : community.floorplates.first) rescue nil
    else
      floorplate = (unit.floorplate.image.present? ? unit.floorplate : nil) if unit.floorplate.present?  rescue nil
    end

    floorplate.image.url rescue nil
  end

  def unit_floorplan_images(unit, images = [] )
    if (unit.image.present? || unit.floorplan.image.present? rescue false)
      images << {url: unit.image.present? ? unit.image.url : unit.floorplan.image.url }
    end

    if (unit.secondary_image.present? || unit.floorplan.secondary_image.present? rescue false)
      images << {url: unit.secondary_image.present? ? unit.secondary_image.url : unit.floorplan.secondary_image.url }
    end

    images
  end

  def fetch_bedroom_list
    bedroom_list = self.floorplans.map{|x| x.bedrooms.to_i}.uniq
    bedroom_list = bedroom_list.sort.map {|bedroom| [bedroom, bedroom]}
    bedroom_list.unshift(["Number of Bedrooms", nil])
    bedroom_list
  end

  def fetch_building_list(sorted_building)
    building_list = []
    building_list = self.units.map{|x| x.building rescue next}.uniq.compact + self.amenities.map{|x| x.building rescue next}.uniq.compact
    building_list = building_list.compact.reject { |c| c.empty? }.uniq
    building_list = building_list.map {|i| i.gsub(/\d+/) {|s| "%08d" % s.to_i } }.zip(building_list).sort.map{|x,y| y}
    if sorted_building.present?
      if (building_list - sorted_building != [] )
        building_list = (sorted_building) + (building_list - sorted_building)
      elsif sorted_building - building_list != []
        building_list = (building_list & sorted_building)
      else
        building_list = sorted_building
      end
    end
    building_list.compact
  end

  def get_lock_info styling_start, styling_end, locks = []
    locks << get_lock_info_object(self.zerv, styling_start, styling_end)
    locks << get_lock_info_object(self.latch, styling_start, styling_end)
    locks << get_lock_info_object(self.dwelo, styling_start, styling_end)
    locks << get_lock_info_object(self.igloohome, styling_start, styling_end)
    locks << get_lock_info_object(self.edge_state, styling_start, styling_end)
    locks << get_manual_lock_info_object(styling_start, styling_end)
    locks.compact.uniq
  end

  private

  def get_lock_info_object lock_object, styling_start, styling_end
    return unless lock_object.present?
    
    {
      lock_id: lock_object&.id,
      lock_type: lock_object.class.name.camelcase,
      lock_description: ActionView::Base.full_sanitizer.sanitize(lock_object.lock_instruction_text),
      lock_long_description: styling_start + lock_object&.lock_instruction_text.gsub('red','') + styling_end,
      lock_image: lock_object.lock_image
    }
  end

  def get_manual_lock_info_object styling_start, styling_end
    {
      lock_id: "",
      lock_type: "Manual",
      lock_description: "",
      lock_long_description: "",
      # lock_description: "When you are at the door, For access enter manual door code.",
      # lock_long_description: styling_start + "When you are at the door, For access enter manual door code." + styling_end,
      lock_image: ""
    }
  end

    #return_time_slots("0:00", "01:00", 15)
  def return_time_slots(opening_time, closing_time, steps)
    slots = []
    start_minute = opening_time
    opening_hour = opening_time.split(":")[0].to_i
    opening_minute = opening_time.split(":")[1].to_i
    open_minute = opening_minute
    closing_hour = closing_time.split(":")[0].to_i
    closing_minute = closing_time.split(":")[1].to_i == 0 ? 60 : closing_time.split(":")[1].to_i
    same_hour = (opening_hour == closing_hour)
    close_minute = same_hour ? closing_minute : 60
    while opening_minute < close_minute
      hour, am_pm = return_hour_and_meridiem(opening_hour)
      slots << (hour  + ":" + ((opening_minute < 10) ? "0" + opening_minute.to_s : opening_minute.to_s) + " " + am_pm)
      opening_minute += steps
    end
    opening_minute = same_hour ? 0 : (opening_minute - 60)
    opening_hour += 1
    if opening_hour != closing_hour
      while opening_hour <= (closing_hour - 1) do
        hour, am_pm = return_hour_and_meridiem(opening_hour)
        slots << (hour  + ":" + ((opening_minute < 10) ? "0" + opening_minute.to_s : opening_minute.to_s) + " " + am_pm)
          if (opening_minute + steps) < 60
            opening_minute += steps
          else
            if steps == 120 && opening_minute >= 60
              unless opening_minute < 60
                opening_hour +=1
                opening_minute = (opening_minute - 60)
              end
            else
              opening_hour = opening_hour + 1
              opening_minute = (opening_minute + steps) - 60
            end
          end
      end # while end
    end
    if !same_hour && closing_minute != 60 # means greater than zero
      open_minute = 0 if open_minute >= closing_minute
      while open_minute < closing_minute
        hour, am_pm = return_hour_and_meridiem(opening_hour)
          slots << (hour  + ":" + ((open_minute < 10) ? "0" + open_minute.to_s : open_minute.to_s) + " " + am_pm)
          open_minute += steps
      end
    end
    if steps == 120
      slots.delete_if {|s| s.split(":")[1].to_i >= 60 }
    else
      slots
    end
    # slots
  end # method end

  def return_hour_and_meridiem(hour)
    if hour == 0
      hour += 12
      return hour.to_s, "am"
    elsif hour < 10
      hour = "0" + hour.to_s
      return hour, "am"
    elsif hour < 12
      return hour.to_s, "am"
    elsif hour == 12
      return hour.to_s, "pm"
    elsif hour < 24
      hour = hour - 12
      pm_hour = "0" + hour.to_s
      hour = hour < 10 ? pm_hour : hour.to_s
      return hour, "pm"
    end
  end

  def maintain_datetime_according_to_yardi(yardi_time_slots)
    yardi_time_slots.map do |time_slot_arr|
      [ time_slot_arr[0], yardi_required_format(time_slot_arr[1], 'start'), yardi_required_format(time_slot_arr[2], 'end') ]
    end
  end

  # Yardi sending us faulty date means they are not giving us date in am/pm so repeatedly calls we see from 8 to 12 time is always in am
  # and 01 to 07 its always in pm
  def yardi_required_format(faulty_date, date_type)
    hour, minute = faulty_date.split(":")[0].to_i, faulty_date.split(":")[1]
    if hour >= 8 && hour <= 12
      return (hour.to_s + ":" + minute)
    else
      return ((hour + 12).to_s + ":" + minute)
    end
  end

  def fetch_hash_from_slots(yardi_time_slots)
    yardi_s_hash = {}
    yardi_time_slots.each do |arr|
      yardi_s_hash[arr[0]] = yardi_s_hash[arr[0]].nil? ? ( [[arr[1], arr[2]]] ) : ( yardi_s_hash[arr[0]] << [arr[1], arr[2]] )
    end
    yardi_s_hash
  end

  def fetch_missing_slots(yardi_time_slots_per_day)
    missing_slots = []
    last_time = yardi_time_slots_per_day.first.last
    i = 1
    if yardi_time_slots_per_day.length > 1
      while i < yardi_time_slots_per_day.length
        if (last_time != yardi_time_slots_per_day[i].first)
          missing_slots << [yardi_time_slots_per_day[i].first, last_time]
        end
        last_time = yardi_time_slots_per_day[i].last
        i+=1
      end
    else
      missing_slots << [yardi_time_slots_per_day.first.first, last_time]
    end
    missing_slots
  end

  def make_guided_free_slot_hash(conflicting_slots_keys, yardi_guided_time_slots_hash)
    yardi_slots = {}
    yardi_free_slot = {}
    conflicting_slots_keys.each do |key|
      yardi_slots[key] = yardi_guided_time_slots_hash[key]
    end
    yardi_slots.keys.each do |key|
      if yardi_slots[key].any?
        start_time = yardi_slots[key].first.first
        end_time = yardi_slots[key].last.last
        missing_slots = fetch_missing_slots(yardi_slots[key])
        yardi_free_slot[key] = {}
        yardi_free_slot[key]['start_time'] = start_time
        yardi_free_slot[key]['end_time'] = end_time
        yardi_free_slot[key]['missing_slots'] = missing_slots
      end
    end
    yardi_free_slot
  end

  def make_slots_from_missing_time_slots(reverse_count, start_time_str, end_time_str, missing_slots, current_date_time_slots, guided_slots_from_top)
    past_time_slot_not_covered = []
    future_time_slot_not_covered = []
    middle_slots = []
    missing_slots_length = missing_slots.length
    first_half = missing_slots.slice(0..(reverse_count - 1))
    second_half = missing_slots.slice(reverse_count, (missing_slots.length - (reverse_count - 1) ))
    first_half.reverse!
    second_half.present? && second_half.each do |s|
      if s.first < first_half.first.first && s.last <= first_half.first.first
        first_half.unshift(s)
      elsif s.first >= first_half.last.last
        first_half.push(s)
      end
    end
    missing_slots = first_half
    start_time = Time.strptime(start_time_str, "%H:%M")
    end_time = Time.strptime(end_time_str, "%H:%M")
    # fetch middle slots from missing slots
    j = 0
    while j < missing_slots.length
      if j==0
        middle_slots << [start_time_str, missing_slots[j][0]]
        next_start = missing_slots[j][1]
      elsif (j == (missing_slots.length - 1))
        middle_slots << [next_start, missing_slots[j][0]]
      else
        middle_slots << [next_start, missing_slots[j][0]]
        next_start = missing_slots[j][1]
      end
      j+=1
    end
    # fetch past slots if any
    i = 0
    while i < current_date_time_slots.length
      if Time.strptime(current_date_time_slots[i].last, "%H:%M") < start_time
        past_time_slot_not_covered << [current_date_time_slots[i].first, current_date_time_slots[i].last]
      elsif Time.strptime(current_date_time_slots[i].first, "%H:%M") < start_time && Time.strptime(current_date_time_slots[i].last, "%H:%M") >= start_time
        past_time_slot_not_covered << [current_date_time_slots[i].first, start_time_str]
        break
      else
        break
      end
      i+=1
    end
    slots = past_time_slot_not_covered + middle_slots
    # fetch future slots which are not covered from guided in missing
    missing_slot_from_guided = []
    now_end_time_str = slots.last.last if slots.present?
    now_end_time = Time.strptime(now_end_time_str, "%H:%M") if now_end_time_str.present?
    # now_end_time = now_end_time_str.to_datetime if now_end_time_str.present?
    m = 0
    while m < guided_slots_from_top.length
      # now_end_time && (guided_slots_from_top[m][1].to_datetime <= now_end_time) && ((guided_slots_from_top[m][0].to_datetime) < (guided_slots_from_top[m][1].to_datetime ))
      # (Time.strptime(guided_slots_from_top[m][0], "%H:%M") < now_end_time && (Time.strptime(guided_slots_from_top[m][1], "%H:%M") <= now_end_time))
      if now_end_time && (Time.strptime(guided_slots_from_top[m][1], "%H:%M") <= now_end_time) && (Time.strptime(guided_slots_from_top[m][0], "%H:%M") < Time.strptime(guided_slots_from_top[m][1], "%H:%M"))
        m+=1
        next
      else
        missing_slot_from_guided << [guided_slots_from_top[m][0], guided_slots_from_top[m][1]]
      end
      m+=1
    end
    slots += missing_slot_from_guided
    # fetch future slots if any from self
    future_slot_from_self = []
    end_time_after_guided_str = slots.last.last
    end_time_after_guided = Time.strptime(end_time_after_guided_str, "%H:%M") if end_time_after_guided_str.present?
    k = 0
    while k < current_date_time_slots.length
      if Time.strptime(current_date_time_slots[k][0], "%H:%M") < end_time_after_guided && (Time.strptime(current_date_time_slots[k][1], "%H:%M") <= end_time_after_guided)
        k+=1
        next
      else
        future_slot_from_self << [current_date_time_slots[k][0], current_date_time_slots[k][1]]
      end
      k+=1
    end
    slots += future_slot_from_self
    slots = [[slots.first.first, slots.last.last]] #if missing_slots_length <= 1 **** Need to make more perfect it according to diff scenarios *******
    return slots
  end

  def return_final_slots(slots, stepping)
    merging_slots = {}
    slots.keys.each do |date|
      yardi_slots = []
      slots[date].each do |time_slot_arr|
        yardi_slots << (return_time_slots(time_slot_arr[0], time_slot_arr[1], stepping))
      end
      merging_slots[date] = yardi_slots
    end
    merging_slots
  end

  def remove_slots_according_to_pynwheel(yardi_time_slots_hash, pynwheel_tour_data)
    week_available_slot_hash = {}
    pynwheel_tour_data.each do |arr|
      week_available_slot_hash[arr[0]] = [arr[1], arr[2]]
    end
    slot_hash = {}
    yardi_time_slots_hash.each do |slot_date, slots_arr|
      day_name   = Time.strptime(slot_date, '%m/%d/%Y').strftime('%A')
      if week_available_slot_hash[day_name].present?
        start_time = Time.strptime(week_available_slot_hash[day_name].first, "%H:%M")
        end_time   = Time.strptime(week_available_slot_hash[day_name].last, "%H:%M")
        skipping_slots = []
        slots_arr.each { |arr| skipping_slots << arr unless Time.strptime(arr[0], "%H:%M") >= start_time && Time.strptime(arr[1], "%H:%M") <= end_time }
        slots_arr = slots_arr - skipping_slots
        slot_hash[slot_date] = slots_arr
      end
    end
    return slot_hash
  end

  def populate_favorites(items_objs,email_to)
    fs = self.favorite_stop
    fs = self.favorite_stop.present? ? self.favorite_stop : FavoriteStop.create(community_id: self.id)
    favorites = []
    units = Hash.new
    items_objs.each do |item|
      favorite = item[:type].classify.constantize.where(id: item[:id])
      favorites << favorite.first if favorite.present?
      if item[:type] == 'floorplan'
        units[item[:id].to_s] = item[:unit_id]
      end

      if item[:type] == 'unit'
        fs.user_favorites_unit[email_to] = [] #if fs.user_favorites_unit[email_to] == nil
        fs.user_favorites_unit[email_to] << item[:id] unless fs.user_favorites_unit[email_to].include?(item[:id])
      elsif item[:type] == 'amenity'
        fs.user_favorites_amenity[email_to] = [] #if fs.user_favorites_amenity[email_to] == nil
        fs.user_favorites_amenity[email_to] << item[:id] unless fs.user_favorites_amenity[email_to].include?(item[:id])
      end
    end
    fs.save
    return favorites , units
  end
  def validate_page_position
    positions = Imagepage.where(community_id: self.id).map(&:position) +  Webpage.where(community_id: self.id).map(&:position)
    if positions.include?(1) && attributes['display_unit_on_homepage']
      errors[:base] << "Position 1 has already been taken."
    end
    if positions.include?(2) && attributes['display_gallery_on_homepage']
      errors[:base] << "Position 2 has already been taken."
    end
  end

  def turn_off_chat
     # doesn't matter whether chat was enabled or not,
     # just turn the chat OFF for every CMS user and
     # for all mobile users of this community
    if self.id.present?
      CommunityUser.where(community_id: self.id).update_all(is_logged_in: false)
      self.update_column(:is_chat_available, false)
    end
  end


end