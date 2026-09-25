# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.2].define(version: 2026_09_23_140000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_stat_statements"
  enable_extension "plpgsql"

  create_table "access_logs", id: :serial, force: :cascade do |t|
    t.string "lock_type"
    t.string "url"
    t.integer "community_id"
    t.integer "tour_user_id"
    t.boolean "is_resident"
    t.string "stop_ids", default: [], array: true
    t.jsonb "payload"
    t.jsonb "response"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
  end

  create_table "additional_files", id: :serial, force: :cascade do |t|
    t.string "file"
    t.string "name"
    t.integer "imagepage_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["imagepage_id"], name: "index_additional_files_on_imagepage_id"
  end

  create_table "additional_images", id: :serial, force: :cascade do |t|
    t.string "image"
    t.integer "sort"
    t.string "name"
    t.integer "imagepage_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.float "crop_x"
    t.float "crop_y"
    t.float "crop_w"
    t.float "crop_h"
    t.boolean "do_crop", default: false
    t.index ["imagepage_id"], name: "index_additional_images_on_imagepage_id"
  end

  create_table "alert_messages", id: :serial, force: :cascade do |t|
    t.string "message_key"
    t.string "message_body"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
  end

  create_table "allowed_emails", id: :serial, force: :cascade do |t|
    t.string "email"
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["community_id"], name: "index_allowed_emails_on_community_id"
  end

  create_table "amenities", id: :serial, force: :cascade do |t|
    t.string "provider_amenity_id"
    t.string "amenty_type"
    t.text "description"
    t.integer "unit_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "name"
    t.string "image"
    t.integer "x_plot"
    t.integer "y_plot"
    t.string "amenityable_type"
    t.integer "amenityable_id"
    t.integer "community_id"
    t.string "standard_image_url"
    t.integer "sort"
    t.string "access_code"
    t.string "directional_text"
    t.integer "floor"
    t.string "video_link"
    t.string "video_link_button_label", default: "PLAY VIDEO"
    t.string "mass_upload_id"
    t.string "building"
    t.integer "floorplan_amenity_id"
    t.float "crop_x"
    t.float "crop_y"
    t.float "crop_w"
    t.float "crop_h"
    t.boolean "do_crop"
    t.boolean "breezway_lock_visible", default: true
    t.string "lock_provider", default: ""
    t.string "amenity_type", default: ""
    t.integer "tour_visiting_order_number"
    t.jsonb "pointer_data", default: {}
    t.index ["amenityable_type", "amenityable_id"], name: "index_amenities_on_amenityable_type_and_amenityable_id"
    t.index ["community_id"], name: "index_amenities_on_community_id"
  end

  create_table "amenity_galleries", id: :serial, force: :cascade do |t|
    t.integer "amenity_id"
    t.string "image"
    t.string "description"
    t.string "name"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "directional_text"
    t.integer "sort"
    t.integer "associated_amenity_gallery_id"
    t.index ["amenity_id"], name: "index_amenity_galleries_on_amenity_id"
  end

  create_table "app_versions", id: :serial, force: :cascade do |t|
    t.string "version"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.integer "neighborhood_counter"
    t.integer "counter_limit", default: 500
    t.integer "portico_version", default: 1
  end

  create_table "as_guests", id: :serial, force: :cascade do |t|
    t.integer "community_id"
    t.string "guest_id"
    t.string "edgestate_pin"
    t.integer "tour_user_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.boolean "dwelo_guest", default: false
    t.integer "pynwheel_access_user_id"
    t.index ["community_id"], name: "index_as_guests_on_community_id"
    t.index ["pynwheel_access_user_id"], name: "index_as_guests_on_pynwheel_access_user_id"
    t.index ["tour_user_id"], name: "index_as_guests_on_tour_user_id"
  end

  create_table "bedroom_marker_colors", force: :cascade do |t|
    t.bigint "community_id", null: false
    t.integer "bedroom", null: false
    t.string "available_units_color", default: "#f9d648", null: false
    t.decimal "available_units_opacity", precision: 3, scale: 2, default: "1.0", null: false
    t.string "model_units_color", default: "#f57396", null: false
    t.decimal "model_units_opacity", precision: 3, scale: 2, default: "1.0", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["community_id", "bedroom"], name: "index_bedroom_marker_colors_on_community_id_and_bedroom", unique: true
    t.index ["community_id"], name: "index_bedroom_marker_colors_on_community_id"
  end

  create_table "building_starting_points", id: :serial, force: :cascade do |t|
    t.integer "community_id"
    t.integer "x_plot"
    t.integer "y_plot"
    t.integer "floor"
    t.string "name"
    t.string "building"
    t.string "image"
    t.string "directional_text"
    t.string "status"
    t.string "access_code"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "lock_provider", default: ""
    t.index ["community_id"], name: "index_building_starting_points_on_community_id"
  end

  create_table "calculator_configs", force: :cascade do |t|
    t.bigint "community_id", null: false
    t.boolean "enabled", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.jsonb "config_json", default: {}, null: false
    t.jsonb "published_config_json"
    t.datetime "published_at"
    t.index ["community_id"], name: "index_calculator_configs_on_community_id"
    t.index ["config_json"], name: "index_calculator_configs_on_config_json", using: :gin
  end

  create_table "chatrooms", id: :serial, force: :cascade do |t|
    t.integer "tour_user_id"
    t.integer "tour_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["tour_id"], name: "index_chatrooms_on_tour_id"
    t.index ["tour_user_id"], name: "index_chatrooms_on_tour_user_id"
  end

  create_table "chats", id: :serial, force: :cascade do |t|
    t.string "message"
    t.string "name"
    t.integer "chatroom_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "client_date"
    t.string "tour_key"
    t.index ["chatroom_id"], name: "index_chats_on_chatroom_id"
  end

  create_table "comments", id: :serial, force: :cascade do |t|
    t.bigint "commentable_id"
    t.string "commentable_type"
    t.text "content"
    t.integer "whodunit"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
  end

  create_table "communities", id: :serial, force: :cascade do |t|
    t.string "name"
    t.string "logo"
    t.string "address"
    t.string "city"
    t.string "state"
    t.string "zip"
    t.string "email"
    t.string "phone"
    t.string "description"
    t.decimal "latitude"
    t.decimal "longitude"
    t.boolean "locked"
    t.string "data_provider"
    t.integer "company_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "theme_name"
    t.string "website"
    t.string "code"
    t.boolean "is_sitemap", default: true
    t.string "secondary_logo"
    t.boolean "show_gallery", default: true
    t.string "gallery_page_name", default: "Gallery"
    t.boolean "show_apartment", default: true
    t.string "apartment_page_name", default: "Apartments"
    t.boolean "equal_housing_opportunity_logo", default: true
    t.boolean "handicap_accessible_logo", default: true
    t.boolean "display_rent", default: true
    t.boolean "display_sitemap", default: true
    t.boolean "display_floorplan_gallery", default: true
    t.boolean "display_unit_on_homepage", default: true
    t.boolean "display_gallery_on_homepage", default: true
    t.string "realpage_pricing_data"
    t.boolean "realpage_pricing_data_uploaded", default: true
    t.boolean "powered_by_btn", default: true
    t.string "entrata_exception_logs"
    t.boolean "is_vertical_app", default: false
    t.boolean "show_tour_page"
    t.boolean "display_available_date", default: true
    t.boolean "show_gesture_icons", default: true
    t.boolean "self_tour", default: false
    t.boolean "floorplan_name_order"
    t.integer "community_group_id"
    t.float "crop_x"
    t.float "crop_y"
    t.float "crop_w"
    t.float "crop_h"
    t.float "crop_x_secondary"
    t.float "crop_y_secondary"
    t.float "crop_w_secondary"
    t.float "crop_h_secondary"
    t.boolean "image_bit"
    t.boolean "do_crop", default: false
    t.boolean "do_crop_secondary", default: false
    t.integer "alert_contact", default: 2
    t.integer "number_of_units"
    t.boolean "tour_setup_visible", default: false
    t.boolean "master_community", default: false
    t.string "menu_button_shade", default: "light"
    t.text "sms_text"
    t.text "email_text"
    t.integer "neighborhood_request_counter", default: 0
    t.integer "neighborhood_request_counter_limit", default: 300
    t.boolean "limit_200_hit", default: false
    t.boolean "limit_400_hit", default: false
    t.boolean "show_property_map_key", default: true
    t.string "show_property_map_key_text", default: "Available Home"
    t.boolean "show_amenity_key", default: true
    t.string "show_amenity_key_text", default: "Amenity Image"
    t.string "billing_type", default: "annual"
    t.string "billing_month", default: ""
    t.date "date_installed"
    t.date "date_activated"
    t.date "date_inactivated"
    t.integer "deleted_ids", default: [], array: true
    t.boolean "touchscreen_app", default: true
    t.boolean "lincoln_app", default: false
    t.boolean "show_camera_button", default: true
    t.boolean "show_notepad_button", default: true
    t.boolean "automate_unit_stop", default: false
    t.boolean "show_map", default: true
    t.boolean "mdu", default: true
    t.string "one_day_email_text"
    t.string "one_hour_email_text"
    t.string "self_tour_logo"
    t.boolean "self_tour_logo_cropped", default: false
    t.boolean "chat_control", default: false
    t.boolean "is_chat_available", default: false
    t.boolean "restrict_access", default: false
    t.boolean "scheduler_widget"
    t.boolean "pynwheel_touch"
    t.string "thank_you_message"
    t.boolean "apply_now_self_tour", default: true
    t.boolean "apply_now_pynwheel_touch", default: true
    t.boolean "apply_now_pynwheel_touch_and_go", default: true
    t.string "arrive_too_early_alert"
    t.string "arrive_too_late_alert"
    t.string "unscheduled_alert"
    t.string "unscheduled_alert_with_widget"
    t.string "billing_rate_touch", default: "$2628"
    t.string "billing_rate_selftour", default: "$385"
    t.string "billing_rate_maps", default: "$29"
    t.string "lincoln_billing_rate", default: "$295"
    t.string "dwelo_billing_rate", default: "$280"
    t.string "billing_rate_for_both", default: "$2413"
    t.integer "creator_id"
    t.string "locks_provider"
    t.boolean "enable_locks", default: true
    t.boolean "manual_lat_long", default: false
    t.integer "enable_community_id"
    t.string "multiple_locks_provider", default: [], array: true
    t.integer "region_id"
    t.boolean "pynwheel_access", default: false
    t.string "web_map_type", default: "2d-map"
    t.boolean "auto_wayfinding", default: false
    t.boolean "community_logo", default: true
    t.boolean "enable_three_d_maps", default: false
    t.string "time_zone", default: "UTC"
    t.string "data_provider_updated_on", default: "Never"
    t.string "property_manager_name"
    t.string "property_manager_email"
    t.string "property_manager_phone"
    t.string "brand_details_pdf"
    t.jsonb "product_options"
    t.boolean "move_to_production", default: true
    t.boolean "display_pricing_options", default: true
    t.boolean "pynwheel_launch_access", default: false
    t.date "production_started_date"
    t.date "released_date"
    t.date "submitted_final_approval_date"
    t.date "follow_up_email_date"
    t.string "file"
    t.boolean "display_building", default: false
    t.string "email_logo", default: ""
    t.boolean "show_amenity_name", default: true
    t.boolean "sitemap_auto_zoom", default: false
    t.boolean "use_company_level_data_settings", default: false
    t.string "country_code"
    t.string "pricing_message", default: "Please see an agent for pricing details."
    t.boolean "units_availability_over_120_days", default: true
    t.boolean "display_additional_fee", default: true
    t.boolean "display_manual_additional_fee", default: false
    t.string "additional_fee", default: ""
    t.boolean "enable_svg_mode", default: false
    t.boolean "display_tbd_legend", default: false
    t.boolean "show_current_availability", default: false
    t.boolean "is_floor_level_map", default: false
    t.boolean "turn_availability_on", default: false
    t.string "available_units_color", default: "#F9D648", null: false
    t.decimal "available_units_opacity", precision: 3, scale: 2, default: "1.0", null: false
    t.string "model_units_color", default: "#F57396", null: false
    t.decimal "model_units_opacity", precision: 3, scale: 2, default: "1.0", null: false
    t.string "amenities_color", default: "#d37474", null: false
    t.decimal "amenities_opacity", precision: 3, scale: 2, default: "1.0", null: false
    t.integer "coloring_mode", default: 0, null: false
    t.boolean "is_beans_svg", default: false
    t.string "background_svg_image"
    t.string "map_logo"
    t.boolean "enable_unit_type_pricing", default: false
    t.boolean "enable_floorplan_level_color", default: false
    t.integer "default_map_floor"
    t.boolean "hide_bedrooms_bathrooms", default: false
    t.boolean "enable_pricing_calculator", default: false, null: false
    t.string "pricing_calculator_embed_code"
    t.boolean "hide_square_feet", default: false
    t.boolean "hide_availability", default: false
    t.boolean "default_satellite_view", default: false
    t.boolean "enable_sdk_map", default: false
    t.boolean "enable_pynwheel_pricing_calculator", default: false, null: false
    t.jsonb "partner_map_settings", default: {}, null: false
    t.boolean "student_housing_property", default: false
    t.boolean "highlight_all_units_on_hover", default: false
    t.jsonb "map_analytics_settings", default: {}
    t.string "available_map_views"
    t.string "default_map_view"
    t.index "(((map_analytics_settings -> 'data_layer'::text) ->> 'enabled'::text))", name: "idx_communities_map_analytics_data_layer_enabled", where: "(((map_analytics_settings -> 'data_layer'::text) ->> 'enabled'::text) = 'true'::text)"
    t.index ["community_group_id"], name: "index_communities_on_community_group_id"
    t.index ["company_id"], name: "index_communities_on_company_id"
    t.index ["partner_map_settings"], name: "index_communities_on_partner_map_settings", using: :gin
    t.index ["region_id"], name: "index_communities_on_region_id"
    t.check_constraint "highlight_all_units_on_hover IS NOT NULL", name: "communities_highlight_all_units_on_hover_not_null", validate: false
    t.check_constraint "map_analytics_settings IS NOT NULL", name: "communities_map_analytics_settings_not_null", validate: false
  end

  create_table "community_groups", id: :serial, force: :cascade do |t|
    t.string "name"
    t.string "address"
    t.string "code"
    t.boolean "page_type", default: false
    t.string "page_name"
    t.string "logo"
    t.boolean "inactivate", default: false
    t.integer "company_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "menu_button_shade", default: "light"
    t.integer "creator_id"
    t.integer "region_id"
    t.index ["company_id"], name: "index_community_groups_on_company_id"
    t.index ["region_id"], name: "index_community_groups_on_region_id"
  end

  create_table "community_users", id: :serial, force: :cascade do |t|
    t.integer "community_id"
    t.integer "user_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.integer "enable_community_id"
    t.boolean "chat_enable", default: false
    t.boolean "is_logged_in", default: false
    t.index ["community_id"], name: "index_community_users_on_community_id"
    t.index ["user_id"], name: "index_community_users_on_user_id"
  end

  create_table "companies", id: :serial, force: :cascade do |t|
    t.string "name"
    t.string "address"
    t.string "city"
    t.string "state"
    t.string "zip"
    t.string "email"
    t.string "phone"
    t.string "logo"
    t.boolean "locked"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.boolean "inactivate", default: false
    t.integer "creator_id"
    t.string "data_providers", default: [], array: true
  end

  create_table "company_settings", id: :serial, force: :cascade do |t|
    t.boolean "company_level_data_import", default: false
    t.integer "company_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.boolean "pynwheel_launch_access", default: false
    t.index ["company_id"], name: "index_company_settings_on_company_id"
  end

  create_table "credentials", id: :serial, force: :cascade do |t|
    t.integer "community_id"
    t.string "password"
    t.string "username"
    t.string "property_id"
    t.string "pmc_id"
    t.string "licence_key"
    t.string "server_name"
    t.string "database"
    t.string "platform"
    t.string "interface_entity"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "url"
    t.string "site_id"
    t.string "c_code"
    t.string "p_code"
    t.string "apply_now", default: "true"
    t.string "file"
    t.string "api_token"
    t.string "resman_apikey"
    t.string "resman_partner_id"
    t.string "resman_account_id"
    t.string "resman_property_id"
    t.string "zaremba_username"
    t.string "zaremba_password"
    t.string "zaremba_filename"
    t.string "zaremba_property_id"
    t.string "entrata_url"
    t.string "xml_filename"
    t.string "xml_domain"
    t.string "data_error_message"
    t.string "data_error_exp"
    t.jsonb "realpage_marketing_sources"
    t.boolean "limit_result", default: true
    t.string "crm_provider"
    t.string "crm_username"
    t.string "crm_password"
    t.string "crm_client_id"
    t.string "crm_client_secret"
    t.boolean "use_different_crm_provider", default: false
    t.string "separate_link"
    t.string "resman_api_version", default: "GetMarketing4_0"
    t.string "perq_property_id"
    t.boolean "is_perq_allowed", default: false
    t.string "entrata_available_units_only", default: "0"
    t.string "entrata_show_unit_spaces", default: "1"
    t.string "entrata_use_space_configuration", default: "1"
    t.string "new_requested_data_provider"
    t.string "yardi_rent_cafe_api_url", default: "https://api.rentcafe.com"
    t.string "currency", default: "840"
    t.string "rentcafe_v2_auth_token"
    t.datetime "rentcafe_v2_token_expires_at", precision: nil
    t.integer "company_id"
    t.string "rentcafe_api_version", default: "Rentcafe V1"
    t.string "yardi_username"
    t.string "yardi_password"
    t.string "rentmanager_username", default: ""
    t.string "rentmanager_password", default: ""
    t.string "rentmanager_property_id", default: ""
    t.string "rentmanager_auth_token", default: ""
    t.string "rentmanager_base_url", default: ""
    t.boolean "allow_sub_communities", default: false
    t.string "app_folio_property_id", default: ""
    t.string "unit_name_key", default: "MarketingTitle", null: false
    t.string "app_folio_database_id"
    t.string "app_folio_property_scope", default: "is_app_folio_property_id", null: false
    t.string "app_folio_property_group_id"
    t.string "apartmentlist_url"
    t.index ["app_folio_property_scope"], name: "index_credentials_on_app_folio_property_scope"
    t.index ["community_id"], name: "index_credentials_on_community_id"
    t.index ["company_id"], name: "index_credentials_on_company_id"
  end

  create_table "crm_credentials", id: :serial, force: :cascade do |t|
    t.string "crm_provider"
    t.integer "community_id"
    t.string "entrata_domain"
    t.string "entrata_username"
    t.string "entrata_password"
    t.string "entrata_property_id"
    t.string "realpage_site_id"
    t.string "realpage_pmc_id"
    t.string "rentcafe_c_code"
    t.string "rentcafe_p_code"
    t.string "rentcafe_domain"
    t.string "salesforce_username"
    t.string "salesforce_password"
    t.string "salesforce_client_id"
    t.string "salesforce_secret_id"
    t.string "salesforce_grant_type"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "salesforce_property_id"
    t.string "yardirentcafe_marketing_api_key"
    t.string "yardirentcafe_property_id"
    t.string "yardirentcafe_property_code"
    t.string "knock_community_id", default: ""
    t.string "funnel_api_key", default: ""
    t.string "funnel_community_id", default: ""
    t.string "knock_company_id", default: ""
    t.index ["community_id"], name: "index_crm_credentials_on_community_id"
  end

  create_table "crm_discovery_sources", id: :serial, force: :cascade do |t|
    t.jsonb "sources"
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["community_id"], name: "index_crm_discovery_sources_on_community_id"
  end

  create_table "crm_time_slots", id: :serial, force: :cascade do |t|
    t.jsonb "slots"
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["community_id"], name: "index_crm_time_slots_on_community_id"
  end

  create_table "default_images", id: :serial, force: :cascade do |t|
    t.string "name"
    t.string "image"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
  end

  create_table "delayed_jobs", id: :serial, force: :cascade do |t|
    t.integer "priority", default: 0, null: false
    t.integer "attempts", default: 0, null: false
    t.text "handler", null: false
    t.text "last_error"
    t.datetime "run_at", precision: nil
    t.datetime "locked_at", precision: nil
    t.datetime "failed_at", precision: nil
    t.string "locked_by"
    t.string "queue"
    t.datetime "created_at", precision: nil
    t.datetime "updated_at", precision: nil
    t.index ["priority", "run_at"], name: "delayed_jobs_priority"
  end

  create_table "design_directions", id: :serial, force: :cascade do |t|
    t.string "image"
    t.string "hex_colors"
    t.string "direction"
    t.string "additional_direction"
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "file"
    t.index ["community_id"], name: "index_design_directions_on_community_id"
  end

  create_table "design_system_configs", force: :cascade do |t|
    t.bigint "community_id", null: false
    t.jsonb "config_json", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["community_id"], name: "index_design_system_configs_on_community_id", unique: true
  end

  create_table "designs", id: :serial, force: :cascade do |t|
    t.string "primary_color"
    t.string "secondary_color"
    t.string "primary_font_family"
    t.string "primary_font_size"
    t.string "primary_font_weight"
    t.string "primary_text_align"
    t.string "primary_font_color"
    t.string "secondary_font_family"
    t.string "secondary_font_size"
    t.string "secondary_font_weight"
    t.string "secondary_text_align"
    t.string "secondary_font_color"
    t.string "main_screen_background_color"
    t.string "inner_screen_background_color"
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "loop_type", default: "images"
    t.string "logo_position"
    t.string "secondary_logo_position"
    t.string "secondary_page_background_image"
    t.string "global_navigation_position"
    t.string "animation", default: "bouncing effects"
    t.string "global_navigation_font_color"
    t.string "global_navigation_background_color"
    t.string "global_navigation_button_color"
    t.string "global_navigation_buttons_opacity"
    t.string "global_nav_bg_opacity"
    t.string "button_shape"
    t.string "global_nav_buttons_height"
    t.string "global_nav_buttons_width"
    t.string "secondary_page_menu_border"
    t.string "global_nav_button_on"
    t.string "global_nav_button_off"
    t.boolean "buttons_as_image", default: false
    t.string "filter_panel_color"
    t.string "filter_panel_font_style"
    t.string "filter_panel_font_color"
    t.string "filter_button_color"
    t.string "filter_button_font_style"
    t.string "filter_button_font_color"
    t.string "filter_panel_opacity"
    t.string "filter_buttons_opacity"
    t.string "gallery_buttons_opacity"
    t.string "filter_menu_buttons_border"
    t.string "gallery_buttons_border"
    t.string "filter_button"
    t.string "gallery_button"
    t.string "filter_panel_background_image"
    t.string "home_page_button_shape"
    t.string "home_page_navigation_background_height"
    t.string "home_page_buttons_height"
    t.string "home_page_buttons_width"
    t.string "home_page_buttons_opacity"
    t.string "home_page_navigation_background_opacity"
    t.string "home_page_buttons_border"
    t.string "marker_background_color"
    t.string "marker_style"
    t.string "header_bg_color"
    t.string "header_font_color"
    t.string "details_bg_color"
    t.string "details_font_color"
    t.string "available_appartments_font_color"
    t.string "available_appartments_bg_color"
    t.string "floor_bg_color"
    t.string "unit_header_bg_color"
    t.string "unit_header_font_color"
    t.string "unit_details_font_color"
    t.string "unit_details_bg_color"
    t.string "floorplan_name_bg_color"
    t.string "floorplan_name_font_color"
    t.string "unit_bg_color"
    t.string "home_page_navigation_background_color"
    t.string "home_page_navigation_button_color"
    t.string "home_page_navigation_font_color"
    t.boolean "filter_button_as_image", default: false
    t.boolean "gallery_button_as_image", default: false
    t.boolean "filter_panel_background_as_image", default: false
    t.string "gallery_button_on_image"
    t.boolean "gallery_button_on_as_image", default: false
    t.boolean "global_nav_button_on_as_image", default: false
    t.boolean "global_nav_button_off_as_image", default: false
    t.string "unit_header_bg_color_opacity"
    t.string "unit_details_bg_color_opacity"
    t.string "floorplan_name_bg_color_opacity"
    t.string "unit_bg_color_opacity"
    t.string "header_bg_color_opacity"
    t.string "details_bg_color_opacity"
    t.string "available_appartments_bg_color_opacity"
    t.string "floor_bg_color_opacity"
    t.string "property_map_size", default: "30px"
    t.string "property_map_color", default: "#d37474"
    t.string "amenity_map_marker_size", default: "30px"
    t.string "amenity_map_marker_color", default: "#ff0000"
    t.string "modernist_map_marker_color", default: "no color"
    t.string "modernists_amenity_map_marker_color", default: "no color"
    t.integer "property_map_size_integer", default: 30
    t.integer "amenity_map_marker_size_integer", default: 30
    t.string "futurist_ebrochure_header_background_color", default: "#808080"
    t.string "modernist_ebrochure_header_background_color", default: "No color"
    t.string "gables_ebrochure_header_background_color", default: "#808080"
    t.string "panther_ebrochure_header_background_color", default: "#808080"
    t.string "expressionist_ebrochure_header_background_color", default: "No color"
    t.boolean "display_ebrochure_header_background_color", default: false
    t.string "ebrochure_email_message", default: "Thank you for visiting <community_name>! Here are your favorites. Click on the images below to expand them.\n\nWe look forward to seeing you again soon. "
    t.boolean "ebrochure_email_message_updated", default: false
    t.string "futurist_property_map_marker_color"
    t.string "expressionist_property_map_marker_color"
    t.string "panther_property_map_marker_color"
    t.string "futurist_amenity_map_marker_color"
    t.string "expressionist__amenity_map_marker_color"
    t.string "panther_amenity_map_marker_color"
    t.integer "futurist_property_map_size"
    t.integer "expressionist_property_map_size"
    t.integer "panther_property_map_size"
    t.integer "modernist_property_map_size"
    t.integer "futurist_amenity_map_size"
    t.integer "expressionist_amenity_map_size"
    t.integer "panther_amenity_map_size"
    t.integer "modernist_amenity_map_size"
    t.string "futurist_unit_floorplan_map_marker_color"
    t.string "expressionist_unit_floorplan_map_marker_color"
    t.string "panther_unit_floorplan_map_marker_color"
    t.string "gables_unit_floorplan_map_marker_color"
    t.string "modernist_unit_floorplan_map_marker_color"
    t.boolean "display_filter_label_image"
    t.string "filter_label_image"
    t.string "filter_panel_label_color"
    t.string "filter_panel_label_opacity"
    t.string "pynwheel_touch_hardware_spec"
    t.text "property_map_occupied_color", default: "#f2f2f2"
    t.text "property_map_occupied_on_notice_color", default: "#8545a1"
    t.text "property_map_vacant_leased_color", default: "#f9d648"
    t.text "property_map_model_color", default: "#f57396"
    t.text "property_map_missing_color", default: "#eecea5"
  end

  create_table "doors", id: :serial, force: :cascade do |t|
    t.string "name"
    t.integer "floor"
    t.integer "x_plot", default: 0
    t.integer "y_plot", default: 0
    t.string "lock_provider", default: ""
    t.string "access_code", default: ""
    t.integer "community_id"
    t.string "attached_with_type"
    t.integer "attached_with_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.boolean "name_overrided", default: false
    t.integer "sort", default: 1
    t.index ["attached_with_type", "attached_with_id"], name: "index_doors_on_attached_with_type_and_attached_with_id"
    t.index ["community_id"], name: "index_doors_on_community_id"
  end

  create_table "dwelos", id: :serial, force: :cascade do |t|
    t.string "client_id"
    t.string "client_secret"
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "default_community_id"
    t.string "api_url", default: "https://api.dwelo.com"
    t.string "lock_instruction_text", default: ""
    t.string "lock_image", default: ""
    t.string "amenity_lock_instruction_text", default: ""
    t.string "amenity_lock_image", default: ""
    t.index ["community_id"], name: "index_dwelos_on_community_id"
  end

  create_table "ebrochure_menu_buttons", id: :serial, force: :cascade do |t|
    t.string "name"
    t.text "url"
    t.integer "favorite_setting_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
  end

  create_table "edge_states", id: :serial, force: :cascade do |t|
    t.string "client_id"
    t.string "client_secret"
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "refresh_token"
    t.boolean "is_authorized_with_pynwheel", default: false
    t.string "lock_instruction_text", default: ""
    t.string "lock_image", default: ""
    t.string "amenity_lock_instruction_text", default: ""
    t.string "amenity_lock_image", default: ""
    t.index ["community_id"], name: "index_edge_states_on_community_id"
  end

  create_table "elevator_banks", id: :serial, force: :cascade do |t|
    t.string "name"
    t.string "position"
    t.string "lock_type"
    t.string "lock_name"
    t.string "lock_id"
    t.integer "elevator_id", null: false
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["elevator_id"], name: "index_elevator_banks_on_elevator_id"
  end

  create_table "elevator_galleries", id: :serial, force: :cascade do |t|
    t.integer "elevator_id"
    t.string "image"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "name"
    t.string "description", default: ""
    t.string "directional_text", default: ""
    t.index ["elevator_id"], name: "index_elevator_galleries_on_elevator_id"
  end

  create_table "elevators", id: :serial, force: :cascade do |t|
    t.string "name"
    t.string "description"
    t.integer "x_plot"
    t.integer "y_plot"
    t.string "directional_text"
    t.integer "floorplate_id"
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "image"
    t.integer "sitemap_id"
    t.string "floorplate_covering_range"
    t.integer "duplicate_of"
    t.string "building"
    t.string "lock_provider", default: ""
    t.string "access_code"
    t.index ["community_id"], name: "index_elevators_on_community_id"
    t.index ["floorplate_id"], name: "index_elevators_on_floorplate_id"
    t.index ["sitemap_id"], name: "index_elevators_on_sitemap_id"
  end

  create_table "expressionists", id: :serial, force: :cascade do |t|
    t.string "home_page_menu_position"
    t.string "home_page_position_of_logo"
    t.string "home_page_logo_size"
    t.string "home_page_button_border_color"
    t.boolean "display_home_page_button_icon", default: true
    t.string "home_page_button_font_family"
    t.string "home_page_button_font_size"
    t.boolean "display_home_page_nav_background", default: true
    t.string "home_page_button_image"
    t.string "global_navigation_button_font_family"
    t.string "global_navigation_button_font_size"
    t.boolean "display_global_navigation_button_bg_color", default: true
    t.string "filter_panel_button_border_color"
    t.string "filter_panel_text_font_size"
    t.string "filter_panel_button_text_font_size"
    t.integer "design_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.boolean "display_global_navigation_button_icon", default: true
    t.boolean "display_home_page_image", default: false
    t.string "global_navigation_button_border_color"
    t.string "spacing_between_buttons"
    t.string "button_on_bg_color"
    t.boolean "display_button_on_bg_color", default: false
    t.string "global_navigation_button_on_font_color"
    t.string "application_background_image"
    t.boolean "display_application_background_image", default: false
    t.string "application_background_color"
    t.boolean "display_apartment_nav_bg_image", default: false
    t.string "apartment_nav_bg_image"
    t.boolean "display_gallery_nav_bg_image", default: false
    t.string "gallery_nav_bg_image"
    t.boolean "display_favourities_nav_bg_image", default: false
    t.string "favourities_nav_bg_image"
    t.boolean "display_additional_pages_nav_bg_image", default: false
    t.string "additional_pages_nav_bg_image"
    t.string "button_on_bg_color_opacity"
    t.string "application_background_color_opacity"
    t.string "apartment_nav_bg_color"
    t.string "gallery_nav_bg_color"
    t.string "favourities_nav_bg_color"
    t.string "additional_pages_nav_bg_color"
    t.boolean "display_apartment_btn_on_image", default: false
    t.string "apartment_btn_on_image"
    t.boolean "display_gallery_btn_on_image", default: false
    t.string "gallery_btn_on_image"
    t.boolean "display_neighborhood_btn_on_image", default: false
    t.string "neighborhood_btn_on_image"
    t.boolean "display_imagepage_btn_on_image", default: false
    t.string "imagepage_btn_on_image"
    t.boolean "display_webpage_btn_on_image", default: false
    t.string "webpage_btn_on_image"
    t.boolean "display_favourite_btn_on_image", default: false
    t.string "favourite_btn_on_image"
    t.boolean "display_apartment_btn_off_image", default: false
    t.string "apartment_btn_off_image"
    t.boolean "display_gallery_btn_off_image", default: false
    t.string "gallery_btn_off_image"
    t.boolean "display_neighborhood_btn_off_image", default: false
    t.string "neighborhood_btn_off_image"
    t.boolean "display_imagepage_btn_off_image", default: false
    t.string "imagepage_btn_off_image"
    t.boolean "display_webpage_btn_off_image", default: false
    t.string "webpage_btn_off_image"
    t.boolean "display_favourite_btn_off_image", default: false
    t.string "favourite_btn_off_image"
    t.boolean "global_navigation_btn_on_for_all", default: false
    t.boolean "global_navigation_btn_off_for_all", default: false
    t.boolean "display_global_nav_background_image", default: false
    t.string "global_nav_background_image"
    t.string "home_page_background_image"
    t.boolean "display_home_page_nav_background_image", default: false
    t.string "spacing_between_buttons_for_homepage"
    t.string "global_navigation_border_thickness"
    t.boolean "home_page_logo_visible", default: false
    t.boolean "gables_home_page_images", default: false
    t.boolean "global_navigation_text_outside_the_button_border", default: false
    t.boolean "use_gables_buttons", default: false
    t.string "home_page_icons_position"
    t.string "global_navigation_icons_position", default: "Above the text"
    t.boolean "global_navigation_show_background_color", default: true
    t.string "button_text_position"
    t.boolean "display_global_navigation_button_color", default: false
    t.string "homepage_button_border_thickness"
    t.boolean "global_navigation_home_icon", default: false
    t.string "homepage_button_border"
    t.string "global_nav_button_icon_size"
    t.boolean "display_neighborhood_bg_image"
    t.string "neighborhood_bg_image"
    t.string "overlay_text"
    t.string "overlay_font"
    t.string "overlay_size"
    t.string "overlay_color"
    t.string "overlay_opacity"
    t.string "overlay_text_position"
  end

  create_table "favorite_images", id: :serial, force: :cascade do |t|
    t.string "image"
    t.integer "favorite_setting_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "name"
    t.integer "sort"
    t.index ["favorite_setting_id"], name: "index_favorite_images_on_favorite_setting_id"
  end

  create_table "favorite_settings", id: :serial, force: :cascade do |t|
    t.integer "community_id"
    t.string "email_from"
    t.string "email_bcc"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "email_body", default: "Thank you for visiting <community_name>! Here are your favorites. Click on the images below to expand them.\n\nWe look forward to seeing you again soon."
    t.boolean "show_favorite", default: true
    t.string "favorite_name", default: "Favorites"
    t.boolean "equal_housing_opportunity_logo", default: true
    t.boolean "handicap_accessible_logo", default: true
    t.index ["community_id"], name: "index_favorite_settings_on_community_id"
  end

  create_table "favorite_stops", id: :serial, force: :cascade do |t|
    t.text "favorite_unit", default: [], array: true
    t.text "favorite_amenity", default: [], array: true
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.json "user_favorites_unit", default: {}
    t.json "user_favorites_amenity", default: {}
    t.index ["community_id"], name: "index_favorite_stops_on_community_id"
  end

  create_table "favorites", id: :serial, force: :cascade do |t|
    t.integer "community_id"
    t.string "session_id"
    t.jsonb "unit_ids"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.jsonb "amenity_ids", default: []
    t.jsonb "floorplan_ids", default: []
    t.jsonb "gallery_image_ids", default: []
    t.index ["session_id", "community_id"], name: "index_favorites_on_session_id_and_community_id", unique: true
  end

  create_table "feedbacks", id: :serial, force: :cascade do |t|
    t.float "rating"
    t.text "comment"
    t.boolean "is_cancelled"
    t.datetime "cancelled_at", precision: nil
    t.integer "tour_user_id"
    t.integer "tour_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["tour_id"], name: "index_feedbacks_on_tour_id"
    t.index ["tour_user_id"], name: "index_feedbacks_on_tour_user_id"
  end

  create_table "filter_panels", id: :serial, force: :cascade do |t|
    t.string "button_border_color"
    t.string "text_font_size"
    t.string "button_text_font_size"
    t.integer "design_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "gallery_button_on_font_color"
    t.boolean "display_gallery_button_on_background_color", default: false
    t.string "gallery_button_on_background_color"
    t.boolean "display_filter_panel_icon", default: true
    t.string "filter_panel_icon_color"
    t.string "icon_background_color"
    t.string "icon_background_color_opacity"
    t.string "gallery_button_on_background_color_opacity"
    t.string "filter_buttons_icons_position", default: "Right of text"
    t.boolean "filter_panel_buttons_show_backround_color", default: true
  end

  create_table "floorplans", id: :serial, force: :cascade do |t|
    t.integer "community_id"
    t.string "provider"
    t.string "property_id"
    t.string "provider_floorplan_id"
    t.string "name"
    t.integer "unit_count"
    t.integer "units_available"
    t.string "bedrooms"
    t.float "bathrooms"
    t.float "market_rent"
    t.float "square_feet"
    t.float "deposit"
    t.text "comment"
    t.text "description"
    t.string "availability_url"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "image"
    t.string "virtual_tour_url"
    t.string "standard_image_url"
    t.boolean "updated_by_admin", default: false
    t.boolean "manual_override", default: false
    t.string "secondary_image"
    t.boolean "name_is_updated"
    t.boolean "square_feet_is_updated"
    t.boolean "bedroom_is_updated"
    t.boolean "bathroom_is_updated"
    t.boolean "market_rent_is_updated"
    t.boolean "display_virtual_tour_button_label", default: false
    t.string "virtual_tour_button_label", default: "3D Tour"
    t.float "crop_x"
    t.float "crop_y"
    t.float "crop_w"
    t.float "crop_h"
    t.float "crop_x_secondary"
    t.float "crop_y_secondary"
    t.float "crop_w_secondary"
    t.float "crop_h_secondary"
    t.boolean "image_bit"
    t.boolean "do_crop", default: false
    t.boolean "do_crop_secondary", default: false
    t.boolean "iframe_enable_for_3Dtour", default: true
    t.string "file"
    t.string "additional_button"
    t.string "additional_url"
    t.string "scheduler_label"
    t.string "scheduler_url"
    t.string "available_units_color", default: "#f9d648", null: false
    t.decimal "available_units_opacity", precision: 3, scale: 2, default: "1.0", null: false
    t.string "model_units_color", default: "#f57396", null: false
    t.decimal "model_units_opacity", precision: 3, scale: 2, default: "1.0", null: false
    t.integer "availability_status", default: 0, null: false
    t.boolean "link1_open_new_tab", default: false
    t.boolean "link2_open_new_tab", default: false
    t.boolean "link3_open_new_tab", default: false
    t.string "description_title", default: "More Details"
    t.boolean "show_description_on_card", default: false
    t.boolean "expand_description_in_popup", default: false
    t.index ["community_id"], name: "index_floorplans_on_community_id"
    t.check_constraint "expand_description_in_popup IS NOT NULL", name: "floorplans_expand_description_in_popup_not_null", validate: false
    t.check_constraint "show_description_on_card IS NOT NULL", name: "floorplans_show_description_on_card_not_null", validate: false
  end

  create_table "floorplates", id: :serial, force: :cascade do |t|
    t.string "name"
    t.integer "number"
    t.string "building"
    t.string "range"
    t.string "image"
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "standard_image_url"
    t.string "svg_image_url"
    t.float "height"
    t.float "width"
    t.string "floor_name"
    t.boolean "floor_name_added", default: false
    t.boolean "name_is_updated"
    t.boolean "building_is_updated"
    t.boolean "manual_override", default: false
    t.jsonb "map_ocr_data"
    t.boolean "is_ocr_enabled", default: false
    t.string "label_image"
    t.string "file"
    t.string "svg_image"
    t.jsonb "svg_metadata", default: {}
    t.index ["community_id"], name: "index_floorplates_on_community_id"
  end

  create_table "font_settings", force: :cascade do |t|
    t.bigint "community_id", null: false
    t.string "svg_labels_font_family"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["community_id"], name: "index_font_settings_on_community_id", unique: true
  end

  create_table "gables", id: :serial, force: :cascade do |t|
    t.boolean "hide_tagline", default: true
    t.string "appartment_button_color"
    t.string "gallery_button_color"
    t.string "neighborhood_button_color"
    t.string "favorite_button_color"
    t.string "filter_panel_color"
    t.integer "design_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "webpages_button_color"
    t.string "imagepages_button_color"
    t.string "home_page_nav_bg_image"
    t.boolean "display_home_page_nav_bg_image_button", default: false
    t.string "global_nav_bg_image"
    t.boolean "display_global_nav_bg_image_button", default: false
    t.string "filter_panel_bg_image"
    t.boolean "display_filter_panel_bg_image_button", default: false
    t.string "filter_panel_text_color"
    t.string "filter_panel_opacity"
    t.string "application_bg_image_gables"
    t.string "apartment_bg_image_gables"
    t.string "gallery_bg_image_gables"
    t.string "favourite_bg_image_gables"
    t.string "additional_pages_bg_image_gables"
    t.boolean "display_application_bg_image_gables"
    t.boolean "display_apartment_bg_image_gables"
    t.boolean "display_gallery_bg_image_gables"
    t.boolean "display_favourite_bg_image_gables"
    t.boolean "display_additional_pages_bg_image_gables"
  end

  create_table "galleries", id: :serial, force: :cascade do |t|
    t.string "name"
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.integer "sort"
    t.boolean "is_default", default: false
    t.index ["community_id"], name: "index_galleries_on_community_id"
  end

  create_table "gallery_images", id: :serial, force: :cascade do |t|
    t.string "image"
    t.float "crop_x"
    t.float "crop_y"
    t.float "crop_w"
    t.float "crop_h"
    t.integer "sort"
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.integer "gallery_id"
    t.string "name"
    t.string "standard_image_url"
    t.string "ios_image_url"
    t.string "large_image_url"
    t.string "video"
    t.boolean "do_crop", default: false
    t.index ["community_id"], name: "index_gallery_images_on_community_id"
    t.index ["gallery_id"], name: "index_gallery_images_on_gallery_id"
  end

  create_table "group_designs", id: :serial, force: :cascade do |t|
    t.string "logo_position"
    t.string "button_shape"
    t.string "button_width"
    t.string "button_height"
    t.string "button_spacing"
    t.string "background_image"
    t.string "button_color"
    t.string "button_opacity"
    t.string "button_border_side"
    t.string "button_border_color"
    t.string "button_border_opacity"
    t.string "button_border_thickness"
    t.string "button_font_family"
    t.string "button_font_size"
    t.string "button_font_color"
    t.integer "community_group_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "bouncing_effecting"
    t.string "video"
    t.string "loop_type", default: "images"
    t.string "logo_size"
    t.boolean "display_button_image", default: false
    t.boolean "display_button_text", default: true
    t.index ["community_group_id"], name: "index_group_designs_on_community_group_id"
  end

  create_table "group_homepage_images", id: :serial, force: :cascade do |t|
    t.string "image"
    t.string "name"
    t.boolean "is_small"
    t.float "crop_x"
    t.float "crop_y"
    t.float "crop_w"
    t.float "crop_h"
    t.integer "group_design_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["group_design_id"], name: "index_group_homepage_images_on_group_design_id"
  end

  create_table "group_homepage_videos", id: :serial, force: :cascade do |t|
    t.string "video"
    t.integer "group_design_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["group_design_id"], name: "index_group_homepage_videos_on_group_design_id"
  end

  create_table "guided_opening_hours", id: :serial, force: :cascade do |t|
    t.string "day"
    t.string "opening_time"
    t.string "closing_time"
    t.integer "community_id"
    t.integer "sort"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["community_id"], name: "index_guided_opening_hours_on_community_id"
  end

  create_table "hallways", id: :serial, force: :cascade do |t|
    t.float "x_plot"
    t.float "y_plot"
    t.string "parent_type"
    t.integer "parent_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.integer "next_points", default: [], array: true
    t.boolean "selected"
    t.index ["parent_type", "parent_id"], name: "index_hallways_on_parent_type_and_parent_id"
  end

  create_table "hardware_specs", id: :serial, force: :cascade do |t|
    t.string "name"
    t.string "phone"
    t.string "image"
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["community_id"], name: "index_hardware_specs_on_community_id"
  end

  create_table "home_page_images", id: :serial, force: :cascade do |t|
    t.string "image"
    t.string "name"
    t.integer "design_id"
    t.float "crop_x"
    t.float "crop_y"
    t.float "crop_w"
    t.float "crop_h"
    t.integer "sort"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "standard_image_url"
    t.string "thumb_image_url"
    t.string "large_image_url"
    t.boolean "do_crop", default: false
    t.boolean "is_small", default: false
  end

  create_table "home_page_videos", id: :serial, force: :cascade do |t|
    t.string "video"
    t.string "name"
    t.integer "design_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
  end

  create_table "home_screens", id: :serial, force: :cascade do |t|
    t.string "appartments_button"
    t.string "galleries_button"
    t.string "neighborhood_button"
    t.string "favorities_button"
    t.string "menu_position"
    t.boolean "manage_background"
    t.string "background_color"
    t.integer "design_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "about_button"
    t.string "floorplan_button"
    t.string "building_button"
  end

  create_table "homepage_icons", id: :serial, force: :cascade do |t|
    t.string "image"
    t.string "name"
    t.integer "sort"
    t.integer "design_id"
    t.float "crop_x"
    t.float "crop_y"
    t.float "crop_w"
    t.float "crop_h"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["design_id"], name: "index_homepage_icons_on_design_id"
  end

  create_table "igloo_guests", id: :serial, force: :cascade do |t|
    t.string "guest_type"
    t.string "guest_code"
    t.string "guest_id"
    t.string "status"
    t.integer "community_id"
    t.integer "tour_user_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.integer "stop_id"
    t.integer "pynwheel_access_user_id"
    t.index ["community_id"], name: "index_igloo_guests_on_community_id"
    t.index ["pynwheel_access_user_id"], name: "index_igloo_guests_on_pynwheel_access_user_id"
    t.index ["tour_user_id"], name: "index_igloo_guests_on_tour_user_id"
  end

  create_table "igloohome_guests", id: :serial, force: :cascade do |t|
    t.string "guest_pin"
    t.integer "community_id"
    t.integer "tour_user_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "stop_id"
    t.string "stop_type"
    t.string "guest_bluetooth_key"
    t.string "guest_key"
    t.string "guest_of_stop_type"
    t.integer "guest_of_stop_id"
    t.index ["community_id"], name: "index_igloohome_guests_on_community_id"
    t.index ["guest_of_stop_type", "guest_of_stop_id"], name: "index_igloohome_guest_of_stop"
    t.index ["tour_user_id"], name: "index_igloohome_guests_on_tour_user_id"
  end

  create_table "igloohome_locks", id: :serial, force: :cascade do |t|
    t.string "device_name"
    t.string "device_id"
    t.string "stop_type"
    t.integer "stop_id"
    t.integer "igloohome_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["igloohome_id"], name: "index_igloohome_locks_on_igloohome_id"
    t.index ["stop_type", "stop_id"], name: "index_igloohome_locks_on_stop_type_and_stop_id"
  end

  create_table "igloohomes", id: :serial, force: :cascade do |t|
    t.string "username"
    t.string "password"
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "email"
    t.string "file"
    t.string "lock_instruction_text", default: ""
    t.string "lock_image", default: ""
    t.boolean "is_authorized_with_pynwheel", default: false
    t.string "client_id"
    t.string "client_secret"
    t.string "refresh_token"
    t.string "access_token"
    t.datetime "access_token_expiry", precision: nil
    t.datetime "refresh_token_expiry", precision: nil
    t.string "version", default: "v1"
    t.string "home_name"
    t.string "amenity_lock_instruction_text", default: ""
    t.string "amenity_lock_image", default: ""
    t.string "iglooworks_api_key", default: ""
    t.string "iglooworks_department_id", default: ""
    t.index ["community_id"], name: "index_igloohomes_on_community_id"
  end

  create_table "imagepages", id: :serial, force: :cascade do |t|
    t.string "name"
    t.boolean "is_slideshow"
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.boolean "hide_page", default: false
    t.boolean "display_on_homepage", default: false
    t.integer "position"
    t.integer "sort"
    t.index ["community_id"], name: "index_imagepages_on_community_id"
  end

  create_table "impressions", id: :serial, force: :cascade do |t|
    t.string "request_id"
    t.json "in_request", default: {}
    t.json "out_response", default: {}
    t.boolean "enabled", default: false
    t.string "name_space"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["enabled"], name: "index_impressions_on_enabled"
    t.index ["request_id"], name: "index_impressions_on_request_id"
  end

  create_table "latch_allowed_accesses", id: :serial, force: :cascade do |t|
    t.string "doorcode"
    t.string "doorcode_type"
    t.string "stop_type"
    t.integer "stop_id"
    t.integer "latch_guest_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["latch_guest_id"], name: "index_latch_allowed_accesses_on_latch_guest_id"
    t.index ["stop_type", "stop_id"], name: "index_latch_allowed_accesses_on_stop_type_and_stop_id"
  end

  create_table "latch_auth_tokens", id: :serial, force: :cascade do |t|
    t.integer "tour_user_id", null: false
    t.string "token"
    t.datetime "expires_at", precision: nil
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["tour_user_id"], name: "index_latch_auth_tokens_on_tour_user_id"
  end

  create_table "latch_guests", id: :serial, force: :cascade do |t|
    t.integer "community_id"
    t.integer "tour_user_id"
    t.string "latch_link"
    t.string "reservation_token"
    t.integer "start_time"
    t.integer "end_time"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "status"
    t.string "guest_of_stop_type"
    t.integer "guest_of_stop_id"
    t.integer "pynwheel_access_user_id"
    t.index ["community_id"], name: "index_latch_guests_on_community_id"
    t.index ["guest_of_stop_type", "guest_of_stop_id"], name: "index_latch_guests_on_guest_of_stop_type_and_guest_of_stop_id"
    t.index ["pynwheel_access_user_id"], name: "index_latch_guests_on_pynwheel_access_user_id"
    t.index ["tour_user_id"], name: "index_latch_guests_on_tour_user_id"
  end

  create_table "latch_locks", id: :serial, force: :cascade do |t|
    t.string "lock_id"
    t.string "stop_type"
    t.integer "stop_id"
    t.integer "latch_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "lock_name"
    t.string "door_uuid"
    t.index ["latch_id"], name: "index_latch_locks_on_latch_id"
    t.index ["stop_type", "stop_id"], name: "index_latch_locks_on_stop_type_and_stop_id"
  end

  create_table "latches", id: :serial, force: :cascade do |t|
    t.string "client_id"
    t.string "client_secret"
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "file"
    t.string "lock_instruction_text", default: ""
    t.string "lock_image", default: ""
    t.string "passwordless_client_id", default: ""
    t.string "passwordless_client_secret", default: ""
    t.string "latch_property_name", default: ""
    t.boolean "is_building_name_added", default: false
    t.boolean "is_integration_submitted", default: false
    t.boolean "is_mission_control_setup", default: false
    t.string "amenity_lock_instruction_text", default: ""
    t.string "amenity_lock_image", default: ""
    t.index ["community_id"], name: "index_latches_on_community_id"
  end

  create_table "launch_remotes", id: :serial, force: :cascade do |t|
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["community_id"], name: "index_launch_remotes_on_community_id"
  end

  create_table "locations", id: :serial, force: :cascade do |t|
    t.string "address"
    t.decimal "latitude"
    t.decimal "longitude"
    t.string "category"
    t.string "title"
    t.integer "neighborhood_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "image"
    t.string "standard_image_url"
    t.float "distance"
    t.string "time"
    t.float "rating"
    t.index ["neighborhood_id"], name: "index_locations_on_neighborhood_id"
  end

  create_table "lock_histories", id: :serial, force: :cascade do |t|
    t.string "event"
    t.datetime "occured_at", precision: nil
    t.integer "stop_id"
    t.string "stop_name"
    t.string "stop_type"
    t.integer "tour_user_id"
    t.integer "tour_history_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["tour_history_id"], name: "index_lock_histories_on_tour_history_id"
    t.index ["tour_user_id"], name: "index_lock_histories_on_tour_user_id"
  end

  create_table "main_screens", id: :serial, force: :cascade do |t|
    t.string "appartments_button"
    t.string "galleries_button"
    t.string "neighborhood_button"
    t.string "favorities_button"
    t.string "menu_position"
    t.boolean "manage_background"
    t.string "background_color"
    t.integer "design_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
  end

  create_table "map_filters", force: :cascade do |t|
    t.bigint "community_id", null: false
    t.boolean "marketing_properties_enabled", default: true, null: false
    t.boolean "marketing_bedrooms_enabled", default: true, null: false
    t.boolean "marketing_pricing_enabled", default: true, null: false
    t.boolean "marketing_square_feet_enabled", default: true, null: false
    t.boolean "marketing_availability_enabled", default: true, null: false
    t.boolean "ops_properties_enabled", default: true, null: false
    t.boolean "ops_bedrooms_enabled", default: true, null: false
    t.boolean "ops_pricing_enabled", default: true, null: false
    t.boolean "ops_square_feet_enabled", default: true, null: false
    t.boolean "ops_availability_enabled", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "marketing_units_tab_enabled", default: true, null: false
    t.boolean "marketing_floorplans_tab_enabled", default: true, null: false
    t.boolean "marketing_amenities_tab_enabled", default: true, null: false
    t.boolean "marketing_favorites_tab_enabled", default: true, null: false
    t.boolean "ops_units_tab_enabled", default: true, null: false
    t.boolean "ops_floorplans_tab_enabled", default: true, null: false
    t.boolean "ops_amenities_tab_enabled", default: true, null: false
    t.boolean "ops_favorites_tab_enabled", default: true, null: false
    t.boolean "marketing_sort_enabled", default: true
    t.boolean "ops_sort_enabled", default: true
    t.boolean "marketing_floorplan_gallery_page_enabled", default: true
    t.boolean "ops_floorplan_gallery_page_enabled", default: true
    t.index ["community_id"], name: "index_map_filters_on_community_id", unique: true
    t.check_constraint "marketing_floorplan_gallery_page_enabled IS NOT NULL", name: "map_filters_marketing_floorplan_gallery_page_enabled_not_null", validate: false
    t.check_constraint "marketing_sort_enabled IS NOT NULL", name: "map_filters_marketing_sort_enabled_not_null", validate: false
    t.check_constraint "ops_floorplan_gallery_page_enabled IS NOT NULL", name: "map_filters_ops_floorplan_gallery_page_enabled_not_null", validate: false
    t.check_constraint "ops_sort_enabled IS NOT NULL", name: "map_filters_ops_sort_enabled_not_null", validate: false
  end

  create_table "map_partners", id: :serial, force: :cascade do |t|
    t.integer "community_id", null: false
    t.string "partner", null: false
    t.string "api_key", null: false
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["community_id", "partner", "api_key"], name: "index_map_partners_on_community_partner_api_key", unique: true
    t.index ["community_id"], name: "index_map_partners_on_community_id"
  end

  create_table "maps_positions", id: :serial, force: :cascade do |t|
    t.integer "community_id"
    t.integer "sitemap_id"
    t.integer "floorplate_id"
    t.float "center_coords", default: [], array: true
    t.float "upward_dist"
    t.float "right_dist"
    t.float "rotation"
    t.float "zoom", default: 18.0
    t.float "opacity", default: 0.5
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["community_id"], name: "index_maps_positions_on_community_id"
    t.index ["floorplate_id"], name: "index_maps_positions_on_floorplate_id"
    t.index ["sitemap_id"], name: "index_maps_positions_on_sitemap_id"
  end

  create_table "menus", id: :serial, force: :cascade do |t|
    t.string "position"
    t.string "button_style"
    t.string "border_radius"
    t.string "border_width"
    t.string "border_color"
    t.string "button_background_color"
    t.string "button_hover_color"
    t.boolean "manage_background", default: false
    t.string "background_color"
    t.integer "design_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.float "background_opacity"
    t.string "vertical_menu_position"
    t.string "horizontal_menu_position"
    t.string "navigation_text_color"
    t.string "navigation_background_color"
  end

  create_table "neighborhoods", id: :serial, force: :cascade do |t|
    t.integer "community_id"
    t.string "address"
    t.decimal "latitude"
    t.decimal "longitude"
    t.float "radius"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "category", default: "Dining,Shopping,Entertainment,Schools,Banks,Parks,Errands"
    t.integer "zoom"
    t.boolean "show_neighborhood", default: true
    t.string "neighborhood_name", default: "Neighborhood"
    t.text "listing"
    t.boolean "display_neighborhood_on_homepage", default: true
    t.index ["community_id"], name: "index_neighborhoods_on_community_id"
  end

  create_table "neighbour_units", id: :serial, force: :cascade do |t|
    t.integer "path_point_id"
    t.integer "unit_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["path_point_id"], name: "index_neighbour_units_on_path_point_id"
  end

  create_table "neighbourhood_logs", id: :serial, force: :cascade do |t|
    t.string "from_ip"
    t.string "cat"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
  end

  create_table "oauth_access_grants", id: :serial, force: :cascade do |t|
    t.integer "resource_owner_id", null: false
    t.integer "application_id"
    t.string "token", null: false
    t.integer "expires_in", null: false
    t.text "redirect_uri", null: false
    t.datetime "created_at", precision: nil, null: false
    t.datetime "revoked_at", precision: nil
    t.string "scopes", default: "", null: false
    t.index ["application_id"], name: "index_oauth_access_grants_on_application_id"
    t.index ["resource_owner_id"], name: "index_oauth_access_grants_on_resource_owner_id"
    t.index ["token"], name: "index_oauth_access_grants_on_token", unique: true
  end

  create_table "oauth_access_tokens", id: :serial, force: :cascade do |t|
    t.integer "resource_owner_id"
    t.integer "application_id"
    t.string "token", null: false
    t.string "refresh_token"
    t.integer "expires_in"
    t.datetime "revoked_at", precision: nil
    t.datetime "created_at", precision: nil, null: false
    t.string "scopes"
    t.string "previous_refresh_token", default: "", null: false
    t.index ["application_id"], name: "index_oauth_access_tokens_on_application_id"
    t.index ["refresh_token"], name: "index_oauth_access_tokens_on_refresh_token", unique: true
    t.index ["resource_owner_id"], name: "index_oauth_access_tokens_on_resource_owner_id"
    t.index ["token"], name: "index_oauth_access_tokens_on_token", unique: true
  end

  create_table "oauth_applications", id: :serial, force: :cascade do |t|
    t.string "name", null: false
    t.string "uid", null: false
    t.string "secret", null: false
    t.text "redirect_uri", null: false
    t.string "scopes", default: "", null: false
    t.boolean "confidential", default: true, null: false
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["uid"], name: "index_oauth_applications_on_uid", unique: true
  end

  create_table "opening_hours", id: :serial, force: :cascade do |t|
    t.string "day"
    t.string "opening_time"
    t.string "closing_time"
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.integer "sort"
    t.index ["community_id"], name: "index_opening_hours_on_community_id"
  end

  create_table "other_locks", id: :serial, force: :cascade do |t|
    t.string "description"
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "area_type"
    t.index ["community_id"], name: "index_other_locks_on_community_id"
  end

  create_table "partner_events", force: :cascade do |t|
    t.bigint "partner_id", null: false
    t.bigint "user_id"
    t.string "event", null: false
    t.jsonb "metadata", default: {}, null: false
    t.datetime "created_at", null: false
    t.index ["partner_id", "created_at"], name: "index_partner_events_on_partner_id_and_created_at"
    t.index ["partner_id"], name: "index_partner_events_on_partner_id"
    t.index ["user_id"], name: "index_partner_events_on_user_id"
  end

  create_table "partners", force: :cascade do |t|
    t.string "key", null: false
    t.string "label", null: false
    t.integer "position", default: 0, null: false
    t.boolean "active", default: true, null: false
    t.string "api_key_digest"
    t.string "api_key_prefix"
    t.string "api_key_last4"
    t.string "env_var"
    t.jsonb "settings", default: {}, null: false
    t.datetime "key_issued_at"
    t.datetime "key_rotated_at"
    t.datetime "key_revoked_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["active", "position"], name: "index_partners_on_active_and_position"
    t.index ["api_key_digest"], name: "index_partners_on_api_key_digest", unique: true, where: "(api_key_digest IS NOT NULL)"
    t.index ["key"], name: "index_partners_on_key", unique: true
  end

  create_table "path_points", id: :serial, force: :cascade do |t|
    t.integer "x_plot"
    t.integer "y_plot"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.integer "path_id"
    t.integer "order"
    t.boolean "reordered", default: false
    t.index ["path_id"], name: "index_path_points_on_path_id"
  end

  create_table "paths", id: :serial, force: :cascade do |t|
    t.string "name"
    t.integer "map_path_id"
    t.string "map_path_type"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "map_path_to_type"
    t.integer "map_path_to_id"
    t.string "map_path_from_type"
    t.integer "map_path_from_id"
    t.index ["map_path_from_type", "map_path_from_id"], name: "index_paths_on_map_path_from_type_and_map_path_from_id"
    t.index ["map_path_to_type", "map_path_to_id"], name: "index_paths_on_map_path_to_type_and_map_path_to_id"
  end

  create_table "portal_tour_stop_galleries", id: :serial, force: :cascade do |t|
    t.integer "portal_tour_stop_id"
    t.string "image"
    t.string "description"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
  end

  create_table "portal_tour_stops", id: :serial, force: :cascade do |t|
    t.integer "portal_tour_id"
    t.string "stop_type"
    t.string "name"
    t.string "starting_point"
    t.string "description"
    t.string "direction"
    t.string "video_link"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "tour_stop_details"
    t.string "amenity_type"
  end

  create_table "portal_tours", id: :serial, force: :cascade do |t|
    t.integer "community_id"
    t.string "start_tour"
    t.integer "max_tour"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "start_tour_point"
  end

  create_table "portico_requests", id: false, force: :cascade do |t|
    t.serial "id", null: false
    t.string "app_name"
    t.integer "user_id"
    t.string "os_type"
    t.string "app_version"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
  end

  create_table "prospects", id: :serial, force: :cascade do |t|
    t.integer "community_id"
    t.string "data_provider"
    t.integer "tour_user_id"
    t.jsonb "data"
    t.jsonb "activites"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "crm_provider"
    t.string "tour_key"
    t.string "sf_booking_id"
    t.string "sf_booking_name"
    t.string "sf_guest_id"
    t.string "sf_status", default: ""
    t.index ["community_id"], name: "index_prospects_on_community_id"
    t.index ["tour_user_id"], name: "index_prospects_on_tour_user_id"
  end

  create_table "pynwheel_access_users", id: :serial, force: :cascade do |t|
    t.integer "community_id"
    t.integer "user_type"
    t.string "name"
    t.string "first_name"
    t.string "last_name"
    t.string "email"
    t.string "phone_number"
    t.datetime "move_in_date", precision: nil
    t.datetime "move_out_date", precision: nil
    t.datetime "lease_in_date", precision: nil
    t.datetime "lease_out_date", precision: nil
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.boolean "is_verified", default: false
    t.string "pin_code"
    t.string "guest_id"
    t.integer "random_number"
    t.string "dwelo_status"
    t.string "edge_state_status"
    t.string "latch_status"
    t.string "zerv_status"
    t.string "igloohome_status"
    t.index ["community_id"], name: "index_pynwheel_access_users_on_community_id"
  end

  create_table "read_marks", id: :serial, force: :cascade do |t|
    t.string "readable_type"
    t.integer "readable_id"
    t.string "reader_type"
    t.integer "reader_id"
    t.datetime "timestamp", precision: nil
    t.index ["readable_type", "readable_id"], name: "index_read_marks_on_readable_type_and_readable_id"
    t.index ["reader_id", "reader_type", "readable_type", "readable_id"], name: "read_marks_reader_readable_index", unique: true
    t.index ["reader_type", "reader_id"], name: "index_read_marks_on_reader_type_and_reader_id"
  end

  create_table "regions", id: :serial, force: :cascade do |t|
    t.string "name"
    t.string "contact"
    t.string "phone"
    t.string "email"
    t.integer "creator_id"
    t.integer "company_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["company_id"], name: "index_regions_on_company_id"
  end

  create_table "remote_locks", id: :serial, force: :cascade do |t|
    t.string "remote_lock_type"
    t.string "name"
    t.integer "edge_state_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "device_id"
    t.integer "stop_id"
    t.string "stop_type"
    t.string "stop_name"
    t.integer "dwelo_id"
    t.index ["dwelo_id"], name: "index_remote_locks_on_dwelo_id"
    t.index ["edge_state_id"], name: "index_remote_locks_on_edge_state_id"
  end

  create_table "resident_access_points", id: :serial, force: :cascade do |t|
    t.integer "pynwheel_access_user_id"
    t.integer "access_point_id"
    t.string "access_point_type"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.datetime "access_time", precision: nil
    t.boolean "is_accessed", default: false
    t.index ["pynwheel_access_user_id", "access_point_id"], name: "resident_access_point_unique_index", unique: true
    t.index ["pynwheel_access_user_id"], name: "index_resident_access_points_on_pynwheel_access_user_id"
  end

  create_table "schedual_tours", id: :serial, force: :cascade do |t|
    t.date "tour_date"
    t.time "tour_time"
    t.integer "tour_user_id"
    t.integer "tour_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.integer "community_id"
    t.boolean "hourly_email_sent", default: false
    t.boolean "daily_email_sent", default: false
    t.string "user_time_zone"
    t.integer "day_diff"
    t.string "charge_id"
    t.string "pay_back_id"
    t.time "end_time"
    t.integer "desired_bedroom"
    t.date "desired_move_in_date"
    t.boolean "community_inform_email", default: false
    t.string "tour_type", default: "self_tour"
    t.integer "stops_list", default: [], array: true
    t.boolean "is_tour_completed", default: false
    t.boolean "missed_email_sent", default: false
    t.string "created_by", default: "Pynwheel"
    t.string "yardirentcafe_prospect_id"
    t.string "yardirentcafe_appointment_id"
    t.string "yardirentcafe_leads_attribution"
    t.string "confirmation_notification"
    t.string "reschedule_notification"
    t.string "property_tour_type"
    t.datetime "tour_completed_at", precision: nil
    t.string "country_code"
    t.string "realpage_marketing_source"
    t.string "salesforce_tour_booking_id", default: ""
    t.string "salesforce_tour_booking_name", default: ""
    t.string "knock_prospect_id"
    t.string "knock_appointment_id"
    t.string "knock_prospect_ip_address"
    t.string "funnel_prospect_id"
    t.string "funnel_appointment_id"
    t.string "funnel_prospect_discover_source", default: ""
    t.string "knock_prospect_discover_source", default: ""
    t.string "rentcafe_discover_source", default: ""
    t.index ["tour_id"], name: "index_schedual_tours_on_tour_id"
    t.index ["tour_user_id"], name: "index_schedual_tours_on_tour_user_id"
  end

  create_table "scheduler_widget_settings", id: :serial, force: :cascade do |t|
    t.string "btn_text", default: "Schedule a Visit"
    t.string "btn_color", default: "#20a345"
    t.integer "btn_width", default: 130
    t.integer "btn_height", default: 35
    t.string "btn_font", default: "Open Sans Regular"
    t.string "btn_font_size", default: "14px"
    t.integer "tour_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["tour_id"], name: "index_scheduler_widget_settings_on_tour_id"
  end

  create_table "schlages", id: :serial, force: :cascade do |t|
    t.string "email"
    t.string "password"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "image"
    t.integer "community_id"
    t.index ["community_id"], name: "index_schlages_on_community_id"
  end

  create_table "sdk_events", force: :cascade do |t|
    t.bigint "sdk_session_id"
    t.string "session_id", null: false
    t.string "parent_sdk_session_id"
    t.integer "community_id", null: false
    t.integer "company_id"
    t.string "client_type", null: false
    t.string "partner"
    t.string "product"
    t.string "sdk_version"
    t.string "name", null: false
    t.string "action"
    t.string "event_type", default: "click", null: false
    t.datetime "occurred_at", null: false
    t.text "page_url"
    t.integer "unit_id"
    t.string "provider_unit_id"
    t.string "unit_name"
    t.string "building"
    t.integer "floor_level"
    t.integer "floorplan_id"
    t.string "provider_floorplan_id"
    t.string "floorplan_name"
    t.decimal "bedrooms", precision: 4, scale: 1
    t.decimal "bathrooms", precision: 4, scale: 1
    t.integer "square_footage"
    t.string "link_label"
    t.text "link_url"
    t.integer "link_index"
    t.jsonb "properties", default: {}, null: false
    t.datetime "created_at", null: false
    t.integer "amenity_id"
    t.string "amenity_name"
    t.index ["community_id", "action", "occurred_at"], name: "idx_sdk_events_community_action_time"
    t.index ["community_id", "occurred_at"], name: "idx_sdk_events_community_time"
    t.index ["company_id", "occurred_at"], name: "idx_sdk_events_company_time"
    t.index ["occurred_at"], name: "idx_sdk_events_time_brin", using: :brin
    t.index ["parent_sdk_session_id", "occurred_at"], name: "idx_sdk_events_visitor_time"
    t.index ["sdk_session_id", "occurred_at"], name: "idx_sdk_events_session_time"
  end

  create_table "sdk_sessions", force: :cascade do |t|
    t.integer "community_id", null: false
    t.string "client_type", null: false
    t.string "session_id", null: false
    t.string "parent_sdk_session_id"
    t.string "partner"
    t.string "product", default: "web", null: false
    t.string "sdk_version", default: "v1"
    t.string "community_time_zone", default: "UTC"
    t.datetime "start_datetime"
    t.datetime "end_datetime"
    t.integer "map_interactions", default: 0, null: false
    t.datetime "map_interactions_last_active"
    t.string "visited_pages", default: [], array: true
    t.jsonb "events", default: {}, null: false
    t.jsonb "device_context", default: {}, null: false
    t.jsonb "full_event", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["community_id", "client_type", "start_datetime"], name: "idx_sdk_sessions_community_type_date"
    t.index ["device_context"], name: "idx_sdk_sessions_device_context_gin", using: :gin
    t.index ["events"], name: "idx_sdk_sessions_events_gin", using: :gin
    t.index ["parent_sdk_session_id", "start_datetime"], name: "idx_sdk_sessions_parent_date"
    t.index ["partner", "start_datetime"], name: "idx_sdk_sessions_partner_date"
    t.index ["session_id", "community_id", "start_datetime"], name: "idx_sdk_sessions_session_community_date"
  end

  create_table "shared_tours", id: :serial, force: :cascade do |t|
    t.string "name"
    t.string "recipient_name"
    t.string "phone"
    t.string "email"
    t.integer "tour_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["tour_id"], name: "index_shared_tours_on_tour_id"
  end

  create_table "sitemaps", id: :serial, force: :cascade do |t|
    t.string "image"
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.integer "width", default: 0
    t.integer "height", default: 0
    t.jsonb "map_ocr_data"
    t.boolean "is_ocr_enabled", default: false
    t.string "label_image"
    t.string "file"
    t.string "svg_image"
    t.jsonb "svg_metadata", default: {}
    t.index ["community_id"], name: "index_sitemaps_on_community_id"
  end

  create_table "statuses", id: :serial, force: :cascade do |t|
    t.integer "status"
    t.bigint "statusable_id"
    t.string "statusable_type"
    t.integer "whodunnit"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.text "remarks"
    t.index ["statusable_type", "statusable_id"], name: "index_statuses_on_statusable"
  end

  create_table "stop_details", id: :serial, force: :cascade do |t|
    t.integer "tour_stop_id"
    t.string "description"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["tour_stop_id"], name: "index_stop_details_on_tour_stop_id"
  end

  create_table "stop_galleries", id: :serial, force: :cascade do |t|
    t.integer "tour_stop_id"
    t.string "image"
    t.string "name"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["tour_stop_id"], name: "index_stop_galleries_on_tour_stop_id"
  end

  create_table "sub_communities", force: :cascade do |t|
    t.string "name"
    t.string "property_id"
    t.bigint "community_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "map_marker_color", default: "#d37474"
    t.index ["community_id"], name: "index_sub_communities_on_community_id"
  end

  create_table "svg_optimization_runs", force: :cascade do |t|
    t.bigint "community_id", null: false
    t.string "target_type", null: false
    t.bigint "target_id", null: false
    t.string "action", default: "optimize", null: false
    t.bigint "reverts_run_id"
    t.string "status", default: "queued", null: false
    t.string "backup_url"
    t.string "resulting_url"
    t.bigint "original_bytes"
    t.bigint "optimized_bytes"
    t.decimal "reduction_pct", precision: 5, scale: 1
    t.text "error_message"
    t.bigint "triggered_by_user_id"
    t.datetime "started_at"
    t.datetime "finished_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["community_id"], name: "index_svg_optimization_runs_on_community_id"
    t.index ["reverts_run_id"], name: "index_svg_optimization_runs_on_reverts_run_id"
    t.index ["status"], name: "index_svg_optimization_runs_on_status"
    t.index ["target_type", "target_id"], name: "index_svg_optimization_runs_on_target_type_and_target_id"
  end

  create_table "temp_tables", id: :serial, force: :cascade do |t|
    t.string "community_log"
    t.string "community_log1"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
  end

  create_table "temporary_images", id: :serial, force: :cascade do |t|
    t.text "image"
    t.integer "position"
    t.integer "community_id"
    t.string "name"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
  end

  create_table "three_d_maps_configurations", id: :serial, force: :cascade do |t|
    t.string "default_polygon_color", default: "#3ca832"
    t.string "selected_polygon_color", default: "#5ca904"
    t.float "default_polygon_opacity", default: 0.5
    t.float "selected_polygon_opacity", default: 0.8
    t.string "unit_color", default: "#202"
    t.string "selected_unit_color", default: "#5ca904"
    t.string "poi_color", default: "#008000"
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.float "faded_polygon_opacity", default: 0.3
    t.boolean "show_unit_numbers", default: true
    t.boolean "hide_floors", default: true
    t.index ["community_id"], name: "index_three_d_maps_configurations_on_community_id"
  end

  create_table "tour_histories", id: :serial, force: :cascade do |t|
    t.datetime "arrived", precision: nil
    t.datetime "left", precision: nil
    t.boolean "id_mismatch"
    t.integer "abandoned_tour_at_stop"
    t.integer "tour_user_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.datetime "lengthy_stay", precision: nil
    t.boolean "lengthy_stay_email_sent", default: false
    t.integer "tour_id"
    t.boolean "end_tour_email_sent", default: false
    t.boolean "abandoned_tour_email_sent", default: false
    t.string "my_time_zone"
    t.integer "desired_bedroom"
    t.boolean "is_left", default: false
    t.string "tour_status"
    t.boolean "active_app", default: true
    t.boolean "history", default: false
    t.string "tour_key"
    t.decimal "latitude"
    t.decimal "longitude"
    t.boolean "is_virtual_tour", default: false
    t.string "verified_by"
    t.time "lock_access_time"
    t.integer "see_availability_counter", default: 0
    t.integer "apply_click_counter", default: 0
    t.integer "price_opened_counter", default: 0
    t.integer "notes_opened_counter", default: 0
    t.integer "camera_opened_counter", default: 0
    t.integer "visited_pages_counter", default: 0
    t.string "tour_type", default: ""
    t.string "tour_state", default: "abandoned"
    t.string "tour_site", default: ""
    t.integer "community_id"
    t.string "community_time_zone", default: "UTC"
    t.index ["tour_user_id"], name: "index_tour_histories_on_tour_user_id"
  end

  create_table "tour_settings", id: :serial, force: :cascade do |t|
    t.boolean "show_checklist"
    t.boolean "show_first_name"
    t.boolean "show_last_name"
    t.boolean "show_phone"
    t.boolean "show_email"
    t.boolean "show_desired_bedroom"
    t.boolean "show_desired_move_in_date"
    t.integer "desired_bedroom"
    t.date "desired_move_in_date"
    t.integer "tour_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "time_intervel", default: "15 min"
    t.boolean "do_limit_max_tour", default: false
    t.string "limit_max_tour_type", default: "scheduling"
    t.integer "limit_max_tour", default: 5
    t.boolean "allow_virtual_tour", default: false
    t.boolean "allow_self_tour", default: true
    t.boolean "allow_guided_tour", default: true
    t.integer "length_stay_limit", default: 45
    t.boolean "charge_user_for_id_verfication", default: false
    t.string "email_header_color", default: "#808080"
    t.string "email_footer_color", default: "#808080"
    t.boolean "enable_header_footer", default: true
    t.boolean "enable_restricted_property_access", default: false
    t.boolean "enable_tour_customization", default: false
    t.boolean "bypass_stop_lock_access", default: true
    t.index ["tour_id"], name: "index_tour_settings_on_tour_id"
  end

  create_table "tour_stops", id: :serial, force: :cascade do |t|
    t.integer "tour_id"
    t.decimal "latitude"
    t.decimal "longitude"
    t.integer "stop_id"
    t.string "stop_type"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "name"
    t.integer "sort"
    t.boolean "display_stop", default: true
    t.index ["tour_id"], name: "index_tour_stops_on_tour_id"
  end

  create_table "tour_users", id: :serial, force: :cascade do |t|
    t.string "name"
    t.string "email"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "card_expiry"
    t.string "phone_number"
    t.string "image"
    t.string "id_card"
    t.boolean "id_selfie_mismatch", default: false, null: false
    t.string "first_name"
    t.string "last_name"
    t.boolean "image_bit", default: false
    t.boolean "croped", default: false
    t.string "secure_random"
    t.integer "desired_bedroom"
    t.integer "random_number"
    t.string "tour_type", default: "self_tour"
    t.string "tour_key"
    t.decimal "latitude"
    t.decimal "longitude"
    t.boolean "is_virtual_tour", default: false
    t.string "verified_by"
    t.string "authentication_request_id"
    t.string "authenteq_response"
    t.string "strip_customer_id"
    t.string "card_last_digits"
    t.boolean "arrival_email_sent", default: false
    t.time "lock_access_time"
    t.string "dwelo_status"
    t.string "edge_state_status"
    t.string "latch_status"
    t.string "zerv_status"
    t.boolean "is_sms_enabled", default: true
    t.boolean "is_authentiq_verified", default: false
    t.boolean "is_checkpoint_verified", default: false
    t.datetime "authentiq_verified_at", precision: nil
    t.datetime "checkpoint_verified_at", precision: nil
    t.string "igloohome_status"
    t.integer "property_access_code"
    t.datetime "property_access_code_generated_at", precision: nil
    t.boolean "restricted_property_access", default: false
    t.string "pin_code"
  end

  create_table "tours", id: :serial, force: :cascade do |t|
    t.integer "community_id"
    t.string "name"
    t.decimal "latitude"
    t.decimal "longitude"
    t.string "image"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.integer "x_plot", default: 0
    t.integer "y_plot", default: 0
    t.json "sort_hash", default: "{}", null: false
    t.boolean "visual_id_verification", default: true
    t.string "marker_icon_size"
    t.string "dotted_line_color", default: "#008FD5"
    t.string "max_tour_users"
    t.boolean "credit_card_required", default: true
    t.integer "starting_floor"
    t.json "floor_elevator", default: "{}", null: false
    t.string "building"
    t.boolean "marketing_source_required", default: false
    t.boolean "only_scheduled_tour", default: false
    t.integer "grace_period", default: 10
    t.string "verification_type", default: "check_point_id"
    t.text "building_order", default: [], array: true
    t.integer "max_virtual_tour_users"
    t.integer "max_self_tour_users"
    t.integer "max_guided_tour_users"
    t.boolean "enable_auto_zoom", default: true
    t.string "lock_provider", default: ""
    t.string "access_code"
    t.integer "tour_user_id"
    t.boolean "skip_tour_editing", default: false
    t.json "copy_sort_hash", default: "{}", null: false
    t.index ["community_id"], name: "index_tours_on_community_id"
    t.index ["tour_user_id"], name: "index_tours_on_tour_user_id"
  end

  create_table "track_sessions", id: :serial, force: :cascade do |t|
    t.datetime "start_datetime", precision: nil
    t.datetime "end_datetime", precision: nil
    t.string "track_session_type", default: ""
    t.integer "community_id"
    t.string "session_id", default: ""
    t.string "visited_pages", default: [], array: true
    t.integer "apply_click_counter", default: 0
    t.integer "favorite_saved_counter", default: 0
    t.integer "favorite_sent_counter", default: 0
    t.integer "price_opened_counter", default: 0
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "community_time_zone", default: "UTC"
    t.string "partner"
    t.integer "amenity_marker_hovers", default: 0
    t.integer "unit_marker_hovers", default: 0
    t.integer "unit_marker_clicks", default: 0
    t.integer "amenity_marker_clicks", default: 0
    t.integer "sorting_filter_clicks", default: 0
    t.integer "bedroom_filter_clicks", default: 0
    t.integer "pricing_filter_clicks", default: 0
    t.integer "square_feet_filter_clicks", default: 0
    t.integer "availability_filter_clicks", default: 0
    t.integer "reset_filter_clicks", default: 0
    t.integer "view_saved_clicks", default: 0
    t.integer "schedule_tour_clicks", default: 0
    t.integer "logo_clicks", default: 0
    t.integer "floor_number_clicks", default: 0
    t.integer "zoom_in_clicks", default: 0
    t.integer "zoom_out_clicks", default: 0
    t.integer "zoom_refresh_clicks", default: 0
    t.integer "clear_favorites_clicks", default: 0
    t.integer "other_hovers", default: 0
    t.integer "other_clicks", default: 0
    t.integer "map_interactions", default: 1
    t.datetime "map_interactions_last_active", precision: nil
    t.integer "virtual_tour_clicks", default: 0
    t.integer "unit_modal_buttons_clicks", default: 0
    t.integer "open_pricing_matrix_clicks", default: 0
    t.integer "hide_pricing_matrix_clicks", default: 0
    t.index ["amenity_marker_clicks"], name: "index_track_sessions_on_amenity_marker_clicks"
    t.index ["amenity_marker_hovers"], name: "index_track_sessions_on_amenity_marker_hovers"
    t.index ["availability_filter_clicks"], name: "index_track_sessions_on_availability_filter_clicks"
    t.index ["bedroom_filter_clicks"], name: "index_track_sessions_on_bedroom_filter_clicks"
    t.index ["clear_favorites_clicks"], name: "index_track_sessions_on_clear_favorites_clicks"
    t.index ["community_id"], name: "index_track_sessions_on_community_id"
    t.index ["floor_number_clicks"], name: "index_track_sessions_on_floor_number_clicks"
    t.index ["hide_pricing_matrix_clicks"], name: "index_track_sessions_on_hide_pricing_matrix_clicks"
    t.index ["logo_clicks"], name: "index_track_sessions_on_logo_clicks"
    t.index ["map_interactions"], name: "index_track_sessions_on_map_interactions"
    t.index ["open_pricing_matrix_clicks"], name: "index_track_sessions_on_open_pricing_matrix_clicks"
    t.index ["other_clicks"], name: "index_track_sessions_on_other_clicks"
    t.index ["other_hovers"], name: "index_track_sessions_on_other_hovers"
    t.index ["pricing_filter_clicks"], name: "index_track_sessions_on_pricing_filter_clicks"
    t.index ["reset_filter_clicks"], name: "index_track_sessions_on_reset_filter_clicks"
    t.index ["schedule_tour_clicks"], name: "index_track_sessions_on_schedule_tour_clicks"
    t.index ["sorting_filter_clicks"], name: "index_track_sessions_on_sorting_filter_clicks"
    t.index ["square_feet_filter_clicks"], name: "index_track_sessions_on_square_feet_filter_clicks"
    t.index ["unit_marker_clicks"], name: "index_track_sessions_on_unit_marker_clicks"
    t.index ["unit_marker_hovers"], name: "index_track_sessions_on_unit_marker_hovers"
    t.index ["unit_modal_buttons_clicks"], name: "index_track_sessions_on_unit_modal_buttons_clicks"
    t.index ["view_saved_clicks"], name: "index_track_sessions_on_view_saved_clicks"
    t.index ["virtual_tour_clicks"], name: "index_track_sessions_on_virtual_tour_clicks"
    t.index ["zoom_in_clicks"], name: "index_track_sessions_on_zoom_in_clicks"
    t.index ["zoom_out_clicks"], name: "index_track_sessions_on_zoom_out_clicks"
    t.index ["zoom_refresh_clicks"], name: "index_track_sessions_on_zoom_refresh_clicks"
  end

  create_table "tutorials", id: :serial, force: :cascade do |t|
    t.integer "community_id"
    t.string "name"
    t.string "description"
    t.string "video_type"
    t.string "video"
    t.string "filename"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.boolean "pynwheel_touch", default: true
    t.boolean "pynwheel_maps", default: true
    t.boolean "self_tour", default: true
    t.index ["community_id"], name: "index_tutorials_on_community_id"
  end

  create_table "unit_elevators", id: :serial, force: :cascade do |t|
    t.integer "unit_id", null: false
    t.integer "elevator_id", null: false
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["elevator_id"], name: "index_unit_elevators_on_elevator_id"
    t.index ["unit_id"], name: "index_unit_elevators_on_unit_id"
  end

  create_table "unit_space_details", force: :cascade do |t|
    t.bigint "unit_id", null: false
    t.integer "community_id", null: false
    t.string "provider", null: false
    t.string "provider_space_id"
    t.string "space_letter"
    t.string "space_option"
    t.jsonb "amenities", default: [], null: false
    t.jsonb "premium_amenities", default: [], null: false
    t.jsonb "lease_terms", default: [], null: false
    t.jsonb "metadata", default: {}, null: false
    t.date "lease_start_date"
    t.date "lease_end_date"
    t.decimal "space_rent", precision: 10, scale: 2
    t.datetime "synced_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["community_id", "provider"], name: "index_unit_space_details_on_community_id_and_provider"
    t.index ["community_id", "provider_space_id"], name: "index_unit_space_details_on_community_id_and_provider_space_id"
    t.index ["community_id", "space_letter"], name: "index_unit_space_details_on_community_id_and_space_letter"
    t.index ["unit_id"], name: "index_unit_space_details_on_unit_id", unique: true
  end

  create_table "units", id: :serial, force: :cascade do |t|
    t.integer "community_id"
    t.string "provider"
    t.string "property_id"
    t.string "provider_unit_id"
    t.string "unit_type"
    t.string "marketing_name"
    t.string "floorplan_id"
    t.float "market_rent"
    t.float "effective_rent"
    t.string "availability"
    t.date "available_date"
    t.string "building"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.integer "x_plot", default: 0
    t.integer "y_plot", default: 0
    t.integer "floorplate_id"
    t.integer "lease_term", default: 12
    t.string "image"
    t.integer "floor"
    t.string "standard_image_url"
    t.boolean "updated_by_admin", default: false
    t.boolean "available"
    t.boolean "sold", default: false
    t.boolean "manually_updated", default: false
    t.boolean "manual_override", default: false
    t.float "square_feet"
    t.text "description"
    t.string "secondary_image"
    t.string "availability_url"
    t.string "lease_pricing"
    t.boolean "name_is_updated"
    t.boolean "floorplan_id_is_updated"
    t.boolean "effective_rent_is_updated"
    t.boolean "available_date_is_updated"
    t.boolean "available_is_updated"
    t.boolean "sold_is_updated"
    t.boolean "floor_is_updated"
    t.boolean "building_is_updated"
    t.boolean "availability_is_updated"
    t.string "stop_description"
    t.boolean "display_virtual_tour_button_label", default: false
    t.string "virtual_tour_button_label", default: "3D Tour"
    t.string "virtual_tour_url"
    t.float "max_effective_rent"
    t.float "min_effective_rent"
    t.float "avg_effective_rent"
    t.string "sitemap_image_url"
    t.boolean "iframe_enable_for_3Dtour", default: true
    t.boolean "modal_unit", default: false
    t.string "availability_url_deep_linking"
    t.string "access_code"
    t.float "crop_x"
    t.float "crop_y"
    t.float "crop_w"
    t.float "crop_h"
    t.float "crop_x_secondary"
    t.float "crop_y_secondary"
    t.float "crop_w_secondary"
    t.float "crop_h_secondary"
    t.boolean "image_bit"
    t.boolean "do_crop", default: false
    t.boolean "do_crop_secpndary", default: false
    t.string "lock_provider", default: ""
    t.string "unit_status", default: ""
    t.boolean "visible", default: true
    t.integer "tour_visiting_order_number"
    t.string "additional_fee", default: ""
    t.jsonb "pointer_data", default: {}
    t.string "voyager_property_code"
    t.string "additional_button"
    t.string "additional_url"
    t.string "scheduler_label"
    t.string "scheduler_url"
    t.boolean "show_on_map", default: false
    t.boolean "link1_open_new_tab", default: false
    t.boolean "link2_open_new_tab", default: false
    t.boolean "link3_open_new_tab", default: false
    t.string "description_title", default: "More Details"
    t.boolean "expand_description_in_popup", default: false
    t.index ["community_id"], name: "index_units_on_community_id"
    t.index ["floorplan_id"], name: "index_units_on_floorplan_id"
    t.check_constraint "expand_description_in_popup IS NOT NULL", name: "units_expand_description_in_popup_not_null", validate: false
  end

  create_table "user_stripes", id: :serial, force: :cascade do |t|
    t.integer "tour_user_id"
    t.integer "charge_amount_in_cent"
    t.string "charge_id"
    t.string "refund_id"
    t.integer "refund_amount_in_cent"
    t.string "last_digits"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["tour_user_id"], name: "index_user_stripes_on_tour_user_id"
  end

  create_table "users", id: :serial, force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at", precision: nil
    t.datetime "remember_created_at", precision: nil
    t.integer "sign_in_count", default: 0, null: false
    t.datetime "current_sign_in_at", precision: nil
    t.datetime "last_sign_in_at", precision: nil
    t.inet "current_sign_in_ip"
    t.inet "last_sign_in_ip"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "first_name"
    t.string "last_name"
    t.string "role"
    t.string "avatar"
    t.string "invitation_token"
    t.datetime "invitation_created_at", precision: nil
    t.datetime "invitation_sent_at", precision: nil
    t.datetime "invitation_accepted_at", precision: nil
    t.integer "invitation_limit"
    t.string "invited_by_type"
    t.integer "invited_by_id"
    t.integer "invitations_count", default: 0
    t.integer "company_id"
    t.string "company_name"
    t.string "community_logs"
    t.string "entrata_list_logs"
    t.string "entrata_function_logs"
    t.boolean "welcome_prompt", default: false
    t.boolean "welcome_property_details_page", default: false
    t.boolean "welcome_logo_page", default: false
    t.boolean "welcome_homepage_page", default: false
    t.boolean "welcome_floorplate_page", default: false
    t.boolean "welcome_amenity_page", default: false
    t.boolean "welcome_floorplan_page", default: false
    t.boolean "welcome_sitemap_page", default: false
    t.boolean "welcome_edit_floorplan_page", default: false
    t.boolean "welcome_unit_page", default: false
    t.boolean "welcome_neighbourhood_page", default: false
    t.boolean "welcome_favorite_page", default: false
    t.boolean "welcome_additional_page", default: false
    t.boolean "welcome_gallery_page", default: false
    t.boolean "welcome_floorplate_plot_page", default: true
    t.boolean "welcome_tour_setup", default: false
    t.boolean "welcome_tour_setting", default: false
    t.integer "enable_community_id"
    t.datetime "last_seen", precision: nil
    t.integer "region_id"
    t.jsonb "product_options"
    t.boolean "pynwheel_launch_access", default: false
    t.boolean "pynwheel_connect_access", default: true
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["invitation_token"], name: "index_users_on_invitation_token", unique: true
    t.index ["invitations_count"], name: "index_users_on_invitations_count"
    t.index ["invited_by_id"], name: "index_users_on_invited_by_id"
    t.index ["region_id"], name: "index_users_on_region_id"
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  create_table "versions", id: false, force: :cascade do |t|
    t.serial "id", null: false
    t.string "item_type", null: false
    t.bigint "item_id", null: false
    t.string "event", null: false
    t.string "whodunnit"
    t.integer "community_id"
    t.integer "company_id"
    t.text "object"
    t.datetime "created_at", precision: nil
    t.index ["item_type", "item_id"], name: "index_versions_on_item_type_and_item_id"
  end

  create_table "visited_stops", id: :serial, force: :cascade do |t|
    t.integer "tour_user_id"
    t.string "image"
    t.integer "tour_stop_id"
    t.string "description"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.integer "tour_id"
    t.string "device_id"
    t.string "tour_key"
    t.boolean "is_rotated", default: true
    t.time "event_time"
    t.date "event_date"
    t.boolean "is_tracked", default: false
    t.jsonb "lat_lang", default: []
    t.string "stop_type"
    t.string "stop_pin"
    t.index ["tour_user_id"], name: "index_visited_stops_on_tour_user_id"
  end

  create_table "web_hook_logs", id: :serial, force: :cascade do |t|
    t.string "webhook_type"
    t.string "community_name"
    t.string "community_id"
    t.jsonb "params"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
  end

  create_table "webpages", id: :serial, force: :cascade do |t|
    t.string "name"
    t.string "url"
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.boolean "hide_page", default: false
    t.boolean "display_on_homepage"
    t.integer "position"
    t.boolean "iframe_enable_for_3Dtour", default: false
    t.index ["community_id"], name: "index_webpages_on_community_id"
  end

  create_table "yales", id: :serial, force: :cascade do |t|
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.integer "community_id"
    t.index ["community_id"], name: "index_yales_on_community_id"
  end

  create_table "zerv_guests", id: :serial, force: :cascade do |t|
    t.string "status"
    t.jsonb "res_errors"
    t.integer "tour_user_id"
    t.integer "community_id"
    t.string "guest_of_stop_type"
    t.integer "guest_of_stop_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.integer "pynwheel_access_user_id"
    t.index ["community_id"], name: "index_zerv_guests_on_community_id"
    t.index ["guest_of_stop_type", "guest_of_stop_id"], name: "index_zerv_guests_on_guest_of_stop_type_and_guest_of_stop_id"
    t.index ["pynwheel_access_user_id"], name: "index_zerv_guests_on_pynwheel_access_user_id"
    t.index ["tour_user_id"], name: "index_zerv_guests_on_tour_user_id"
  end

  create_table "zerv_locks", id: :serial, force: :cascade do |t|
    t.string "mac_id"
    t.boolean "is_device_active"
    t.string "location_name"
    t.string "location_friendly_name"
    t.string "sub_location_name"
    t.string "sub_location_friendly_name"
    t.string "universal_access_code"
    t.integer "zerv_id"
    t.string "stop_type"
    t.integer "stop_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.index ["stop_type", "stop_id"], name: "index_zerv_locks_on_stop_type_and_stop_id"
    t.index ["zerv_id"], name: "index_zerv_locks_on_zerv_id"
  end

  create_table "zervs", id: :serial, force: :cascade do |t|
    t.string "username"
    t.string "password"
    t.integer "community_id"
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.string "facility_id"
    t.string "badge_id"
    t.string "card_format"
    t.string "lock_instruction_text", default: ""
    t.string "lock_image", default: ""
    t.string "amenity_lock_instruction_text", default: ""
    t.string "amenity_lock_image", default: ""
    t.index ["community_id"], name: "index_zervs_on_community_id"
  end

  add_foreign_key "additional_files", "imagepages"
  add_foreign_key "additional_images", "imagepages"
  add_foreign_key "allowed_emails", "communities"
  add_foreign_key "amenity_galleries", "amenities"
  add_foreign_key "as_guests", "communities"
  add_foreign_key "as_guests", "tour_users"
  add_foreign_key "bedroom_marker_colors", "communities"
  add_foreign_key "building_starting_points", "communities"
  add_foreign_key "calculator_configs", "communities"
  add_foreign_key "chatrooms", "tour_users"
  add_foreign_key "chatrooms", "tours"
  add_foreign_key "chats", "chatrooms"
  add_foreign_key "communities", "companies"
  add_foreign_key "community_groups", "companies"
  add_foreign_key "community_users", "communities"
  add_foreign_key "community_users", "users"
  add_foreign_key "company_settings", "companies"
  add_foreign_key "credentials", "communities"
  add_foreign_key "credentials", "companies"
  add_foreign_key "crm_credentials", "communities"
  add_foreign_key "crm_discovery_sources", "communities"
  add_foreign_key "crm_time_slots", "communities"
  add_foreign_key "design_system_configs", "communities"
  add_foreign_key "doors", "communities"
  add_foreign_key "dwelos", "communities"
  add_foreign_key "edge_states", "communities"
  add_foreign_key "elevator_banks", "elevators"
  add_foreign_key "elevator_galleries", "elevators"
  add_foreign_key "elevators", "communities"
  add_foreign_key "elevators", "floorplates"
  add_foreign_key "elevators", "sitemaps"
  add_foreign_key "favorite_images", "favorite_settings"
  add_foreign_key "favorite_settings", "communities"
  add_foreign_key "favorite_stops", "communities"
  add_foreign_key "feedbacks", "tour_users"
  add_foreign_key "feedbacks", "tours"
  add_foreign_key "font_settings", "communities"
  add_foreign_key "galleries", "communities"
  add_foreign_key "gallery_images", "communities"
  add_foreign_key "gallery_images", "galleries"
  add_foreign_key "group_designs", "community_groups"
  add_foreign_key "group_homepage_images", "group_designs"
  add_foreign_key "group_homepage_videos", "group_designs"
  add_foreign_key "guided_opening_hours", "communities"
  add_foreign_key "homepage_icons", "designs"
  add_foreign_key "igloo_guests", "communities"
  add_foreign_key "igloo_guests", "tour_users"
  add_foreign_key "igloohome_guests", "communities"
  add_foreign_key "igloohome_guests", "tour_users"
  add_foreign_key "igloohome_locks", "igloohomes"
  add_foreign_key "igloohomes", "communities"
  add_foreign_key "imagepages", "communities"
  add_foreign_key "latch_allowed_accesses", "latch_guests"
  add_foreign_key "latch_auth_tokens", "tour_users"
  add_foreign_key "latch_guests", "communities"
  add_foreign_key "latch_guests", "tour_users"
  add_foreign_key "latch_locks", "latches"
  add_foreign_key "latches", "communities"
  add_foreign_key "locations", "neighborhoods"
  add_foreign_key "lock_histories", "tour_histories"
  add_foreign_key "lock_histories", "tour_users"
  add_foreign_key "map_filters", "communities"
  add_foreign_key "map_partners", "communities"
  add_foreign_key "maps_positions", "communities"
  add_foreign_key "maps_positions", "floorplates"
  add_foreign_key "maps_positions", "sitemaps"
  add_foreign_key "neighborhoods", "communities"
  add_foreign_key "neighbour_units", "path_points"
  add_foreign_key "oauth_access_grants", "oauth_applications", column: "application_id"
  add_foreign_key "oauth_access_tokens", "oauth_applications", column: "application_id"
  add_foreign_key "opening_hours", "communities"
  add_foreign_key "other_locks", "communities"
  add_foreign_key "partner_events", "partners"
  add_foreign_key "partner_events", "users"
  add_foreign_key "prospects", "communities"
  add_foreign_key "prospects", "tour_users"
  add_foreign_key "pynwheel_access_users", "communities"
  add_foreign_key "regions", "companies"
  add_foreign_key "remote_locks", "dwelos"
  add_foreign_key "remote_locks", "edge_states"
  add_foreign_key "resident_access_points", "pynwheel_access_users"
  add_foreign_key "schedual_tours", "tour_users"
  add_foreign_key "schedual_tours", "tours"
  add_foreign_key "scheduler_widget_settings", "tours"
  add_foreign_key "sitemaps", "communities"
  add_foreign_key "stop_details", "tour_stops"
  add_foreign_key "stop_galleries", "tour_stops"
  add_foreign_key "sub_communities", "communities"
  add_foreign_key "svg_optimization_runs", "communities"
  add_foreign_key "three_d_maps_configurations", "communities"
  add_foreign_key "tour_histories", "tour_users"
  add_foreign_key "tour_settings", "tours"
  add_foreign_key "tour_stops", "tours"
  add_foreign_key "tours", "communities"
  add_foreign_key "tours", "tour_users"
  add_foreign_key "tutorials", "communities"
  add_foreign_key "unit_elevators", "elevators"
  add_foreign_key "unit_elevators", "units"
  add_foreign_key "unit_space_details", "units", on_delete: :cascade
  add_foreign_key "user_stripes", "tour_users"
  add_foreign_key "visited_stops", "tour_users"
  add_foreign_key "webpages", "communities"
  add_foreign_key "zerv_guests", "communities"
  add_foreign_key "zerv_guests", "tour_users"
  add_foreign_key "zerv_locks", "zervs"
  add_foreign_key "zervs", "communities"
end
