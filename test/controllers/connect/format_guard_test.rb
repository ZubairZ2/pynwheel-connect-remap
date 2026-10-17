require 'test_helper'

# The Connect Tour Setup endpoints are JSON whatever the request says. Their
# read and write guards used to be keyed on `request.format.json?` while the
# routes keep Rails' optional `.:format` segment, so `visitors.html` or
# `stops.xml` skipped property scoping, CSRF, the kill switch and the
# `can_edit_map?` check (found and fixed in the October 17, 2026 QA pass).
class Connect::FormatGuardTest < ActionDispatch::IntegrationTest
  setup do
    @community = communities(:tour_property)
    @base = "/communities/#{@community.id}/connect"
  end

  def body
    JSON.parse(response.body)
  end

  %w[html xml js].each do |format|
    test "a user without access to the property is turned away from every read as .#{format}" do
      sign_in users(:other_company_admin)
      %w[visitors locks stops booking visitors/export].each do |path|
        get "#{@base}/#{path}.#{format}"
        assert_response :not_found, "#{path}.#{format} must be scoped like the JSON path"
        assert_equal 'not_found', body['errors'].first['code']
      end
    end

    test "a write as .#{format} still needs the CSRF token" do
      sign_in users(:community_admin)
      with_forgery_protection do
        put "#{@base}/locks/manual_code.#{format}", params: { target_type: 'unit', target_id: units(:unplotted_unit).id, code: '1234' }
        assert_response :forbidden
        assert_equal 'csrf', body['errors'].first['code']
      end
    end
  end

  test 'a user without access cannot write to the property as .html' do
    before = @community.enable_locks
    sign_in users(:other_company_admin)
    put "#{@base}/locks/enabled.html", params: { enabled: !before }
    assert_response :forbidden
    assert_equal 'forbidden', body['errors'].first['code']
    assert_equal before, @community.reload.enable_locks, 'the row must not have been written by a refused request'
  end

  test 'the kill switch applies to a write as .xml' do
    sign_in users(:community_admin)
    Connect::Flags.stub(:writes_enabled?, false) do
      put "#{@base}/locks/enabled.xml", params: { enabled: true }
      assert_response :not_found
      assert_equal 'disabled', body['errors'].first['code']
    end
  end

  test 'an authorized read as .html answers the JSON envelope' do
    sign_in users(:community_admin)
    get "#{@base}/stops.html"
    assert_response :success
    assert_equal 'application/json', response.media_type
    assert body['data'].key?('stops')
  end

  private

    # Integration tests run with forgery protection off; the CSRF guard of the
    # Connect writes is what these tests are about, so it is switched on for
    # the request.
    def with_forgery_protection
      previous = ActionController::Base.allow_forgery_protection
      ActionController::Base.allow_forgery_protection = true
      yield
    ensure
      ActionController::Base.allow_forgery_protection = previous
    end
end
