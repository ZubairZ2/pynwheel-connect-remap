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
  before_save :set_https_in_url
  has_one :status, as: :statusable
  
  after_update :change_to_scheduled_tours_for_sf

  def as_json(data_provider = "")
    data = super(
      :only => [:community_id, :id]
    )
    data.merge!(data_provider: data_provider,credentials: data_providers_credentials(data_provider),use_different_crm_provider: use_different_crm,crm_provider: crm_provider,crm_credential: crm_credential_provider)
  end

  def crm_credential_provider
    community = self.community
    return {} unless self.use_different_crm_provider && community.crm_credential.crm_provider.present?
    community.crm_credential.crm_provider_credentials
  end

  def use_different_crm
    self.use_different_crm_provider
  end

  def crm_provider
    self.community.crm_credential.crm_provider rescue ""
  end

  def data_providers_credentials(data_provider)
    case data_provider
      when "psi"
        psi_credentials
      when "yardirentcafe"
        yardirentcafe_credentials
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
    {domain: self.entrata_url, username: self.username, password: self.password, property_id: self.property_id}
  end

  def yardirentcafe_credentials
    selected_code_option = self.api_token.present? ? API_TOKEN : PROPERTY_CODE
    cred = {code_option: selected_code_option, p_code: self.p_code}
    cred.merge!(fetch_code(selected_code_option))
  end
  
  def fetch_code(selected_code_option)
    if selected_code_option.eql?(API_TOKEN)
      {api_token: self.api_token}
    else
      {c_code: self.c_code}
    end
  end

  def realpagesvc_credentials
    {site_id: self.site_id, pmc_id: self.pmc_id}
  end

  def yardi_credentials
    {url: self.url, username: self.username, password: self.password, property_id: self.property_id, server_name: self.server_name }
  end
  
  def resman_credentials
    {account_id: self.resman_account_id, property_id: self.resman_property_id}
  end

  def new_requested_provider
    self.new_requested_data_provider rescue ""
  end

  def import_data_from_spreadsheet(file)
    xlsx = Roo::Spreadsheet.open(file.open)
    units = xlsx.sheet(0)
    units.each_with_index do |u,index|
      unless index == 0 
        unit = Unit.where(provider: "spreadsheet",community_id: community_id,provider_unit_id: u[0].to_s.gsub(".","")).first_or_initialize
        unit.provider_unit_id = u[0].to_s.gsub(".","")
        unit.marketing_name = u[0].to_i == 0 ? u[0] : u[0] rescue u[0]
        unit.unit_type = u[0]
        unit.floorplan_id = u[1]
        unit.floor = u[3]
        unit.availability = u[4] == true ? "Unoccupied" : "Occupied"
        unit.available = u[4] == true ? true : false
        unit.available_date = u[5]
        unit.market_rent = u[6].present? ? u[6] : 1
        unit.effective_rent = u[6].present? ? u[6] : 1
        unit.save(validate: false)
      end
    end
    floorplans = xlsx.sheet(1)

    floorplans.each_with_index do |f,index|
      unless index == 0
        floorplan = Floorplan.where(provider: "spreadsheet",community_id: community_id,provider_floorplan_id: f[0]).first_or_initialize  
        floorplan.name = f[1]
        floorplan.square_feet = f[2]
        floorplan.bedrooms = f[3]
        floorplan.bathrooms = f[4]
        floorplan.save(validate: false)
      end
    end
  end

  def swap_data_from_spreadsheet(file)
    xlsx = Roo::Spreadsheet.open(file.open)
    units = xlsx.sheet(0)
    units.each_with_index do |u,index|
      unless index == 0
        unit_name = u[0].to_i == 0 ? u[0] : u[0] rescue u[0]
        unit = Unit.where(community_id: community_id,marketing_name: unit_name).first
        if unit.present?
          unit.provider_unit_id = u[0].to_s.gsub(".","")
          unit.provider = "spreadsheet_new"
          unit.unit_type = u[0]
          unit.floorplan_id = u[1]
          unit.floor = u[3]
          unit.availability = u[4] == true ? "Unoccupied" : "Occupied"
          unit.available = u[4] == true ? true : false
          unit.available_date = u[5]
          unit.market_rent = u[6].present? ? u[6] : 1
          unit.effective_rent = u[6].present? ? u[6] : 1
          unit.save(validate: false)
        else
          dup = Unit.find_by(community_id: community_id, provider_unit_id: u[0].to_s.gsub(".",""))
          if dup.present?
            dup.destroy
          end
          unit = Unit.new
          unit.community_id = community_id
          unit.marketing_name = u[0].to_i == 0 ? u[0] : u[0] rescue u[0]
          unit.provider_unit_id = u[0].to_s.gsub(".","")
          unit.provider = "spreadsheet_new"
          unit.unit_type = u[0]
          unit.floorplan_id = u[1]
          unit.floor = u[3]
          unit.availability = u[4] == true ? "Unoccupied" : "Occupied"
          unit.available = u[4] == true ? true : false
          unit.available_date = u[5]
          unit.market_rent = u[6].present? ? u[6] : 1
          unit.effective_rent = u[6].present? ? u[6] : 1
          unit.save(validate: false)
        end
      end
    end
    unit = Unit.where(community_id: community_id)
    unit.each do |d|
      unless d.provider == "spreadsheet_new" || d.provider == "manually"
        d.destroy
      end
    end
    unit = Unit.where(community_id: community_id)
    unit.each do |d|
      if d.provider == "spreadsheet_new"
        d.provider = "spreadsheet"
      end
    end

    floorplans = xlsx.sheet(1)

    floorplans.each_with_index do |f,index|
      unless index == 0
        floorplan = Floorplan.where(community_id: community_id,name: f[1]).first
        if floorplan.present?
          floorplan.provider = "spreadsheet_new"
          floorplan.provider_floorplan_id = f[0]
          floorplan.square_feet = f[2]
          floorplan.bedrooms = f[3]
          floorplan.bathrooms = f[4]
          floorplan.manual_override = false
          floorplan.save(validate: false)
        else
          dup = Floorplan.find_by(community_id: community_id, provider_floorplan_id: f[0])
          if dup.present?
            dup.destroy
          end
          floorplan = Floorplan.new
          floorplan.community_id = community_id
          floorplan.name = f[1]
          floorplan.provider = "spreadsheet_new"
          floorplan.provider_floorplan_id = f[0]
          floorplan.square_feet = f[2]
          floorplan.bedrooms = f[3]
          floorplan.bathrooms = f[4]
          floorplan.save(validate: false)
        end
      end
    end
    fp = Floorplan.where(community_id: community_id)
    fp.each do |d|
      unless d.provider == "spreadsheet_new"
        d.destroy
      end
    end
    fp = Floorplan.where(community_id: community_id)
    fp.each do |d|
      if d.provider == "spreadsheet_new"
        d.provider = "spreadsheet"
      end
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
    if self.use_different_crm_provider && community.crm_credential.crm_provider == "salesforce"
      self.community.tour.update_columns(only_scheduled_tour: true)
      self.community.update_columns(scheduler_widget: false)
    end
  end
end
