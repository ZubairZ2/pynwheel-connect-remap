require 'test_helper'

class UserTest < ActiveSupport::TestCase
  setup do
    @property = communities(:tour_property)
    @other = communities(:two)
  end

  test 'a super admin may access every property' do
    assert users(:super_admin).can_access_community?(@property.id)
    assert users(:super_admin).can_access_community?(@other.id)
  end

  test 'a company admin may access the company properties and the assigned ones' do
    admin = users(:other_company_admin)
    assert admin.can_access_community?(@other.id)
    assert_not admin.can_access_community?(@property.id)
  end

  test 'everyone else may access only the assigned properties' do
    assert users(:community_admin).can_access_community?(@property.id)
    assert_not users(:community_admin).can_access_community?(@other.id)
    assert_not users(:unassigned_admin).can_access_community?(@property.id)
  end

  test 'a Dwelo admin may access assigned, Dwelo-created and Dwelo-company properties' do
    dwelo = User.create!(email: 'dwelo@example.test', password: 'password123', role: 'Dwelo admin')
    created = Community.create!(name: 'Dwelo made', company: companies(:one), creator_id: dwelo.id)
    assert dwelo.can_access_community?(created.id)
    assert_not dwelo.can_access_community?(@property.id)
  end

  test 'map edits are for admin roles within their properties' do
    assert users(:super_admin).can_edit_map?(@property)
    assert users(:community_admin).can_edit_map?(@property)
    assert users(:community_manager).can_edit_map?(@property)
    assert_not users(:community_assistant).can_edit_map?(@property)
    assert_not users(:other_company_admin).can_edit_map?(@property)
    assert_not users(:unassigned_admin).can_edit_map?(@property)
  end

  test 'a community assistant may read but not edit' do
    assert users(:community_assistant).can_read_map?(@property)
    assert_not users(:community_assistant).can_edit_map?(@property)
  end
end
