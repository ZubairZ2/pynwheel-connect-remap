require 'test_helper'

# The Connect Locks account endpoints (Locks::Accounts): the legacy Locks
# page's per-vendor account forms, instructions, images and the igloohome v1
# lock entry, on the same rows the legacy CMS and both mobile APIs read.
class Connect::LockAccountsTest < ActionDispatch::IntegrationTest
  PNG = "data:image/png;base64,#{Base64.strict_encode64("\x89PNG\r\n\x1a\n" + ('0' * 64))}".freeze

  UPLOAD_ROOT = Rails.root.join('tmp', 'test_uploads').to_s

  # AvatarUploader stores on S3 outside development; the test keeps the
  # base64 uploads on disk under tmp/ and skips the RMagick versions.
  setup do
    @community = communities(:tour_property)
    @community.update_columns(multiple_locks_provider: [], enable_locks: true)
    @previous_storage = AvatarUploader.storage
    @previous_processing = AvatarUploader.enable_processing
    @previous_root = AvatarUploader.root
    AvatarUploader.storage :file
    AvatarUploader.enable_processing = false
    AvatarUploader.root = UPLOAD_ROOT
    sign_in users(:super_admin)
  end

  teardown do
    AvatarUploader.storage @previous_storage
    AvatarUploader.enable_processing = @previous_processing
    AvatarUploader.root = @previous_root
    FileUtils.rm_rf(UPLOAD_ROOT)
  end

  def body
    JSON.parse(response.body)
  end

  def base
    "/communities/#{@community.id}/connect/locks"
  end

  def provider(vendor)
    body['data']['providers'].find { |p| p['vendor'] == vendor }
  end

  test 'the card formats offered are the legacy helper list, verbatim' do
    assert_equal Object.new.extend(ApplicationHelper).cards_formats, Locks::Accounts::CARD_FORMATS
  end

  test 'a zerv account is created with the legacy fields and its ranges, then updated without losing the password' do
    put "#{base}/account.json", as: :json, params: { vendor: 'Zerv', fields: { username: 'ops', password: 'pw', facility_id: '12', badge_id: '70000', card_format: 'HID Prox 26-bit H10301' } }
    assert_response :unprocessable_entity
    fields = body['errors'].first['fields']
    assert_equal ['badge_id'], fields.map { |f| f['field'] }
    assert_nil @community.reload.zerv

    put "#{base}/account.json", as: :json, params: { vendor: 'Zerv', fields: { username: 'ops', password: 'pw', facility_id: '12', badge_id: '4321', card_format: 'Not a format' } }
    assert_response :unprocessable_entity
    assert_equal 'card_format', body['errors'].first['fields'].first['field']

    put "#{base}/account.json", as: :json, params: { vendor: 'Zerv', fields: { username: 'ops', password: 'pw', facility_id: '12', badge_id: '4321', card_format: 'HID Prox 48-bit' } }
    assert_response :success
    zerv = @community.reload.zerv
    assert_equal %w[ops pw 12 4321], [zerv.username, zerv.password, zerv.facility_id, zerv.badge_id]
    assert_equal 'HID Prox 48-bit', zerv.card_format
    assert_includes @community.multiple_locks_provider, 'Zerv'
    assert body['data']['account']['created']
    card = provider('Zerv')
    assert card['configured']
    assert_equal 'ops', card['details']['username']
    assert card['details']['password_present']
    assert_nil card['details']['password'], 'the password never travels'
    assert_equal Locks::Accounts::CARD_FORMATS, card['options']['card_formats']

    # A blank password keeps the stored one; the other fields change.
    put "#{base}/account.json", as: :json, params: { vendor: 'Zerv', fields: { username: 'ops2', password: '', facility_id: '255', badge_id: '', card_format: '' } }
    assert_response :success
    zerv.reload
    assert_equal %w[ops2 pw 255], [zerv.username, zerv.password, zerv.facility_id]
    assert_equal ['', ''], [zerv.badge_id, zerv.card_format]
    assert_equal 1, Zerv.where(community_id: @community.id).count, 'one account per property'
  end

  test 'a dwelo account needs the community id and client credentials, keeps the api url default and the secret on update' do
    put "#{base}/account.json", as: :json, params: { vendor: 'Dwelo', fields: { client_id: 'cid', client_secret: '', default_community_id: '' } }
    assert_response :unprocessable_entity
    assert_equal %w[default_community_id client_secret], body['errors'].first['fields'].map { |f| f['field'] }

    put "#{base}/account.json", as: :json, params: { vendor: 'Dwelo', fields: { client_id: 'cid', client_secret: 'sec', default_community_id: '77', api_url: '' } }
    assert_response :success
    dwelo = @community.reload.dwelo
    assert_equal ['cid', 'sec', '77', 'https://api.dwelo.com'], [dwelo.client_id, dwelo.client_secret, dwelo.default_community_id, dwelo.api_url]
    assert_includes @community.multiple_locks_provider, 'Dwelo'

    put "#{base}/account.json", as: :json, params: { vendor: 'Dwelo', fields: { client_id: 'cid', client_secret: '', default_community_id: '78', api_url: 'ftp://nope' } }
    assert_response :unprocessable_entity
    assert_equal 'api_url', body['errors'].first['fields'].first['field']
    put "#{base}/account.json", as: :json, params: { vendor: 'Dwelo', fields: { client_id: 'cid', client_secret: '', default_community_id: '78', api_url: 'https://api.example.com/' } }
    assert_response :success
    dwelo.reload
    assert_equal ['sec', '78', 'https://api.example.com'], [dwelo.client_secret, dwelo.default_community_id, dwelo.api_url]
  end

  test 'edgestate client credentials end a code-grant authorization, and the authorization can be removed' do
    EdgeState.create!(community: @community, refresh_token: 'rt', is_authorized_with_pynwheel: true)
    get "#{base}.json"
    details = provider('EdgeState')['details']
    assert_equal ['code_grant', true, true], [details['auth_mode'], details['authorized'], details['authorized_with_pynwheel']]
    assert provider('EdgeState')['supports']['remove_authorization']

    put "#{base}/account.json", as: :json, params: { vendor: 'EdgeState', fields: { client_id: 'cid', client_secret: 'sec' } }
    assert_response :success
    edge = @community.reload.edge_state
    assert_equal ['cid', 'sec', false], [edge.client_id, edge.client_secret, edge.is_authorized_with_pynwheel]
    assert_includes @community.multiple_locks_provider, 'EdgeState'

    put "#{base}/account/remove_authorization.json", as: :json, params: { vendor: 'EdgeState' }
    assert_response :success
    assert_nil edge.reload.refresh_token
    put "#{base}/account/remove_authorization.json", as: :json, params: { vendor: 'EdgeState' }
    assert_response :unprocessable_entity
    assert_equal 'not_authorized', body['errors'].first['code']
    put "#{base}/account/remove_authorization.json", as: :json, params: { vendor: 'Zerv' }
    assert_response :unprocessable_entity
  end

  test 'a latch account is the building name, with the legacy default instructions and images' do
    put "#{base}/account.json", as: :json, params: { vendor: 'Latch', fields: { latch_property_name: '' } }
    assert_response :unprocessable_entity
    put "#{base}/account.json", as: :json, params: { vendor: 'Latch', fields: { latch_property_name: 'Hazel Tower' } }
    assert_response :success
    latch = @community.reload.latch
    assert_equal 'Hazel Tower', latch.latch_property_name
    assert_equal UNIT_LATCH_LOCK_INSTRUCTION_TEXT, latch.lock_instruction_text
    assert_equal AMENITY_LATCH_LOCK_INSTRUCTION_TEXT, latch.amenity_lock_instruction_text
    assert latch.read_attribute(:lock_image).present?, 'the bundled unit image stands in'
    assert latch.read_attribute(:amenity_lock_image).present?
    card = provider('Latch')
    assert card['configured'], 'the building name is what the legacy Latch tab needs'
    assert card['supports']['test']
    assert_equal 'Hazel Tower', card['details']['latch_property_name']
    assert_includes @community.multiple_locks_provider, 'Latch'
  end

  test 'an igloohome account picks its version and the fields of that mode' do
    put "#{base}/account.json", as: :json, params: { vendor: 'Igloohome', fields: { version: 'v2' } }
    assert_response :unprocessable_entity
    assert_equal 'version', body['errors'].first['fields'].first['field']

    put "#{base}/account.json", as: :json, params: { vendor: 'Igloohome', fields: { version: 'igloohome', auth_mode: 'client_credentials', home_name: 'pynwheel home', client_id: 'cid', client_secret: '' } }
    assert_response :unprocessable_entity
    assert_equal 'client_secret', body['errors'].first['fields'].first['field']

    put "#{base}/account.json", as: :json, params: { vendor: 'Igloohome', fields: { version: 'igloohome', auth_mode: 'client_credentials', home_name: 'pynwheel home', client_id: 'cid', client_secret: 'sec' } }
    assert_response :success
    igloo = @community.reload.igloohome
    assert_equal ['igloohome', 'pynwheel home', 'cid', 'sec', false], [igloo.version, igloo.home_name, igloo.client_id, igloo.client_secret, igloo.is_authorized_with_pynwheel]
    assert_equal %w[Username Password], [igloo.username, igloo.password], 'the legacy placeholders'
    card = provider('Igloohome')
    assert_equal ['igloohome', 'hourly_pin', true], [card['mode'], card['access']['method'], card['access']['tour_app']]
    assert card['configured']
    assert card['supports']['sync']
    assert_equal false, card['supports']['add_device']
    assert card['details']['client_secret_present']
    assert_equal %w[v1 igloohome iglooworks], card['options']['versions']

    put "#{base}/account.json", as: :json, params: { vendor: 'Igloohome', fields: { version: 'iglooworks', iglooworks_api_key: '', iglooworks_department_id: 'dept-1' } }
    assert_response :unprocessable_entity
    assert_equal 'iglooworks_api_key', body['errors'].first['fields'].first['field']
    put "#{base}/account.json", as: :json, params: { vendor: 'Igloohome', fields: { version: 'iglooworks', iglooworks_api_key: 'key', iglooworks_department_id: 'dept-1' } }
    assert_response :success
    igloo.reload
    assert_equal ['iglooworks', 'key', 'dept-1', 'cid'], [igloo.version, igloo.iglooworks_api_key, igloo.iglooworks_department_id, igloo.client_id], 'the other mode\'s fields stay'
    assert_equal 'iglooworks', provider('Igloohome')['mode']

    put "#{base}/account.json", as: :json, params: { vendor: 'Igloohome', fields: { version: 'v1' } }
    assert_response :success
    assert_equal 'v1', igloo.reload.version
    card = provider('Igloohome')
    assert_equal ['bluetooth_key', true, true], [card['access']['method'], card['supports']['add_device'], card['supports']['csv']]
    assert_equal false, card['supports']['sync']
    assert_includes @community.multiple_locks_provider, 'Igloohome'
  end

  test 'a v1 account can carry an optional developer client, both values or neither, and clear it' do
    put "#{base}/account.json", as: :json, params: { vendor: 'Igloohome', fields: { version: 'v1' } }
    assert_response :success
    assert_equal 'partner_key', provider('Igloohome')['access']['source']

    put "#{base}/account.json", as: :json, params: { vendor: 'Igloohome', fields: { version: 'v1', client_id: 'dev-cid', client_secret: '' } }
    assert_response :unprocessable_entity
    assert_equal 'client_secret', body['errors'].first['fields'].first['field']
    put "#{base}/account.json", as: :json, params: { vendor: 'Igloohome', fields: { version: 'v1', client_id: '', client_secret: 'dev-sec' } }
    assert_response :unprocessable_entity
    assert_equal 'client_id', body['errors'].first['fields'].first['field']

    put "#{base}/account.json", as: :json, params: { vendor: 'Igloohome', fields: { version: 'v1', client_id: 'dev-cid', client_secret: 'dev-sec' } }
    assert_response :success
    igloo = @community.reload.igloohome
    assert_equal ['v1', 'dev-cid', 'dev-sec'], [igloo.version, igloo.client_id, igloo.client_secret]
    card = provider('Igloohome')
    assert_equal 'developer_client', card['access']['source']
    assert_equal ['dev-cid', true], [card['details']['client_id'], card['details']['client_secret_present']]

    put "#{base}/account.json", as: :json, params: { vendor: 'Igloohome', fields: { version: 'v1', client_id: 'dev-cid-2', client_secret: '' } }
    assert_response :success
    assert_equal ['dev-cid-2', 'dev-sec'], [igloo.reload.client_id, igloo.client_secret], 'a blank secret keeps the stored one'

    put "#{base}/account.json", as: :json, params: { vendor: 'Igloohome', fields: { version: 'v1', clear_developer_client: 'true' } }
    assert_response :success
    assert_nil igloo.reload.client_id
    assert_nil igloo.client_secret
    assert_equal 'partner_key', provider('Igloohome')['access']['source']
  end

  test 'the igloohome code grant can be chosen and its authorization removed, which falls back to v1 as the legacy page does' do
    put "#{base}/account.json", as: :json, params: { vendor: 'Igloohome', fields: { version: 'igloohome', auth_mode: 'code_grant', home_name: 'home' } }
    assert_response :success
    igloo = @community.reload.igloohome
    assert igloo.is_authorized_with_pynwheel
    card = provider('Igloohome')
    assert_equal 'code_grant', card['details']['auth_mode']
    assert_equal 'needs_authorization', card['status'], 'no token yet'
    assert_match %r{\Ahttps://auth.igloohome.co/login}, card['details']['authorize_url']

    igloo.update_columns(refresh_token: 'rt', refresh_token_expiry: 1.day.from_now)
    get "#{base}.json"
    assert_equal 'connected', provider('Igloohome')['status']
    put "#{base}/account/remove_authorization.json", as: :json, params: { vendor: 'Igloohome' }
    assert_response :success
    igloo.reload
    assert_equal [nil, false, 'v1'], [igloo.refresh_token, igloo.is_authorized_with_pynwheel, igloo.version]
  end

  test 'v1 locks are typed one at a time or imported from the legacy CSV layout' do
    post "#{base}/devices.json", as: :json, params: { device_name: '', device_id: 'IGK-1' }
    assert_response :unprocessable_entity
    assert_equal 'device_name', body['errors'].first['fields'].first['field']

    post "#{base}/devices.json", as: :json, params: { device_name: '101', device_id: 'IGK-1' }
    assert_response :success
    igloo = @community.reload.igloohome
    assert_equal 'v1', igloo.version, 'the row is created for v1 on first use'
    assert_equal [['101', 'IGK-1']], igloo.igloohome_locks.pluck(:device_name, :device_id)
    assert_equal 'IGK-1', body['data']['device']['device_id']
    assert_includes @community.multiple_locks_provider, 'Igloohome'
    post "#{base}/devices.json", as: :json, params: { device_name: 'again', device_id: 'IGK-1' }
    assert_response :unprocessable_entity
    assert_equal 'duplicate_device', body['errors'].first['code']

    csv = "Device Name,Device ID\nGym,IGK-2\n101,IGK-1\n,IGK-3\nPool,\nLobby,IGK-4\n"
    post "#{base}/import_csv.json", as: :json, params: { csv: csv }
    assert_response :success
    imported = body['data']['imported']
    assert_equal({ 'created' => 2, 'skipped_existing' => 1, 'skipped_blank' => 2, 'rows' => 5, 'vendor' => 'Igloohome' }, imported)
    assert_equal %w[IGK-1 IGK-2 IGK-4], igloo.igloohome_locks.order(:id).pluck(:device_id)
    assert_equal 3, provider('Igloohome')['lock_count']

    post "#{base}/import_csv.json", as: :json, params: { csv: '' }
    assert_response :unprocessable_entity
    assert_equal 'empty_csv', body['errors'].first['code']
    post "#{base}/import_csv.json", as: :json, params: { csv: "a,b\n\"unterminated,x\n" }
    assert_response :unprocessable_entity
    assert_equal 'malformed_csv', body['errors'].first['code']
    assert_equal 3, igloo.igloohome_locks.count, 'a refused file changes nothing'
  end

  test 'instructions and images are stored on the vendor row through the legacy uploader' do
    put "#{base}/instructions.json", as: :json, params: { vendor: 'Zerv', unit: 'x', amenity: 'y' }
    assert_response :unprocessable_entity
    assert_equal 'no_account', body['errors'].first['code']

    Zerv.create!(community: @community, username: 'u', password: 'p')
    put "#{base}/instructions.json", as: :json, params: { vendor: 'Zerv', unit: 'Tap the reader.', amenity: 'Hold the fob near the reader.' }
    assert_response :success
    zerv = @community.reload.zerv
    assert_equal ['Tap the reader.', 'Hold the fob near the reader.'], [zerv.lock_instruction_text, zerv.amenity_lock_instruction_text]
    assert_equal({ 'unit' => 'Tap the reader.', 'amenity' => 'Hold the fob near the reader.' }, provider('Zerv')['instructions'])

    put "#{base}/instruction_image.json", as: :json, params: { vendor: 'Zerv', kind: 'amenity', image: 'data:text/plain;base64,aGk=' }
    assert_response :unprocessable_entity
    assert_equal 'invalid_image', body['errors'].first['code']
    put "#{base}/instruction_image.json", as: :json, params: { vendor: 'Zerv', kind: 'amenity', image: PNG }
    assert_response :success
    zerv.reload
    assert zerv.read_attribute(:amenity_lock_image).present?
    assert zerv.read_attribute(:lock_image).blank?
    image = provider('Zerv')['details']['images']['amenity']
    assert image['file_name'].present?
    put "#{base}/instruction_image.json", as: :json, params: { vendor: 'Zerv', kind: 'unit', image: PNG }
    assert_response :success
    assert zerv.reload.read_attribute(:lock_image).present?
  end

  test 'the Launch-only vendors are listed as chips, present when the property has their rows' do
    get "#{base}.json"
    chips = body['data']['launch_only']
    assert_equal %w[Schlage Yale Other], chips.map { |c| c['vendor'] }
    assert_equal [false, false, false], chips.map { |c| c['present'] }
    OtherLock.create!(community: @community, description: 'Gate fob', area_type: 'amenity')
    get "#{base}.json"
    assert_equal true, body['data']['launch_only'].find { |c| c['vendor'] == 'Other' }['present']
  end

  test 'disconnect removes the vendor rows and takes the vendor off the property, keeping the account' do
    put "#{base}/account.json", as: :json, params: { vendor: 'Igloohome', fields: { version: 'v1' } }
    post "#{base}/devices.json", as: :json, params: { device_name: '101', device_id: 'IGK-9' }
    put "#{base}/map.json", as: :json, params: { vendor: 'Igloohome', device_id: 'IGK-9', target_type: 'amenity', target_id: amenities(:gym).id }
    assert_equal 'Igloohome', amenities(:gym).reload.lock_provider
    put "#{base}/disconnect.json", as: :json, params: { vendor: 'Igloohome' }
    assert_response :success
    assert_equal({ 'vendor' => 'Igloohome', 'count' => 1 }, body['data']['disconnected'])
    assert_equal [], @community.reload.multiple_locks_provider
    assert_equal 0, @community.igloohome.igloohome_locks.count
    assert_equal '', amenities(:gym).reload.lock_provider
    assert_equal 'v1', @community.igloohome.version, 'the account row stays'
    assert_equal false, provider('Igloohome')['enabled']
    put "#{base}/disconnect.json", as: :json, params: { vendor: 'Dormakaba' }
    assert_response :unprocessable_entity
  end

  test 'account writes are refused for read-only roles and foreign properties' do
    sign_in users(:community_assistant)
    put "#{base}/account.json", as: :json, params: { vendor: 'Zerv', fields: { username: 'u', password: 'p' } }
    assert_response :forbidden
    sign_in users(:other_company_admin)
    put "#{base}/account.json", as: :json, params: { vendor: 'Zerv', fields: { username: 'u', password: 'p' } }
    assert_response :forbidden
    assert_nil @community.reload.zerv
    sign_in users(:super_admin)
    put "#{base}/account.json", as: :json, params: { vendor: 'Schlage', fields: {} }
    assert_response :unprocessable_entity
    assert_equal 'unknown_vendor', body['errors'].first['code']
  end
end
