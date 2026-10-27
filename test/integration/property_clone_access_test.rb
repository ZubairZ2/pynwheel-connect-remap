require 'test_helper'

# The test administrator against the real routes: signs in through the Devise
# form, operates the clone, and is refused on the source property, its
# siblings and its company, by server-side checks keyed on ids.
class PropertyCloneAccessTest < ActionDispatch::IntegrationTest
  setup do
    @source = communities(:tour_property)
    @sibling = communities(:no_tour_property)
    @company = companies(:one)
    TourSetting.create!(tour: tours(:main_tour), buffer_minutes: 10)
    @plan = PropertyClone::Plan.new(@source.id).resolve!
    @runner = PropertyClone::Runner.new(@plan).execute!
    @clone = Community.find(@runner.clone_property_id)
    @clone_company = Company.find(@runner.clone_company_id)
    @admin = User.find(PropertyClone::TestAdmin.call!(company: @clone_company, community: @clone, email: 'test@gmail.com', password: 'Testing123', production: false).user_id)
    @clone_tour = Tour.find(@runner.id_map.get('tours', tours(:main_tour).id))
    @clone_lift_stop = TourStop.find(@runner.id_map.get('tour_stops', tour_stops(:lift_stop).id))
    @clone_lift = Elevator.find(@runner.id_map.get('elevators', elevators(:lift).id))
    @baseline = PropertyClone::Baseline.capture(@plan)
  end

  def body
    JSON.parse(response.body)
  end

  def sign_in_through_the_form!
    assert @admin.reload.valid_password?('Testing123'), 'the bootstrapped password is set'
    post '/users/sign_in', params: { user: { email: 'test@gmail.com', password: 'Testing123' } }
    flunk "sign-in failed: #{response.status} #{flash.to_h.inspect} #{response.body.to_s[0, 300]}" unless response.redirect?
    assert_equal @admin.id, request.env['warden'].user(:user)&.id, 'the Devise session belongs to the test admin'
  end

  test 'the test admin signs in, reads and edits the clone, and is refused everywhere else' do
    sign_in_through_the_form!

    # Connect property detail: scoped by AccessibleCommunitiesQuery (404 outside the scope)
    get "/communities/#{@clone.id}/edit.json"
    assert_response :success
    assert_equal @clone.id, body.dig('data', 'id')
    get "/communities/#{@source.id}/edit.json"
    assert_response :not_found
    get "/communities/#{@sibling.id}/edit.json"
    assert_response :not_found

    # Connect listings only show the clone company and the clone
    get '/communities.json'
    assert_response :success
    assert_equal [@clone.id], body['data'].map { |row| row['id'] }
    # Legacy limitation, reported: `Ability` has no rule for the "Company admin"
    # role, so CompaniesController (load_and_authorize_resource) refuses it the
    # companies listing, its own company included. Nothing of the source is exposed.
    get '/companies.json'
    assert_response :forbidden

    # Connect reads keyed on the property id (User#can_access_community?)
    get "/communities/#{@clone.id}/connect/stops.json"
    assert_response :success
    assert_includes body['data']['stops'].map { |s| s['id'] }, @clone_lift_stop.id
    get "/communities/#{@source.id}/connect/stops.json"
    assert_response :not_found
    get "/communities/#{@sibling.id}/connect/stops.json"
    assert_response :not_found
    get "/communities/#{@clone.id}/connect/booking.json"
    assert_response :success
    get "/communities/#{@source.id}/connect/booking.json"
    assert_response :not_found

    # Connect writes keyed on the property id (User#can_edit_map?)
    put "/communities/#{@clone.id}/connect/stops/#{@clone_lift_stop.id}.json", as: :json, params: { name: 'Lift via API', instructions: 'Turn left' }
    assert_response :success
    assert_equal ['Lift via API', 'Turn left'], [@clone_lift.reload.name, @clone_lift.directional_text]
    assert_equal 'Elevator 1', elevators(:lift).reload.name

    put "/communities/#{@source.id}/connect/stops/#{tour_stops(:lift_stop).id}.json", as: :json, params: { name: 'Hacked', instructions: 'x' }
    assert_response :forbidden
    assert_equal 'Elevator 1', elevators(:lift).reload.name
    put "/communities/#{@clone.id}/connect/stops/#{tour_stops(:lift_stop).id}.json", as: :json, params: { name: 'Hacked', instructions: 'x' }
    assert_response :not_found, 'a source stop id under the clone property is not found'
    assert_equal 'Elevator 1', elevators(:lift).reload.name

    put "/communities/#{@clone.id}/tours/save_setup.json", as: :json, params: { base_version: @clone_tour.reload.tour_setup_version, stops: { order: [@clone_lift_stop.id] } }
    assert_response :success
    put "/communities/#{@source.id}/tours/save_setup.json", as: :json, params: { base_version: tours(:main_tour).reload.tour_setup_version, stops: { remove: [tour_stops(:unit_stop).id] } }
    assert_response :forbidden
    assert TourStop.exists?(tour_stops(:unit_stop).id)
    put "/communities/#{@clone.id}/tours/save_setup.json", as: :json, params: { base_version: @clone_tour.reload.tour_setup_version, stops: { remove: [tour_stops(:unit_stop).id] } }
    assert_response :unprocessable_entity, 'a source stop id under the clone tour is rejected'
    assert TourStop.exists?(tour_stops(:unit_stop).id)

    put "/communities/#{@clone.id}/connect/booking/rules.json", as: :json, params: { buffer_minutes: 30, minimum_notice_minutes: 60 }
    assert_response :success
    assert_equal 30, TourSetting.find_by!(tour_id: @clone_tour.id).buffer_minutes
    put "/communities/#{@source.id}/connect/booking/rules.json", as: :json, params: { buffer_minutes: 99 }
    assert_response :forbidden
    refute_equal 99, TourSetting.find_by(tour_id: tours(:main_tour).id)&.buffer_minutes

    # legacy HTML pages keyed on community_id: ApplicationController#check_community
    # sends strangers home before anything renders (UnitsController runs it; the
    # HTML layout itself does not render in the test environment, so the clone
    # page is only checked for not being redirected).
    get "/communities/#{@source.id}/units"
    assert_redirected_to root_path
    get "/communities/#{@sibling.id}/units"
    assert_redirected_to root_path
    get "/communities/#{@clone.id}/units"
    refute response.redirect?, 'the clone page is served to its administrator'

    # the source company and its settings are out of reach (CanCan on CompaniesController)
    patch "/companies/#{@company.id}", params: { company: { name: 'Hacked' } }
    assert_not_equal 'Hacked', @company.reload.name
    assert_equal 'MyString', @company.name

    assert_equal [], @baseline.compare(PropertyClone::Baseline.capture(@plan)), 'nothing of the source changed during the session'
  end

  test 'the test admin is not a super admin and the Tour App API (super admins only) refuses it' do
    refute @admin.is_super_admin?
    post '/api/tour/v1/auth/login', params: { email: 'test@gmail.com', password: 'Testing123' }, as: :json
    assert_includes [401, 403], response.status
  end
end
