# app/workers/upload_image_for_unit_worker.rb
class UploadImageForUnitWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'upload_image', retry: 3

  def perform(community_id, unit_ids, image)
    community = Community.find_by(id: community_id)
    return unless community

    units = community.units.where(id: unit_ids)

    units.each do |unit|
      unit.update(image: image, manually_updated: true)
    end
  end
end
