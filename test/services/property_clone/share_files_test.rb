require 'test_helper'

class PropertyClone::ShareFilesTest < ActiveSupport::TestCase
  setup do
    floorplates(:plate_a).update_columns(image: 'a.png')
    units(:plotted_unit).update_columns(image: 'u.png')
    @plan = PropertyClone::Plan.new(communities(:tour_property).id).resolve!
    @runner = PropertyClone::Runner.new(@plan).execute!
  end

  test 'the runner points every cloned row with a file at the source folder, and the verifier checks it' do
    clone_plate = Floorplate.find(@runner.id_map.get('floorplates', floorplates(:plate_a).id))
    assert_equal floorplates(:plate_a).id, clone_plate.file_source_id
    assert_equal floorplates(:plate_a).image.url, clone_plate.image.url
    clone_unit = Unit.find(@runner.id_map.get('units', units(:plotted_unit).id))
    assert_equal units(:plotted_unit).id, clone_unit.file_source_id
    assert_equal units(:plotted_unit).image.url, clone_unit.image.url
    plate_b = Floorplate.find(@runner.id_map.get('floorplates', floorplates(:plate_b).id))
    assert_equal floorplates(:plate_b).id, plate_b.file_source_id, 'set on every row, file or not'
    verifier = PropertyClone::Verifier.new(@plan, @runner.id_map, baseline: @runner.baseline).run
    check = verifier.checks.find { |c| c.name.start_with?('12') }
    assert_equal 'PASS', check.status, check.detail
    assert verifier.passed?, verifier.checks.reject { |c| c.status == 'PASS' }.map(&:to_h).inspect
  end

  test 'a clone of a clone reads the original folder' do
    clone = Community.find(@runner.clone_property_id)
    plan2 = PropertyClone::Plan.new(clone.id, suffix: ' [SCRIPT TESTING 2]').resolve!
    runner2 = PropertyClone::Runner.new(plan2).execute!
    first_plate = @runner.id_map.get('floorplates', floorplates(:plate_a).id)
    second = Floorplate.find(runner2.id_map.get('floorplates', first_plate))
    assert_equal floorplates(:plate_a).id, second.file_source_id
  end

  test 'share_files backfills an older clone and the verifier fails before it' do
    clone_plate_id = @runner.id_map.get('floorplates', floorplates(:plate_a).id)
    clone_unit_id = @runner.id_map.get('units', units(:plotted_unit).id)
    Floorplate.where(id: clone_plate_id).update_all(file_source_id: nil)
    Unit.where(id: clone_unit_id).update_all(file_source_id: nil)
    check = PropertyClone::Verifier.new(@plan, @runner.id_map).run.checks.find { |c| c.name.start_with?('12') }
    assert_equal 'FAIL', check.status

    result = PropertyClone::ShareFiles.call(@runner.id_map)
    assert_equal({ 'floorplates' => 1, 'units' => 1 }, result.tables)
    assert_equal floorplates(:plate_a).id, Floorplate.find(clone_plate_id).file_source_id
    assert_equal units(:plotted_unit).id, Unit.find(clone_unit_id).file_source_id
    check = PropertyClone::Verifier.new(@plan, @runner.id_map).run.checks.find { |c| c.name.start_with?('12') }
    assert_equal 'PASS', check.status, check.detail
    assert_equal 0, PropertyClone::ShareFiles.call(@runner.id_map).rows, 'idempotent'
  end
end
