require 'test_helper'

class PropertyClone::TestAdminTest < ActiveSupport::TestCase
  setup do
    @company = Company.create!(name: 'Clone Co [SCRIPT TESTING]')
    @property = Community.new(name: 'Clone Prop [SCRIPT TESTING]', company: @company, is_sitemap: false, locked: false)
    @property.save!(validate: false)
    @source = communities(:tour_property)
  end

  test 'creates a company-scoped admin that reaches the clone and nothing else' do
    result = PropertyClone::TestAdmin.call!(company: @company, community: @property, email: 'Test-Admin@Example.test', password: 'Testing123', production: false)
    assert_equal :created, result.status
    user = User.find(result.user_id)
    assert_equal 'test-admin@example.test', user.email
    assert_equal 'Community admin', user.role
    assert_equal @company.id, user.company_id
    assert user.pynwheel_connect_access
    refute user.pynwheel_launch_access
    assert user.valid_password?('Testing123')
    assert_equal [@property.id], user.communities.pluck(:id)
    assert user.can_access_community?(@property.id)
    assert user.can_edit_map?(@property)
    refute user.can_access_community?(@source.id), 'the source property is out of reach'
    refute user.can_access_community?(communities(:no_tour_property).id), 'a sibling of the source is out of reach'
    refute user.is_super_admin?
    assert_equal [@property.id], AccessibleCommunitiesQuery.new(user).call.pluck(:id)
    assert_nil result.credential_file
  end

  test 'never touches an existing account' do
    existing = users(:community_admin)
    digest = existing.encrypted_password
    result = PropertyClone::TestAdmin.call!(company: @company, community: @property, email: existing.email.upcase, password: 'Testing123', production: false)
    assert_equal :exists, result.status
    assert_equal existing.id, result.user_id
    existing.reload
    assert_equal digest, existing.encrypted_password
    assert_equal companies(:one).id, existing.company_id
    assert_equal 'Community admin', existing.role
    assert_equal digest, existing.encrypted_password
    refute CommunityUser.where(user_id: existing.id, community_id: @property.id).exists?
  end

  test 'on a production-like database a chosen password is refused and a reset link is provisioned instead' do
    assert_raises(PropertyClone::Blocked) do
      PropertyClone::TestAdmin.call!(company: @company, community: @property, email: 'prod-admin@example.test', password: 'Testing123', production: true)
    end
    refute User.exists?(email: 'prod-admin@example.test')

    result = PropertyClone::TestAdmin.call!(company: @company, community: @property, email: 'prod-admin@example.test', password: nil, production: true, host: 'https://cms.example.test')
    assert_equal :created, result.status
    user = User.find(result.user_id)
    refute user.valid_password?('Testing123')
    assert user.reset_password_token.present?
    assert File.exist?(result.credential_file)
    assert_equal '600', format('%o', File.stat(result.credential_file).mode & 0o777)
    link = File.read(result.credential_file)[%r{https://cms\.example\.test/users/password/edit\?reset_password_token=\S+}]
    assert link, 'the one-time reset link is in the credential file'
    raw = link[/token=(.+)\z/, 1]
    assert_equal user, User.with_reset_password_token(raw), 'the link resets this account'
  ensure
    File.delete(result.credential_file) if result&.credential_file && File.exist?(result.credential_file)
  end

  test 'refuses a property that is not the company\'s' do
    assert_raises(PropertyClone::Error) do
      PropertyClone::TestAdmin.call!(company: @company, community: @source, email: 'x@example.test', password: 'Testing123', production: false)
    end
  end
end
