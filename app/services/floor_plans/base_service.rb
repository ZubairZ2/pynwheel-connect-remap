module FloorPlans
  class BaseService
    attr_reader :floorplan_id

    def initialize(floorplan_id)
      @floorplan = floorplan(floorplan_id)
      @community = community()
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
  end
end