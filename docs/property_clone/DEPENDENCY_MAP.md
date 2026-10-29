# Property clone: dependency map

Generated from `app/services/property_clone/policy.rb` (policy 2026-10-28.1) by `script/property_clone/dependency_map.rb`. The property is the primary object; its company is a supporting dependency. Everything below is derived from the models, associations and schema in this repository.

## Categories

- `clone`: Clone as a new independent record
- `clone_remap`: Clone and remap its associations
- `recreate`: Recreate or attach a separate resource
- `exclude`: Excluded: unrelated to the selected property
- `sanitize`: Cloned with sensitive columns sanitized or external triggers disabled
- `approval`: Requires owner approval: ownership or cloning behaviour is ambiguous

## Tables cloned, in execution order

Every step runs after its parents. `remap` lists plain foreign keys rewritten to the clone ids, `polymorphic` the type/id pairs, `self` the columns pointing at the same table (second pass), `sanitized` the columns overwritten on the clone.

| # | step (table) | category | selection | remap | polymorphic | self | sanitized | note |
|---|---|---|---|---|---|---|---|---|
| 1 | `companies` | sanitize | the property's company (communities.company_id) |  |  |  | email, phone | Owning company: new id, name suffixed, contact email/phone cleared (notification targets). Its users, sibling properties, regions and groups the property does not use are not copied. |
| 2 | `company_settings` | clone_remap | company_id = source company | company_id→companies |  |  |  |  |
| 3 | `credentials (company level)` | sanitize | company_id = source company AND community_id IS NULL | company_id→companies, community_id→communities |  |  | password, username, licence_key, api_token, resman_apikey, zaremba_username, zaremba_password, crm_username, crm_password, crm_client_id, crm_client_secret, rentcafe_v2_auth_token, rentcafe_v2_token_expires_at, yardi_username, yardi_password, rentmanager_username, rentmanager_password, rentmanager_auth_token, property_id, pmc_id, site_id, c_code, p_code, url, server_name, database, platform, interface_entity, resman_partner_id, resman_account_id, resman_property_id, zaremba_filename, zaremba_property_id, entrata_url, xml_filename, xml_domain, perq_property_id, rentmanager_property_id, rentmanager_base_url, app_folio_property_id, app_folio_database_id, app_folio_property_group_id, apartmentlist_url, yardi_rent_cafe_api_url, crm_provider, data_error_message, data_error_exp | Company-level PMS credential: secrets and provider identifiers cleared, display settings kept. |
| 4 | `regions` | clone_remap | the property's region (communities.region_id) | company_id→companies |  |  | email, phone, contact | Only the region the property belongs to (Region#name is unique application-wide, so it is suffixed). |
| 5 | `community_groups` | clone_remap | the property's portfolio group (communities.community_group_id) | company_id→companies, region_id→regions |  |  | code | Only the portfolio group the property belongs to (name unique application-wide, code unique with properties). |
| 6 | `group_designs` | clone_remap | community_group_id IN cloned community_groups | community_group_id→community_groups |  |  |  |  |
| 7 | `group_homepage_images` | clone_remap | group_design_id IN cloned group_designs | group_design_id→group_designs |  |  |  |  |
| 8 | `group_homepage_videos` | clone_remap | group_design_id IN cloned group_designs | group_design_id→group_designs |  |  |  |  |
| 9 | `communities` | sanitize | the property row | company_id→companies, region_id→regions, community_group_id→community_groups |  |  | email, phone, property_manager_email, property_manager_phone, code, data_provider, data_provider_updated_on, chat_control, is_chat_available, locks_provider, multiple_locks_provider, realpage_pricing_data, entrata_exception_logs | The property. deleted_ids (tour stop ids) is remapped after the stops are cloned. |
| 10 | `credentials (property level)` | sanitize | community_id = source property | community_id→communities, company_id→companies |  |  | password, username, licence_key, api_token, resman_apikey, zaremba_username, zaremba_password, crm_username, crm_password, crm_client_id, crm_client_secret, rentcafe_v2_auth_token, rentcafe_v2_token_expires_at, yardi_username, yardi_password, rentmanager_username, rentmanager_password, rentmanager_auth_token, property_id, pmc_id, site_id, c_code, p_code, url, server_name, database, platform, interface_entity, resman_partner_id, resman_account_id, resman_property_id, zaremba_filename, zaremba_property_id, entrata_url, xml_filename, xml_domain, perq_property_id, rentmanager_property_id, rentmanager_base_url, app_folio_property_id, app_folio_database_id, app_folio_property_group_id, apartmentlist_url, yardi_rent_cafe_api_url, crm_provider, data_error_message, data_error_exp | Property PMS credential: secrets and provider identifiers cleared, display settings kept. |
| 11 | `crm_credentials` | sanitize | community_id = source property | community_id→communities |  |  | crm_provider, entrata_domain, entrata_username, entrata_password, entrata_property_id, realpage_site_id, realpage_pmc_id, rentcafe_c_code, rentcafe_p_code, rentcafe_domain, salesforce_username, salesforce_password, salesforce_client_id, salesforce_secret_id, salesforce_property_id, yardirentcafe_marketing_api_key, yardirentcafe_property_id, yardirentcafe_property_code, knock_community_id, knock_company_id, funnel_api_key, funnel_community_id | CRM credential: provider and every secret/identifier cleared. |
| 12 | `font_settings` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 13 | `map_filters` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 14 | `favorite_stops` | sanitize | community_id = source property | community_id→communities |  |  | user_favorites_unit, user_favorites_amenity | Property favourites: unit/amenity id arrays remapped; the per-visitor-email favourites (PII) are emptied. |
| 15 | `favorite_settings` | sanitize | community_id = source property | community_id→communities |  |  | email_from, email_bcc | eBrochure settings: sender/BCC addresses cleared. |
| 16 | `favorite_images` | clone_remap | favorite_setting_id IN cloned favorite_settings | favorite_setting_id→favorite_settings |  |  |  |  |
| 17 | `ebrochure_menu_buttons` | clone_remap | favorite_setting_id IN cloned favorite_settings | favorite_setting_id→favorite_settings |  |  |  |  |
| 18 | `designs` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 19 | `menus` | clone_remap | design_id IN cloned designs | design_id→designs |  |  |  |  |
| 20 | `gables` | clone_remap | design_id IN cloned designs | design_id→designs |  |  |  |  |
| 21 | `filter_panels` | clone_remap | design_id IN cloned designs | design_id→designs |  |  |  |  |
| 22 | `expressionists` | clone_remap | design_id IN cloned designs | design_id→designs |  |  |  |  |
| 23 | `home_screens` | clone_remap | design_id IN cloned designs | design_id→designs |  |  |  |  |
| 24 | `main_screens` | clone_remap | design_id IN cloned designs | design_id→designs |  |  |  |  |
| 25 | `home_page_images` | clone_remap | design_id IN cloned designs | design_id→designs |  |  |  |  |
| 26 | `homepage_icons` | clone_remap | design_id IN cloned designs | design_id→designs |  |  |  |  |
| 27 | `home_page_videos` | clone_remap | design_id IN cloned designs | design_id→designs |  |  |  |  |
| 28 | `neighborhoods` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 29 | `locations` | clone_remap | neighborhood_id IN cloned neighborhoods | neighborhood_id→neighborhoods |  |  |  |  |
| 30 | `three_d_maps_configurations` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 31 | `design_directions` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 32 | `calculator_configs` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 33 | `design_system_configs` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 34 | `hardware_specs` | sanitize | community_id = source property | community_id→communities |  |  | phone |  |
| 35 | `launch_remotes` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 36 | `crm_time_slots` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 37 | `crm_discovery_sources` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 38 | `touch_settings` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 39 | `bedroom_marker_colors` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 40 | `sub_communities` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 41 | `other_locks` | clone_remap | community_id = source property | community_id→communities |  |  |  | "Other" lock descriptions: text only, no credentials. |
| 42 | `galleries` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 43 | `gallery_images` | clone_remap | gallery_id IN cloned galleries | gallery_id→galleries, community_id→communities |  |  |  |  |
| 44 | `webpages` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 45 | `imagepages` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 46 | `additional_images` | clone_remap | imagepage_id IN cloned imagepages | imagepage_id→imagepages |  |  |  |  |
| 47 | `additional_files` | clone_remap | imagepage_id IN cloned imagepages | imagepage_id→imagepages |  |  |  |  |
| 48 | `tutorials` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 49 | `opening_hours` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 50 | `guided_opening_hours` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 51 | `tour_closures` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 52 | `floorplans` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 53 | `floorplates` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 54 | `sitemaps` | clone_remap | community_id = source property | community_id→communities |  |  |  |  |
| 55 | `units` | sanitize | community_id = source property | community_id→communities, floorplate_id→floorplates |  |  | access_code | Units with their plots; access codes cleared, lock_provider kept (no lock account or device is copied). units.floorplan_id is the PMS floor plan code (a string resolved through floorplans.provider_floorplan_id within the property), so it is copied as is. |
| 56 | `unit_space_details` | clone_remap | unit_id IN cloned units | unit_id→units, community_id→communities |  |  |  |  |
| 57 | `amenities` | sanitize | community_id = source property | community_id→communities, unit_id→units | amenityable_type/amenityable_id | floorplan_amenity_id | access_code |  |
| 58 | `amenity_galleries` | clone_remap | amenity_id IN cloned amenities | amenity_id→amenities |  | associated_amenity_gallery_id |  |  |
| 59 | `elevators` | sanitize | community_id = source property | community_id→communities, floorplate_id→floorplates, sitemap_id→sitemaps |  | duplicate_of | access_code |  |
| 60 | `elevator_galleries` | clone_remap | elevator_id IN cloned elevators | elevator_id→elevators |  |  |  |  |
| 61 | `building_starting_points` | sanitize | community_id = source property | community_id→communities |  |  | access_code |  |
| 62 | `doors` | sanitize | community_id = source property | community_id→communities | attached_with_type/attached_with_id |  | access_code | Unit/amenity doors and map access points; a door whose record no longer exists is skipped. |
| 63 | `hallway_detection_runs` | clone_remap | (parent_type, parent_id) IN cloned floorplates / sitemaps | community_id→communities | parent_type/parent_id |  |  | Detect Hallways runs: client_request_id is unique, so each clone gets a fresh one. |
| 64 | `hallways` | clone_remap | (parent_type, parent_id) IN cloned floorplates / sitemaps | community_id→communities, detection_run_id→hallway_detection_runs | parent_type/parent_id |  |  | Wayfinding nodes; next_points (hallway ids) is remapped after the pass. A legacy row with NULL community_id stays NULL, as on the source. |
| 65 | `hallway_edges` | clone_remap | (parent_type, parent_id) IN cloned floorplates / sitemaps | from_hallway_id→hallways, to_hallway_id→hallways, community_id→communities, detection_run_id→hallway_detection_runs | parent_type/parent_id |  |  |  |
| 66 | `hallway_suppressions` | clone_remap | (parent_type, parent_id) IN cloned floorplates / sitemaps | hallway_a_id→hallways, hallway_b_id→hallways, community_id→communities | parent_type/parent_id |  |  |  |
| 67 | `wayfinding_stops` | sanitize | community_id = source property | community_id→communities, hallway_id→hallways | map_type/map_id |  | access_code |  |
| 68 | `hallway_attachments` | clone_remap | (parent_type, parent_id) IN cloned floorplates / sitemaps | community_id→communities, hallway_id→hallways | parent_type/parent_id, attachable_type/attachable_id |  |  |  |
| 69 | `tours` | sanitize | community_id = source property AND tour_user_id IS NULL | community_id→communities |  |  | access_code, credit_card_required | The property tour(s) (tour_user_id IS NULL); per-visitor tours are excluded. sort_hash / copy_sort_hash (stop ids) are remapped after the stops. Card requirement (Stripe) turned off. |
| 70 | `tour_settings` | sanitize | tour_id IN cloned tours | tour_id→tours |  |  | charge_user_for_id_verfication | Scheduling and booking rules; the ID-verification charge (Stripe) is turned off. |
| 71 | `scheduler_widget_settings` | clone_remap | tour_id IN cloned tours | tour_id→tours |  |  |  |  |
| 72 | `tour_stops` | clone_remap | tour_id IN cloned tours | tour_id→tours | stop_type/stop_id |  |  | Stops of the property tour; a stop whose unit/amenity/elevator no longer exists is skipped. |
| 73 | `stop_details` | clone_remap | tour_stop_id IN cloned tour_stops | tour_stop_id→tour_stops |  |  |  |  |
| 74 | `stop_galleries` | clone_remap | tour_stop_id IN cloned tour_stops | tour_stop_id→tour_stops |  |  |  |  |
| 75 | `paths` | clone_remap | (map_path_type, map_path_id) IN cloned units / amenities / elevators / building_starting_points / tours / tour_stops / wayfinding_stops |  | map_path_type/map_path_id, map_path_to_type/map_path_to_id, map_path_from_type/map_path_from_id |  |  | Legacy routing paths owned by a cloned stop; the to/from endpoints are remapped, an endpoint outside the clone is cleared. |
| 76 | `path_points` | clone_remap | path_id IN cloned paths | path_id→paths |  |  |  |  |
| 77 | `neighbour_units` | clone_remap | path_point_id IN cloned path_points | path_point_id→path_points, unit_id→units |  |  |  |  |
| 78 | `statuses` | clone_remap | (statusable_type, statusable_id) IN every cloned row |  |  |  |  | Launch form statuses of every cloned record (polymorphic statusable, remapped). |

## Serialized columns that carry record ids (rewritten after the pass)

| table | column | storage | ids of |
|---|---|---|---|
| `communities` | `deleted_ids` | int_array | tour_stops |
| `hallways` | `next_points` | int_array | hallways |
| `favorite_stops` | `favorite_unit` | text_array | units |
| `favorite_stops` | `favorite_amenity` | text_array | amenities |
| `tours` | `sort_hash` | json_hash_of_id_lists | tour_stops |
| `tours` | `copy_sort_hash` | json_hash_of_id_lists | tour_stops |

## Per-row overrides

- `companies.name`, `regions.name`, `community_groups.name`, `communities.name`: the source name plus ` [SCRIPT TESTING]`.
- `hallway_detection_runs.client_request_id`: a fresh `clone-<uuid>` (unique index).
- `created_at` / `updated_at` are copied from the source rows (the manifest records when the clone was made).

## Excluded or disabled

| table(s) | category | reason |
|---|---|---|
| `communities (siblings)` | exclude | Sibling properties of the company are not the selected property. |
| `users` | exclude | Staff identities are not property data; a test administrator is bootstrapped separately. |
| `community_users` | exclude | Staff assignments of the source would grant the source staff access to the clone. |
| `tours (visitor tours)` | approval | Per-visitor tour rows are booking/visit data (PII). |
| `schedual_tours` | approval | Bookings hold visitor PII, CRM appointment ids and Stripe charge ids. |
| `tour_histories` | approval | Visit history (PII, lock access times). |
| `visited_stops` | approval | Per-visit stop events with photos and lock pins. |
| `tour_users` | approval | Visitors (PII, ID cards, Stripe customer ids); they are global records, not owned by the property. |
| `visitor_sessions` | exclude | Live visitor sessions. |
| `prospects` | approval | CRM prospect payloads (PII). |
| `as_guests / igloo_guests / igloohome_guests / latch_guests / zerv_guests` | exclude | Issued lock guest credentials and pins. |
| `pynwheel_access_users` | approval | Residents and staff of Pynwheel Access (PII, pin codes). |
| `favorites / shared_favorites / shared_tours` | exclude | Visitor favourites and share links (session data, tokens). |
| `chatrooms / chats / feedbacks` | exclude | Visitor chat (Pusher) and feedback. |
| `lock_histories / user_stripes / latch_auth_tokens` | exclude | Lock events, Stripe charges and vendor tokens of visitors. |
| `track_sessions / sdk_sessions / sdk_events / access_logs / web_hook_logs / impressions` | exclude | Analytics and request logs. |
| `svg_optimization_runs` | exclude | Optimizer history with S3 backup URLs of the source. |
| `versions (PaperTrail)` | exclude | Audit history of the source. |
| `comments` | exclude | Launch review comments of the source. |
| `temporary_images` | exclude | Upload scratch rows. |
| `allowed_emails` | approval | Visitor e-mail allowlist (PII); restrict_access stays as on the source. |
| `map_partners` | sanitize | Partner map API keys are reusable secrets. |
| `igloohomes / igloohome_locks` | sanitize | Lock vendor account (tokens, client secrets) and the devices bound to real locks. |
| `latches / latch_locks` | sanitize | Lock vendor account and devices. |
| `zervs / zerv_locks` | sanitize | Lock vendor account and devices (universal access codes). |
| `dwelos / edge_states / remote_locks` | sanitize | Lock vendor accounts and devices. |
| `schlages / yales` | sanitize | Lock vendor accounts. |
| `elevator_banks` | sanitize | Elevator-to-lock bindings (lock ids). |
| `unit_elevators / maps_positions / portal_tours / portal_tour_stops / portal_tour_stop_galleries` | exclude | Legacy tables without a model or code path. |

## Files (S3)

Every CarrierWave uploader stores under `uploads/<model>/<mount>/<record id>/`, so the clone gets its own copy of each folder (server-side copy, never overwriting, never deleting), after the database transaction. The `*_url` columns (`standard_image_url`, `svg_image_url`, `thumb_image_url`, `large_image_url`, `ios_image_url`) are rewritten to the clone prefix only once the copy succeeded; until then they read the source objects (read-only). Models with uploaders among the cloned tables:

