# == Schema Information
#
# Table name: credentials
#
#  id                  :integer          not null, primary key
#  community_id        :integer
#  password            :string
#  username            :string
#  property_id         :string
#  pmc_id              :string
#  licence_key         :string
#  server_name         :string
#  database            :string
#  platform            :string
#  interface_entity    :string
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  url                 :string
#  site_id             :string
#  c_code              :string
#  p_code              :string
#  apply_now           :boolean          default(FALSE)
#  file                :string
#  api_token           :string
#  resman_apikey       :string
#  resman_partner_id   :string
#  resman_account_id   :string
#  resman_property_id  :string
#  zaremba_username    :string
#  zaremba_password    :string
#  zaremba_filename    :string
#  zaremba_property_id :string
#  entrata_url         :string
#  xml_filename        :string
#  xml_domain          :string
#  data_error_message  :string
#  data_error_exp      :string
#

class Credential < ApplicationRecord
  has_paper_trail
  belongs_to :community
  belongs_to :company
  before_save :set_https_in_url
  has_one :status, as: :statusable
  
  after_update :change_to_scheduled_tours_for_sf
  after_update :fetch_crm_data

  def as_json(data_provider = "")
    data = super(
      :only => [:community_id, :id],include: { community: {only: [:use_company_level_data_settings]}}
    )
    data.merge!(data_provider: data_provider,credentials: data_providers_credentials(data_provider),use_different_crm_provider: use_different_crm,crm_provider: crm_provider,crm_credentials: crm_credential_provider)
  end

  def crm_credential_provider
    community = self.community
    return {} unless community&.crm_credential&.crm_provider.present?
    community.crm_credential.crm_provider_credentials
  end

  def use_different_crm
    community = self.community
    community.use_crm_credentials?
  end

  def crm_provider
    self.community.crm_credential.crm_provider rescue ""
  end

  def fetch_crm_data
    if self&.community&.is_funnel_community?
      FunnelCrmWorker.perform_async self&.community&.id
    elsif self&.community&.is_knock_community?
      KnockCrmWorker.perform_async self&.community&.id
    elsif self&.community&.use_yardi_as_lead?
      RentCafeCrmWorker.perform_async self&.community&.id
    end
  end

  def data_providers_credentials(data_provider)
    case data_provider
      when "psi"
        psi_credentials
      when "yardirentcafe"
        yardirentcafe_credentials
      when "appfolio"
        appfolio_credentials
      when "rentmanager"
        rentmanager_credentials
      when "realpagesvc"
        realpagesvc_credentials
      when "yardi"
        yardi_credentials
      when "resman"
        resman_credentials
      when "other"
        new_requested_provider
    end
  end

  def psi_credentials
    {entrata_url: self.entrata_url, username: self.username, password: self.password, property_id: self.property_id}
  end

  def yardirentcafe_credentials
    selected_code_option = self.api_token.present? ? API_TOKEN : PROPERTY_CODE
    cred = {code_option: selected_code_option, p_code: self.p_code}
    cred.merge!(fetch_code(selected_code_option))
  end

  def rentmanager_credentials
    {
      rentmanager_username: self.rentmanager_username,
      rentmanager_password: self.rentmanager_password,
      rentmanager_property_id: self.rentmanager_property_id,
      rentmanager_base_url: self.rentmanager_base_url
    }
  end

  def appfolio_credentials
    {
      app_folio_property_id: self.app_folio_property_id,
    }
  end
  
  def fetch_code(selected_code_option)
    # if selected_code_option.eql?(API_TOKEN)
    #   {api_token: self.api_token}
    # else
    #   {c_code: self.c_code}
    # end
    {api_token: self.api_token, c_code: self.c_code}
  end

  def realpagesvc_credentials
    {site_id: self.site_id, pmc_id: self.pmc_id}
  end

  def yardi_credentials
    {url: self.url, username: self.username, password: self.password, property_id: self.property_id, server_name: self.server_name, database: self.database }
  end
  
  def resman_credentials
    {resman_account_id: self.resman_account_id, resman_property_id: self.resman_property_id}
  end

  def new_requested_provider
    self.new_requested_data_provider rescue ""
  end

  def import_data_from_spreadsheet(file)
    spreadsheet_data_update_or_import(file)
  end

  def swap_data_from_spreadsheet(file)
    spreadsheet_data_update_or_import(file)
  end
  
  def spreadsheet_data_update_or_import file
    xlsx = Roo::Spreadsheet.open(file.open)
   
    units = xlsx.sheet(0)

    units.each_with_index do |u, index|
      create_or_update_unit(community_id, u) unless index == 0
    end
    
    floorplans = xlsx.sheet(1)

    floorplans.each_with_index do |f,index|
      create_or_update_floorplan(community_id, f) unless index == 0
    end
  end

  def set_https_in_url
    if self.url.present?
      unless url.include?('https')
        self.url = url.gsub('http','https')
      end
    end
  end

  def change_to_scheduled_tours_for_sf
    community = self.community
    if self.use_different_crm_provider && community&.crm_credential&.crm_provider == "salesforce"
      self.community.community_tour.update(only_scheduled_tour: true)
      self.community.update(scheduler_widget: false)
    end
  end

  private

  def create_or_update_unit community_id, u
    provider_unit_id = [ u[0].to_s.gsub(".",""), u[0].to_s.gsub(".","").gsub(/\s+/, '-') ]&.compact&.uniq
    unit = Unit.where(provider: "spreadsheet", community_id: community_id, provider_unit_id: provider_unit_id ).first_or_initialize

    unit.provider_unit_id = u[0].to_s.gsub(".","").gsub(/\s+/, '-')
    unit.marketing_name = get_integer_value(u[0])
    unit.unit_type = get_integer_value(u[0])
    unit.floorplan_id = u[1]
    unit.floor = get_integer_value(u[3])
    unit.availability = u[4] == true ? "Unoccupied" : "Occupied"
    unit.available = u[4] == true  ? true : false
    unit.available_date = u[5]
    unit.market_rent = u[6].present? ? u[6] : 0
    unit.effective_rent = u[6].present? ? u[6] : 0

    unit.save(validate: false)
  end

  def create_or_update_floorplan community_id, f
    floorplan = Floorplan.where(provider: "spreadsheet", community_id: community_id, provider_floorplan_id: f[0] ).first_or_initialize

    floorplan.name = get_integer_value(f[1])
    floorplan.provider_floorplan_id = f[0]
    floorplan.square_feet = f[2]
    floorplan.bedrooms = get_integer_value(f[3])
    floorplan.bathrooms = get_integer_value(f[4])

    floorplan.save(validate: false)
  end

  def get_integer_value value
    if value.class == Integer || value.class == Float
      value.to_i
    else
      value
    end
  end

end
