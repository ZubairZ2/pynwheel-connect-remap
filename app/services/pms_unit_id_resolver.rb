# Recovers the source PMS's own unit identifier from a Unit's provider_unit_id.
#
# provider_unit_id is Pynwheel's sync key, not the PMS value: most importers
# fold extra parts into it so it stays unique per community. Each rule below
# is the exact inverse of how that provider's importers build the key, and
# returns nil whenever the original value cannot be recovered with certainty.
# A nil is always preferable to a wrong id, because partners match on it.
class PmsUnitIdResolver
  # Swap services stage a provider change as "<provider>_new" with the same key.
  SWAP_SUFFIX = /_new\z/

  def self.call(unit)
    new(unit).call
  end

  def initialize(unit)
    @unit = unit
    @key = unit.provider_unit_id.to_s
    @provider = unit.provider.to_s.sub(SWAP_SUFFIX, "")
  end

  def call
    return if @key.blank?

    case @provider
    # Entrata. "{Unit Identification IDValue}-{ILS_Unit IDValue}". The first part
    # is Entrata's PropertyUnitId; the second is the unit space. Older records
    # used "{id}", "{id}-{MarketingName}" or "{id}-{id}", which all lead with
    # the same PropertyUnitId, and Entrata ids are always integers.
    when "psi"
      @key[/\A(\d+)(?:-|\z)/, 1]

    # "{UnitID}-{siteId}" and "{Unit Id}-{propertyId}". The importers write the
    # same site/property id to property_id, so strip exactly that suffix: unit
    # codes (Yardi especially) may contain hyphens of their own.
    when "realpagesvc", "yardi"
      strip_property_suffix

    # Stored exactly as the PMS sends it.
    when "yardirentcafe", "appfolio", "rentmanager", "xml"
      @key

    # Stored as Id.gsub("*", "-"), which cannot be undone once a hyphen is
    # present: "A-1" may have been "A*1". Only a hyphen-free key is the original.
    when "resman"
      @key unless @key.include?("-")

    # Zaremba ("{BuildingID}-{IDValue}") is deliberately absent: the building
    # column is rewritten on import and editable in the CMS, so the prefix
    # cannot be removed reliably. Non-PMS sources (spreadsheet, manual, Beans,
    # Salesforce, Swoop) have no PMS id at all.
    end
  end

  private

  def strip_property_suffix
    property_id = @unit.property_id.to_s
    return if property_id.blank?

    suffix = "-#{property_id}"
    return unless @key.end_with?(suffix)

    @key.delete_suffix(suffix).presence
  end
end
