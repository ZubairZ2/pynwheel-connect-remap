namespace :units do
  desc "Auto-hide units)"
  task hide_wait_units: :environment do
    Unit.where('LOWER(marketing_name) LIKE ?', "%#{HIDE_UNIT_PATTERN}%").update_all(visible: false)
  end
end