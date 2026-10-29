require 'test_helper'

class PropertyClone::PlanTest < ActiveSupport::TestCase
  setup do
    @source = communities(:tour_property)
  end

  test 'resolves the footprint of a property without writing' do
    assert_no_difference(['Community.count', 'Company.count', 'Unit.count', 'TourStop.count', 'Hallway.count']) do
      @plan = PropertyClone::Plan.new(@source.id).resolve!
    end
    assert_equal @source, @plan.source
    assert_equal companies(:one), @plan.company
    assert_equal 'Tour Property [SCRIPT TESTING]', @plan.clone_property_name
    assert_equal 'MyString [SCRIPT TESTING]', @plan.clone_company_name
    assert_equal [@source.id], @plan.source_ids_for('communities')
    assert_equal Unit.where(community_id: @source.id).order(:id).pluck(:id), @plan.source_ids_for('units')
    assert_equal Floorplate.where(community_id: @source.id).order(:id).pluck(:id), @plan.source_ids_for('floorplates')
    assert_equal TourStop.where(tour_id: tours(:main_tour).id).order(:id).pluck(:id), @plan.source_ids_for('tour_stops')
    assert_equal Hallway.where(parent: [floorplates(:plate_a), floorplates(:plate_b)]).order(:id).pluck(:id), @plan.source_ids_for('hallways')
    assert_equal [doors(:unit_door).id], @plan.source_ids_for('doors')
    assert_equal @plan.source_ids_for('units').size, @plan.expected_count('units')
    assert_empty @plan.conflicts
    siblings = Community.where(company_id: companies(:one).id).where.not(id: @source.id).order(:id).pluck(:id)
    assert_equal siblings, @plan.sibling_ids
    assert_includes @plan.notes.join, "#{siblings.size} sibling properties stay with the source company"
    assert @plan.exclusions.any? { |e| e[:table] == 'communities (siblings)' && e[:source_count] == siblings.size }
    assert @plan.exclusions.any? { |e| e[:table] == 'community_users' && e[:source_count] == CommunityUser.where(community_id: @source.id).count }
  end

  test 'a stop whose record is gone is predicted as skipped; a cleared optional reference is reported' do
    gone = TourStop.create!(tour: tours(:main_tour), stop_type: 'unit', stop_id: 987_654_321, name: 'ghost', sort: 9, display_stop: true)
    units(:plotted_unit).update_columns(floorplate_id: 123_456_789)
    plan = PropertyClone::Plan.new(@source.id).resolve!
    assert_equal [{ id: gone.id, reason: 'stop_type=unit stop_id=987654321 is not part of the clone' }], plan.skipped('tour_stops')
    assert_equal plan.source_ids_for('tour_stops').size - 1, plan.expected_count('tour_stops')
    assert_includes plan.cleared_references('units'), 'floorplate_id=123456789 cleared (not part of the clone)'
  end

  test 'unknown, missing and clone-suffixed sources' do
    assert_raises(PropertyClone::NotFound) { PropertyClone::Plan.new(0).resolve! }
    assert_raises(PropertyClone::NotFound) { PropertyClone::Plan.new(999_999_999).resolve! }
    @source.update_columns(name: 'Already [SCRIPT TESTING]')
    plan = PropertyClone::Plan.new(@source.id).resolve!
    assert plan.conflicts.any? { |c| c.include?('is itself a clone') }
  end

  test 'a company already carrying the clone name is a conflict' do
    Company.create!(name: 'MyString [SCRIPT TESTING]')
    plan = PropertyClone::Plan.new(@source.id).resolve!
    assert plan.conflicts.any? { |c| c.include?('already exists') }
  end

  test 'polymorphic type names resolve to tables, unknown ones to nil' do
    assert_equal 'units', PropertyClone::Plan.table_for_type('unit')
    assert_equal 'units', PropertyClone::Plan.table_for_type('Unit')
    assert_equal 'building_starting_points', PropertyClone::Plan.table_for_type('building_starting_point')
    assert_equal 'floorplates', PropertyClone::Plan.table_for_type('Floorplate')
    assert_equal 'tour_stops', PropertyClone::Plan.table_for_type('TourStop')
    assert_nil PropertyClone::Plan.table_for_type('NoSuchThing')
    assert_nil PropertyClone::Plan.table_for_type('')
  end

  test 'every policy step is ordered after its parents and names real tables and columns' do
    seen = []
    tables = ActiveRecord::Base.connection.tables
    PropertyClone::Policy.steps.each do |step|
      assert_includes tables, step.table, "#{step.key}: table"
      columns = ActiveRecord::Base.connection.columns(step.table).map(&:name)
      (step.remap_columns.keys + step.poly_pairs.flatten + step.self_ref_columns).each { |c| assert_includes columns, c, "#{step.key}: column #{c}" }
      step.remap_columns.each_value { |target| assert_includes seen + [step.table], target, "#{step.key}: remap target #{target} must come earlier" }
      sel = step.select
      assert_includes seen, sel[:table], "#{step.key}: parent #{sel[:table]} must come earlier" if sel[:parent]
      Array(sel[:tables]).each { |t| assert_includes seen, t, "#{step.key}: poly parent #{t} must come earlier" } if sel[:poly]
      assert step.model.safe_constantize, "#{step.key}: model #{step.model}"
      seen << step.table
    end
    PropertyClone::Policy::SERIALIZED_ID_COLUMNS.each do |table, column, _kind, target|
      assert_includes ActiveRecord::Base.connection.columns(table).map(&:name), column
      assert_includes seen, target
    end
  end
end
