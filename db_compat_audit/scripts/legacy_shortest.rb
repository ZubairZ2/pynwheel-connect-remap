# Legacy code: shortest_path JSON for one community, both path types; prints sha/len. ARGV[0]=community id, ARGV[1]=label
require 'json'; require 'digest'; require 'warden/test/helpers'; include Warden::Test::Helpers
Warden.test_mode!; ActionController::Base.allow_forgery_protection = false
login_as(User.find_by!(email: 'salahudin@pynwheel.com'), scope: :user, run_callbacks: false)
s = ActionDispatch::Integration::Session.new(Rails.application); s.host! '127.0.0.1'
cid = ARGV[0].to_i
out = { label: ARGV[1], community: cid }
['sorting', 'actual shortest'].each do |pt|
  s.get "/automate_plotting/shortest_path?community_id=#{cid}&path_type=#{CGI.escape(pt)}", headers: { 'Accept' => '*/*' }
  j = JSON.parse(s.response.body); po = j['path_object'].to_s
  out[pt] = { status: s.response.status, sha: Digest::SHA256.hexdigest(po)[0, 16], len: po.size }
end
s.get "/automate_plotting?community_id=#{cid}"
m = s.response.body[/name="hallways"[^>]*value="(.*?)"/m, 1]
out[:map_hallway_ids] = JSON.parse(CGI.unescapeHTML(m)).to_json.scan(/"id":(\d+)/).flatten.map(&:to_i).uniq.size if m
puts JSON.generate(out)
