class ProvidersDataUpdationService
  def initialize 
  end

  def update_or_create_floorplans_records import_floorplans
    return unless import_floorplans.present?
    new_floorplans = import_floorplans.map{|f| f unless f&.id.present?}.compact
    existing_floorlans = import_floorplans.map{|f| f if f&.id.present?}.compact.uniq
    create_new_floorplans_records(new_floorplans)
    update_existing_floorplans_records(existing_floorlans)
  end

  def update_or_create_units_records import_units
    return unless import_units.present?
    new_units = import_units.map{|u| u unless u&.id.present?}.compact
    existing_units = import_units.map{|u| u if u&.id.present?}.compact.uniq
    create_new_units_records(new_units)
    update_existing_units_records(existing_units)
  end

  private

  def create_new_floorplans_records(new_floorplans)
    return unless new_floorplans.present?
    Floorplan.import new_floorplans, validate: false  if new_floorplans.present?
  end

  def update_existing_floorplans_records(existing_floorplans)
    return unless existing_floorplans.present?
    Floorplan.import existing_floorplans, on_duplicate_key_update: {
      conflict_target: [:id],
      columns: (Floorplan.column_names.map! &:to_sym)
    }, batch_size: 100
  end

  def create_new_units_records(new_units)
    return unless new_units.present?
    Unit.import new_units, validate: false  if new_units.present?
  end

  def update_existing_units_records(existing_units)
    return unless existing_units.present?
    Unit.import existing_units, on_duplicate_key_update: {
      conflict_target: [:id],
      columns: (Unit.column_names.map! &:to_sym)
    }, batch_size: 100
  end

end