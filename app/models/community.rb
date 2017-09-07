class Community < ApplicationRecord
  mount_uploader :logo, AvatarUploader
  belongs_to :company
  has_many :units, dependent: :destroy
  has_many :floorplans, dependent: :destroy
  has_one :credential , dependent: :destroy
  accepts_nested_attributes_for :credential


  def data_is_imported
    case data_provider
      when "psi"
        import_psi_data
      when "yardirentcafe"
        import_yardirentcafe_data
      when "realpagesvc"
        import_realpage_svc_data
      when "yardi2"
        import_yardi2_data
      when "yardi4"
        import_yardi4_data
    end
  end

  def import_psi_data
    begin
      psi_service = PsiService.new(credential.attributes)
      psi_service.perform
    rescue => e
      puts '--------------' ,e.message
      false
    end
  end

  def import_yardirentcafe_data
    begin
      yardi_rent_cafe_service = YardiRentCafeService.new(credential.attributes)
      yardi_rent_cafe_service.perform
    rescue => e
      puts '--------------' ,e.message
      false
    end
  end

  def import_yardi2_data
    begin
      yardi2_service = Yardi2Service.new(credential.attributes)
      yardi2_service.perform
    rescue => e
      puts '--------------' ,e.message
      false
    end
  end

  def import_yardi4_data
    begin
      yardi4_service = Yardi4Service.new(credential.attributes)
      yardi4_service.perform
    rescue => e
      puts '--------------' ,e.message
      false
    end
  end

  def import_realpage_svc_data
    begin
      real_page_svc_service = RealPageSvcService.new(credential.attributes)
      real_page_svc_service.perform
    rescue => e
      puts '--------------' ,e.message
      false
    end
  end

end
