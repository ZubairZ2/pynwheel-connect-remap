class FloorplanImageFilterWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'floorplan_image_filter_worker', retry: 3

  def perform(floorplan_id, amenity_name, amenity_id, image_src)
    FloorPlans::UnitsService.new(floorplan_id).create_floorplan_units_image(image_src, amenity_name, amenity_id)
  end
end