class Community < ApplicationRecord
  #mount_uploader :logo, AvatarUploader
  mount_base64_uploader :logo, AvatarUploader
  belongs_to :company
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
  accepts_nested_attributes_for :credential
  accepts_nested_attributes_for :design
  validates_uniqueness_of :name, scope: :company_id
  validates_uniqueness_of :code
  after_create :set_default_theme
  after_create :create_default_gallery

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

  def has_floorplates?
    floorplates.size > 0
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
    end
  end

  def select_yardi_provider
    credential.url.include?("20") ? import_yardi2_data : import_yardi4_data
  end

  def import_psi_data
    #psi_service = PsiService.new(credential.attributes)
    #psi_service.perform  
    ImportPsiDataJob.perform_async credential.attributes.to_json
  end

  def import_yardirentcafe_data
      #yardi_rent_cafe_service = YardiRentCafeService.new(credential.attributes)
      #yardi_rent_cafe_service.perform
      ImportYardirentcafeDataJob.perform_async credential.attributes.to_json
  end

  def import_yardi2_data
    #yardi2_service = Yardi2Service.new(credential.attributes)
    #yardi2_service.perform
    ImportYardi2DataJob.perform_async credential.attributes.to_json
  end

  def import_yardi4_data
    #yardi4_service = Yardi4Service.new(credential.attributes)
    #yardi4_service.perform
    ImportYardi4DataJob.perform_async credential.attributes.to_json
  end

  def import_realpage_svc_data
    #real_page_svc_service = RealPageSvcService.new(credential.attributes)
    #real_page_svc_service.perform
    ImportRealpageSvcDataJob.perform_async credential.attributes.to_json
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
    end
  end

  def connect_to_psi
    psi_connection_service = PsiConnectionService.new(credential.attributes)
    psi_connection_service.perform
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
    credential.url.include?("20") ? yardi2_service : yardi4_service
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
    self.units.where(floorplate_id: floorplate_id).each do |unit|
      # unit.update_attributes(x_plot: 0, y_plot: 0,floorplate_id: nil) # effective rent validation fails for 0
      unit.x_plot = 0
      unit.y_plot = 0
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
    favorites = populate_favorites(params[:favorites][:items])
    email_bcc = self.favorite_setting.present? ? self.favorite_setting.email_bcc : nil 
    email_from = self.favorite_setting.present? ? self.favorite_setting.email_from : nil
    email_body = self.favorite_setting.present? ? self.favorite_setting.email_body : nil
    ios = params[:favorites][:device_type].present? && params[:favorites][:device_type] == "iOS" ? true : false
    if favorites.present?
      FavoriteMailer.email_favorites(email_from,email_to,email_bcc,email_body,favorites,ios).deliver
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
    items_objs.each do |item|
      favorite = item['type'].classify.constantize.where(id: item["id"])
      favorites << favorite.first if favorite.present?
    end
    return favorites
  end

end
