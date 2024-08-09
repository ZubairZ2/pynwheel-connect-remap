# lib/tasks/hide_wait_units.rake
namespace :units do
  desc "Auto-hide units that start with 'WAIT_' (case-insensitive)"
  task hide_wait_units: :environment do
    # Fetch all units where the name starts with 'WAIT_' case-insensitively
    Unit.where('LOWER(marketing_name) LIKE ?', '%wait%').update_all(visible: false)
  end
end