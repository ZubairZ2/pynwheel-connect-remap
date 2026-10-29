require 'test_helper'

class PropertyClone::EnvironmentGuardTest < ActiveSupport::TestCase
  test 'describes the connected database' do
    info = PropertyClone::EnvironmentGuard.describe
    assert_equal 'test', info[:rails_env]
    assert_equal ActiveRecord::Base.connection_db_config.configuration_hash[:database].to_s, info[:database]
    assert info[:server_version].present?
  end

  test 'execution needs every confirmation and lists the missing ones' do
    db = PropertyClone::EnvironmentGuard.describe[:database]
    error = assert_raises(PropertyClone::Blocked) { PropertyClone::EnvironmentGuard.require_execute!(1618, {}) }
    assert_includes error.message, 'PROPERTY_CLONE_EXECUTE=1'
    assert_includes error.message, "CONFIRM_DATABASE=#{db}"
    assert_includes error.message, 'CONFIRM_SOURCE=1618'
    error = assert_raises(PropertyClone::Blocked) { PropertyClone::EnvironmentGuard.require_execute!(1618, { 'PROPERTY_CLONE_EXECUTE' => '1', 'CONFIRM_DATABASE' => db, 'CONFIRM_SOURCE' => '1619' }) }
    assert_includes error.message, 'CONFIRM_SOURCE=1618'
    info = PropertyClone::EnvironmentGuard.require_execute!(1618, { 'PROPERTY_CLONE_EXECUTE' => '1', 'CONFIRM_DATABASE' => db, 'CONFIRM_SOURCE' => '1618' })
    assert_equal db, info[:database]
  end

  test 'production-like databases are recognised by name, host and environment' do
    assert PropertyClone::EnvironmentGuard.production_like?({ database: 'pynwheel_prod', host: 'localhost' })
    assert PropertyClone::EnvironmentGuard.production_like?({ database: 'd1abc', host: 'ec2-1-2-3-4.compute-1.amazonaws.com' })
    refute PropertyClone::EnvironmentGuard.production_like?({ database: 'pynwheel_audit_clone', host: 'localhost' })
    refute PropertyClone::EnvironmentGuard.production_like?({ database: 'pynwheel_test', host: nil })
  end
end
