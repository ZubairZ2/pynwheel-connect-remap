module FloorPlans
  class BaseService
    attr_reader :floorplan_id

    def initialize(floorplan_id)
      @floorplan = floorplan(floorplan_id)
      @community = community()
      @floorplan_units = floorplan_units()
    end

    private

    def floorplan(floorplan_id)
      return nil unless floorplan_id.present? 
      Floorplan.find floorplan_id
    end

    def community()
      return nil unless  @floorplan.community_id.present? 
      Community.find @floorplan.community_id
    end

    def floorplan_units
      return unless @floorplan.provider_floorplan_id.present?
      Unit.where('floorplan_id = ? AND community_id = ?', @floorplan.provider_floorplan_id, @community.id)
    end
  end
end