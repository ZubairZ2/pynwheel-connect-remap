module FloorPlans
  class UnitsService < FloorPlans::BaseService

    def update_floorplan_units_description
      return unless @floorplan.present? && @community.present?
      floorplan_units = floorplan_units()
      floorplan_units.update_all(description: @floorplan.description)
    end

    private

      def floorplan_units
        return unless @floorplan.provider_floorplan_id.present?
        Unit.where('floorplan_id = ? AND community_id = ?', @floorplan.provider_floorplan_id, @community.id)
      end
  end
end