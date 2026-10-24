require 'test_helper'

# "Publish to Tour App" (October 25, 2026): records the current configuration
# version on the tour, idempotently, with an audit row; read-only roles and
# other companies are refused as for every Connect write.
class Connect::TourControllerTest < ActionDispatch::IntegrationTest
  setup do
    @community = communities(:tour_property)
    @tour = tours(:main_tour)
  end

  def body
    JSON.parse(response.body)
  end

  def base
    "/communities/#{@community.id}/connect/tour"
  end

  test 'publication reads the state before and after a publish' do
    sign_in users(:community_assistant)
    get "#{base}/publication.json"
    assert_response :success
    data = body['data']
    assert_equal [true, nil, nil, false, true], [data['tour_enabled'], data['published_at'], data['published_by'], data['ever_published'], data['changed_since_publish']]
    assert_equal TourApi::ConfigVersion.for(@community), data['current_version']
  end

  test 'publish records the version, is idempotent, and moves again after a save' do
    sign_in users(:community_admin)
    post "#{base}/publish.json", as: :json
    assert_response :success, response.body
    data = body['data']
    version = TourApi::ConfigVersion.for(@community)
    assert_equal [false, true, false, version, version], [data['already_published'], data['ever_published'], data['changed_since_publish'], data['published_version'], data['current_version']]
    assert_equal users(:community_admin).id, data['published_by']['id']
    @tour.reload
    assert_equal version, @tour.tour_published_version
    assert_equal users(:community_admin).id, @tour.tour_published_by_id
    assert @tour.tour_published_at.present?
    audit = PaperTrail::Version.where(item_type: 'Community', item_id: @community.id, event: 'tour_published').order(:created_at).to_a.last
    assert_equal users(:community_admin).id.to_s, audit.whodunnit
    assert_equal version, JSON.parse(audit.object)['config_version']
    assert body['meta']['versions'].key?('tour')

    first_at = @tour.tour_published_at
    post "#{base}/publish.json", as: :json
    assert_response :success
    assert_equal true, body['data']['already_published']
    assert_equal first_at, @tour.reload.tour_published_at, 'nothing is rewritten when the configuration is unchanged'
    assert_equal 1, PaperTrail::Version.where(item_type: 'Community', item_id: @community.id, event: 'tour_published').count

    @tour.update!(grace_period: 25)
    get "#{base}/publication.json"
    assert_equal true, body['data']['changed_since_publish'], 'a saved booking rule moves the current version'
    post "#{base}/publish.json", as: :json
    assert_equal [false, false], [body['data']['already_published'], body['data']['changed_since_publish']]
    assert_not_equal version, @tour.reload.tour_published_version
  end

  test 'publish is refused to read-only roles, other companies and a property without the tour' do
    sign_in users(:community_assistant)
    post "#{base}/publish.json", as: :json
    assert_response :forbidden
    sign_in users(:other_company_admin)
    post "#{base}/publish.json", as: :json
    assert_response :forbidden
    get "#{base}/publication.json"
    assert_response :not_found
    sign_in users(:community_admin)
    quiet = communities(:no_tour_property)
    post "/communities/#{quiet.id}/connect/tour/publish.json", as: :json
    assert_response :unprocessable_entity
    assert_equal 'tour_disabled', body['errors'][0]['code']
  end
end
