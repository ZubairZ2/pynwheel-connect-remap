require 'test_helper'
require_relative '../../../../support/tour_api_test_helper'

# The visitor's ID verification through Rails (October 28, 2026): what the
# server requires, one CheckpointID attempt with the provider stubbed, the
# visitor's row written from the provider's answer only, the leasing team
# told once about a failure, the card on file, and the check-in refusing to
# start until both hold.
class Api::TourApp::V1::VerificationTest < ActionDispatch::IntegrationTest
  include TourApiTestHelper
  include TourApiJobsStub

  IMAGE = "data:image/jpeg;base64,#{Base64.strict_encode64('x' * 400)}".freeze
  PASS = { 'faceVerificationResult' => { 'antiSpoofing' => 96.5, 'confidence' => 82.1 } }.freeze
  FACE_FAIL = { 'code' => 'ValidationError' }.freeze

  setup do
    fake_jobs!
    build_tour_app_fixtures!
    @community.update_columns(time_zone: 'America/Denver', email: 'leasing@example.test, manager@example.test')
    @tour.update_columns(visual_id_verification: true, credit_card_required: false, verification_type: 'check_point_id', only_scheduled_tour: false)
    TourSetting.create!(tour: @tour, allow_self_tour: true, allow_guided_tour: true, time_intervel: '30 min', length_stay_limit: 45, do_limit_max_tour: false)
    %w[Monday Tuesday Wednesday Thursday Friday Saturday Sunday].each_with_index do |day, i|
      OpeningHour.create!(community_id: @community.id, day: day, opening_time: '00:00', closing_time: '23:59', sort: i + 1)
    end
    @ann = TourUser.create!(first_name: 'Ann', last_name: 'Lee', name: 'Ann Lee', email: 'ann@example.test', phone_number: '+13035550101')
    @bob = TourUser.create!(first_name: 'Bob', last_name: 'Ray', name: 'Bob Ray', email: 'bob@example.test', phone_number: '+13035550102')
    @ann_token, = Visitors::Session.issue!(@ann)
    @bob_token, = Visitors::Session.issue!(@bob)
    @staff = api_token_for(users(:super_admin))
    @token = @ann_token
    @mails = []
    mails = @mails
    DelayedSchedulerMailerJob.define_singleton_method(:perform_async) { |*args| mails << args; true }
    @env = { 'CHECKPOINT_DVS_API_KEY' => 'sk_test_fake' }
  end

  teardown do
    restore_jobs!
    DelayedSchedulerMailerJob.singleton_class.send(:remove_method, :perform_async) if DelayedSchedulerMailerJob.singleton_class.method_defined?(:perform_async, false)
    reset_tour_api_caches!
  end

  # ENV as the services read it (`ENV['NAME']`), with the given keys set.
  def with_env(extra = @env, &block)
    ENV.stub(:[], ->(key) { extra.key?(key) ? extra[key] : nil }, &block)
  end

  def attempt(payload = {}, headers = auth)
    post_json("#{@base}/verification", { document_type: 'drivers_license', front_image: IMAGE, back_image: IMAGE, selfie_image: IMAGE }.merge(payload), headers)
  end

  def status(headers = auth)
    get "#{@base}/verification", headers: headers
    body['verification']
  end

  test 'the status says what the property asks and what the visitor has' do
    with_env do
      v = status
      assert_response :success, response.body
      assert_equal ['check_point_id', true, true, true, 'never', 30], v.values_at('provider', 'provider_available', 'property_requires', 'required', 'state', 'valid_for_days')
      assert_equal 5, v['attempts_left']
      assert_equal %w[drivers_license id_card passport passport_card international_id], v['document_types'].map { |t| t['key'] }
      assert_equal({ 'required' => false, 'on_file' => false, 'needed' => false, 'last4' => nil, 'available' => false, 'publishable_key' => nil }, v['card'])

      @ann.update_columns(is_checkpoint_verified: true, checkpoint_verified_at: 3.days.ago)
      v = status
      assert_equal [false, 'verified', 'CheckpointID'], v.values_at('required', 'state', 'verified_by')
      assert v['valid_until'] > Time.current.iso8601

      @ann.update_columns(checkpoint_verified_at: 40.days.ago)
      assert_equal [true, 'expired'], status.values_at('required', 'state')

      @tour.update_columns(visual_id_verification: false)
      reset_tour_api_caches!
      assert_equal [false, false], status.values_at('property_requires', 'required')
    end
  end

  test 'without the key the status says the provider is unavailable and an attempt is 503' do
    with_env({}) do
      assert_equal false, status['provider_available']
      attempt
      assert_response :service_unavailable
      assert_equal 'provider_unavailable', body['error']['code']
    end
  end

  test 'a pass writes the row the legacy initialize_tour wrote, from the provider answer only' do
    sent = nil
    verify = lambda do |document_type:, front:, back:, selfie:|
      sent = { document_type: document_type, front: front, back: back, selfie: selfie }
      PASS
    end
    with_env do
      Verification::Checkpoint.stub(:verify!, verify) { attempt }
    end
    assert_response :success, response.body
    assert_equal 'verified', body['result']['outcome']
    assert_equal [false, 'verified', 'CheckpointID', 4], body['verification'].values_at('required', 'state', 'verified_by', 'attempts_left')
    assert_equal 'drivers_license', sent[:document_type]
    assert_equal Base64.strict_encode64('x' * 400), sent[:front], 'the data URL prefix is stripped; the provider gets bare base64'
    assert_equal sent[:front], sent[:back]
    @ann.reload
    assert @ann.is_checkpoint_verified
    assert_in_delta Time.current, @ann.checkpoint_verified_at, 60
    assert_equal 'check_point_id', @ann.verified_by
    audit = PaperTrail::Version.where(item_type: 'Community', item_id: @community.id, event: 'id_verification_passed', whodunnit: "visitor:#{@ann.id}").order(created_at: :desc).first
    assert audit
    refute_match(/base64|#{Regexp.escape(IMAGE[0, 40])}/, audit.object.to_s, 'no picture in the audit row')
    assert_empty @mails

    # Verified: a second attempt does not call the provider.
    with_env do
      Verification::Checkpoint.stub(:verify!, ->(**) { raise 'must not be called' }) { attempt }
    end
    assert_response :success
    assert_equal 'already_verified', body['result']['outcome']
    assert_equal 1, Visitors::Status.id_check(@ann, Time.current)[:state] == 'verified' ? 1 : 0
  end

  test 'a failure leaves the visitor unverified and tells the leasing team once a day, with the legacy reason' do
    with_env do
      Verification::Checkpoint.stub(:verify!, ->(**) { FACE_FAIL }) { attempt }
      assert_response :success, response.body
      assert_equal ['face_mismatch', Verification::Checkpoint::FACE_REASON], body['result'].values_at('outcome', 'reason')
      assert_equal [true, 'never', 4], body['verification'].values_at('required', 'state', 'attempts_left')
      refute @ann.reload.is_checkpoint_verified
      assert_equal 2, @mails.size, 'one mail per leasing address'
      subject, content, to = @mails.first
      assert_equal 'ID Verification Issue for Ann Lee', subject
      assert_equal 'leasing@example.test', to
      assert_includes content, 'Ann Lee visiting'
      assert_includes content, 'was unable to begin the tour because of an issue with ID verification.<br><br>The Face has not been matched'

      Verification::Checkpoint.stub(:verify!, ->(**) { { 'code' => 'MRZOCRError' } }) { attempt }
      assert_equal 'document_unreadable', body['result']['outcome']
      assert_equal 2, @mails.size, 'a retry the same day does not mail again'
      Verification::Checkpoint.stub(:verify!, ->(**) { { 'code' => 'Unknown', 'message' => 'Blurry' } }) { attempt }
      assert_equal %w[rejected Blurry], body['result'].values_at('outcome', 'reason')
      refute @ann.reload.is_checkpoint_verified
      assert_equal 3, PaperTrail::Version.where(item_type: 'Community', item_id: @community.id, event: 'id_verification_failed', whodunnit: "visitor:#{@ann.id}").count
    end
  end

  test 'attempts are bounded, the provider being down is 503, and the request is validated' do
    with_env do
      Verification::Checkpoint.stub(:verify!, ->(**) { raise Verification::Checkpoint::Unavailable, 'down' }) { attempt }
      assert_response :service_unavailable
      assert_equal 'provider_unavailable', body['error']['code']
      refute @ann.reload.is_checkpoint_verified

      attempt(document_type: 'wallet')
      assert_response :unprocessable_entity
      assert_equal 'validation_error', body['error']['code']
      attempt(back_image: nil)
      assert_equal 'body front_image back_image selfie_image'.split.include?(body['error']['details'][0]['loc'][1]), true
      assert_equal 'back_image', body['error']['details'][0]['loc'][1], "a driver's license needs its back"
      Verification::Checkpoint.stub(:verify!, ->(**) { PASS }) { attempt(document_type: 'passport', back_image: nil) }
      assert_response :success, 'a passport has no back'
      @ann.update_columns(is_checkpoint_verified: false, checkpoint_verified_at: nil)
      attempt(selfie_image: 'not base64!!')
      assert_equal 'selfie_image', body['error']['details'][0]['loc'][1]

      5.times { TourApi::Audit.record(@community, 'id_verification_failed', whodunnit: "visitor:#{@bob.id}", payload: {}) }
      attempt({}, auth(@bob_token))
      assert_response :unprocessable_entity
      assert_equal 'attempt_limit', body['error']['code']
      assert_equal 0, status(auth(@bob_token))['attempts_left']
    end
  end

  test 'a property that does not ask, an unsupported provider and a flagged mismatch refuse an attempt' do
    with_env do
      @tour.update_columns(visual_id_verification: false)
      reset_tour_api_caches!
      attempt
      assert_equal 'not_required', body['error']['code']
      @tour.update_columns(visual_id_verification: true, verification_type: 'authenteq')
      reset_tour_api_caches!
      attempt
      assert_equal 'provider_unsupported', body['error']['code']
      @tour.update_columns(verification_type: 'check_point_id')
      reset_tour_api_caches!
      @ann.update_columns(id_selfie_mismatch: true)
      attempt
      assert_equal 'mismatch_flagged', body['error']['code']
      assert_equal 'mismatch', status['state']
    end
  end

  test 'a visitor reads only themself; staff read a visitor of the property' do
    with_env do
      get "#{@base}/verification", headers: auth(@staff)
      assert_response :unprocessable_entity
      assert_equal 'tour_user_id', body['error']['details'][0]['loc'][1]
      get "#{@base}/verification", params: { tour_user_id: @ann.id }, headers: auth(@staff)
      assert_response :not_found, 'Ann has neither a booking nor a visit here yet'
      SchedualTour.create!(community_id: @community.id, tour_user_id: @ann.id, tour_date: Date.current, tour_time: '10:00', tour_type: 'self_tour', property_tour_type: 'scheduled_tour')
      get "#{@base}/verification", params: { tour_user_id: @ann.id }, headers: auth(@staff)
      assert_response :success
      assert_equal 'never', body['verification']['state']
      attempt({}, auth(@staff))
      assert_response :forbidden
      assert_equal 'visitor_only', body['error']['code']
    end
  end

  test 'the card on file: required by the property, tokenized by Stripe.js, saved as the CMS saves it' do
    post_json("#{@base}/verification/card", { card_token: 'tok_visa_test_1234' })
    assert_response :unprocessable_entity
    assert_equal 'card_not_required', body['error']['code']

    @tour.update_columns(credit_card_required: true)
    reset_tour_api_caches!
    with_env do
      assert_equal({ 'required' => true, 'on_file' => false, 'needed' => true, 'last4' => nil, 'available' => false, 'publishable_key' => nil }, status['card'])
      post_json("#{@base}/verification/card", { card_token: 'tok_visa_test_1234' })
      assert_response :service_unavailable
      assert_equal 'card_unavailable', body['error']['code']
    end
    stripe = @env.merge('STRIPE_SECRET_KEY' => 'sk_test_x', 'STRIPE_PUBLISHABLE_KEY' => 'pk_test_x')
    with_env(stripe) do
      assert_equal 'pk_test_x', status['card']['publishable_key']
      post_json("#{@base}/verification/card", { card_token: '4242424242424242' })
      assert_response :unprocessable_entity
      assert_equal 'validation_error', body['error']['code'], 'a card number is never accepted here'

      token = Struct.new(:card, :used).new(Struct.new(:last4).new('4242'), false)
      customer = Struct.new(:id).new('cus_test_1')
      created = nil
      Stripe::Token.stub(:retrieve, ->(id) { id == 'tok_visa_test_1234' ? token : raise(Stripe::InvalidRequestError.new('No such token', 'card')) }) do
        Stripe::Customer.stub(:create, ->(email:, card:) { created = [email, card]; customer }) do
          post_json("#{@base}/verification/card", { card_token: 'tok_visa_test_1234' })
        end
      end
      assert_response :success, response.body
      assert_equal({ 'saved' => true, 'last4' => '4242' }, body['card'])
      assert_equal ['ann@example.test', 'tok_visa_test_1234'], created
      assert_equal ['cus_test_1', '4242'], [@ann.reload.strip_customer_id, @ann.card_last_digits]
      assert_equal({ 'required' => true, 'on_file' => true, 'needed' => false, 'last4' => '4242', 'available' => true, 'publishable_key' => nil }, body['verification']['card'])
      assert PaperTrail::Version.where(item_type: 'Community', item_id: @community.id, event: 'card_saved', whodunnit: "visitor:#{@ann.id}").exists?

      Stripe::Token.stub(:retrieve, ->(_id) { raise Stripe::CardError.new('Your card was declined.', 'number') }) do
        post_json("#{@base}/verification/card", { card_token: 'tok_declined_0001' }, auth(@bob_token))
      end
      assert_response :unprocessable_entity
      assert_equal %w[card_declined], [body['error']['code']]
      assert_equal 'Your card was declined.', body['error']['message']
    end
  end

  test 'the check-in starts only once the server-side requirements hold' do
    start = ->(headers = auth, extra = {}) { post_json("#{@base}/visits", { client_visit_id: SecureRandom.uuid, tour_type: 'self_tour' }.merge(extra), headers) }
    start.call
    assert_response :unprocessable_entity, response.body
    assert_equal 'verification_required', body['error']['code']
    assert_equal 'never', body['error']['details']['state']
    assert_equal 0, TourHistory.where(tour_user_id: @ann.id).count, 'nothing written'

    @tour.update_columns(credit_card_required: true)
    reset_tour_api_caches!
    @ann.update_columns(is_checkpoint_verified: true, checkpoint_verified_at: Time.current, verified_by: 'check_point_id')
    start.call
    assert_response :unprocessable_entity
    assert_equal 'card_required', body['error']['code']

    @ann.update_columns(strip_customer_id: 'cus_test_1', card_last_digits: '4242')
    start.call
    assert_response :created, response.body
    assert_equal false, body['visit']['verification_required']
    assert_equal 'check_point_id', TourHistory.find(body['visit']['id']).verified_by

    # Staff drive a visit on an unverified visitor's behalf; a virtual tour (outside hours) is never gated.
    SchedualTour.create!(community_id: @community.id, tour_user_id: @bob.id, tour_date: Date.current, tour_time: '10:00', tour_type: 'self_tour', property_tour_type: 'scheduled_tour')
    start.call(auth(@staff), { tour_user_id: @bob.id })
    assert_response :created, response.body
    assert_equal true, body['visit']['verification_required']
    OpeningHour.where(community_id: @community.id).delete_all
    @carl = TourUser.create!(first_name: 'Carl', last_name: 'Fox', name: 'Carl Fox', email: 'carl@example.test', phone_number: '+13035550103')
    carl_token, = Visitors::Session.issue!(@carl)
    start.call(auth(carl_token))
    assert_response :created, response.body
    assert_equal 'virtual_tour', body['visit']['tour_type']
  end
end
