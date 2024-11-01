class ProvidersDataUpdationService
  def initialize 
  end

  def get_all_units_hash community_id, provider
    all_units = Unit.where(community_id: community_id)
    all_units.index_by(&:provider_unit_id)
  end

  def get_all_units_marketing_name_hash community_id, provider
    all_units = Unit.where(community_id: community_id)
    all_units.index_by(&:marketing_name)
  end

  def get_all_units_marketing_name_and_building_hash community_id, provider
    all_units = Unit.where(community_id: community_id)
    all_units.index_by{ |u| "#{u.building}-#{u.marketing_name}" }
  end

  def get_all_floorplans_hash community_id, provider
    all_floorplans = Floorplan.where(community_id: community_id)
    all_floorplans.index_by(&:provider_floorplan_id)
  end

  def update_availability_of_units community_id, no_availbale_units_provider_ids
    return unless no_availbale_units_provider_ids.present?
    Unit.where(community_id: community_id, manual_override: false, provider_unit_id: no_availbale_units_provider_ids).update_all(availability: "Occupied", available: false, available_date: nil)
  end
  
  def update_or_create_floorplans_records(import_floorplans)
    return unless import_floorplans.present?
  
    new_floorplans = import_floorplans.reject(&:id)
    existing_floorplans = import_floorplans.select(&:id).uniq
  
    create_new_floorplans_records(new_floorplans)
    update_existing_floorplans_records(existing_floorplans)
  end

  def update_or_create_units_records(import_units)
    return unless import_units.present?
  
    new_units = import_units.reject(&:id)
    existing_units = import_units.select(&:id).uniq
  
    create_new_units_records(new_units)
    update_existing_units_records(existing_units)
  end

  private

  def set_default_timestamps(records)
    current_time = Time.now
    records.each do |record|
      record.created_at ||= current_time
      record.updated_at ||= current_time
    end

    records
  end

  def create_new_floorplans_records(new_floorplans)
    return unless new_floorplans.present?

    new_floorplans = set_default_timestamps(new_floorplans)

    Floorplan.transaction do
      Floorplan.import new_floorplans, validate: false
    end
  end

  def update_existing_floorplans_records(existing_floorplans)
    return unless existing_floorplans.present?
  
    Floorplan.transaction do
      Floorplan.import existing_floorplans, on_duplicate_key_update: {
        conflict_target: [:id],
        columns: Floorplan.column_names.map(&:to_sym)
      }, validate: false, batch_size: 100
    end
  end

  def create_new_units_records(new_units)
    return unless new_units.present?

    new_units = set_default_timestamps(new_units)

    Unit.transaction do
      Unit.import new_units, validate: false
    end
  end

  def update_existing_units_records(existing_units)
    return unless existing_units.present?
  
    Unit.transaction do
      Unit.import existing_units, on_duplicate_key_update: {
        conflict_target: [:id],
        columns: Unit.column_names.map(&:to_sym)
      }, validate: false, batch_size: 100
    end
  end
end