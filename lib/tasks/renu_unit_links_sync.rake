# Console-free way to run (or preview) the RENU link sync for one company.
#
#   rake renu:sync_unit_links[42]            # enqueue on Sidekiq
#   rake renu:sync_unit_links[42,now]        # run inline, print the summary
#   rake renu:sync_unit_links[42,dry_run]    # run inline, write nothing
namespace :renu do
  desc "Sync Boom/Rently unit links from the RENU data feed for a company (args: company_id[,now|dry_run])"
  task :sync_unit_links, [:company_id, :mode] => :environment do |_task, args|
    company_id = args[:company_id].presence or abort("company_id is required — rake renu:sync_unit_links[42]")
    mode = args[:mode].to_s

    case mode
    when "now", "dry_run"
      stats = RenuUnitLinksSyncService.new(company_id, dry_run: mode == "dry_run").perform
      puts stats.map { |key, value| "#{key}=#{value}" }.join(" ")
    else
      puts "enqueued RenuUnitLinksSyncWorker for company #{company_id}: #{RenuUnitLinksSyncWorker.perform_async(company_id)}"
    end
  end
end
