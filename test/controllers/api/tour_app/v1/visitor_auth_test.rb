require 'test_helper'
require_relative '../../../../support/tour_api_test_helper'

# The visitor (prospect) sign-in of the Tour App: a one-time code by SMS,
# then a `vst_` session token (Visitors::Otp, Visitors::Session, October 23,
# 2026). Twilio is never reached (Sidekiq fake mode); the legacy app's JWT
# and `pin_code` flow is untouched by any of this.
class Api::TourApp::V1::VisitorAuthTest < ActionDispatch::IntegrationTest
  include TourApiTestHelper
  include TourApiJobsStub

  PHONE = '+13035550199'

  setup do
    fake_jobs!
    @community = communities(:tour_property)
    @ann = TourUser.create!(first_name: 'Ann', last_name: 'Lee', name: 'Ann Lee', email: 'ann@example.test', phone_number: PHONE, pin_code: '4321')
  end

  teardown { restore_jobs! }

  def request_code(phone = PHONE, extra = {})
    post_json("#{BASE}/visitor/otp", { phone: phone, country_code: 'US' }.merge(extra), {})
  end

  # The code the SMS carried: the worker's queued arguments.
  def last_code
    job = TwilioSmsWorker.jobs.last
    job && job['args'][0][/\d{6}/]
  end

  def verify(phone, code, extra = {})
    post_json("#{BASE}/visitor/otp/verify", { phone: phone, code: code, country_code: 'US' }.merge(extra), {})
  end

  def sign_in_visitor(phone = PHONE, extra = {})
    request_code(phone)
    verify(phone, last_code, extra)
    assert_response :success, response.body
    body['access_token']
  end

  test 'asking for a code answers the same for a known and an unknown phone, and queues one SMS for each' do
    request_code
    assert_response :accepted
    known = body
    assert_equal({ 'success' => true, 'sent' => true, 'resend_after' => 60 }, known)
    assert_equal 1, TwilioSmsWorker.jobs.size
    assert_equal PHONE, TwilioSmsWorker.jobs.last['args'][1]
    assert_match(/\A\d{6}\z/, last_code)
    refute_equal @ann.reload.pin_code, last_code, 'the legacy pin_code is not touched'
    assert_equal '4321', @ann.pin_code

    request_code('+13035550100')
    assert_response :accepted
    assert_equal known, body
    assert_equal 2, TwilioSmsWorker.jobs.size
    row = VisitorOtp.find_by(phone_number: PHONE)
    assert row
    refute_match(/\d{6}/, row.code_digest[0, 6]) if row.code_digest.match?(/\A\d{6}/)
    refute_equal last_code, row.code_digest
  end

  test 'a second request inside a minute sends nothing more and a bad phone is a validation error' do
    request_code
    request_code
    assert_response :accepted
    assert_equal 1, TwilioSmsWorker.jobs.size, 'no second SMS inside RESEND_AFTER'
    request_code('12')
    assert_response :unprocessable_entity
    assert_equal 'validation_error', body['error']['code']
  end

  test 'the right code signs the visitor in with a vst_ token that is stored only as a digest' do
    request_code
    code = last_code
    verify(PHONE, code)
    assert_response :success, response.body
    token = body['access_token']
    assert token.start_with?('vst_')
    assert_equal 'bearer', body['token_type']
    assert_equal @ann.id, body['visitor']['id']
    assert_equal 'visitor', body['visitor']['role']
    assert_equal '•••0199', body['visitor']['phone_masked']
    assert_equal [], body['bookings']
    assert body['capabilities']['visitor_auth']
    refute_match(/pin_code|otp_digest|id_card|encrypted_password/, response.body)
    session = VisitorSession.find_by(tour_user_id: @ann.id)
    assert session
    refute_equal token, session.token_digest
    assert_equal Digest::SHA256.hexdigest(token), session.token_digest
    assert_in_delta 30.days.from_now, session.expires_at, 60
    assert_nil VisitorOtp.find_by(phone_number: PHONE), 'the code is spent'
    assert_equal 0, User.where(email: 'ann@example.test').count, 'a visitor is never a CMS user'

    get "#{BASE}/visitor/me", headers: auth(token)
    assert_response :success
    assert_equal @ann.id, body['visitor']['id']
    assert_nil body['open_visit']
    get "#{BASE}/auth/me", headers: auth(token)
    assert_response :success
    assert_equal 'visitor', body['visitor']['role']
    refute body.key?('user')
  end

  test 'a wrong code is refused with one message, five wrong codes void it, and an expired code is refused' do
    request_code
    code = last_code
    4.times do
      verify(PHONE, '000000')
      assert_response :unauthorized
      assert_equal 'invalid_code', body['error']['code']
    end
    assert_equal 4, VisitorOtp.find_by(phone_number: PHONE).attempts
    verify(PHONE, '111111')
    assert_response :unauthorized
    verify(PHONE, code)
    assert_response :unauthorized, 'the right code no longer works after MAX_ATTEMPTS'
    assert_equal 'invalid_code', body['error']['code']
    assert_equal 0, VisitorSession.count

    VisitorOtp.delete_all
    request_code('+13035550100')
    VisitorOtp.find_by(phone_number: '+13035550100').update_columns(expires_at: 1.minute.ago)
    verify('+13035550100', last_code)
    assert_response :unauthorized
    assert_equal 'invalid_code', body['error']['code']
    verify('+13035550101', '123456')
    assert_response :unauthorized, 'a phone that never asked for a code gets the same answer'
    assert_equal 'invalid_code', body['error']['code']
  end

  test 'a new phone needs a profile and is created through the legacy dedupe' do
    phone = '+13035550177'
    request_code(phone)
    code = last_code
    verify(phone, code)
    assert_response :unprocessable_entity
    assert_equal 'profile_required', body['error']['code']
    assert_equal %w[first_name last_name email], body['error']['details']['fields']
    assert VisitorOtp.find_by(phone_number: phone), 'the code survives the missing profile'

    earlier = TourUser.create!(first_name: 'Old', last_name: 'Name', name: 'Old Name', email: 'new@example.test', phone_number: '+10000000001')
    earlier.update_column(:phone_number, '') # a legacy row booked with an email only
    verify(phone, code, first_name: 'New', last_name: 'Visitor', email: 'New@Example.test')
    assert_response :success, response.body
    assert_equal earlier.id, body['visitor']['id'], 'the email-only row is reused, not duplicated'
    earlier.reload
    assert_equal ['New', 'Visitor', 'new@example.test', phone], [earlier.first_name, earlier.last_name, earlier.email, earlier.phone_number]
    assert_equal 1, TourUser.where(email: 'new@example.test').count

    request_code('+13035550178')
    verify('+13035550178', last_code, first_name: 'Only', last_name: 'Phone', email: 'not-an-email')
    assert_response :unprocessable_entity
    assert_equal 'validation_error', body['error']['code']
  end

  test 'sign-out revokes the session, an expired or revoked token is refused, and a staff token is not a visitor' do
    token = sign_in_visitor
    post "#{BASE}/visitor/logout", headers: auth(token)
    assert_response :success
    assert body['revoked']
    get "#{BASE}/visitor/me", headers: auth(token)
    assert_response :unauthorized
    assert_equal 'token_revoked', body['error']['code']

    token = sign_in_visitor
    VisitorSession.order(:id).last.update_columns(expires_at: 1.minute.ago)
    get "#{BASE}/visitor/me", headers: auth(token)
    assert_response :unauthorized
    assert_equal 'token_expired', body['error']['code']

    get "#{BASE}/visitor/me", headers: auth('vst_nonsense')
    assert_response :unauthorized
    assert_equal 'invalid_token', body['error']['code']

    staff = api_token_for(users(:super_admin))
    get "#{BASE}/visitor/me", headers: auth(staff)
    assert_response :forbidden
    assert_equal 'visitor_only', body['error']['code']
    token = sign_in_visitor
    post "#{BASE}/auth/logout", headers: auth(token)
    assert_response :forbidden
    assert_equal 'staff_only', body['error']['code']
  end

  test 'a visitor token never opens the CMS or Connect' do
    token = sign_in_visitor
    get "/communities/#{@community.id}/connect/visitors.json", headers: auth(token)
    assert_includes [302, 401], response.status, 'Connect wants a Devise session, not a visitor token'
    refute_match(/"rows"/, response.body)
    get "/communities/#{@community.id}/tour_users", headers: auth(token)
    assert_includes [302, 401], response.status
  end

  test 'the profile can be edited but not the phone, and removing personal data signs the visitor out everywhere' do
    token = sign_in_visitor
    put "#{BASE}/visitor/me", params: { first_name: 'Anne', email: 'anne@example.test', phone_number: '+10000000000', is_sms_enabled: false }.to_json, headers: auth(token).merge(JSON_HEADERS)
    assert_response :success, response.body
    @ann.reload
    assert_equal ['Anne', 'anne@example.test', PHONE, false, 'Anne Lee'], [@ann.first_name, @ann.email, @ann.phone_number, @ann.is_sms_enabled, @ann.name]

    Visitors::Privacy.remove!(@community, @ann, { phone: true })
    get "#{BASE}/visitor/me", headers: auth(token)
    assert_response :unauthorized
    assert_equal 'token_revoked', body['error']['code']
  end

  test 'the visitor can delete their own account, as the legacy app allowed' do
    token = sign_in_visitor
    SchedualTour.create!(community_id: @community.id, tour_user_id: @ann.id, tour_date: Date.today + 3, tour_time: '10:00', tour_type: 'self_tour', property_tour_type: 'scheduled_tour')
    delete "#{BASE}/visitor/me", headers: auth(token)
    assert_response :success
    assert_nil TourUser.find_by(id: @ann.id)
    assert_equal 0, SchedualTour.where(tour_user_id: @ann.id).count
    get "#{BASE}/visitor/me", headers: auth(token)
    assert_response :unauthorized
  end

  test 'every visitor route is 404 while the switch is off, and a vst_ token is then not a session' do
    token = sign_in_visitor
    ENV['PYN_TOUR_VISITOR_AUTH'] = 'off'
    request_code
    assert_response :not_found
    assert_equal 'disabled', body['error']['code']
    get "#{BASE}/visitor/me", headers: auth(token)
    assert_response :unauthorized
    assert_equal 'invalid_token', body['error']['code']
    get "#{BASE}/health"
    refute body['capabilities']['visitor_auth']
  ensure
    ENV.delete('PYN_TOUR_VISITOR_AUTH')
  end

  test 'the code is shown in the answer only while the testing switch is on' do
    request_code
    refute body.key?('debug_code'), 'off by default'
    ENV['PYN_TOUR_OTP_DEBUG'] = 'on'
    VisitorOtp.delete_all
    request_code('+13035550160')
    assert_response :accepted
    assert_equal last_code, body['debug_code']
    verify('+13035550160', body['debug_code'], first_name: 'Dbg', last_name: 'Code', email: 'dbg@example.test')
    assert_response :success, response.body
    Rails.env.stub(:production?, true) do
      VisitorOtp.delete_all
      request_code('+13035550161')
      refute body.key?('debug_code'), 'never in production'
    end
  ensure
    ENV.delete('PYN_TOUR_OTP_DEBUG')
  end

  test 'a store-review phone takes the configured code outside production and gets no SMS' do
    ENV['PYN_TOUR_OTP_TEST_PHONES'] = PHONE
    ENV['PYN_TOUR_OTP_TEST_CODE'] = '246810'
    request_code
    assert_equal 0, TwilioSmsWorker.jobs.size
    verify(PHONE, '246810')
    assert_response :success, response.body
  ensure
    ENV.delete('PYN_TOUR_OTP_TEST_PHONES')
    ENV.delete('PYN_TOUR_OTP_TEST_CODE')
  end
end
