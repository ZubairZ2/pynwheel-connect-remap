class Community < ApplicationRecord
  # has_paper_trail
  # mount_uploader :logo, AvatarUploader
  # attr_readonly :uuid
  include LockedTourStopHelper
  
  mount_base64_uploader :logo, AvatarUploader
  mount_base64_uploader :secondary_logo, AvatarUploader
  mount_base64_uploader :self_tour_logo, AvatarUploader

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

  accepts_nested_attributes_for :credential
  accepts_nested_attributes_for :design

  validates_uniqueness_of :name, scope: :company_id
  validate :apartment_page_name_length_validate
  validate :gallery_page_name_length_validate
  validate :validate_page_position
  validates_with CodeValidatorOnUpdate , on: [:update]
  validates_with CodeValidatorOnCreate , on: [:create]
  
  # validate :unique_community_code_on_create, on: [:create]
  # validate :unique_community_code_on_update, on: [:update]

  after_create :set_default_theme
  after_create :create_default_gallery
  after_create :create_sms_email_content

  attr_accessor :default_community_id
  # before_validation :gen_uuid, on: :create
  # validates :uuid, presence: true, uniqueness: true
  
  after_update :crop_image
  after_update :crop_secondary_image
  after_create :create_tour_also
  after_create :change_touchscreen_app_for_dwelo
  before_save :turn_off_chat, if: Proc.new { chat_control == false }
  #
  # phony_normalize :phone
  # # phony_normalize :phone, as: :phone_number_normalized_version, default_country_code: 'US'
  # validates :phone, phony_plausible: true


  # phony_normalize :phone
  # phony_normalize :phone, as: :phone_number_normalized_version, default_country_code: 'US'
  # validates :phone, phony_plausible: true


  enum alert_contact: [:email, :phone, :both]
  scope :active_communities, -> { where(locked: false) }
  scope :self_tour_enabled_only, -> { where('self_tour = ?', true) }
  scope :desc_created_at, -> { order(created_at: :desc) }
  amoeba do
    include_association :design
  end

  def community_website
    return unless self.website.present?

    if self.website.include?("https" || "http")
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
    tour = self.create_tour if self.tour.nil?
    tour.create_tour_setting if tour.present? and tour.tour_setting.nil?
  end

  def change_touchscreen_app_for_dwelo
    self.update_columns(touchscreen_app: false)
  end

  def crop_image
    logo.recreate_versions! if (crop_x.present? && image_bit && do_crop)
  end
  def crop_secondary_image
    secondary_logo.recreate_versions! if (crop_x_secondary.present? && !image_bit && do_crop_secondary)
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
    return default_time_zone unless (self.latitude.present? && self.longitude.present?)

    Timezone.lookup(self.latitude, self.longitude).name rescue default_time_zone
  end

  def has_temporary_images?
    temporary_images.size > 0
  end
  def delete_community
    DeleteCommunityJob.perform_async self
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

  def get_community_time_zone()
    tz = Ziptz.new
    timezone = nil

    if self.latitude.present? and self.longitude.present?
      time_zone = Timezone.lookup(self.latitude, self.longitude)
      timezone = time_zone.name
    end

    if timezone.nil? and self.zip.present?
      timezone = tz.time_zone_name(self.zip)
    end

      return timezone
    rescue
      return "UTC"
  end

  def data_is_imported
    case data_provider
      when "psi"
        import_psi_data
      when "yardirentcafe"
        import_yardirentcafe_data
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
  def use_yardi_as_lead?
    if self.credential.present? && self.credential.use_different_crm_provider && self.crm_credential.present? && self.crm_credential.crm_provider == "yardirentcafe" && self.crm_credential.yardirentcafe_marketing_api_key.present?
      (true)
    else
      (false)
    end
  end
  def use_yardi_as_lead?
    if self.credential.present? && self.credential.use_different_crm_provider && self.crm_credential.present? && self.crm_credential.crm_provider == "yardirentcafe" && self.crm_credential.yardirentcafe_marketing_api_key.present?
      (true)
    else
      (false)
    end
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
    #psi_service = PsiService.new(credential.attributes)
    #psi_service.perform
    psi_static_service = CredentialsValid.new(JSON.parse(credential.attributes.to_json))
    psi_static_service.perform
    # ImportPsiDataJob.perform_async credential.attributes.to_json
  end
  def import_psi_data
    #psi_service = PsiService.new(credential.attributes)
    #psi_service.perform
    ImportPsiStaticDataJob.perform_async credential.attributes.to_json
    # ImportPsiDataJob.perform_async credential.attributes.to_json
  end

  def clean_data_psi
    CleanPsiDataJob.perform_async credential.attributes.to_json
  end

  def import_zaremba_provider
    ImportZarembaStaticDataJob.perform_async credential.attributes.to_json
    # ImportZarembaDataJob.perform_async credential.attributes.to_json
  end
  def import_xml_provider
    ImportXmlStaticDataJob.perform_async credential.attributes.to_json
    # ImportXmlDataJob.perform_async credential.attributes.to_json
  end

  def swap_psi_data
    ImportPsiSwapDataJob.perform_async credential.attributes.to_json
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
      #yardi_rent_cafe_service = YardiRentCafeService.new(credential.attributes)
      #yardi_rent_cafe_service.perform
    # ImportYardirentcafeDataJob.perform_async credential.attributes.to_json
    ImportYardirentcafeStaticDataJob.perform_async credential.attributes.to_json
  end
  def swap_yardirentcafe_data
    ImportYardirentcafeSwapDataJob.perform_async credential.attributes.to_json
  end
  def import_yardi2_data
    #yardi2_service = Yardi2Service.new(credential.attributes)
    #yardi2_service.perform
    ImportYardi2StaticDataJob.perform_async credential.attributes.to_json
    # ImportYardi2DataJob.perform_async credential.attributes.to_json
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
    #yardi4_service = Yardi4Service.new(credential.attributes)
    #yardi4_service.perform
    ImportYardi4StaticDataJob.perform_async credential.attributes.to_json
    # ImportYardi4DataJob.perform_async credential.attributes.to_json
  end

  def swap_yardi4_data
    ImportYardi4SwapDataJob.perform_async credential.attributes.to_json
  end
  def import_realpage_svc_data
    #real_page_svc_service = RealPageSvcService.new(credential.attributes)
    #real_page_svc_service.perform
    ImportRealpageSvcStaticDataJob.perform_async credential.attributes.to_json
    # ImportRealpageSvcDataJob.perform_async credential.attributes.to_json
  end

  def realpage_insert_prospect(tour_user, appointment_time, marketing_source, desired_move_in_date)
    RealPageInsertProspectJob.perform_async credential.attributes.to_json, tour_user, appointment_time, marketing_source, desired_move_in_date, self
  end

  def real_page_get_marketing_sources
    RealPageGetMarketingSoucesJob.perform_async credential.attributes.to_json, self
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
    YardiRentCafeServices::MarketingApisService.new(scheduled_tour).available_slots
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
    yardi_rent_cafe_connection_service = YardiRentCafeConnectionService.new(credential.attributes)
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
    credential.url[credential.url.length-10..credential.url.length-1].include?("20") ? yardi2_service : yardi4_service
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
    self.galleries.create(name: 'default')
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

  def email_favorites(params)
    email_to = params[:favorites][:email_to]
    result = populate_favorites(params[:favorites][:items],email_to)
    favorites = result[0]
    units = result[1] 

    params[:favorites][:items].each do |item|
      # if item['unit_id'].present?
      #   u = Unit.find item['unit_id']
      #   if u.present?
      #     units << u
      #   else
      #     u = Unit.new
      #     units << u
      #   end
      #   u = Unit.new
      #   units << u
      # end

    end
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
    NeighbourhoodMailer.email_counter_200("salahudin@pynwheel.com","salahudinali78@gmail.com","",self).deliver
  end
  def neighbourhood_counter_mail_400
    NeighbourhoodMailer.email_counter_400("salahudin@pynwheel.com","salahudinali78@gmail.com","",self).deliver
  end

  def image_src
    if sitemap.image.present?
      sitemap.image.url(:svg_for_metro).present? ? sitemap.image.url(:svg_for_metro) : sitemap.image.url
    else
      "/assets/default.jpeg"
    end
  end

  def creator
    User.find_by(id: self.creator_id)
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
  
  def lock_options(locks_present_hash)
    options = [["Select an option",""],["Manual", "Manual"]]
    locks_present_hash.each do |key,value|
      if value
        options << (key == "Zerv" ? ["Pynwheel Access", key] : [key, key])
      end
    end
    options
  end


  def community_tour_available_stops tour_user
    scheduled_tour = MaxDateScheduledTourService.new(tour_user, self, false).get_scheduled_tour

    if scheduled_tour.present? && scheduled_tour.stops_list.present?
      self.tour.tour_stops.where(id: scheduled_tour.stops_list).order(:sort)
    else
      nil
    end
  end

  def is_virtual_permission_on
    if self&.tour&.tour_setting.present?
      self.tour.tour_setting.allow_virtual_tour
    else
      false
    end
  end

  def is_any_tour_type_selected
    if self&.tour&.tour_setting.present?
      toue_setting = self.tour.tour_setting
      return toue_setting.allow_virtual_tour || toue_setting.allow_self_tour || toue_setting.allow_guided_tour
    else
      return false
    end
  end

  def collect_disable_days
    disable_days_of_week = []
    if self&.tour&.tour_setting.present?
      tour_setting = self.tour.tour_setting
      allow_self_tour = tour_setting.allow_self_tour
      allow_guided_tour = tour_setting.allow_guided_tour
      # allow_virtual_tour = tour_setting.allow_virtual_tour
      # if allow_virtual_tour
      #   return disable_days_of_week
      # else
        week_days = {"Sunday" => 0, "Monday" => 1, "Tuesday" => 2, "Wednesday" => 3, "Thursday" => 4, "Friday" => 5, "Saturday" => 6}
        self_tour_week_days = (allow_self_tour && self.opening_hours.present?) ? self.opening_hours.pluck(:day) : []
        guided_tour_week_days = (allow_guided_tour && self.guided_opening_hours.present?) ? self.guided_opening_hours.pluck(:day) : []
        enable_days = self_tour_week_days.present? && guided_tour_week_days.present? ? (self_tour_week_days | guided_tour_week_days) : (self_tour_week_days + guided_tour_week_days)
        enable_indexes = enable_days.any? ? (enable_days.map {|day| week_days[day]}) : []
        disable_days = week_days.values - enable_indexes
        return disable_days
      # end
    end
    disable_days_of_week
  end

  def collect_time_slots(stepping)
    time_slots = {}
    self_time_slots_hash = {}
    guided_time_slots_hash = {}
    week_days = {"Sunday" => 0, "Monday" => 1, "Tuesday" => 2, "Wednesday" => 3, "Thursday" => 4, "Friday" => 5, "Saturday" => 6}
    if self&.tour&.tour_setting.present?
      tour_setting = self.tour.tour_setting
      allow_self_tour = tour_setting.allow_self_tour
      allow_guided_tour = tour_setting.allow_guided_tour
      # allow_virtual_tour = tour_setting.allow_virtual_tour
      # if allow_virtual_tour
      #   each_day_slots = return_time_slots("0:00", "23:59",stepping)
      #   ((0..6).to_a).each do |day|
      #     time_slots[day] = each_day_slots
      #   end
      # else
        self_tour_data = (allow_self_tour && self.opening_hours.present?) ? self.opening_hours.pluck(:day, :opening_time, :closing_time) : []
        if self_tour_data.present?
          self_tour_data.each do |data|
            # time_slots[week_days[data[0]]] = time_slots[week_days[data[0]]].present? ? (time_slots[week_days[data[0]]] + return_time_slots(data[1], data[2], stepping)) : (return_time_slots(data[1], data[2], stepping))
            self_time_slots_hash[week_days[data[0]]] = self_time_slots_hash[week_days[data[0]]].present? ? (self_time_slots_hash[week_days[data[0]]] + return_slots_hash(data[1], data[2])) : (return_slots_hash(data[1], data[2]))
          end
        end
        guided_tour_data = (allow_guided_tour && self.guided_opening_hours.present?) ? self.guided_opening_hours.pluck(:day, :opening_time, :closing_time) : []
        if guided_tour_data.present?
          guided_tour_data.each do |data|
            # time_slots[week_days[data[0]]] = time_slots[week_days[data[0]]].present? ? (time_slots[week_days[data[0]]] + return_time_slots(data[1], data[2], stepping)) : (return_time_slots(data[1], data[2], stepping))
            guided_time_slots_hash[week_days[data[0]]] = guided_time_slots_hash[week_days[data[0]]].present? ? (guided_time_slots_hash[week_days[data[0]]] + return_slots_hash(data[1], data[2])) : (return_slots_hash(data[1], data[2]))
          end
        end
      # end
    end
    merged_slots = merge_both_self_and_guided_slots(self_time_slots_hash, guided_time_slots_hash)
    slots = return_final_slots(merged_slots, stepping)
    slots.each {|date,two_d_array| slots[date] = two_d_array.flatten }
    keys_which_have_no_slot = (slots.map { |date, arr| unless arr.any?; date; end } ).compact
    slots.delete_if { |k,v| keys_which_have_no_slot.include?(k) }
    time_slots = slots
    time_slots.each {|key, value_arr| time_slots[key] = value_arr.uniq}
    time_slots
    # time_slots.each {|key, value_arr| time_slots[key] = value_arr.uniq}
    # time_slots
  end

  def collect_time_slots_for_rechedule_tours(stepping,tour_type)
    time_slots = {}
    self_time_slots_hash = {}
    guided_time_slots_hash = {}
    week_days = {"Sunday" => 0, "Monday" => 1, "Tuesday" => 2, "Wednesday" => 3, "Thursday" => 4, "Friday" => 5, "Saturday" => 6}
    if self&.tour&.tour_setting.present?
      tour_setting = self.tour.tour_setting
      allow_self_tour = tour_setting.allow_self_tour
      allow_guided_tour = tour_setting.allow_guided_tour
        self_tour_data = (allow_self_tour && self.opening_hours.present?) ? self.opening_hours.pluck(:day, :opening_time, :closing_time) : []
        if self_tour_data.present? && tour_type == "self_tour"
          self_tour_data.each do |data|
            time_slots[week_days[data[0]]] = time_slots[week_days[data[0]]].present? ? (time_slots[week_days[data[0]]] + return_time_slots(data[1], data[2], stepping)) : (return_time_slots(data[1], data[2], stepping))
            # self_time_slots_hash[week_days[data[0]]] = self_time_slots_hash[week_days[data[0]]].present? ? (self_time_slots_hash[week_days[data[0]]] + return_slots_hash(data[1], data[2])) : (return_slots_hash(data[1], data[2]))
          end
        end
        guided_tour_data = (allow_guided_tour && self.guided_opening_hours.present?) ? self.guided_opening_hours.pluck(:day, :opening_time, :closing_time) : []
        if guided_tour_data.present? && tour_type == "guided_tour"
          guided_tour_data.each do |data|
            time_slots[week_days[data[0]]] = time_slots[week_days[data[0]]].present? ? (time_slots[week_days[data[0]]] + return_time_slots(data[1], data[2], stepping)) : (return_time_slots(data[1], data[2], stepping))
            # guided_time_slots_hash[week_days[data[0]]] = guided_time_slots_hash[week_days[data[0]]].present? ? (guided_time_slots_hash[week_days[data[0]]] + return_slots_hash(data[1], data[2])) : (return_slots_hash(data[1], data[2]))
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
    time_slots = {}
    if self&.tour&.tour_setting.present?
      tour_setting = self.tour.tour_setting
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

  def fetch_tour_type_according_to_time(day, tour_time)
    tour_type = []
    if self&.tour&.tour_setting.present?
      tour_setting = self.tour.tour_setting
      allow_self_tour = tour_setting.allow_self_tour
      allow_guided_tour = tour_setting.allow_guided_tour

      # TODO::Removed virtual tour option from dropdown
      # allow_virtual_tour = tour_setting.allow_virtual_tour
      # if allow_virtual_tour
      #   tour_type << ["virtual_tour","Virtual Tour"]
      # end
      week_days = {"Sunday" => 0, "Monday" => 1, "Tuesday" => 2, "Wednesday" => 3, "Thursday" => 4, "Friday" => 5, "Saturday" => 6}
      if allow_self_tour && self.opening_hours.present?
        hours_hash ||= []
        # hours_hash = {}
        self_tour_week_days = self.opening_hours.pluck(:day, :opening_time, :closing_time)
        if self_tour_week_days.present?
          self_tour_week_days.each do |arr|
            # hours_hash[week_days[arr[0]]] = [arr[1], arr[2]]
            hours_hash << {"#{week_days[arr[0]]}": ["#{arr[1]}","#{arr[2]}"]}
          end
          merged_intervals = hours_hash.each_with_object({}) { |h, o| h.each { |k,v| (o[k] ||= []) << v } }
          time_range = []
          merged_intervals.each do |k,v|
            time_range << v if k[0].to_i == day.to_i
          end
          # time_range = hours_hash[day.to_i]
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
        # hours_hash = {}
        guided_tour_week_days = self.guided_opening_hours.pluck(:day, :opening_time, :closing_time)
        if guided_tour_week_days.present?
          guided_tour_week_days.each do |arr|
            guided_hours_hash << {"#{week_days[arr[0]]}": ["#{arr[1]}","#{arr[2]}"]}
            # hours_hash[week_days[arr[0]]] = [arr[1], arr[2]]
          end
          merged_intervals = guided_hours_hash.each_with_object({}) { |h, o| h.each { |k,v| (o[k] ||= []) << v } }
          guided_time_range = []
          merged_intervals.each do |k,v|
            guided_time_range << v if k[0].to_i == day.to_i
          end
          # time_range = hours_hash[day.to_i]
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
    tour_type = []
    yardi_time_slots = self.available_slots(scheduled_tour)
    yardi_self_time_slots = yardi_time_slots["Response"][0]["AvailableSlots"].map{|x| [x["dtStart"].split(' ')[0],x["dtStart"].split(' ')[1],x["dtEnd"].split(' ')[1]  ] if x['TypeofSlot'] == "SelfTour"}.compact
    yardi_guided_time_slots = yardi_time_slots["Response"][0]["AvailableSlots"].map{|x| [x["dtStart"].split(' ')[0],x["dtStart"].split(' ')[1],x["dtEnd"].split(' ')[1]  ] if x['TypeofSlot'] == "GuidedTour"}.compact
    if self&.tour&.tour_setting.present?
      tour_setting = self.tour.tour_setting
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

  private

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
    # binding.pry
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

  # For Testing purpose if there is no slot available of self
  # def get_yardi_self_fixed_time_slots
  #   [["6/4/2021", "8:00:00", "9:00:00"],
  #  ["6/4/2021", "9:00:00", "10:00:00"],
  #  ["6/4/2021", "10:00:00", "11:00:00"],
  #  ["6/4/2021", "11:00:00", "12:00:00"],
  #  ["6/4/2021", "12:00:00", "12:20:00"],
  #  ["6/4/2021", "1:00:00", "2:00:00"],
  #  ["6/4/2021", "2:20:00", "3:00:00"],
  #  ["6/4/2021", "3:00:00", "4:00:00"],
  #  ["6/4/2021", "4:20:00", "4:40:00"],
  #  ["6/4/2021", "5:00:00", "6:00:00"],
  #  ["6/4/2021", "6:00:00", "7:00:00"],
  #  ["6/7/2021", "9:00:00", "10:00:00"],
  #  ["6/7/2021", "11:00:00", "12:00:00"],
  #  ["6/7/2021", "1:00:00", "2:00:00"],
  #  ["6/7/2021", "3:00:00", "4:00:00"],
  #  ["6/7/2021", "4:00:00", "5:00:00"],
  #  ["6/7/2021", "5:00:00", "6:00:00"],
  #  ["6/7/2021", "6:00:00", "7:00:00"]]
  # end

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
      #   u = Unit.find item['unit_id']
      #   if u.present?
      #     units << u
      #   else
      #     u = Unit.new
      #     units << u
      #   end
      # else
      #   u = Unit.new
      #   units << u
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
