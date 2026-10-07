# frozen_string_literal: true

# Shared setup of the Tour App API tests (test/controllers/api/tour_app/v1):
# Doorkeeper tokens for the fixture users, JSON helpers, and the extra rows
# that turn the wayfinding fixture property into the Python test fixture it
# replaces - a stop with a dwell time and rich-text instructions, a hidden
# stop, an amenity whose "Show in Stops List" is off, a duplicate stop row,
# an island stop that no path reaches, and a second building reached
# outdoors. Everything is created inside the test transaction.
module TourApiTestHelper
  BASE = '/api/tour/v1'
  JSON_HEADERS = { 'Content-Type' => 'application/json', 'Accept' => 'application/json' }.freeze
  SVG = %(<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1412 912"><rect width="10" height="10"/></svg>)

  def api_token_for(user, created_at: Time.current, expires_in: 5.days, revoked_at: nil)
    Doorkeeper::AccessToken.create!(resource_owner_id: user.id, expires_in: expires_in.to_i, scopes: '', created_at: created_at, revoked_at: revoked_at)
  end

  def auth(token = @token)
    value = token.is_a?(String) ? token : token.plaintext_token
    { 'Authorization' => "Bearer #{value}", 'Accept' => 'application/json' }
  end

  def body
    JSON.parse(response.body)
  end

  def post_json(path, payload, headers = auth)
    post path, params: payload.to_json, headers: headers.merge(JSON_HEADERS)
  end

  def all_stops(stops_body)
    stops_body['groups'].flat_map { |group| group['stops'] }
  end


  # The test environment's uploaders store to fog without a bucket, so the
  # URL of a stored file cannot be resolved there; the S3 URL the CMS would
  # answer is stood in for while the block runs (the graph payload is built
  # inside it).
  def with_s3_uploads(&block)
    resolver = lambda do |record, column, _base_url, bucket: nil|
      name = record.read_attribute(column)
      name.present? ? "https://bucket.s3-accelerate.amazonaws.com/uploads/#{record.class.base_class.name.underscore}/#{column}/#{record.id}/#{name}" : nil
    end
    image = ->(record, base_url, bucket: nil) { resolver.call(record, :image, base_url, bucket: bucket) }
    Connect::UploadUrl.stub(:upload, resolver) { Connect::UploadUrl.stub(:image, image, &block) }
  end

  def reset_tour_api_caches!
    TourApi::Engine.clear!
    TourApi::Properties.reset_cache!
    TourApi::Assets.clear!
    TourApi::Assets.http = nil
  end

  # The tour property of the wayfinding fixtures, extended.
  def build_tour_app_fixtures!
    @community = communities(:tour_property)
    @tour = tours(:main_tour)
    @plate_a = floorplates(:plate_a)
    @plate_b = floorplates(:plate_b)
    @unit101 = units(:plotted_unit)
    @unit301 = units(:plotted_unit_floor3)
    @gym = amenities(:gym)
    @lift = elevators(:lift)
    @stairs = elevators(:north_stairs)

    @gym.update_columns(directional_text: 'Past the mailroom.<font color="red"><br></font>', amenity_type: 'Fitness')
    @gym_stop = TourStop.create!(tour: @tour, stop_type: 'amenity', stop_id: @gym.id, name: 'Gym', sort: 0, display_stop: true, duration_minutes: 3)
    tour_stops(:unit_stop).update_columns(duration_minutes: 4, sort: 2)
    tour_stops(:unit_stop_floor3).update_columns(sort: 3)
    tour_stops(:lift_stop).update_columns(sort: 4)
    @floorplan = Floorplan.create!(community: @community, provider_floorplan_id: 'fp-a1', name: 'A1', bedrooms: '2', bathrooms: 2.0, square_feet: 850)
    @unit101.update_columns(stop_description: 'Turn left at the lobby', floorplan_id: 'fp-a1', effective_rent: 2400, market_rent: 2500, square_feet: 850)

    # 102 is a stop that Tour Setup hid.
    @hidden_stop = TourStop.create!(tour: @tour, stop_type: 'unit', stop_id: units(:unplotted_unit).id, name: '102', sort: 5, display_stop: false)
    # The Pool is a visible stop whose amenity form says "Show in Stops List" off.
    @pool = Amenity.create!(community: @community, name: 'Pool', amenityable: @plate_a, x_plot: 140, y_plot: 160, floor: 1, building: 'A', breezway_lock_visible: false)
    @pool_stop = TourStop.create!(tour: @tour, stop_type: 'amenity', stop_id: @pool.id, name: 'Pool', sort: 6, display_stop: true)

    # Building B: one plate, two linked hallway points, a unit and an entry gate.
    @plate_c = Floorplate.create!(name: 'Tower B', number: 3, building: 'B', range: '1', community: @community, width: 800, height: 500)
    @h7 = Hallway.create!(parent: @plate_c, community_id: @community.id, x_plot: 100, y_plot: 100, next_points: [])
    @h8 = Hallway.create!(parent: @plate_c, community_id: @community.id, x_plot: 300, y_plot: 100, next_points: [])
    @h7.update!(next_points: [@h8.id])
    @unit201 = Unit.create!(community: @community, floorplate: @plate_c, marketing_name: '201', provider_unit_id: 'u201', x_plot: 320, y_plot: 60, floor: 1, building: 'B',
                            visible: true, available: true, modal_unit: false)
    @unit201_stop = TourStop.create!(tour: @tour, stop_type: 'unit', stop_id: @unit201.id, name: '201', sort: 7, display_stop: true, duration_minutes: 2)
    @gate_b = BuildingStartingPoint.create!(community: @community, building: 'B', floor: 1, name: 'Tower B entrance', x_plot: 90, y_plot: 92, directional_text: 'Use the side gate')

    # A second (legacy duplicate) row for 101, and an island nobody can reach.
    @dup_stop = TourStop.create!(tour: @tour, stop_type: 'unit', stop_id: @unit101.id, name: '101 duplicate', sort: 8, display_stop: true)
    @island_hallway = Hallway.create!(parent: @plate_a, community_id: @community.id, x_plot: 700, y_plot: 50, next_points: [])
    @island = Unit.create!(community: @community, floorplate: @plate_a, marketing_name: 'Island', provider_unit_id: 'u999', x_plot: 700, y_plot: 40, floor: 1, building: 'A', visible: true)
    @island_stop = TourStop.create!(tour: @tour, stop_type: 'unit', stop_id: @island.id, name: 'Island', sort: 9, display_stop: true)

    @gym_key = "amenity:#{@gym.id}"
    @pool_key = "amenity:#{@pool.id}"
    @u101 = "unit:#{@unit101.id}"
    @u102 = "unit:#{units(:unplotted_unit).id}"
    @u301 = "unit:#{@unit301.id}"
    @u201 = "unit:#{@unit201.id}"
    @island_key = "unit:#{@island.id}"
    @start = "tour_start:#{@tour.id}"
    @level_a = "floorplate:#{@plate_a.id}"
    @level_b = "floorplate:#{@plate_b.id}"
    @level_c = "floorplate:#{@plate_c.id}"
    @base = "#{BASE}/properties/#{@community.id}"
    # A fresh instance: the fixture object's association caches predate the rows created above.
    @community = Community.find(@community.id)
    reset_tour_api_caches!
  end
end
