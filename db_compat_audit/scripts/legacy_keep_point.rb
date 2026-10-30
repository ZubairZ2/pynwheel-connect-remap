# Legacy code: create ONE committed hallway point on 1411's busiest plate through the real action, keep it.
require 'json'; require 'warden/test/helpers'; include Warden::Test::Helpers
Warden.test_mode!; ActionController::Base.allow_forgery_protection = false
login_as(User.find_by!(email: 'salahudin@pynwheel.com'), scope: :user, run_callbacks: false)
s = ActionDispatch::Integration::Session.new(Rails.application); s.host! '127.0.0.1'
c = Community.find(1411)
level = c.floorplates.joins(:hallways).group('floorplates.id').order(Arel.sql('count(hallways.id) desc')).first
prev = level.hallways.order(:id).where(selected: true).first || level.hallways.order(:id).last
s.post '/save_hallways_point', params: { floor_plate_id: level.id, new_point: { x_plot: 777, y_plot: 333, selected: true, next_points: [] }.to_json, previous_point: { id: prev.id }.to_json }
rows = JSON.parse(s.response.body); new_id = rows.map { |r| r['id'] }.max
row = ActiveRecord::Base.connection.select_one("select id, parent_id, x_plot, y_plot, community_id, source, review_status, space from hallways where id=#{new_id}")
puts JSON.generate(status: s.response.status, level_id: level.id, prev_id: prev.id, new_id: new_id, row: row, prev_next_points: Hallway.find(prev.id).next_points)
