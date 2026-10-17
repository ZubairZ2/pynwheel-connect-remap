require 'test_helper'

# The Connect Locks endpoints on the wayfinding fixture property, with an
# igloohome account and two devices created in the test transaction.
class Connect::LocksControllerTest < ActionDispatch::IntegrationTest
  setup do
    @community = communities(:tour_property)
    @community.update_columns(multiple_locks_provider: ['Igloohome'], enable_locks: true)
    @account = Igloohome.create!(community: @community, username: 'u', password: 'p', version: 'v1')
    @device_a = @account.igloohome_locks.create!(device_name: '101', device_id: 'IGP-A')
    @device_b = @account.igloohome_locks.create!(device_name: 'Gym', device_id: 'IGP-B')
    @unit = units(:plotted_unit)
    @gym = amenities(:gym)
    @door = doors(:unit_door)
  end

  def body
    JSON.parse(response.body)
  end

  def base
    "/communities/#{@community.id}/connect/locks"
  end

  test 'the inventory is refused anonymously and for another company' do
    get "#{base}.json"
    assert_response :unauthorized
    sign_in users(:other_company_admin)
    get "#{base}.json"
    assert_response :not_found
  end

  test 'the inventory lists providers, devices, targets and counts from the rows' do
    sign_in users(:community_assistant)
    get "#{base}.json"
    assert_response :success
    data = body['data']
    assert data['enabled']
    igloo = data['providers'].find { |p| p['vendor'] == 'Igloohome' }
    assert_equal 2, igloo['lock_count']
    assert_equal 0, igloo['mapped_count']
    assert_equal 'v1', igloo['mode']
    assert_equal false, igloo['supports']['sync']
    assert_equal 2, data['locks'].size
    assert_equal({ 'all' => 2, 'unmapped' => 2, 'mapped' => 0, 'manual' => 0, 'health' => 0, 'without_lock' => 0 }, data['counts'])
    unit_target = data['targets'].find { |t| t['target']['type'] == 'Unit' && t['target']['id'] == @unit.id }
    assert_equal 'Door', unit_target['holder']['type'], 'a unit with a door holds its lock on the door'
    assert_equal false, body['meta']['can_edit']
    assert_nil data['locks'].first['target']
  end

  test 'map and unmap go through the door rule and the legacy helper' do
    sign_in users(:community_manager)
    put "#{base}/map.json", as: :json, params: { vendor: 'Igloohome', device_id: 'IGP-A', target_type: 'unit', target_id: @unit.id }
    assert_response :success
    @device_a.reload
    assert_equal ['Door', @door.id], [@device_a.stop_type, @device_a.stop_id]
    assert_equal ['Igloohome', 'IGP-A'], [@door.reload.lock_provider, @door.access_code]
    assert_equal 'Igloohome', @unit.reload.lock_provider
    lock = body['data']['locks'].find { |l| l['device_id'] == 'IGP-A' }
    assert lock['mapped']
    assert_equal 'Door', lock['target']['type']
    assert_equal @unit.id, lock['target']['parent']['id']
    assert_equal 1, body['data']['counts']['mapped']

    # Mapping the same device elsewhere takes it from the door.
    put "#{base}/map.json", as: :json, params: { vendor: 'Igloohome', device_id: 'IGP-A', target_type: 'amenity', target_id: @gym.id }
    assert_response :success
    assert_equal ['Amenity', @gym.id], [@device_a.reload.stop_type, @device_a.stop_id]
    assert_equal '', @door.reload.lock_provider
    assert_equal 'Igloohome', @gym.reload.lock_provider

    put "#{base}/unmap.json", as: :json, params: { vendor: 'Igloohome', device_id: 'IGP-A' }
    assert_response :success
    assert_nil @device_a.reload.stop_id
    assert_equal '', @gym.reload.lock_provider
    assert_equal 0, body['data']['counts']['mapped']
  end

  test 'a manual code sets the holder and clearing it removes the lock' do
    sign_in users(:community_admin)
    put "#{base}/manual_code.json", as: :json, params: { target_type: 'amenity', target_id: @gym.id, code: '24#68*' }
    assert_response :success
    assert_equal ['Manual', '24#68*'], [@gym.reload.lock_provider, @gym.access_code]
    manual = body['data']['manual_codes'].first
    assert_equal @gym.id, manual['target']['id']
    assert_equal '24#68*', manual['code'], 'an editor sees the code'
    assert_equal 1, body['data']['counts']['manual']

    put "#{base}/manual_code.json", as: :json, params: { target_type: 'amenity', target_id: @gym.id, code: 'abc' }
    assert_response :unprocessable_entity
    assert_equal 'invalid_code', body['errors'].first['code']

    put "#{base}/manual_code.json", as: :json, params: { target_type: 'amenity', target_id: @gym.id, code: '' }
    assert_response :success
    assert_equal ['', ''], [@gym.reload.lock_provider, @gym.access_code]
  end

  test 'a holder naming a provider without a device is listed as locked without a lock' do
    @gym.update_columns(lock_provider: 'Igloohome')
    sign_in users(:community_admin)
    get "#{base}.json"
    row = body['data']['locked_without_lock'].first
    assert_equal @gym.id, row['target']['id']
    assert_equal 'no_device', row['reason']
    assert_equal 1, body['data']['counts']['without_lock']
  end

  test 'auto-match proposes the legacy name matches and applies only the chosen ones' do
    sign_in users(:community_admin)
    get "#{base}/auto_match.json"
    assert_response :success
    proposals = body['data']['proposals']
    assert_equal 2, proposals.size
    a = proposals.find { |p| p['device_id'] == 'IGP-A' }
    assert_equal ['Unit', @unit.id], [a['target']['type'], a['target']['id']]
    b = proposals.find { |p| p['device_id'] == 'IGP-B' }
    assert_equal ['Amenity', @gym.id], [b['target']['type'], b['target']['id']]

    post "#{base}/auto_match.json", as: :json, params: { pairs: [{ vendor: 'Igloohome', device_id: 'IGP-B', target_type: 'amenity', target_id: @gym.id }] }
    assert_response :success
    assert_equal ['Amenity', @gym.id], [@device_b.reload.stop_type, @device_b.stop_id]
    assert_nil @device_a.reload.stop_id, 'the unpicked proposal is untouched'
    assert_equal 1, body['data']['applied'].size
  end

  test 'writes are refused for read-only roles, foreign properties, unknown devices and when writes are off' do
    put "#{base}/map.json", as: :json, params: { vendor: 'Igloohome', device_id: 'IGP-A', target_type: 'unit', target_id: @unit.id }
    assert_response :unauthorized
    sign_in users(:community_assistant)
    put "#{base}/map.json", as: :json, params: { vendor: 'Igloohome', device_id: 'IGP-A', target_type: 'unit', target_id: @unit.id }
    assert_response :forbidden
    sign_in users(:other_company_admin)
    put "#{base}/map.json", as: :json, params: { vendor: 'Igloohome', device_id: 'IGP-A', target_type: 'unit', target_id: @unit.id }
    assert_response :forbidden
    sign_in users(:super_admin)
    put "#{base}/map.json", as: :json, params: { vendor: 'Igloohome', device_id: 'nope', target_type: 'unit', target_id: @unit.id }
    assert_response :not_found
    put "#{base}/map.json", as: :json, params: { vendor: 'Igloohome', device_id: 'IGP-A', target_type: 'unit', target_id: units(:no_tour_unit).id }
    assert_response :not_found, 'another property\'s unit is not a target'
    assert_nil @device_a.reload.stop_id
    ENV['PYN_CONNECT_WRITES'] = 'off'
    put "#{base}/map.json", as: :json, params: { vendor: 'Igloohome', device_id: 'IGP-A', target_type: 'unit', target_id: @unit.id }
    assert_response :not_found
    assert_equal 'disabled', body['errors'].first['code']
  ensure
    ENV.delete('PYN_CONNECT_WRITES')
  end

  test 'purge deletes the vendor rows and clears the stops they were on' do
    sign_in users(:super_admin)
    put "#{base}/map.json", as: :json, params: { vendor: 'Igloohome', device_id: 'IGP-B', target_type: 'amenity', target_id: @gym.id }
    assert_equal 'Igloohome', @gym.reload.lock_provider
    delete "#{base}/purge.json", as: :json, params: { vendor: 'Igloohome' }
    assert_response :success
    assert_equal 2, body['data']['purged']['count']
    assert_equal 0, IgloohomeLock.where(igloohome_id: @account.id).count
    assert_equal '', @gym.reload.lock_provider
  end

  test 'sync and test refuse a v1 igloohome account honestly' do
    sign_in users(:super_admin)
    post "#{base}/sync.json", as: :json, params: { vendor: 'Igloohome' }
    assert_response :unprocessable_entity
    assert_equal 'no_api', body['errors'].first['code']
    post "#{base}/test.json", as: :json, params: { vendor: 'Latch' }
    assert_response :unprocessable_entity
    assert_equal 'no_account', body['errors'].first['code']
  end

  test 'the enabled switch writes communities.enable_locks' do
    sign_in users(:super_admin)
    put "#{base}/enabled.json", as: :json, params: { enabled: false }
    assert_response :success
    assert_equal false, @community.reload.enable_locks
    assert_equal false, body['data']['enabled']
  end
end
