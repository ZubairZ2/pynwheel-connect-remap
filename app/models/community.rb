# == Schema Information
#
# Table name: communities
#
#  id                             :integer          not null, primary key
#  name                           :string
#  logo                           :string
#  address                        :string
#  city                           :string
#  state                          :string
#  zip                            :string
#  email                          :string
#  phone                          :string
#  description                    :string
#  latitude                       :decimal(, )
#  longitude                      :decimal(, )
#  locked                         :boolean
#  data_provider                  :string
#  company_id                     :integer
#  created_at                     :datetime         not null
#  updated_at                     :datetime         not null
#  theme_name                     :string
#  website                        :string
#  code                           :string
#  is_sitemap                     :boolean          default(TRUE)
#  secondary_logo                 :string
#  show_gallery                   :boolean          default(TRUE)
#  gallery_page_name              :string           default("Gallery")
#  show_apartment                 :boolean          default(TRUE)
#  apartment_page_name            :string           default("Apartments")
#  equal_housing_opportunity_logo :boolean          default(TRUE)
#  handicap_accessible_logo       :boolean          default(TRUE)
#  display_rent                   :boolean          default(TRUE)
#  display_sitemap                :boolean          default(TRUE)
#  display_floorplan_gallery      :boolean          default(TRUE)
#  display_unit_on_homepage       :boolean          default(TRUE)
#  display_gallery_on_homepage    :boolean          default(TRUE)
#  realpage_pricing_data          :string
#  realpage_pricing_data_uploaded :boolean          default(TRUE)
#  powered_by_btn                 :boolean          default(TRUE)
#  is_vertical_app                :boolean          default(FALSE)
#  entrata_exception_logs         :string
#  show_tour_page                 :boolean
#  display_available_date         :boolean          default(TRUE)
#  show_gesture_icons             :boolean          default(TRUE)
#  self_tour                      :boolean          default(FALSE)
#  crop_x                         :float
#  crop_y                         :float
#  crop_w                         :float
#  crop_h                         :float
#  crop_x_secondary               :float
#  crop_y_secondary               :float
#  crop_w_secondary               :float
#  crop_h_secondary               :float
#  community_group_id             :integer
#  alert_contact                  :integer          default("both")
#  floorplan_name_order           :boolean          default(FALSE)
#  image_bit                      :boolean
#  do_crop                        :boolean          default(FALSE)
#  do_crop_secondary              :boolean          default(FALSE)
#  number_of_units                :integer
#  tour_setup_visible             :boolean          default(FALSE)
#

class Community < ApplicationRecord
  # has_paper_trail
  # mount_uploader :logo, AvatarUploader
  # attr_readonly :uuid
  mount_base64_uploader :logo, AvatarUploader
  mount_base64_uploader :secondary_logo, AvatarUploader
  mount_base64_uploader :self_tour_logo, AvatarUploader
  belongs_to :company
  belongs_to :community_group
  has_many :community_users, dependent: :destroy
  has_many :users ,through: :community_users, dependent: :destroy
  has_many :units, dependent: :destroy
  has_many :floorplans, dependent: :destroy
  has_many :floorplates, -> { order("number DESC") }, dependent: :destroy
  has_many :allowed_emails, dependent: :destroy
  has_one :credential, dependent: :destroy
  has_one :design, dependent: :destroy
  has_one :favorite_stop, dependent: :destroy
  has_one :sitemap, dependent: :destroy
  has_one :favorite_setting, dependent: :destroy
  has_one :neighborhood, dependent: :destroy
  has_many :galleries, dependent: :destroy
  has_many :gallery_images, -> { order(:sort) }, dependent: :destroy
  has_many :temporary_images, dependent: :destroy
  has_many :webpages, dependent: :destroy
  has_many :imagepages, dependent: :destroy
  has_many :amenities, dependent: :destroy
  has_many :as_guests, dependent: :destroy
  has_many :igloo_guests, dependent: :destroy
  has_many :opening_hours, dependent: :destroy
  has_many :schedual_tours, dependent: :destroy
  has_one :tour, dependent: :destroy
  has_one :edge_state, dependent: :destroy

  accepts_nested_attributes_for :credential
  accepts_nested_attributes_for :design
  validates_uniqueness_of :name, scope: :company_id
  validate :apartment_page_name_length_validate
  validate :gallery_page_name_length_validate
  # validate :unique_community_code_on_create, on: [:create]
  # validate :unique_community_code_on_update, on: [:update]
  after_create :set_default_theme
  after_create :create_default_gallery
  after_create :create_sms_email_content
  validate :validate_page_position

  # before_validation :gen_uuid, on: :create
  # validates :uuid, presence: true, uniqueness: true

  validates_with CodeValidatorOnUpdate , on: [:update]
  validates_with CodeValidatorOnCreate , on: [:create]
  after_update :crop_image
  after_update :crop_secondary_image

  #
  # phony_normalize :phone
  # # phony_normalize :phone, as: :phone_number_normalized_version, default_country_code: 'US'
  # validates :phone, phony_plausible: true

  has_many :elevators, dependent: :destroy



  # phony_normalize :phone
  # phony_normalize :phone, as: :phone_number_normalized_version, default_country_code: 'US'
  # validates :phone, phony_plausible: true


  enum alert_contact: [:email, :phone, :both]
  
  scope :self_tour_enabled_only, -> { where('self_tour = ?', true) }
  amoeba do
    include_association :design
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

  def has_temporary_images?
    temporary_images.size > 0
  end
  def delete_community
    DeleteCommunityJob.perform_async self
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
    ImportResmanSwapDataJob.perform_async credential.attributes.to_json
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

  def realpage_insert_prospect(tour_user)
    RealPageInsertProspectJob.perform_async credential.attributes.to_json, tour_user
  end

  def realpage_get_leasing_agents
    RealPageGetLeasingAgentsJob.perform_async credential.attributes.to_json
  end

  def entrata_send_mits_leads(tour_user, current_time)
    PsiSendMitsLeadsJob.perform_async credential.attributes.to_json, tour_user, current_time
  end

  def select_resman_provider

    ImportResmanStaticDataJob.perform_async credential.attributes.to_json
    # ImportResmanDataJob.perform_async credential.attributes.to_json
  end
  def swap_realpage_svc_data
    ImportRealpageSvcSwapDataJob.perform_async credential.attributes.to_json
  end

  def experimental_data
    ImportExperimentalYardi4DataJob.perform_async credential.attributes.to_json
  end

  def credentials_are_present?
    credential.present?
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
    self.units.where(floorplate_id: nil).each do |unit|
      #unit.update_attributes(x_plot: 0, y_plot: 0) # effective rent validation fails for 0
      unit.x_plot = 0
      unit.y_plot = 0
      unit.save(validate: false)
    end
    true
  end

  def delete_plots_from_floorplate(floorplate_id)
    floorplate = Floorplate.find floorplate_id
    units = Unit.where(community_id: id,floor: floorplate.floors)
    units.each do |unit|
      unit.x_plot = 0
      unit.y_plot = 0
      unit.floorplate_id = nil
      unit.save(validate: false)
    end
    true
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
    puts '%%%%%%%%%%%%%%%%%%%%%%%%PARAMS%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%'
    puts params
    puts '%%%%%%%%%%%%%%%%%%%%%%%%PARAMS FAVOURITES%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%'
    puts params[:favorites]
    puts '%%%%%%%%%%%%%%%%%%%%%%%%PARAMS ITEMS 1%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%'
    params[:favorites][:items]
    puts '%%%%%%%%%%%%%%%%%%%%%%%%PARAMS ITEMS 2%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%'
    puts params[:favorites]['items']
    puts "--"*50

    params[:favorites][:items].each do |item|
      puts "++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++", item['unit_id']
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
    NeighbourhoodMailer.email_counter_200("umersani47@gmail.com","msds19063@itu.edu.pk","",self).deliver
  end
  def neighbourhood_counter_mail_400
    NeighbourhoodMailer.email_counter_400("umersani47@gmail.com","muhammad.umer@intagleo.com","",self).deliver
  end

  def image_src
    if sitemap.image.present?
      sitemap.image.url(:svg_for_metro).present? ? sitemap.image.url(:svg_for_metro) : sitemap.image.url
    else
      "/assets/default.jpeg"
    end
  end

  private

  def populate_favorites(items_objs,email_to)
    fs = self.favorite_stop
    fs = self.favorite_stop.present? ? self.favorite_stop : FavoriteStop.create(community_id: self.id)
    favorites = []
    units = Hash.new
    items_objs.each do |item|
      puts "populate_favorites 11"*50
      puts item[:type]
      puts "populate_favorites 22"*50
      puts item['type']
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
end
