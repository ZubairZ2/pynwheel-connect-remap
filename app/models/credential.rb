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
  include LaunchStatusable

  has_paper_trail
  belongs_to :community
  belongs_to :company
  before_save :set_https_in_url
  # `has_one :status` comes from LaunchStatusable

  after_update :change_to_scheduled_tours_for_sf
  after_update :fetch_crm_data

  enum :app_folio_property_scope, {
    is_app_folio_property_id: "is_app_folio_property_id",
    is_app_folio_property_group_id: "is_app_folio_property_group_id"
  }

  UNIT_NAME_FIELD_MAP = {
    'Marketing Title' => 'MarketingTitle',
    'Name'            => 'Name',
    'Address2'        => 'Address2',
    'Address1'        => 'Address1'
  }.freeze

  PROPERTY_SCOP_OPTIONS = [
    ['Property ID', 'is_app_folio_property_id'],
    ['Property Group ID', 'is_app_folio_property_group_id']
  ].freeze

  validates :unit_name_key, inclusion: { in: UNIT_NAME_FIELD_MAP.values }

  def as_json(data_provider = "")
    data = super(
      :only => [:community_id, :id],include: { community: {only: [:use_company_level_data_settings]}}
    )
    data.merge!(data_provider: data_provider,credentials: data_providers_credentials(data_provider),use_different_crm_provider: use_different_crm,crm_provider: crm_provider,crm_credentials: crm_credential_provider)
  end

  # Same rule Community#set_data_provider_status applies: credentials complete
  # enough for the provider to connect are ready for Launch to review.
  def derive_launch_status
    community.present? && community.check_required_fields_for_providers ? SUBMITTED : IN_PROGRESS
  rescue StandardError
    IN_PROGRESS
  end

  def resolved_app_folio_property_ids(app_folio_service)
    if is_app_folio_property_id?
      app_folio_property_id.to_s.split(',').map(&:strip)
    else
      resolve_property_ids_from_group(app_folio_service)
    end
  end

  def resolved_unit_name(unit_data)
    unit_data[unit_name_key]
  end

  def get_limit_result_availability
    [false, true]
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
      app_folio_database_id: self.app_folio_database_id,
      app_folio_property_group_id: self.app_folio_property_group_id,
      app_folio_property_scope: self.app_folio_property_scope
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

    # Tabs are found by name so an extra or reordered tab doesn't swap units
    # and floor plans; the positional fallback keeps older templates working.
    units = spreadsheet_tab(xlsx, /unit/i, 0)

    units.each_with_index do |u, index|
      next if index == 0 || spreadsheet_blank_row?(u)
      create_or_update_unit(community_id, u)
    end

    floorplans = spreadsheet_tab(xlsx, /floor\s*plan/i, 1)

    floorplans.each_with_index do |f,index|
      next if index == 0 || spreadsheet_blank_row?(f)
      create_or_update_floorplan(community_id, f)
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

  def resolve_property_ids_from_group(app_folio_service)
    return [] if app_folio_property_group_id.blank?

    response = app_folio_service.get_resource(nil, "property_groups")
    return [] unless response&.success?

    groups = response["data"] || []

    group = groups.find { |g| g["Id"] == app_folio_property_group_id }
    group ? group["PropertyIds"] : []
  end

  def create_or_update_unit community_id, u
    provider_unit_id = spreadsheet_id(u[0])
    unit = Unit.where(provider: "spreadsheet", community_id: community_id, provider_unit_id: spreadsheet_id_variants(u[0], hyphenate: true) ).first_or_initialize
    available = spreadsheet_boolean(u[4])
    rent = spreadsheet_number(u[6]) || 0

    unit.provider_unit_id = provider_unit_id.gsub(/\s+/, '-')
    unit.marketing_name = provider_unit_id
    unit.unit_type = provider_unit_id
    # Must be spelled exactly like the floor plan's provider_floorplan_id:
    # Unit#floorplan joins the two as strings, so "4.0" never finds "4".
    unit.floorplan_id = spreadsheet_id(u[1]).presence
    unit.floor = spreadsheet_number(u[3])&.to_i
    unit.availability = available ? "Unoccupied" : "Occupied"
    unit.available = available
    unit.available_date = spreadsheet_date(u[5])
    unit.market_rent = rent
    unit.effective_rent = rent

    unit.save(validate: false)
  end

  def create_or_update_floorplan community_id, f
    floorplan = Floorplan.where(provider: "spreadsheet", community_id: community_id, provider_floorplan_id: spreadsheet_id_variants(f[0]) ).first_or_initialize

    floorplan.name = spreadsheet_id(f[1])
    floorplan.provider_floorplan_id = spreadsheet_id(f[0])
    floorplan.square_feet = spreadsheet_number(f[2])
    floorplan.bedrooms = spreadsheet_number(f[3])&.to_i
    # Not truncated: a 1.5-bath plan is real.
    floorplan.bathrooms = spreadsheet_number(f[4])

    floorplan.save(validate: false)
  end

  def spreadsheet_tab xlsx, name_pattern, fallback_index
    name = xlsx.sheets.find { |sheet| sheet.to_s.match?(name_pattern) }
    xlsx.sheet(name || fallback_index)
  end

  def spreadsheet_blank_row? row
    Array(row).all? { |cell| cell.to_s.strip.empty? }
  end

  # The same id can arrive as 4, 4.0 or "4" depending on how the cell was
  # formatted, so every spelling collapses to "4". Non-numeric ids ("A01",
  # "2BED-1BATH") pass through trimmed.
  def spreadsheet_id value
    case value
    when nil then ""
    when Float then value == value.to_i ? value.to_i.to_s : value.to_s
    when Numeric then value.to_s
    else
      text = value.to_s.strip
      text.match?(/\A-?\d+\.0+\z/) ? text.sub(/\.0+\z/, "") : text
    end
  end

  # Every id this row may have been saved under by earlier versions of the
  # importer (which stripped dots and hyphenated spaces), so re-importing
  # updates those records rather than duplicating them.
  def spreadsheet_id_variants value, hyphenate: false
    variants = [spreadsheet_id(value), value.to_s, value.to_s.gsub(".", "")]
    variants += variants.map { |v| v.gsub(/\s+/, '-') } if hyphenate
    variants.map(&:strip).reject(&:empty?).uniq
  end

  # Accepts real numbers and text such as "1,895.00" or "$1,895", which a
  # plain string-to-float cast would read as 1.0.
  def spreadsheet_number value
    return value.to_f if value.is_a?(Numeric)

    text = value.to_s.gsub(/[$,\s]/, "")
    Float(text) rescue nil
  end

  def spreadsheet_boolean value
    return value if value == true || value == false
    return value.to_i == 1 if value.is_a?(Numeric)

    %w[true t yes y 1 available].include?(value.to_s.strip.downcase)
  end

  def spreadsheet_date value
    return value.to_date if value.respond_to?(:to_date) && !value.is_a?(String)

    text = value.to_s.strip
    return nil if text.empty?

    # US sheets write 10/15/2026, which Date.parse reads day-first and rejects.
    Date.strptime(text, text.match?(/\A\d{1,2}\/\d{1,2}\/\d{2}\z/) ? "%m/%d/%y" : "%m/%d/%Y")
  rescue ArgumentError
    Date.parse(text) rescue nil
  end

end
