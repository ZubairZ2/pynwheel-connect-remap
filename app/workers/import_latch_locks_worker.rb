class ImportLatchLocksWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'latch_lock', retry: 1

  def perform(community_id)
    LatchOpenkit::LatchLocksService.new(nil, community_id).import_property_latch_locks_data()
  end
end