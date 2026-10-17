# frozen_string_literal: true

module Stops
  # The stop editor's Save: the stop's content lives on its record (the
  # design: "Name and content live on the unit / amenity, the one source for
  # Tour, Map and Touch"), so this writes the record's own columns:
  #   unit      description, stop_description (what the app reads out at the
  #             stop), virtual_tour_url
  #   amenity   description, directional_text, video_link
  #   elevator  name, description, directional_text
  #   entry     name, directional_text
  # Plain text is stored as given (the legacy forms store HTML; a value with
  # tags is kept as-is). Column writes, as the Tour Setup save does, so no
  # unrelated callback (image cropping, unplotting, PMS flags) runs; the
  # tour's own version moves so the Tour App's cache refreshes.
  module UpdateContent
    FIELDS = {
      'unit' => { 'description' => :description, 'instructions' => :stop_description, 'virtual_tour_url' => :virtual_tour_url },
      'amenity' => { 'description' => :description, 'instructions' => :directional_text, 'video_link' => :video_link },
      'elevator' => { 'name' => :name, 'description' => :description, 'instructions' => :directional_text },
      'building_starting_point' => { 'name' => :name, 'instructions' => :directional_text }
    }.freeze
    MAX = { 'name' => 120, 'description' => 5000, 'instructions' => 2000, 'video_link' => 500, 'virtual_tour_url' => 500 }.freeze
    URL = %r{\Ahttps?://\S+\z}

    module_function

    def call!(community:, user:, tour_stop_id:, attributes:)
      tour = community.community_tour
      stop = tour && TourStop.find_by(id: tour_stop_id, tour_id: tour.id)
      raise Connect::DomainError.not_found('No such stop on this tour.') unless stop

      record = Locks::Targets.find(community, stop.stop_type, stop.stop_id)
      raise Connect::DomainError.not_found('The stop\'s record no longer exists.') unless record

      fields = FIELDS[stop.stop_type] || {}
      changes = {}
      errors = []
      attributes.to_h.each do |key, value|
        key = key.to_s
        next unless fields.key?(key)

        text = value.nil? ? '' : value.to_s.strip
        errors << { path: key, code: 'too_long', message: "#{key} must be at most #{MAX[key]} characters" } if text.length > MAX[key]
        errors << { path: key, code: 'invalid', message: "#{key} must be an http(s) link" } if %w[video_link virtual_tour_url].include?(key) && text.present? && !URL.match?(text)
        errors << { path: key, code: 'required', message: 'name cannot be blank' } if key == 'name' && text.blank?
        changes[fields[key]] = text.presence
      end
      raise Wayfinding::Invalid.new(errors) if errors.any?
      raise Connect::DomainError.invalid('nothing_to_save', 'Nothing to save.') if changes.empty?

      Wayfinding::VersionBump.suspend do
        ApplicationRecord.transaction do
          record.update_columns(changes.merge(updated_at: Time.current))
          stop.update_columns(name: changes[:name]) if changes.key?(:name) && changes[:name].present?
          PaperTrail::Version.create!(
            item_type: record.class.base_class.name, item_id: record.id, event: 'stop_content_save', whodunnit: user&.id&.to_s,
            community_id: community.id, company_id: community.company_id, object: { tour_stop_id: stop.id, fields: changes.keys }.to_json
          )
        end
      end
      Wayfinding::VersionBump.tour!(tour.id)
      stop
    end
  end
end
