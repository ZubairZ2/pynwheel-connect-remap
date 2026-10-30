require 'json'; require 'warden/test/helpers'; include Warden::Test::Helpers
Warden.test_mode!; ActionController::Base.allow_forgery_protection = false
login_as(User.find_by!(email: 'salahudin@pynwheel.com'), scope: :user, run_callbacks: false)
s = ActionDispatch::Integration::Session.new(Rails.application); s.host! '127.0.0.1'
def phase(s, label)
  out = { label: label, hallway_columns_cached: Hallway.column_names.size }
  s.get '/automate_plotting?community_id=1411'; out[:map] = s.response.status
  s.get '/automate_plotting/shortest_path?community_id=1411&path_type=sorting', headers: { 'Accept' => '*/*' }; out[:shortest] = [s.response.status, JSON.parse(s.response.body)['path_object'].to_s.size]
  s.get '/communities/1411/tours'; out[:tour_setup] = s.response.status
  s.get '/communities/1411/floorplates/1868/plotexp'; out[:plotexp] = s.response.status
  s.post '/save_hallways_point', params: { floor_plate_id: 1868, new_point: { x_plot: 10, y_plot: 20, selected: true, next_points: [] }.to_json }
  rows = JSON.parse(s.response.body); id = rows.map { |r| r['id'] }.max
  out[:point_save] = [s.response.status, rows.size, rows.last.keys.size]
  s.post '/update_hallways_point', params: { floor_plate_id: 1868, current_id: id, x_plot: 11, y_plot: 21 }; out[:update] = s.response.status
  s.post '/delete_hallways_point', params: { floor_plate_id: 1868, current_id: id }; out[:delete] = s.response.status
  s.post '/add_elevator/822/1411', params: { floorplate: 1868, building: '' }; ts = (JSON.parse(s.response.body).dig('path', 'id') rescue nil); out[:add_elevator] = s.response.status
  s.delete "/communities/1411/tours/822/tour_stops/#{ts}"; out[:delete_elevator_stop] = s.response.status
  s.post '/communities/1411/tours/display_stop', params: { stop_id: Tour.find(822).tour_stops.first.id }; out[:display_stop] = s.response.status
  s.post '/communities/1411/tours/display_stop', params: { stop_id: Tour.find(822).tour_stops.first.id }
  u = Unit.where(community_id: 1411).first; s.patch "/communities/1411/units/#{u.id}", params: { unit: { marketing_name: u.marketing_name } }; out[:unit_update] = s.response.status
  out[:db_schema] = ActiveRecord::Base.connection.select_value('select max(version) from schema_migrations')
  puts JSON.generate(out)
end
phase(s, 'legacy process on OLD schema')
env = { 'DATABASE_URL' => ENV['DATABASE_URL'], 'SCHEMA' => '/dev/null', 'DISABLE_SPRING' => '1', 'OBJC_DISABLE_INITIALIZE_FORK_SAFETY' => 'YES' }
ok = system(env, "cd /Users/zubairzulifqar/pynwheel-staging && #{ENV['RB']} -S bundle exec rails db:migrate > /dev/null 2>&1")
puts JSON.generate(migrated_underneath: ok)
phase(s, 'SAME legacy process, schema migrated underneath (no restart)')
Hallway.reset_column_information; Elevator.reset_column_information; TourStop.reset_column_information; Tour.reset_column_information; Floorplate.reset_column_information
phase(s, 'same process after reset_column_information (= what a restart sees)')
