require 'json'; require 'warden/test/helpers'; include Warden::Test::Helpers
Warden.test_mode!; ActionController::Base.allow_forgery_protection = false
login_as(User.find_by!(email: 'salahudin@pynwheel.com'), scope: :user, run_callbacks: false)
$exc = nil
ActiveSupport::Notifications.subscribe('process_action.action_controller') { |*, p| $exc = p[:exception_object]&.then { |e| [e.class.name, e.message[0, 400], e.backtrace.grep(/app\//).first(4)] } if p[:exception] }
s = ActionDispatch::Integration::Session.new(Rails.application); s.host! '127.0.0.1'
def cycle(s, label)
  out = { label: label, elevator_cols: Elevator.column_names.size, tour_stop_cols: TourStop.column_names.size }
  $exc = nil; s.post '/add_elevator/822/1411', params: { floorplate: 1868, building: '' }; body = JSON.parse(s.response.body) rescue {}
  ts = body.dig('path', 'id'); el = body.dig('path', 'stop_id'); out[:add_elevator] = [s.response.status, ts, el, $exc]
  $exc = nil; s.post '/update_elevator', params: { community_id: 1411, elevator_id: el, x_plot: 5, y_plot: 6 }; out[:update_elevator] = [s.response.status, $exc]
  $exc = nil; s.delete "/communities/1411/tours/822/tour_stops/#{ts}"; out[:delete_elevator_stop] = [s.response.status, $exc]
  out[:left] = [Elevator.exists?(el), TourStop.exists?(ts)]
  $exc = nil; s.post '/save_hallways_point', params: { floor_plate_id: 1868, new_point: { x_plot: 10, y_plot: 20, selected: true, next_points: [] }.to_json }
  id = (JSON.parse(s.response.body).map { |r| r['id'] }.max rescue nil); out[:point_save] = [s.response.status, $exc]
  $exc = nil; s.post '/delete_hallways_point', params: { floor_plate_id: 1868, current_id: id }; out[:point_delete] = [s.response.status, $exc]
  # legacy ElevatorsController#destroy path too
  e2 = Elevator.create(name: 'audit-del', community_id: 1411, x_plot: 1, y_plot: 1, floorplate_covering_range: '1-3')
  $exc = nil; s.delete "/communities/1411/elevators/#{e2.id}"; out[:elevators_destroy] = [s.response.status, $exc, Elevator.exists?(e2.id)]
  puts JSON.generate(out)
end
cycle(s, 'OLD schema')
system({ 'DATABASE_URL' => ENV['DATABASE_URL'], 'SCHEMA' => '/dev/null', 'DISABLE_SPRING' => '1', 'OBJC_DISABLE_INITIALIZE_FORK_SAFETY' => 'YES' }, "cd /Users/zubairzulifqar/pynwheel-staging && #{ENV['RB']} -S bundle exec rails db:migrate > /dev/null 2>&1")
cycle(s, 'migrated underneath, stale column cache')
cycle(s, 'second cycle, still stale')
ActiveRecord::Base.descendants.each(&:reset_column_information)
cycle(s, 'after reset_column_information')
