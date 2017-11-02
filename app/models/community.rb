class Community < ApplicationRecord
  #mount_uploader :logo, AvatarUploader
  mount_base64_uploader :logo, AvatarUploader
  belongs_to :company
  has_many :units, dependent: :destroy
  has_many :floorplans, dependent: :destroy
  has_many :floorplates, dependent: :destroy
  has_one :credential , dependent: :destroy
  has_one :design, dependent: :destroy
  has_one :sitemap , dependent: :destroy
  accepts_nested_attributes_for :credential
  accepts_nested_attributes_for :design
  validates_uniqueness_of :name, scope: :company_id
  after_create :set_default_theme

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
    psi_service = PsiService.new(credential.attributes)
    psi_service.perform  
  end

  def import_yardirentcafe_data
      yardi_rent_cafe_service = YardiRentCafeService.new(credential.attributes)
      yardi_rent_cafe_service.perform
  end

  def import_yardi2_data
    yardi2_service = Yardi2Service.new(credential.attributes)
    yardi2_service.perform
  end

  def import_yardi4_data
    yardi4_service = Yardi4Service.new(credential.attributes)
    yardi4_service.perform
  end

  def import_realpage_svc_data
    real_page_svc_service = RealPageSvcService.new(credential.attributes)
    real_page_svc_service.perform
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
    self.units.each do |unit|
      unit.update_attributes(x_plot: 0, y_plot: 0)
    end
    true
  end

  def delete_plots_from_floorplate(floorplate_id)
    self.units.where(floorplate_id: floorplate_id).each do |unit|
      unit.update_attributes(x_plot: 0, y_plot: 0,floorplate_id: nil)
    end
    true
  end

  def set_default_theme
    self.theme_name = "futurist"
    self.save
  end



end
