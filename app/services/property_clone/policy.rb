# frozen_string_literal: true

# Property-centred cloning (October 28, 2026).
#
# PropertyClone copies ONE property (a `communities` row) together with the
# company it belongs to and every record the property needs to work on its
# own, into brand-new rows with new primary keys, and remaps every foreign
# key, polymorphic pair and id-bearing serialized column onto the new rows.
# The source is only read. This file is the dependency map, as code: which
# tables are copied, how each row finds its parent, which columns are
# sanitized, and which tables are left out and why. `PropertyClone::Plan`
# resolves it against a source property (the dry run), `PropertyClone::Runner`
# executes it row by row with `INSERT ... SELECT` so that no model callback,
# validation, PaperTrail version, uploader or background job fires.
#
# Classification used throughout (the owner's six categories):
#   :clone         clone as a new independent record
#   :clone_remap   clone and remap its associations
#   :recreate      recreate or attach a separate resource (files on S3)
#   :exclude       excluded, unrelated to the selected property
#   :sanitize      cloned, but sensitive columns cleared / external triggers off
#   :approval      requires the owner's approval before it is cloned
module PropertyClone
  module Policy
    SUFFIX = ' [SCRIPT TESTING]'
    VERSION = '2026-10-28.1'

    CATEGORIES = {
      clone: 'Clone as a new independent record',
      clone_remap: 'Clone and remap its associations',
      recreate: 'Recreate or attach a separate resource',
      exclude: 'Excluded: unrelated to the selected property',
      sanitize: 'Cloned with sensitive columns sanitized or external triggers disabled',
      approval: 'Requires owner approval: ownership or cloning behaviour is ambiguous'
    }.freeze

    # One table of the plan.
    #
    #   table      the table copied
    #   key        unique name of the step (a table may appear twice: credentials)
    #   model      the ActiveRecord class name (statuses, uploaders)
    #   select     how the source rows are found (see Plan#selection_sql)
    #   remap      { column => target table }: plain foreign keys to remap
    #   poly       [[type_column, id_column], ...]: polymorphic pairs to remap
    #   self_refs  columns that point at the same table (remapped in a 2nd pass)
    #   sanitize   { column => value }: columns overwritten on the clone
    #   overrides  ->(ctx, source_row) { column => value }: per-row values
    #   on_missing { column => :null | :skip | :fail }: what to do when a
    #              non-NULL reference has no clone (default :null for remap
    #              columns, :skip for polymorphic pairs, :fail for `required`)
    #   required   remap columns that must resolve (otherwise the run fails)
    Step = Struct.new(:table, :key, :model, :category, :select, :remap, :poly, :self_refs,
                      :sanitize, :overrides, :on_missing, :required, :note, keyword_init: true) do
      def missing_policy(column, default)
        (on_missing || {}).fetch(column, default)
      end

      def poly_pairs
        poly || []
      end

      def remap_columns
        remap || {}
      end

      def self_ref_columns
        self_refs || []
      end

      def sanitized_columns
        sanitize || {}
      end
    end

    def self.step(table, **opts)
      Step.new(table: table, key: opts.delete(:key) || table, **opts)
    end

    # Columns of `credentials` (company level and property level) that are
    # cleared on the clone. Secrets, and the provider identifiers that would
    # let the clone reach the real PMS/CRM with the environment's own keys.
    # Display settings (apply_now, currency, unit_name_key, the booleans) stay.
    CREDENTIAL_SANITIZE = %w[
      password username licence_key api_token resman_apikey zaremba_username zaremba_password
      crm_username crm_password crm_client_id crm_client_secret rentcafe_v2_auth_token
      rentcafe_v2_token_expires_at yardi_username yardi_password rentmanager_username
      rentmanager_password rentmanager_auth_token
      property_id pmc_id site_id c_code p_code url server_name database platform interface_entity
      resman_partner_id resman_account_id resman_property_id zaremba_filename zaremba_property_id
      entrata_url xml_filename xml_domain perq_property_id rentmanager_property_id rentmanager_base_url
      app_folio_property_id app_folio_database_id app_folio_property_group_id apartmentlist_url
      yardi_rent_cafe_api_url crm_provider data_error_message data_error_exp
    ].index_with { nil }.freeze

    CRM_CREDENTIAL_SANITIZE = %w[
      crm_provider entrata_domain entrata_username entrata_password entrata_property_id
      realpage_site_id realpage_pmc_id rentcafe_c_code rentcafe_p_code rentcafe_domain
      salesforce_username salesforce_password salesforce_client_id salesforce_secret_id
      salesforce_property_id yardirentcafe_marketing_api_key yardirentcafe_property_id
      yardirentcafe_property_code knock_community_id knock_company_id funnel_api_key funnel_community_id
    ].index_with { nil }.freeze

    # The property row itself. Contact details are notification targets
    # (booking mails and SMS go to them), chat reaches Pusher, the data
    # provider drives the scheduled importers and the lock vendors are
    # derived from the (excluded) lock accounts. `code` is unique across
    # properties and groups and identifies the kiosk, so the clone gets none.
    COMMUNITY_SANITIZE = {
      'email' => nil, 'phone' => nil, 'property_manager_email' => nil, 'property_manager_phone' => nil,
      'code' => nil, 'data_provider' => nil, 'data_provider_updated_on' => 'Never',
      'chat_control' => false, 'is_chat_available' => false,
      'locks_provider' => nil, 'multiple_locks_provider' => [],
      'realpage_pricing_data' => nil, 'entrata_exception_logs' => nil
    }.freeze

    LOCK_STOP_SANITIZE = { 'access_code' => nil }.freeze

    STOP_TABLES = %w[units amenities elevators building_starting_points tours tour_stops wayfinding_stops].freeze
    MAP_TABLES = %w[floorplates sitemaps].freeze

    # Ordered: every step's parents come earlier.
    STEPS = [
      # ----- the supporting company ---------------------------------------
      step('companies', model: 'Company', category: :sanitize, select: { id: :company },
           sanitize: { 'email' => nil, 'phone' => nil },
           overrides: ->(ctx, row) { { 'name' => ctx.suffixed(row['name']) } },
           note: 'Owning company: new id, name suffixed, contact email/phone cleared (notification targets). Its users, sibling properties, regions and groups the property does not use are not copied.'),
      step('company_settings', model: 'CompanySetting', category: :clone_remap,
           select: { column: 'company_id', value: :company }, remap: { 'company_id' => 'companies' }, required: %w[company_id]),
      step('credentials', key: 'credentials (company level)', model: 'Credential', category: :sanitize,
           select: { column: 'company_id', value: :company, where: 'community_id IS NULL' },
           remap: { 'company_id' => 'companies' }, required: %w[company_id],
           sanitize: CREDENTIAL_SANITIZE,
           note: 'Company-level PMS credential: secrets and provider identifiers cleared, display settings kept.'),
      step('regions', model: 'Region', category: :clone_remap, select: { id: :region },
           remap: { 'company_id' => 'companies' }, required: %w[company_id],
           sanitize: { 'email' => nil, 'phone' => nil, 'contact' => nil },
           overrides: ->(ctx, row) { { 'name' => ctx.suffixed(row['name']) } },
           note: 'Only the region the property belongs to (Region#name is unique application-wide, so it is suffixed).'),
      step('community_groups', model: 'CommunityGroup', category: :clone_remap, select: { id: :group },
           remap: { 'company_id' => 'companies', 'region_id' => 'regions' }, required: %w[company_id],
           sanitize: { 'code' => nil },
           overrides: ->(ctx, row) { { 'name' => ctx.suffixed(row['name']) } },
           note: 'Only the portfolio group the property belongs to (name unique application-wide, code unique with properties).'),
      step('group_designs', model: 'GroupDesign', category: :clone_remap,
           select: { parent: 'community_group_id', table: 'community_groups' }, remap: { 'community_group_id' => 'community_groups' }, required: %w[community_group_id]),
      step('group_homepage_images', model: 'GroupHomepageImage', category: :clone_remap,
           select: { parent: 'group_design_id', table: 'group_designs' }, remap: { 'group_design_id' => 'group_designs' }, required: %w[group_design_id]),
      step('group_homepage_videos', model: 'GroupHomepageVideo', category: :clone_remap,
           select: { parent: 'group_design_id', table: 'group_designs' }, remap: { 'group_design_id' => 'group_designs' }, required: %w[group_design_id]),

      # ----- the property ------------------------------------------------
      step('communities', model: 'Community', category: :sanitize, select: { id: :source },
           remap: { 'company_id' => 'companies', 'region_id' => 'regions', 'community_group_id' => 'community_groups' },
           required: %w[company_id], sanitize: COMMUNITY_SANITIZE,
           overrides: ->(ctx, row) { { 'name' => ctx.suffixed(row['name']) } },
           note: 'The property. deleted_ids (tour stop ids) is remapped after the stops are cloned.'),
      step('credentials', key: 'credentials (property level)', model: 'Credential', category: :sanitize,
           select: { column: 'community_id', value: :source },
           remap: { 'community_id' => 'communities', 'company_id' => 'companies' }, required: %w[community_id],
           sanitize: CREDENTIAL_SANITIZE,
           note: 'Property PMS credential: secrets and provider identifiers cleared, display settings kept.'),
      step('crm_credentials', model: 'CrmCredential', category: :sanitize, select: { column: 'community_id', value: :source },
           remap: { 'community_id' => 'communities' }, required: %w[community_id], sanitize: CRM_CREDENTIAL_SANITIZE,
           note: 'CRM credential: provider and every secret/identifier cleared.'),

      # ----- property configuration (has_one / has_many) -------------------
      step('font_settings', model: 'FontSetting', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('map_filters', model: 'MapFilter', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('favorite_stops', model: 'FavoriteStop', category: :sanitize, select: { column: 'community_id', value: :source },
           remap: { 'community_id' => 'communities' }, required: %w[community_id],
           sanitize: { 'user_favorites_unit' => {}, 'user_favorites_amenity' => {} },
           note: 'Property favourites: unit/amenity id arrays remapped; the per-visitor-email favourites (PII) are emptied.'),
      step('favorite_settings', model: 'FavoriteSetting', category: :sanitize, select: { column: 'community_id', value: :source },
           remap: { 'community_id' => 'communities' }, required: %w[community_id],
           sanitize: { 'email_from' => nil, 'email_bcc' => nil }, note: 'eBrochure settings: sender/BCC addresses cleared.'),
      step('favorite_images', model: 'FavoriteImage', category: :clone_remap, select: { parent: 'favorite_setting_id', table: 'favorite_settings' }, remap: { 'favorite_setting_id' => 'favorite_settings' }, required: %w[favorite_setting_id]),
      step('ebrochure_menu_buttons', model: 'EbrochureMenuButton', category: :clone_remap, select: { parent: 'favorite_setting_id', table: 'favorite_settings' }, remap: { 'favorite_setting_id' => 'favorite_settings' }, required: %w[favorite_setting_id]),
      step('designs', model: 'Design', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('menus', model: 'Menu', category: :clone_remap, select: { parent: 'design_id', table: 'designs' }, remap: { 'design_id' => 'designs' }, required: %w[design_id]),
      step('gables', model: 'Gable', category: :clone_remap, select: { parent: 'design_id', table: 'designs' }, remap: { 'design_id' => 'designs' }, required: %w[design_id]),
      step('filter_panels', model: 'FilterPanel', category: :clone_remap, select: { parent: 'design_id', table: 'designs' }, remap: { 'design_id' => 'designs' }, required: %w[design_id]),
      step('expressionists', model: 'Expressionist', category: :clone_remap, select: { parent: 'design_id', table: 'designs' }, remap: { 'design_id' => 'designs' }, required: %w[design_id]),
      step('home_screens', model: 'HomeScreen', category: :clone_remap, select: { parent: 'design_id', table: 'designs' }, remap: { 'design_id' => 'designs' }, required: %w[design_id]),
      step('main_screens', model: 'MainScreen', category: :clone_remap, select: { parent: 'design_id', table: 'designs' }, remap: { 'design_id' => 'designs' }, required: %w[design_id]),
      step('home_page_images', model: 'HomePageImage', category: :clone_remap, select: { parent: 'design_id', table: 'designs' }, remap: { 'design_id' => 'designs' }, required: %w[design_id]),
      step('homepage_icons', model: 'HomepageIcon', category: :clone_remap, select: { parent: 'design_id', table: 'designs' }, remap: { 'design_id' => 'designs' }, required: %w[design_id]),
      step('home_page_videos', model: 'HomePageVideo', category: :clone_remap, select: { parent: 'design_id', table: 'designs' }, remap: { 'design_id' => 'designs' }, required: %w[design_id]),
      step('neighborhoods', model: 'Neighborhood', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('locations', model: 'Location', category: :clone_remap, select: { parent: 'neighborhood_id', table: 'neighborhoods' }, remap: { 'neighborhood_id' => 'neighborhoods' }, required: %w[neighborhood_id]),
      step('three_d_maps_configurations', model: 'ThreeDMapsConfiguration', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('design_directions', model: 'DesignDirection', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('calculator_configs', model: 'CalculatorConfig', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('design_system_configs', model: 'DesignSystemConfig', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('hardware_specs', model: 'HardwareSpec', category: :sanitize, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id], sanitize: { 'phone' => nil }),
      step('launch_remotes', model: 'LaunchRemote', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('crm_time_slots', model: 'CrmTimeSlot', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('crm_discovery_sources', model: 'CrmDiscoverySource', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('touch_settings', model: 'TouchSetting', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('bedroom_marker_colors', model: 'BedroomMarkerColor', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('sub_communities', model: 'SubCommunity', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('other_locks', model: 'OtherLock', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id],
           note: '"Other" lock descriptions: text only, no credentials.'),
      step('galleries', model: 'Gallery', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('gallery_images', model: 'GalleryImage', category: :clone_remap, select: { parent: 'gallery_id', table: 'galleries' },
           remap: { 'gallery_id' => 'galleries', 'community_id' => 'communities' }, required: %w[gallery_id]),
      step('webpages', model: 'Webpage', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('imagepages', model: 'Imagepage', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('additional_images', model: 'AdditionalImage', category: :clone_remap, select: { parent: 'imagepage_id', table: 'imagepages' }, remap: { 'imagepage_id' => 'imagepages' }, required: %w[imagepage_id]),
      step('additional_files', model: 'AdditionalFile', category: :clone_remap, select: { parent: 'imagepage_id', table: 'imagepages' }, remap: { 'imagepage_id' => 'imagepages' }, required: %w[imagepage_id]),
      step('tutorials', model: 'Tutorial', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('opening_hours', model: 'OpeningHour', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('guided_opening_hours', model: 'GuidedOpeningHour', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('tour_closures', model: 'TourClosure', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),

      # ----- inventory and maps -------------------------------------------
      step('floorplans', model: 'Floorplan', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('floorplates', model: 'Floorplate', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('sitemaps', model: 'Sitemap', category: :clone_remap, select: { column: 'community_id', value: :source }, remap: { 'community_id' => 'communities' }, required: %w[community_id]),
      step('units', model: 'Unit', category: :sanitize, select: { column: 'community_id', value: :source },
           remap: { 'community_id' => 'communities', 'floorplate_id' => 'floorplates' }, required: %w[community_id],
           sanitize: LOCK_STOP_SANITIZE,
           note: 'Units with their plots; access codes cleared, lock_provider kept (no lock account or device is copied). units.floorplan_id is the PMS floor plan code (a string resolved through floorplans.provider_floorplan_id within the property), so it is copied as is.'),
      step('unit_space_details', model: 'UnitSpaceDetail', category: :clone_remap, select: { parent: 'unit_id', table: 'units' },
           remap: { 'unit_id' => 'units', 'community_id' => 'communities' }, required: %w[unit_id]),
      step('amenities', model: 'Amenity', category: :sanitize, select: { column: 'community_id', value: :source },
           remap: { 'community_id' => 'communities', 'unit_id' => 'units' }, poly: [%w[amenityable_type amenityable_id]],
           on_missing: { 'amenityable_id' => :null }, self_refs: %w[floorplan_amenity_id], required: %w[community_id],
           sanitize: LOCK_STOP_SANITIZE),
      step('amenity_galleries', model: 'AmenityGallery', category: :clone_remap, select: { parent: 'amenity_id', table: 'amenities' },
           remap: { 'amenity_id' => 'amenities' }, self_refs: %w[associated_amenity_gallery_id], required: %w[amenity_id]),
      step('elevators', model: 'Elevator', category: :sanitize, select: { column: 'community_id', value: :source },
           remap: { 'community_id' => 'communities', 'floorplate_id' => 'floorplates', 'sitemap_id' => 'sitemaps' },
           self_refs: %w[duplicate_of], required: %w[community_id], sanitize: LOCK_STOP_SANITIZE),
      step('elevator_galleries', model: 'ElevatorGallery', category: :clone_remap, select: { parent: 'elevator_id', table: 'elevators' }, remap: { 'elevator_id' => 'elevators' }, required: %w[elevator_id]),
      step('building_starting_points', model: 'BuildingStartingPoint', category: :sanitize, select: { column: 'community_id', value: :source },
           remap: { 'community_id' => 'communities' }, required: %w[community_id], sanitize: LOCK_STOP_SANITIZE),
      step('doors', model: 'Door', category: :sanitize, select: { column: 'community_id', value: :source },
           remap: { 'community_id' => 'communities' }, poly: [%w[attached_with_type attached_with_id]], required: %w[community_id],
           sanitize: LOCK_STOP_SANITIZE, note: 'Unit/amenity doors and map access points; a door whose record no longer exists is skipped.'),
      step('hallway_detection_runs', model: 'HallwayDetectionRun', category: :clone_remap,
           select: { poly: %w[parent_type parent_id], tables: MAP_TABLES },
           remap: { 'community_id' => 'communities' }, poly: [%w[parent_type parent_id]],
           overrides: ->(_ctx, _row) { { 'client_request_id' => "clone-#{SecureRandom.uuid}" } },
           note: 'Detect Hallways runs: client_request_id is unique, so each clone gets a fresh one.'),
      step('hallways', model: 'Hallway', category: :clone_remap, select: { poly: %w[parent_type parent_id], tables: MAP_TABLES },
           remap: { 'community_id' => 'communities', 'detection_run_id' => 'hallway_detection_runs' }, poly: [%w[parent_type parent_id]],
           note: 'Wayfinding nodes; next_points (hallway ids) is remapped after the pass. A legacy row with NULL community_id stays NULL, as on the source.'),
      step('hallway_edges', model: 'HallwayEdge', category: :clone_remap, select: { poly: %w[parent_type parent_id], tables: MAP_TABLES },
           remap: { 'from_hallway_id' => 'hallways', 'to_hallway_id' => 'hallways', 'community_id' => 'communities', 'detection_run_id' => 'hallway_detection_runs' },
           poly: [%w[parent_type parent_id]], on_missing: { 'from_hallway_id' => :skip, 'to_hallway_id' => :skip }),
      step('hallway_suppressions', model: 'HallwaySuppression', category: :clone_remap, select: { poly: %w[parent_type parent_id], tables: MAP_TABLES },
           remap: { 'hallway_a_id' => 'hallways', 'hallway_b_id' => 'hallways', 'community_id' => 'communities' }, poly: [%w[parent_type parent_id]]),
      step('wayfinding_stops', model: 'WayfindingStop', category: :sanitize, select: { column: 'community_id', value: :source },
           remap: { 'community_id' => 'communities', 'hallway_id' => 'hallways' }, poly: [%w[map_type map_id]], required: %w[community_id],
           sanitize: LOCK_STOP_SANITIZE),
      step('hallway_attachments', model: 'HallwayAttachment', category: :clone_remap, select: { poly: %w[parent_type parent_id], tables: MAP_TABLES },
           remap: { 'community_id' => 'communities', 'hallway_id' => 'hallways' }, poly: [%w[parent_type parent_id], %w[attachable_type attachable_id]]),

      # ----- the self-guided tour ------------------------------------------
      step('tours', model: 'Tour', category: :sanitize, select: { column: 'community_id', value: :source, where: 'tour_user_id IS NULL' },
           remap: { 'community_id' => 'communities' }, required: %w[community_id],
           sanitize: { 'access_code' => nil, 'credit_card_required' => false },
           note: 'The property tour(s) (tour_user_id IS NULL); per-visitor tours are excluded. sort_hash / copy_sort_hash (stop ids) are remapped after the stops. Card requirement (Stripe) turned off.'),
      step('tour_settings', model: 'TourSetting', category: :sanitize, select: { parent: 'tour_id', table: 'tours' },
           remap: { 'tour_id' => 'tours' }, required: %w[tour_id], sanitize: { 'charge_user_for_id_verfication' => false },
           note: 'Scheduling and booking rules; the ID-verification charge (Stripe) is turned off.'),
      step('scheduler_widget_settings', model: 'SchedulerWidgetSetting', category: :clone_remap, select: { parent: 'tour_id', table: 'tours' }, remap: { 'tour_id' => 'tours' }, required: %w[tour_id]),
      step('tour_stops', model: 'TourStop', category: :clone_remap, select: { parent: 'tour_id', table: 'tours' },
           remap: { 'tour_id' => 'tours' }, poly: [%w[stop_type stop_id]], required: %w[tour_id],
           note: 'Stops of the property tour; a stop whose unit/amenity/elevator no longer exists is skipped.'),
      step('stop_details', model: 'StopDetail', category: :clone_remap, select: { parent: 'tour_stop_id', table: 'tour_stops' }, remap: { 'tour_stop_id' => 'tour_stops' }, required: %w[tour_stop_id]),
      step('stop_galleries', model: 'StopGallery', category: :clone_remap, select: { parent: 'tour_stop_id', table: 'tour_stops' }, remap: { 'tour_stop_id' => 'tour_stops' }, required: %w[tour_stop_id]),
      step('paths', model: 'Path', category: :clone_remap, select: { poly: %w[map_path_type map_path_id], tables: STOP_TABLES },
           poly: [%w[map_path_type map_path_id], %w[map_path_to_type map_path_to_id], %w[map_path_from_type map_path_from_id]],
           on_missing: { 'map_path_to_id' => :null, 'map_path_from_id' => :null },
           note: 'Legacy routing paths owned by a cloned stop; the to/from endpoints are remapped, an endpoint outside the clone is cleared.'),
      step('path_points', model: 'PathPoint', category: :clone_remap, select: { parent: 'path_id', table: 'paths' }, remap: { 'path_id' => 'paths' }, required: %w[path_id]),
      step('neighbour_units', model: 'NeighbourUnit', category: :clone_remap, select: { parent: 'path_point_id', table: 'path_points' },
           remap: { 'path_point_id' => 'path_points', 'unit_id' => 'units' }, required: %w[path_point_id])
    ].freeze

    # Launch-form statuses (`statuses`, polymorphic statusable) are copied for
    # every cloned row whose model carries them, after the steps above.
    STATUSES = step('statuses', model: 'Status', category: :clone_remap, select: { statuses: true },
                    note: 'Launch form statuses of every cloned record (polymorphic statusable, remapped).').freeze

    # Serialized columns that carry record ids. Rewritten after the pass.
    #   [table, column, kind, target table]
    #   kind :int_array (integer[]), :text_array (text[] of ids), :json_hash_of_id_lists ({"k" => ["id", ...]})
    SERIALIZED_ID_COLUMNS = [
      %w[communities deleted_ids int_array tour_stops],
      %w[hallways next_points int_array hallways],
      %w[favorite_stops favorite_unit text_array units],
      %w[favorite_stops favorite_amenity text_array amenities],
      %w[tours sort_hash json_hash_of_id_lists tour_stops],
      %w[tours copy_sort_hash json_hash_of_id_lists tour_stops]
    ].freeze

    # Tables tied to the property that are deliberately NOT copied.
    #   [table, category, scope SQL against the source (for the counts in the
    #   report; :source, :company, :tours, :tour_users are substituted), reason]
    Exclusion = Struct.new(:table, :category, :scope, :reason, keyword_init: true)

    EXCLUSIONS = [
      Exclusion.new(table: 'communities (siblings)', category: :exclude, scope: 'company_id = :company AND id <> :source', reason: 'Sibling properties of the company are not the selected property.'),
      Exclusion.new(table: 'users', category: :exclude, scope: 'company_id = :company', reason: 'Staff identities are not property data; a test administrator is bootstrapped separately.'),
      Exclusion.new(table: 'community_users', category: :exclude, scope: 'community_id = :source', reason: 'Staff assignments of the source would grant the source staff access to the clone.'),
      Exclusion.new(table: 'tours (visitor tours)', category: :approval, scope: 'community_id = :source AND tour_user_id IS NOT NULL', reason: 'Per-visitor tour rows are booking/visit data (PII).'),
      Exclusion.new(table: 'schedual_tours', category: :approval, scope: 'community_id = :source', reason: 'Bookings hold visitor PII, CRM appointment ids and Stripe charge ids.'),
      Exclusion.new(table: 'tour_histories', category: :approval, scope: 'community_id = :source OR tour_id IN (:tours)', reason: 'Visit history (PII, lock access times).'),
      Exclusion.new(table: 'visited_stops', category: :approval, scope: 'tour_id IN (:tours)', reason: 'Per-visit stop events with photos and lock pins.'),
      Exclusion.new(table: 'tour_users', category: :approval, scope: 'id IN (SELECT tour_user_id FROM schedual_tours WHERE community_id = :source UNION SELECT tour_user_id FROM tour_histories WHERE community_id = :source)', reason: 'Visitors (PII, ID cards, Stripe customer ids); they are global records, not owned by the property.'),
      Exclusion.new(table: 'visitor_sessions', category: :exclude, scope: 'community_id = :source', reason: 'Live visitor sessions.'),
      Exclusion.new(table: 'prospects', category: :approval, scope: 'community_id = :source', reason: 'CRM prospect payloads (PII).'),
      Exclusion.new(table: 'as_guests / igloo_guests / igloohome_guests / latch_guests / zerv_guests', category: :exclude, scope: nil, reason: 'Issued lock guest credentials and pins.'),
      Exclusion.new(table: 'pynwheel_access_users', category: :approval, scope: 'community_id = :source', reason: 'Residents and staff of Pynwheel Access (PII, pin codes).'),
      Exclusion.new(table: 'favorites / shared_favorites / shared_tours', category: :exclude, scope: nil, reason: 'Visitor favourites and share links (session data, tokens).'),
      Exclusion.new(table: 'chatrooms / chats / feedbacks', category: :exclude, scope: nil, reason: 'Visitor chat (Pusher) and feedback.'),
      Exclusion.new(table: 'lock_histories / user_stripes / latch_auth_tokens', category: :exclude, scope: nil, reason: 'Lock events, Stripe charges and vendor tokens of visitors.'),
      Exclusion.new(table: 'track_sessions / sdk_sessions / sdk_events / access_logs / web_hook_logs / impressions', category: :exclude, scope: nil, reason: 'Analytics and request logs.'),
      Exclusion.new(table: 'svg_optimization_runs', category: :exclude, scope: 'community_id = :source', reason: 'Optimizer history with S3 backup URLs of the source.'),
      Exclusion.new(table: 'versions (PaperTrail)', category: :exclude, scope: 'community_id = :source', reason: 'Audit history of the source.'),
      Exclusion.new(table: 'comments', category: :exclude, scope: "commentable_type = 'Community' AND commentable_id = :source", reason: 'Launch review comments of the source.'),
      Exclusion.new(table: 'temporary_images', category: :exclude, scope: 'community_id = :source', reason: 'Upload scratch rows.'),
      Exclusion.new(table: 'allowed_emails', category: :approval, scope: 'community_id = :source', reason: 'Visitor e-mail allowlist (PII); restrict_access stays as on the source.'),
      Exclusion.new(table: 'map_partners', category: :sanitize, scope: 'community_id = :source', reason: 'Partner map API keys are reusable secrets.'),
      Exclusion.new(table: 'igloohomes / igloohome_locks', category: :sanitize, scope: 'community_id = :source', reason: 'Lock vendor account (tokens, client secrets) and the devices bound to real locks.'),
      Exclusion.new(table: 'latches / latch_locks', category: :sanitize, scope: 'community_id = :source', reason: 'Lock vendor account and devices.'),
      Exclusion.new(table: 'zervs / zerv_locks', category: :sanitize, scope: 'community_id = :source', reason: 'Lock vendor account and devices (universal access codes).'),
      Exclusion.new(table: 'dwelos / edge_states / remote_locks', category: :sanitize, scope: 'community_id = :source', reason: 'Lock vendor accounts and devices.'),
      Exclusion.new(table: 'schlages / yales', category: :sanitize, scope: 'community_id = :source', reason: 'Lock vendor accounts.'),
      Exclusion.new(table: 'elevator_banks', category: :sanitize, scope: nil, reason: 'Elevator-to-lock bindings (lock ids).'),
      Exclusion.new(table: 'unit_elevators / maps_positions / portal_tours / portal_tour_stops / portal_tour_stop_galleries', category: :exclude, scope: nil, reason: 'Legacy tables without a model or code path.')
    ].freeze

    # Tables an isolated clone must not have rows in (checked by the Verifier).
    CLONE_MUST_BE_EMPTY = %w[
      schedual_tours tour_histories visitor_sessions prospects pynwheel_access_users allowed_emails map_partners
      igloohomes latches zervs dwelos edge_states schlages yales svg_optimization_runs temporary_images
    ].freeze

    # *_url columns that mirror an uploader path; rewritten when files are copied.
    URL_COLUMNS = %w[standard_image_url svg_image_url thumb_image_url large_image_url ios_image_url].freeze

    def self.steps
      STEPS
    end

    def self.exclusions
      EXCLUSIONS
    end
  end
end
