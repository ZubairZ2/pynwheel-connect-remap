require 'test_helper'

# The clone on real models: new rows, remapped references, sanitized columns,
# the integrity checks, duplicate and rollback behaviour, and the isolation
# of the clone from its source under the application's own write paths.
class PropertyClone::RunnerTest < ActiveSupport::TestCase
  setup do
    @source = communities(:tour_property)
    @company = companies(:one)
    @tour = tours(:main_tour)
    @source.update_columns(email: 'leasing@example.test', phone: '555-0100', code: 'TP1', data_provider: 'yardi', chat_control: true,
                           deleted_ids: [tour_stops(:unit_stop_floor3).id], multiple_locks_provider: %w[Igloohome])
    @tour.update_columns(sort_hash: { 'A,1' => [tour_stops(:unit_stop).id.to_s, '999999'], 'A,3' => [tour_stops(:unit_stop_floor3).id.to_s] }, access_code: '4321', credit_card_required: true)
    units(:plotted_unit).update_columns(access_code: '1234', lock_provider: 'Igloohome')
    TourSetting.create!(tour: @tour, buffer_minutes: 10, allow_virtual_tour: true)
    @credential = Credential.new(community_id: @source.id, password: 'secret', username: 'user', property_id: 'p1', apply_now: 'true', currency: 'USD')
    @credential.save!(validate: false)
    FavoriteStop.create!(community_id: @source.id, favorite_unit: [units(:plotted_unit).id.to_s, '42'], favorite_amenity: [], user_favorites_unit: { 'visitor@example.test' => ['1'] })
    @plan = PropertyClone::Plan.new(@source.id).resolve!
  end

  def clone!
    @runner = PropertyClone::Runner.new(@plan).execute!
    @clone = Community.find(@runner.clone_property_id)
    @clone_company = Company.find(@runner.clone_company_id)
    @runner
  end

  def mapped(table, source_id)
    @runner.id_map.get(table, source_id)
  end

  test 'clones the property under a new company with remapped, sanitized, independent rows' do
    before = { communities: Community.count, companies: Company.count, units: Unit.count, stops: TourStop.count, hallways: Hallway.count }
    clone!

    # new ids, new company, suffixed names
    refute_equal @source.id, @clone.id
    refute_equal @company.id, @clone_company.id
    assert_equal @clone_company.id, @clone.company_id
    assert_equal 'Tour Property [SCRIPT TESTING]', @clone.name
    assert_equal 'MyString [SCRIPT TESTING]', @clone_company.name
    assert_equal [@clone.id], @clone_company.communities.pluck(:id)
    assert_equal before[:communities] + 1, Community.count
    assert_equal before[:companies] + 1, Company.count
    assert_equal @company.id, @source.reload.company_id
    assert_equal 'Tour Property', @source.name

    # the property row: configuration kept, contact / provider / chat / code sanitized
    assert_equal @source.is_sitemap, @clone.is_sitemap
    assert_equal @source.self_tour, @clone.self_tour
    assert_equal @source.auto_wayfinding, @clone.auto_wayfinding
    assert_nil @clone.email
    assert_nil @clone.phone
    assert_nil @clone.code
    assert_nil @clone.data_provider
    assert_equal false, @clone.chat_control
    assert_equal [], @clone.multiple_locks_provider
    assert_equal 'leasing@example.test', @source.email
    assert_equal 'yardi', @source.data_provider

    # inventory and maps
    source_units = Unit.where(community_id: @source.id).order(:id)
    clone_units = Unit.where(community_id: @clone.id).order(:id)
    assert_equal before[:units] + source_units.size, Unit.count
    assert_equal source_units.map(&:provider_unit_id), clone_units.map(&:provider_unit_id)
    assert_equal source_units.map { |u| [u.x_plot, u.y_plot, u.floor, u.building] }, clone_units.map { |u| [u.x_plot, u.y_plot, u.floor, u.building] }
    clone_plates = Floorplate.where(community_id: @clone.id).pluck(:id)
    clone_units.each { |u| assert_includes clone_plates + [nil], u.floorplate_id }
    assert_equal mapped('floorplates', floorplates(:plate_a).id), Unit.find(mapped('units', units(:plotted_unit).id)).floorplate_id
    assert_nil Unit.find(mapped('units', units(:plotted_unit).id)).access_code, 'access codes are cleared'
    assert_equal 'Igloohome', Unit.find(mapped('units', units(:plotted_unit).id)).lock_provider, 'lock_provider is configuration and stays'
    assert_equal '1234', units(:plotted_unit).reload.access_code
    assert_equal mapped('floorplates', floorplates(:plate_a).id), Amenity.find(mapped('amenities', amenities(:gym).id)).amenityable_id
    assert_equal 'Floorplate', Amenity.find(mapped('amenities', amenities(:gym).id)).amenityable_type
    door = Door.find(mapped('doors', doors(:unit_door).id))
    assert_equal ['Unit', mapped('units', units(:plotted_unit).id), @clone.id], [door.attached_with_type, door.attached_with_id, door.community_id]
    assert_equal mapped('floorplates', floorplates(:plate_a).id), Elevator.find(mapped('elevators', elevators(:lift).id)).floorplate_id

    # the wayfinding graph: parents and next_points remapped
    h1 = Hallway.find(mapped('hallways', hallways(:h1).id))
    assert_equal ['Floorplate', mapped('floorplates', floorplates(:plate_a).id), @clone.id], [h1.parent_type, h1.parent_id, h1.community_id]
    assert_equal [mapped('hallways', hallways(:h2).id)], h1.next_points
    assert_equal [hallways(:h2).id], hallways(:h1).reload.next_points
    assert_equal before[:hallways] + Hallway.where(parent: [floorplates(:plate_a), floorplates(:plate_b)]).where('id < ?', h1.id).count, Hallway.count

    # the tour and its stops
    clone_tour = Tour.find(mapped('tours', @tour.id))
    assert_equal @clone.id, clone_tour.community_id
    assert_nil clone_tour.tour_user_id
    assert_nil clone_tour.access_code
    assert_equal false, clone_tour.credit_card_required
    assert_equal '4321', @tour.reload.access_code
    assert_equal TourStop.where(tour_id: @tour.id).count, TourStop.where(tour_id: clone_tour.id).count
    clone_unit_stop = TourStop.find(mapped('tour_stops', tour_stops(:unit_stop).id))
    assert_equal ['unit', mapped('units', units(:plotted_unit).id), clone_tour.id], [clone_unit_stop.stop_type, clone_unit_stop.stop_id, clone_unit_stop.tour_id]
    clone_lift_stop = TourStop.find(mapped('tour_stops', tour_stops(:lift_stop).id))
    assert_equal ['elevator', mapped('elevators', elevators(:lift).id)], [clone_lift_stop.stop_type, clone_lift_stop.stop_id]
    assert_equal({ 'A,1' => [clone_unit_stop.id.to_s], 'A,3' => [mapped('tour_stops', tour_stops(:unit_stop_floor3).id).to_s] }, clone_tour.sort_hash)
    assert_equal({ 'A,1' => [tour_stops(:unit_stop).id.to_s, '999999'], 'A,3' => [tour_stops(:unit_stop_floor3).id.to_s] }, @tour.reload.sort_hash)
    assert_equal [mapped('tour_stops', tour_stops(:unit_stop_floor3).id)], @clone.deleted_ids
    assert_equal [tour_stops(:unit_stop_floor3).id], @source.reload.deleted_ids
    dropped = @runner.serialized_results.find { |r| r[:table] == 'tours' && r[:column] == 'sort_hash' }
    assert_equal ['999999'], dropped[:dropped]

    # favourites and credentials
    fav = FavoriteStop.find_by!(community_id: @clone.id)
    assert_equal [mapped('units', units(:plotted_unit).id).to_s], fav.favorite_unit
    assert_equal({}, fav.user_favorites_unit)
    cred = Credential.find_by!(community_id: @clone.id)
    assert_nil cred.password
    assert_nil cred.username
    assert_nil cred.property_id
    assert_equal 'true', cred.apply_now
    assert_equal 'USD', cred.currency
    assert_equal 'secret', @credential.reload.password

    # staff, bookings and siblings are not carried over
    assert_equal 0, CommunityUser.where(community_id: @clone.id).count
    assert_equal 0, User.where(company_id: @clone_company.id).count
    assert_equal 0, SchedualTour.where(community_id: @clone.id).count
    assert_equal @company.id, communities(:no_tour_property).reload.company_id
    assert_equal @company.id, communities(:sitemap_property).reload.company_id

    # the integrity checks
    verifier = PropertyClone::Verifier.new(@plan, @runner.id_map, baseline: @runner.baseline).run
    failures = verifier.checks.select { |c| c.status == 'FAIL' }
    assert_empty failures.map { |c| "#{c.name}: #{c.detail}" }
    assert_equal 14, verifier.checks.size
    assert verifier.checks.all? { |c| c.status == 'PASS' }, verifier.checks.map(&:to_h).inspect
  end

  test 'a second attempt for the same property fails safely and writes nothing' do
    clone!
    companies = Company.count
    communities = Community.count
    plan2 = PropertyClone::Plan.new(@source.id).resolve!
    assert plan2.conflicts.any?
    assert_raises(PropertyClone::Conflict) { PropertyClone::Runner.new(plan2).execute! }
    assert_equal companies, Company.count
    assert_equal communities, Community.count
    assert_equal 1, Company.where(name: 'MyString [SCRIPT TESTING]').count
  end

  test 'a failure in the middle rolls everything back' do
    counts = -> { [Company.count, Community.count, Floorplate.count, Unit.count, Credential.count, Design.count] }
    before = counts.call
    error = assert_raises(PropertyClone::Error) { PropertyClone::Runner.new(@plan, options: { fail_at: 'units' }).execute! }
    assert_includes error.message, 'PROPERTY_CLONE_FAIL_AT=units'
    assert_equal before, counts.call
    refute Company.where(name: 'MyString [SCRIPT TESTING]').exists?
    refute Community.where(name: 'Tour Property [SCRIPT TESTING]').exists?
    # and the clone can still be made afterwards
    clone!
    assert Company.where(name: 'MyString [SCRIPT TESTING]').exists?
  end

  test 'a dangling stop is skipped and reported, and the counts still verify' do
    ghost = TourStop.create!(tour: @tour, stop_type: 'unit', stop_id: 987_654_321, name: 'ghost', sort: 9, display_stop: true)
    @plan = PropertyClone::Plan.new(@source.id).resolve!
    clone!
    assert_nil mapped('tour_stops', ghost.id)
    assert_equal [{ id: ghost.id, reason: 'stop_type=unit stop_id=987654321 is not part of the clone' }], @runner.step_results['tour_stops'][:skipped]
    verifier = PropertyClone::Verifier.new(@plan, @runner.id_map, baseline: @runner.baseline).run
    assert verifier.passed?, verifier.checks.reject { |c| c.status == 'PASS' }.map(&:to_h).inspect
  end

  test 'the application write paths on the clone leave the source untouched' do
    clone!
    baseline = PropertyClone::Baseline.capture(@plan)
    clone_tour = Tour.find(mapped('tours', @tour.id))
    clone_lift_stop = TourStop.find(mapped('tour_stops', tour_stops(:lift_stop).id))
    clone_unit_stop = TourStop.find(mapped('tour_stops', tour_stops(:unit_stop).id))
    admin = users(:super_admin)

    # edit a stop's content (Connect Tour Stops)
    Stops::UpdateContent.call!(community: @clone, user: admin, tour_stop_id: clone_lift_stop.id, attributes: { 'name' => 'Lift Clone', 'instructions' => 'Clone only' })
    assert_equal ['Lift Clone', 'Clone only'], [Elevator.find(mapped('elevators', elevators(:lift).id)).name, Elevator.find(mapped('elevators', elevators(:lift).id)).directional_text]
    assert_equal 'Elevator 1', elevators(:lift).reload.name
    assert_equal 'Elevator 1', tour_stops(:lift_stop).reload.name

    # reorder, hide and remove stops (Connect Tour Setup)
    result = TourSetup::Save.call(community: @clone, user: admin, payload: {
      'base_version' => clone_tour.reload.tour_setup_version,
      'stops' => { 'order' => [clone_lift_stop.id, clone_unit_stop.id], 'visibility' => [{ 'id' => clone_unit_stop.id, 'visible' => false }], 'remove' => [mapped('tour_stops', tour_stops(:unit_stop_floor3).id)] }
    })
    assert result.respond_to?(:counts)
    refute TourStop.exists?(mapped('tour_stops', tour_stops(:unit_stop_floor3).id))
    assert TourStop.exists?(tour_stops(:unit_stop_floor3).id), 'the source stop survives the clone removal'
    assert_equal 3, TourStop.where(tour_id: @tour.id).count
    assert_equal 1, tour_stops(:unit_stop).reload.sort

    # scheduling settings and property configuration
    TourSetting.find_by!(tour_id: clone_tour.id).update!(buffer_minutes: 45, allow_virtual_tour: false)
    @clone.update!(name: 'Renamed clone [SCRIPT TESTING]', self_tour: false)
    @clone_company.update!(name: 'Renamed company [SCRIPT TESTING]')
    Unit.find(mapped('units', units(:plotted_unit).id)).update!(marketing_name: 'Clone 101', x_plot: 1, y_plot: 1)
    Hallway.find(mapped('hallways', hallways(:h1).id)).update!(x_plot: 7, next_points: [])
    Door.find(mapped('doors', doors(:unit_door).id)).destroy!
    Amenity.find(mapped('amenities', amenities(:gym).id)).destroy!
    Floorplate.find(mapped('floorplates', floorplates(:plate_b).id)).destroy!

    assert_equal 'Tour Property', @source.reload.name
    assert @source.self_tour
    assert_equal 'MyString', @company.reload.name
    assert_equal '101', units(:plotted_unit).reload.marketing_name
    assert_equal [hallways(:h2).id], hallways(:h1).reload.next_points
    assert Door.exists?(doors(:unit_door).id)
    assert Amenity.exists?(amenities(:gym).id)
    assert Floorplate.exists?(floorplates(:plate_b).id)
    assert_equal [], baseline.compare(PropertyClone::Baseline.capture(@plan)), 'every source digest is identical after the edits on the clone'
  end
end
