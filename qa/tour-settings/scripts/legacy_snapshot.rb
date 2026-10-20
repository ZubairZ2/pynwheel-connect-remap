# Legacy scheduler snapshot (Test G baseline / after): pure reads of the slot
# engine plus the legacy Tour Settings page and the public widget page, driven
# in-process (Warden test login, no cookie written anywhere).
#   bundle exec rails runner qa/tour-settings/scripts/legacy_snapshot.rb OUT.json LABEL HTML_DIR [ids...]
require 'json'
require 'digest'
require 'warden/test/helpers'
include Warden::Test::Helpers

OUT = ARGV[0]; LABEL = ARGV[1]; HTML_DIR = ARGV[2]; IDS = (ARGV[3..] || []).map(&:to_i)
IDS.replace([1618, 818, 8005]) if IDS.empty?
FileUtils.mkdir_p(HTML_DIR)
Warden.test_mode!
ActionController::Base.allow_forgery_protection = false
user = User.find_by!(email: 'salahudin@pynwheel.com')
login_as(user, scope: :user, run_callbacks: false)
S = ActionDispatch::Integration::Session.new(Rails.application)
S.host! '127.0.0.1'
def sha(s) = Digest::SHA256.hexdigest(s.to_s)[0, 16]
def norm(html) = html.gsub(/name="authenticity_token" value="[^"]*"/, 'TOKEN').gsub(/csrf-token" content="[^"]*"/, 'TOKEN').gsub(/sched_tour_id"[^>]*value="\d+"/, 'SCHED').gsub(/schedual_tour_id = \d+/, 'SCHED')

res = { label: LABEL, code: `git rev-parse --short HEAD`.strip, db: ActiveRecord::Base.connection.current_database,
        schema: ActiveRecord::Base.connection.select_value('select max(version) from schema_migrations'), at: Time.now.utc.iso8601,
        counts: { schedual_tours: SchedualTour.count, tour_users: TourUser.count, opening_hours: OpeningHour.count, guided_opening_hours: GuidedOpeningHour.count, tour_settings: TourSetting.count },
        properties: {} }
IDS.each do |id|
  c = Community.find_by(id: id)
  next res[:properties][id] = { missing: true } unless c
  tour = c.community_tour; setting = tour&.tour_setting
  stepping = SchedualTours::Capacity.interval_minutes(c)
  slots = c.collect_time_slots(stepping) rescue { error: $!.message }
  monday = Date.today.next_occurring(:monday)
  avail = Bookings::Availability.new(c)
  week = (0...7).map { |o| avail.day(monday + o) } rescue { error: $!.message }
  types = %w[Monday Saturday Sunday].to_h { |d| [d, %w[09:00\ am 12:00\ pm 04:00\ pm 06:00\ pm].to_h { |t| [t, (c.fetch_tour_type_according_to_time(d, t) rescue $!.message)] }] }
  row = { name: c.name, tz: c.get_time_zone, scheduler_widget: c.scheduler_widget, tour_id: tour&.id,
          setting: setting&.attributes&.slice('allow_self_tour', 'allow_guided_tour', 'allow_virtual_tour', 'time_intervel', 'do_limit_max_tour', 'limit_max_tour', 'length_stay_limit', 'show_desired_bedroom', 'show_desired_move_in_date', 'charge_user_for_id_verfication'),
          tour: tour&.attributes&.slice('only_scheduled_tour', 'grace_period', 'credit_card_required', 'marketing_source_required', 'visual_id_verification', 'max_self_tour_users', 'max_guided_tour_users'),
          hours_self: c.opening_hours.order(:day, :opening_time).pluck(:day, :opening_time, :closing_time), hours_guided: c.guided_opening_hours.order(:day, :opening_time).pluck(:day, :opening_time, :closing_time),
          button: tour&.scheduler_widget_setting&.attributes&.except('id', 'created_at', 'updated_at'),
          disable_days: (c.collect_disable_days rescue $!.message), slots_sha: sha(slots.to_json), slots_count: slots.is_a?(Hash) ? slots.transform_values { |v| v.size } : slots,
          availability_week_sha: sha(week.to_json), availability_week: week, types_at: types,
          bookings: c.schedual_tours.where.not(tour_user_id: nil).count, bookings_sha: sha(c.schedual_tours.where.not(tour_user_id: nil).order(:id).pluck(:id, :tour_date, :tour_time, :tour_type, :tour_user_id, :created_by).to_json) }
  # legacy settings page
  S.get "/communities/#{id}/tours/settings"
  body = S.response.body
  File.write("#{HTML_DIR}/#{LABEL}_settings_#{id}.html", body)
  row[:settings_page] = { status: S.response.status, sha: sha(norm(body)), bytes: body.bytesize,
                          checked: { only_scheduled: body.scan(/only_scheduled_tour/).size, grace: body[/grace_time[^>]*value="(\d+)"/, 1], increments: body.scan(/time_intervel_(15|30|1|2)"[^>]*checked/).flatten } }
  # public widget (direct link)
  S.get c.schedule_tour_url.sub(ENV['HOST_URL'].to_s, '')
  body = S.response.body
  File.write("#{HTML_DIR}/#{LABEL}_widget_#{id}.html", body)
  ts = body[/time_slot_hash[^>]*value="([^"]*)"/, 1] || body[/var time_slots = (.*?);\s*$/, 1]
  row[:widget_page] = { status: S.response.status, sha: sha(norm(body)), bytes: body.bytesize, time_slots_sha: sha(ts.to_s), fields: { bedroom: body.include?('desired_bedroom'), move_in: body.include?('desired_move_in_date'), card: body.include?('card_number') || body.include?('cardNumber'), scheduler_error: body.include?('scheduler_error') } }
  res[:properties][id] = row
  $stderr.puts "#{id} #{c.name}: settings #{row[:settings_page][:status]} widget #{row[:widget_page][:status]} slots #{row[:slots_count]}"
end
File.write(OUT, JSON.pretty_generate(res))
puts OUT
