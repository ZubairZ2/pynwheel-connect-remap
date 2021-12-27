class FloorplanUnitsService < BaseService
  def initialize(community)
    @community = community
  end

  def get_floorplans
    units = @community.units.where(available: true)
    floorplans = []
    units.each do |u|
      floorplans << u.floorplan
    end
    floorplans.compact
  end

  def get_floorplan_units(floorplan_id)
    floorplan = Floorplan.find_by_id(floorplan_id)
    Unit.where('floorplan_id = ? AND community_id = ? AND available = ?', floorplan.provider_floorplan_id,@community.id,true) if floorplan.present?
    # @units.each do |u|
    #   if u.community.is_sitemap?
    #     u.sitemap_image_url = u.community.sitemap.image.url(:svg_for_metro).present? ? u.community.sitemap.
    #       image.url(:svg_for_metro) : u.community.sitemap.image.url rescue ""
    #     @sitemap_image_url = u.sitemap_image_url

    #   else
    #     floorplate = Floorplate.find_by_id(u.floorplate_id)
    #     floorplate_image = floorplate.image.url if floorplate.present?
    #     u.sitemap_image_url = floorplate_image
    #     @sitemap_image_url = floorplate_image
    #   end
    #   u.availability_url = u.availability_url.present? ? u.availability_url : (u.floorplan.availability_url.present? ? u.floorplan.availability_url : nil)
    # end
    # success = true
    # message = 'success'
    # floorplate_image = (@units.first.floorplate.present? ? @units.floorplate.image_url : "No Floorplate Image" rescue "")
  end

end