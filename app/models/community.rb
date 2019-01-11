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
#

class Community < ApplicationRecord
  #mount_uploader :logo, AvatarUploader
  mount_base64_uploader :logo, AvatarUploader
  mount_base64_uploader :secondary_logo, AvatarUploader
  belongs_to :company
  has_many :community_users, dependent: :destroy
  has_many :users ,through: :community_users, dependent: :destroy
  has_many :units, dependent: :destroy
  has_many :floorplans, dependent: :destroy
  has_many :floorplates, -> { order("number DESC") }, dependent: :destroy
  has_one :credential, dependent: :destroy
  has_one :design, dependent: :destroy
  has_one :sitemap, dependent: :destroy
  has_one :favorite_setting, dependent: :destroy
  has_one :neighborhood, dependent: :destroy
  has_many :galleries, dependent: :destroy
  has_many :gallery_images, -> { order(:sort) }, dependent: :destroy
  has_many :temporary_images, dependent: :destroy
  has_many :webpages, dependent: :destroy
  has_many :imagepages, dependent: :destroy
  has_many :amenities, dependent: :destroy
  accepts_nested_attributes_for :credential
  accepts_nested_attributes_for :design
  validates_uniqueness_of :name, scope: :company_id
  validate :apartment_page_name_length_validate
  validate :gallery_page_name_length_validate
  validate :unique_community_code_on_create, on: [:create]
  validate :unique_community_code_on_update, on: [:update]
  after_create :set_default_theme
  after_create :create_default_gallery
  validate :validate_page_position

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

  def has_temporary_images?
    temporary_images.size > 0
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
  def import_psi_data
    #psi_service = PsiService.new(credential.attributes)
    #psi_service.perform
    ImportPsiStaticDataJob.perform_async credential.attributes.to_json
    ImportPsiDataJob.perform_async credential.attributes.to_json
  end

  def import_zaremba_provider
    ImportZarembaStaticDataJob.perform_async credential.attributes.to_json
    ImportZarembaDataJob.perform_async credential.attributes.to_json
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
  def import_yardirentcafe_data
      #yardi_rent_cafe_service = YardiRentCafeService.new(credential.attributes)
      #yardi_rent_cafe_service.perform
    ImportYardirentcafeDataJob.perform_async credential.attributes.to_json
    ImportYardirentcafeStaticDataJob.perform_async credential.attributes.to_json
  end
  def swap_yardirentcafe_data
    ImportYardirentcafeSwapDataJob.perform_async credential.attributes.to_json
  end
  def import_yardi2_data
    #yardi2_service = Yardi2Service.new(credential.attributes)
    #yardi2_service.perform
    ImportYardi2StaticDataJob.perform_async credential.attributes.to_json
    ImportYardi2DataJob.perform_async credential.attributes.to_json
  end

  def swap_yardi2_data
    ImportYardi2SwapDataJob.perform_async credential.attributes.to_json
  end

  def import_yardi4_data
    #yardi4_service = Yardi4Service.new(credential.attributes)
    #yardi4_service.perform
    ImportYardi4DataJob.perform_async credential.attributes.to_json
    ImportYardi4StaticDataJob.perform_async credential.attributes.to_json
  end

  def swap_yardi4_data
    ImportYardi4SwapDataJob.perform_async credential.attributes.to_json
  end
  def import_realpage_svc_data
    #real_page_svc_service = RealPageSvcService.new(credential.attributes)
    #real_page_svc_service.perform
    ImportRealpageSvcDataJob.perform_async credential.attributes.to_json
    ImportRealpageSvcStaticDataJob.perform_async credential.attributes.to_json
  end
  def select_resman_provider

    ImportResmanStaticDataJob.perform_async credential.attributes.to_json
    ImportResmanDataJob.perform_async credential.attributes.to_json
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
    end
  end

  def connect_to_psi_pricing
    psi_pricing_connection_service = PsiPricingConnectionService.new(credential.attributes)
    psi_pricing_connection_service.perform
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

  def connect_to_yardirentcafe
    yardi_rent_cafe_connection_service = YardiRentCafeConnectionService.new(credential.attributes)
    yardi_rent_cafe_connection_service.perform
  end

  def connect_to_realpagesvc
    real_page_svc_connection_service = RealPageSvcConnectionService.new(credential.attributes)
    real_page_svc_connection_service.perform
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
    result = populate_favorites(params[:favorites][:items])
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
      FavoriteMailer.email_favorites(email_from,email_to,email_bcc,email_body,favorites,units,ios,self).deliver
      return true
    else
      return false
    end
  end

  def image_src
    if sitemap.image.present?
      sitemap.image.url(:svg_for_metro).present? ? sitemap.image.url(:svg_for_metro) : sitemap.image.url
    else
      "/assets/default.jpeg"
    end
  end

  private

  def populate_favorites(items_objs)
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
    end
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
