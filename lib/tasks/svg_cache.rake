namespace :svg_cache do
  desc "Enqueue SVG cache warming for all active_client communities with enable_svg_mode. Run via Heroku Scheduler every 20 min."
  task warm_all: :environment do
    # community_ids = Community
    #   .active_client_properties
    #   .where(enable_svg_mode: true)
    #   .pluck(:id)

    # puts "[svg_cache:warm_all] Enqueueing #{community_ids.size} communities on critical queue..."

    # community_ids.each { |id| SvgCacheWarmingWorker.perform_async(id) }

    # puts "[svg_cache:warm_all] Done — #{community_ids.size} jobs enqueued."
  end

  desc "Synchronously warm SVG caches for a single community. Usage: rake 'svg_cache:warm_community[<id>]'"
  task :warm_community, [:community_id] => :environment do |_, args|
    # community_id = args[:community_id].to_i
    # abort "Usage: rake 'svg_cache:warm_community[<community_id>]'" if community_id.zero?

    # puts "[svg_cache:warm_community] Warming community #{community_id} synchronously..."
    # SvgCacheWarmingWorker.new.perform(community_id)
    # puts "[svg_cache:warm_community] Done."
  end
end
