# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 20190805130215) do

  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"
  enable_extension "pg_stat_statements"

  create_table "additional_images", force: :cascade do |t|
    t.string   "image"
    t.integer  "sort"
    t.string   "name"
    t.integer  "imagepage_id"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
    t.index ["imagepage_id"], name: "index_additional_images_on_imagepage_id", using: :btree
  end

  create_table "amenities", force: :cascade do |t|
    t.string   "provider_amenity_id"
    t.string   "amenty_type"
    t.text     "description"
    t.integer  "unit_id"
    t.datetime "created_at",          null: false
    t.datetime "updated_at",          null: false
    t.string   "name"
    t.string   "image"
    t.integer  "x_plot"
    t.integer  "y_plot"
    t.string   "amenityable_type"
    t.integer  "amenityable_id"
    t.integer  "community_id"
    t.string   "standard_image_url"
    t.integer  "sort"
    t.string   "access_code"
    t.string   "directional_text"
    t.index ["amenityable_type", "amenityable_id"], name: "index_amenities_on_amenityable_type_and_amenityable_id", using: :btree
  end

  create_table "amenity_galleries", force: :cascade do |t|
    t.integer  "amenity_id"
    t.string   "image"
    t.string   "description"
    t.string   "name"
    t.datetime "created_at",       null: false
    t.datetime "updated_at",       null: false
    t.string   "directional_text"
    t.index ["amenity_id"], name: "index_amenity_galleries_on_amenity_id", using: :btree
  end

  create_table "app_versions", force: :cascade do |t|
    t.string   "version"
    t.datetime "created_at",           null: false
    t.datetime "updated_at",           null: false
    t.integer  "neighborhood_counter"
  end

  create_table "communities", force: :cascade do |t|
    t.string   "name"
    t.string   "logo"
    t.string   "address"
    t.string   "city"
    t.string   "state"
    t.string   "zip"
    t.string   "email"
    t.string   "phone"
    t.string   "description"
    t.decimal  "latitude"
    t.decimal  "longitude"
    t.boolean  "locked"
    t.string   "data_provider"
    t.integer  "company_id"
    t.datetime "created_at",                                            null: false
    t.datetime "updated_at",                                            null: false
    t.string   "theme_name"
    t.string   "website"
    t.string   "code"
    t.boolean  "is_sitemap",                     default: true
    t.string   "secondary_logo"
    t.boolean  "show_gallery",                   default: true
    t.string   "gallery_page_name",              default: "Gallery"
    t.boolean  "show_apartment",                 default: true
    t.string   "apartment_page_name",            default: "Apartments"
    t.boolean  "equal_housing_opportunity_logo", default: true
    t.boolean  "handicap_accessible_logo",       default: true
    t.boolean  "display_rent",                   default: true
    t.boolean  "display_sitemap",                default: true
    t.boolean  "display_floorplan_gallery",      default: true
    t.boolean  "display_unit_on_homepage",       default: true
    t.boolean  "display_gallery_on_homepage",    default: true
    t.string   "realpage_pricing_data"
    t.boolean  "realpage_pricing_data_uploaded", default: true
    t.boolean  "powered_by_btn",                 default: true
    t.string   "entrata_exception_logs"
    t.boolean  "is_vertical_app",                default: false
    t.boolean  "show_tour_page"
    t.boolean  "display_available_date",         default: true
    t.boolean  "show_gesture_icons"
    t.index ["company_id"], name: "index_communities_on_company_id", using: :btree
  end

  create_table "community_users", force: :cascade do |t|
    t.integer  "community_id"
    t.integer  "user_id"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
    t.index ["community_id"], name: "index_community_users_on_community_id", using: :btree
    t.index ["user_id"], name: "index_community_users_on_user_id", using: :btree
  end

  create_table "companies", force: :cascade do |t|
    t.string   "name"
    t.string   "address"
    t.string   "city"
    t.string   "state"
    t.string   "zip"
    t.string   "email"
    t.string   "phone"
    t.string   "logo"
    t.boolean  "locked"
    t.datetime "created_at",                 null: false
    t.datetime "updated_at",                 null: false
    t.boolean  "inactivate", default: false
  end

  create_table "credentials", force: :cascade do |t|
    t.integer  "community_id"
    t.string   "password"
    t.string   "username"
    t.string   "property_id"
    t.string   "pmc_id"
    t.string   "licence_key"
    t.string   "server_name"
    t.string   "database"
    t.string   "platform"
    t.string   "interface_entity"
    t.datetime "created_at",                          null: false
    t.datetime "updated_at",                          null: false
    t.string   "url"
    t.string   "site_id"
    t.string   "c_code"
    t.string   "p_code"
    t.boolean  "apply_now",           default: false
    t.string   "file"
    t.string   "api_token"
    t.string   "resman_apikey"
    t.string   "resman_partner_id"
    t.string   "resman_account_id"
    t.string   "resman_property_id"
    t.string   "zaremba_username"
    t.string   "zaremba_password"
    t.string   "zaremba_filename"
    t.string   "zaremba_property_id"
    t.string   "entrata_url"
    t.string   "xml_filename"
    t.string   "xml_domain"
    t.string   "data_error_message"
    t.index ["community_id"], name: "index_credentials_on_community_id", using: :btree
  end

  create_table "default_images", force: :cascade do |t|
    t.string   "name"
    t.string   "image"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "delayed_jobs", force: :cascade do |t|
    t.integer  "priority",   default: 0, null: false
    t.integer  "attempts",   default: 0, null: false
    t.text     "handler",                null: false
    t.text     "last_error"
    t.datetime "run_at"
    t.datetime "locked_at"
    t.datetime "failed_at"
    t.string   "locked_by"
    t.string   "queue"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.index ["priority", "run_at"], name: "delayed_jobs_priority", using: :btree
  end

  create_table "designs", force: :cascade do |t|
    t.string   "primary_color"
    t.string   "secondary_color"
    t.string   "primary_font_family"
    t.string   "primary_font_size"
    t.string   "primary_font_weight"
    t.string   "primary_text_align"
    t.string   "primary_font_color"
    t.string   "secondary_font_family"
    t.string   "secondary_font_size"
    t.string   "secondary_font_weight"
    t.string   "secondary_text_align"
    t.string   "secondary_font_color"
    t.string   "main_screen_background_color"
    t.string   "inner_screen_background_color"
    t.integer  "community_id"
    t.datetime "created_at",                                                                                                                                                                                                            null: false
    t.datetime "updated_at",                                                                                                                                                                                                            null: false
    t.string   "loop_type",                                       default: "images"
    t.string   "logo_position"
    t.string   "secondary_logo_position"
    t.string   "secondary_page_background_image"
    t.string   "global_navigation_position"
    t.string   "animation",                                       default: "bouncing effects"
    t.string   "global_navigation_font_color"
    t.string   "global_navigation_background_color"
    t.string   "global_navigation_button_color"
    t.string   "global_navigation_buttons_opacity"
    t.string   "global_nav_bg_opacity"
    t.string   "button_shape"
    t.string   "global_nav_buttons_height"
    t.string   "global_nav_buttons_width"
    t.string   "secondary_page_menu_border"
    t.string   "global_nav_button_on"
    t.string   "global_nav_button_off"
    t.boolean  "buttons_as_image",                                default: false
    t.string   "filter_panel_color"
    t.string   "filter_panel_font_style"
    t.string   "filter_panel_font_color"
    t.string   "filter_button_color"
    t.string   "filter_button_font_style"
    t.string   "filter_button_font_color"
    t.string   "filter_panel_opacity"
    t.string   "filter_buttons_opacity"
    t.string   "gallery_buttons_opacity"
    t.string   "filter_menu_buttons_border"
    t.string   "gallery_buttons_border"
    t.string   "filter_button"
    t.string   "gallery_button"
    t.string   "filter_panel_background_image"
    t.string   "home_page_button_shape"
    t.string   "home_page_navigation_background_height"
    t.string   "home_page_buttons_height"
    t.string   "home_page_buttons_width"
    t.string   "home_page_buttons_opacity"
    t.string   "home_page_navigation_background_opacity"
    t.string   "home_page_buttons_border"
    t.string   "marker_background_color"
    t.string   "marker_style"
    t.string   "header_bg_color"
    t.string   "header_font_color"
    t.string   "details_bg_color"
    t.string   "details_font_color"
    t.string   "available_appartments_font_color"
    t.string   "available_appartments_bg_color"
    t.string   "floor_bg_color"
    t.string   "unit_header_bg_color"
    t.string   "unit_header_font_color"
    t.string   "unit_details_font_color"
    t.string   "unit_details_bg_color"
    t.string   "floorplan_name_bg_color"
    t.string   "floorplan_name_font_color"
    t.string   "unit_bg_color"
    t.string   "home_page_navigation_background_color"
    t.string   "home_page_navigation_button_color"
    t.string   "home_page_navigation_font_color"
    t.boolean  "filter_button_as_image",                          default: false
    t.boolean  "gallery_button_as_image",                         default: false
    t.boolean  "filter_panel_background_as_image",                default: false
    t.string   "gallery_button_on_image"
    t.boolean  "gallery_button_on_as_image",                      default: false
    t.boolean  "global_nav_button_on_as_image",                   default: false
    t.boolean  "global_nav_button_off_as_image",                  default: false
    t.string   "unit_header_bg_color_opacity"
    t.string   "unit_details_bg_color_opacity"
    t.string   "floorplan_name_bg_color_opacity"
    t.string   "unit_bg_color_opacity"
    t.string   "header_bg_color_opacity"
    t.string   "details_bg_color_opacity"
    t.string   "available_appartments_bg_color_opacity"
    t.string   "floor_bg_color_opacity"
    t.string   "property_map_size",                               default: "30px"
    t.string   "property_map_color",                              default: "#d37474"
    t.string   "amenity_map_marker_size",                         default: "30px"
    t.string   "amenity_map_marker_color",                        default: "#ff0000"
    t.string   "modernist_map_marker_color",                      default: "no color"
    t.string   "modernists_amenity_map_marker_color",             default: "no color"
    t.integer  "property_map_size_integer",                       default: 30
    t.integer  "amenity_map_marker_size_integer",                 default: 30
    t.string   "futurist_ebrochure_header_background_color",      default: "#808080"
    t.string   "modernist_ebrochure_header_background_color",     default: "No color"
    t.string   "gables_ebrochure_header_background_color",        default: "#808080"
    t.string   "panther_ebrochure_header_background_color",       default: "#808080"
    t.string   "expressionist_ebrochure_header_background_color", default: "No color"
    t.boolean  "display_ebrochure_header_background_color",       default: false
    t.string   "ebrochure_email_message",                         default: "Thank you for visiting <community_name>! Here are your favorites. Click on the images below to expand them.\n\nWe look forward to seeing you again soon. "
    t.boolean  "ebrochure_email_message_updated",                 default: false
    t.string   "futurist_property_map_marker_color"
    t.string   "expressionist_property_map_marker_color"
    t.string   "panther_property_map_marker_color"
    t.string   "futurist_amenity_map_marker_color"
    t.string   "expressionist__amenity_map_marker_color"
    t.string   "panther_amenity_map_marker_color"
    t.integer  "futurist_property_map_size"
    t.integer  "expressionist_property_map_size"
    t.integer  "panther_property_map_size"
    t.integer  "modernist_property_map_size"
    t.integer  "futurist_amenity_map_size"
    t.integer  "expressionist_amenity_map_size"
    t.integer  "panther_amenity_map_size"
    t.integer  "modernist_amenity_map_size"
    t.string   "futurist_unit_floorplan_map_marker_color"
    t.string   "expressionist_unit_floorplan_map_marker_color"
    t.string   "panther_unit_floorplan_map_marker_color"
    t.string   "gables_unit_floorplan_map_marker_color"
    t.string   "modernist_unit_floorplan_map_marker_color"
  end

  create_table "ebrochure_menu_buttons", force: :cascade do |t|
    t.string   "name"
    t.text     "url"
    t.integer  "favorite_setting_id"
    t.datetime "created_at",          null: false
    t.datetime "updated_at",          null: false
  end

  create_table "expressionists", force: :cascade do |t|
    t.string   "home_page_menu_position"
    t.string   "home_page_position_of_logo"
    t.string   "home_page_logo_size"
    t.string   "home_page_button_border_color"
    t.boolean  "display_home_page_button_icon",                    default: true
    t.string   "home_page_button_font_family"
    t.string   "home_page_button_font_size"
    t.boolean  "display_home_page_nav_background",                 default: true
    t.string   "home_page_button_image"
    t.string   "global_navigation_button_font_family"
    t.string   "global_navigation_button_font_size"
    t.boolean  "display_global_navigation_button_bg_color",        default: true
    t.string   "filter_panel_button_border_color"
    t.string   "filter_panel_text_font_size"
    t.string   "filter_panel_button_text_font_size"
    t.integer  "design_id"
    t.datetime "created_at",                                                                  null: false
    t.datetime "updated_at",                                                                  null: false
    t.boolean  "display_global_navigation_button_icon",            default: true
    t.boolean  "display_home_page_image",                          default: false
    t.string   "global_navigation_button_border_color"
    t.string   "spacing_between_buttons"
    t.string   "button_on_bg_color"
    t.boolean  "display_button_on_bg_color",                       default: false
    t.string   "global_navigation_button_on_font_color"
    t.string   "application_background_image"
    t.boolean  "display_application_background_image",             default: false
    t.string   "application_background_color"
    t.boolean  "display_apartment_nav_bg_image",                   default: false
    t.string   "apartment_nav_bg_image"
    t.boolean  "display_gallery_nav_bg_image",                     default: false
    t.string   "gallery_nav_bg_image"
    t.boolean  "display_favourities_nav_bg_image",                 default: false
    t.string   "favourities_nav_bg_image"
    t.boolean  "display_additional_pages_nav_bg_image",            default: false
    t.string   "additional_pages_nav_bg_image"
    t.string   "button_on_bg_color_opacity"
    t.string   "application_background_color_opacity"
    t.string   "apartment_nav_bg_color"
    t.string   "gallery_nav_bg_color"
    t.string   "favourities_nav_bg_color"
    t.string   "additional_pages_nav_bg_color"
    t.boolean  "display_apartment_btn_on_image",                   default: false
    t.string   "apartment_btn_on_image"
    t.boolean  "display_gallery_btn_on_image",                     default: false
    t.string   "gallery_btn_on_image"
    t.boolean  "display_neighborhood_btn_on_image",                default: false
    t.string   "neighborhood_btn_on_image"
    t.boolean  "display_imagepage_btn_on_image",                   default: false
    t.string   "imagepage_btn_on_image"
    t.boolean  "display_webpage_btn_on_image",                     default: false
    t.string   "webpage_btn_on_image"
    t.boolean  "display_favourite_btn_on_image",                   default: false
    t.string   "favourite_btn_on_image"
    t.boolean  "display_apartment_btn_off_image",                  default: false
    t.string   "apartment_btn_off_image"
    t.boolean  "display_gallery_btn_off_image",                    default: false
    t.string   "gallery_btn_off_image"
    t.boolean  "display_neighborhood_btn_off_image",               default: false
    t.string   "neighborhood_btn_off_image"
    t.boolean  "display_imagepage_btn_off_image",                  default: false
    t.string   "imagepage_btn_off_image"
    t.boolean  "display_webpage_btn_off_image",                    default: false
    t.string   "webpage_btn_off_image"
    t.boolean  "display_favourite_btn_off_image",                  default: false
    t.string   "favourite_btn_off_image"
    t.boolean  "global_navigation_btn_on_for_all",                 default: false
    t.boolean  "global_navigation_btn_off_for_all",                default: false
    t.boolean  "display_global_nav_background_image",              default: false
    t.string   "global_nav_background_image"
    t.string   "home_page_background_image"
    t.boolean  "display_home_page_nav_background_image",           default: false
    t.string   "spacing_between_buttons_for_homepage"
    t.string   "global_navigation_border_thickness"
    t.boolean  "home_page_logo_visible",                           default: false
    t.boolean  "gables_home_page_images",                          default: false
    t.boolean  "global_navigation_text_outside_the_button_border", default: false
    t.boolean  "use_gables_buttons",                               default: false
    t.string   "home_page_icons_position"
    t.string   "global_navigation_icons_position",                 default: "Above the text"
    t.boolean  "global_navigation_show_background_color",          default: true
    t.string   "button_text_position"
    t.boolean  "display_global_navigation_button_color",           default: false
    t.string   "homepage_button_border_thickness"
    t.boolean  "global_navigation_home_icon",                      default: false
    t.string   "homepage_button_border"
    t.string   "global_nav_button_icon_size"
  end

  create_table "favorite_images", force: :cascade do |t|
    t.string   "image"
    t.integer  "favorite_setting_id"
    t.datetime "created_at",          null: false
    t.datetime "updated_at",          null: false
    t.string   "name"
    t.integer  "sort"
    t.index ["favorite_setting_id"], name: "index_favorite_images_on_favorite_setting_id", using: :btree
  end

  create_table "favorite_settings", force: :cascade do |t|
    t.integer  "community_id"
    t.string   "email_from"
    t.string   "email_bcc"
    t.datetime "created_at",                                                                                                                                                                                          null: false
    t.datetime "updated_at",                                                                                                                                                                                          null: false
    t.string   "email_body",                     default: "Thank you for visiting <community_name>! Here are your favorites. Click on the images below to expand them.\n\nWe look forward to seeing you again soon."
    t.boolean  "show_favorite",                  default: true
    t.string   "favorite_name",                  default: "Favorites"
    t.boolean  "equal_housing_opportunity_logo", default: true
    t.boolean  "handicap_accessible_logo",       default: true
    t.index ["community_id"], name: "index_favorite_settings_on_community_id", using: :btree
  end

  create_table "favorites", force: :cascade do |t|
    t.integer  "community_id"
    t.string   "session_id"
    t.jsonb    "unit_ids"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
  end

  create_table "filter_panels", force: :cascade do |t|
    t.string   "button_border_color"
    t.string   "text_font_size"
    t.string   "button_text_font_size"
    t.integer  "design_id"
    t.datetime "created_at",                                                           null: false
    t.datetime "updated_at",                                                           null: false
    t.string   "gallery_button_on_font_color"
    t.boolean  "display_gallery_button_on_background_color", default: false
    t.string   "gallery_button_on_background_color"
    t.boolean  "display_filter_panel_icon",                  default: true
    t.string   "filter_panel_icon_color"
    t.string   "icon_background_color"
    t.string   "icon_background_color_opacity"
    t.string   "gallery_button_on_background_color_opacity"
    t.string   "filter_buttons_icons_position",              default: "Right of text"
    t.boolean  "filter_panel_buttons_show_backround_color",  default: true
  end

  create_table "floorplans", force: :cascade do |t|
    t.integer  "community_id"
    t.string   "provider"
    t.string   "property_id"
    t.string   "provider_floorplan_id"
    t.string   "name"
    t.integer  "unit_count"
    t.integer  "units_available"
    t.string   "bedrooms"
    t.float    "bathrooms"
    t.float    "market_rent"
    t.float    "square_feet"
    t.float    "deposit"
    t.text     "comment"
    t.text     "description"
    t.string   "availability_url"
    t.datetime "created_at",                                            null: false
    t.datetime "updated_at",                                            null: false
    t.string   "image"
    t.string   "virtual_tour_url"
    t.string   "standard_image_url"
    t.boolean  "updated_by_admin",                  default: false
    t.boolean  "manual_override",                   default: false
    t.string   "secondary_image"
    t.boolean  "name_is_updated"
    t.boolean  "square_feet_is_updated"
    t.boolean  "bedroom_is_updated"
    t.boolean  "bathroom_is_updated"
    t.boolean  "market_rent_is_updated"
    t.boolean  "display_virtual_tour_button_label", default: false
    t.string   "virtual_tour_button_label",         default: "3D Tour"
  end

  create_table "floorplates", force: :cascade do |t|
    t.string   "name"
    t.integer  "number"
    t.string   "building"
    t.string   "range"
    t.string   "image"
    t.integer  "community_id"
    t.datetime "created_at",                          null: false
    t.datetime "updated_at",                          null: false
    t.string   "standard_image_url"
    t.string   "svg_image_url"
    t.float    "height"
    t.float    "width"
    t.string   "floor_name"
    t.boolean  "floor_name_added",    default: false
    t.boolean  "name_is_updated"
    t.boolean  "building_is_updated"
    t.boolean  "manual_override",     default: false
  end

  create_table "gables", force: :cascade do |t|
    t.boolean  "hide_tagline",                             default: true
    t.string   "appartment_button_color"
    t.string   "gallery_button_color"
    t.string   "neighborhood_button_color"
    t.string   "favorite_button_color"
    t.string   "filter_panel_color"
    t.integer  "design_id"
    t.datetime "created_at",                                               null: false
    t.datetime "updated_at",                                               null: false
    t.string   "webpages_button_color"
    t.string   "imagepages_button_color"
    t.string   "home_page_nav_bg_image"
    t.boolean  "display_home_page_nav_bg_image_button",    default: false
    t.string   "global_nav_bg_image"
    t.boolean  "display_global_nav_bg_image_button",       default: false
    t.string   "filter_panel_bg_image"
    t.boolean  "display_filter_panel_bg_image_button",     default: false
    t.string   "filter_panel_text_color"
    t.string   "filter_panel_opacity"
    t.string   "application_bg_image_gables"
    t.string   "apartment_bg_image_gables"
    t.string   "gallery_bg_image_gables"
    t.string   "favourite_bg_image_gables"
    t.string   "additional_pages_bg_image_gables"
    t.boolean  "display_application_bg_image_gables"
    t.boolean  "display_apartment_bg_image_gables"
    t.boolean  "display_gallery_bg_image_gables"
    t.boolean  "display_favourite_bg_image_gables"
    t.boolean  "display_additional_pages_bg_image_gables"
  end

  create_table "galleries", force: :cascade do |t|
    t.string   "name"
    t.integer  "community_id"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
    t.integer  "sort"
    t.index ["community_id"], name: "index_galleries_on_community_id", using: :btree
  end

  create_table "gallery_images", force: :cascade do |t|
    t.string   "image"
    t.float    "crop_x"
    t.float    "crop_y"
    t.float    "crop_w"
    t.float    "crop_h"
    t.integer  "sort"
    t.integer  "community_id"
    t.datetime "created_at",         null: false
    t.datetime "updated_at",         null: false
    t.integer  "gallery_id"
    t.string   "name"
    t.string   "standard_image_url"
    t.string   "ios_image_url"
    t.string   "large_image_url"
    t.index ["community_id"], name: "index_gallery_images_on_community_id", using: :btree
    t.index ["gallery_id"], name: "index_gallery_images_on_gallery_id", using: :btree
  end

  create_table "home_page_images", force: :cascade do |t|
    t.string   "image"
    t.string   "name"
    t.integer  "design_id"
    t.float    "crop_x"
    t.float    "crop_y"
    t.float    "crop_w"
    t.float    "crop_h"
    t.integer  "sort"
    t.datetime "created_at",         null: false
    t.datetime "updated_at",         null: false
    t.string   "standard_image_url"
    t.string   "thumb_image_url"
    t.string   "large_image_url"
  end

  create_table "home_page_videos", force: :cascade do |t|
    t.string   "video"
    t.string   "name"
    t.integer  "design_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "home_screens", force: :cascade do |t|
    t.string   "appartments_button"
    t.string   "galleries_button"
    t.string   "neighborhood_button"
    t.string   "favorities_button"
    t.string   "menu_position"
    t.boolean  "manage_background"
    t.string   "background_color"
    t.integer  "design_id"
    t.datetime "created_at",          null: false
    t.datetime "updated_at",          null: false
    t.string   "about_button"
    t.string   "floorplan_button"
    t.string   "building_button"
  end

  create_table "homepage_icons", force: :cascade do |t|
    t.string   "image"
    t.string   "name"
    t.integer  "sort"
    t.integer  "design_id"
    t.float    "crop_x"
    t.float    "crop_y"
    t.float    "crop_w"
    t.float    "crop_h"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["design_id"], name: "index_homepage_icons_on_design_id", using: :btree
  end

  create_table "imagepages", force: :cascade do |t|
    t.string   "name"
    t.boolean  "is_slideshow"
    t.integer  "community_id"
    t.datetime "created_at",                          null: false
    t.datetime "updated_at",                          null: false
    t.boolean  "hide_page",           default: false
    t.boolean  "display_on_homepage", default: false
    t.integer  "position"
    t.integer  "sort"
    t.index ["community_id"], name: "index_imagepages_on_community_id", using: :btree
  end

  create_table "locations", force: :cascade do |t|
    t.string   "address"
    t.decimal  "latitude"
    t.decimal  "longitude"
    t.string   "category"
    t.string   "title"
    t.integer  "neighborhood_id"
    t.datetime "created_at",         null: false
    t.datetime "updated_at",         null: false
    t.string   "image"
    t.string   "standard_image_url"
    t.float    "distance"
    t.string   "time"
    t.float    "rating"
    t.index ["neighborhood_id"], name: "index_locations_on_neighborhood_id", using: :btree
  end

  create_table "main_screens", force: :cascade do |t|
    t.string   "appartments_button"
    t.string   "galleries_button"
    t.string   "neighborhood_button"
    t.string   "favorities_button"
    t.string   "menu_position"
    t.boolean  "manage_background"
    t.string   "background_color"
    t.integer  "design_id"
    t.datetime "created_at",          null: false
    t.datetime "updated_at",          null: false
  end

  create_table "menus", force: :cascade do |t|
    t.string   "position"
    t.string   "button_style"
    t.string   "border_radius"
    t.string   "border_width"
    t.string   "border_color"
    t.string   "button_background_color"
    t.string   "button_hover_color"
    t.boolean  "manage_background",           default: false
    t.string   "background_color"
    t.integer  "design_id"
    t.datetime "created_at",                                  null: false
    t.datetime "updated_at",                                  null: false
    t.float    "background_opacity"
    t.string   "vertical_menu_position"
    t.string   "horizontal_menu_position"
    t.string   "navigation_text_color"
    t.string   "navigation_background_color"
  end

  create_table "neighborhoods", force: :cascade do |t|
    t.integer  "community_id"
    t.string   "address"
    t.decimal  "latitude"
    t.decimal  "longitude"
    t.float    "radius"
    t.datetime "created_at",                                                                                             null: false
    t.datetime "updated_at",                                                                                             null: false
    t.string   "category",                         default: "Dining,Shopping,Entertainment,Schools,Banks,Parks,Errands"
    t.integer  "zoom"
    t.boolean  "show_neighborhood",                default: true
    t.string   "neighborhood_name",                default: "Neighborhood"
    t.text     "listing"
    t.boolean  "display_neighborhood_on_homepage", default: true
    t.index ["community_id"], name: "index_neighborhoods_on_community_id", using: :btree
  end

  create_table "neighbour_units", force: :cascade do |t|
    t.integer  "path_point_id"
    t.integer  "unit_id"
    t.datetime "created_at",    null: false
    t.datetime "updated_at",    null: false
    t.index ["path_point_id"], name: "index_neighbour_units_on_path_point_id", using: :btree
  end

  create_table "neighbourhood_logs", force: :cascade do |t|
    t.string   "from_ip"
    t.string   "cat"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "path_points", force: :cascade do |t|
    t.integer  "x_plot"
    t.integer  "y_plot"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer  "path_id"
    t.index ["path_id"], name: "index_path_points_on_path_id", using: :btree
  end

  create_table "paths", force: :cascade do |t|
    t.string   "name"
    t.integer  "map_path_id"
    t.string   "map_path_type"
    t.datetime "created_at",    null: false
    t.datetime "updated_at",    null: false
  end

  create_table "schedual_tours", force: :cascade do |t|
    t.date     "tour_date"
    t.time     "tour_time"
    t.integer  "tour_user_id"
    t.integer  "tour_id"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
    t.index ["tour_id"], name: "index_schedual_tours_on_tour_id", using: :btree
    t.index ["tour_user_id"], name: "index_schedual_tours_on_tour_user_id", using: :btree
  end

  create_table "sitemaps", force: :cascade do |t|
    t.string   "image"
    t.integer  "community_id"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
    t.index ["community_id"], name: "index_sitemaps_on_community_id", using: :btree
  end

  create_table "stop_details", force: :cascade do |t|
    t.integer  "tour_stop_id"
    t.string   "description"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
    t.index ["tour_stop_id"], name: "index_stop_details_on_tour_stop_id", using: :btree
  end

  create_table "stop_galleries", force: :cascade do |t|
    t.integer  "tour_stop_id"
    t.string   "image"
    t.string   "name"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
    t.index ["tour_stop_id"], name: "index_stop_galleries_on_tour_stop_id", using: :btree
  end

  create_table "temporary_images", force: :cascade do |t|
    t.text     "image"
    t.integer  "position"
    t.integer  "community_id"
    t.string   "name"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
  end

  create_table "tour_stops", force: :cascade do |t|
    t.integer  "tour_id"
    t.decimal  "latitude"
    t.decimal  "longitude"
    t.integer  "stop_id"
    t.string   "stop_type"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string   "name"
    t.integer  "sort"
    t.index ["tour_id"], name: "index_tour_stops_on_tour_id", using: :btree
  end

  create_table "tour_users", force: :cascade do |t|
    t.string   "name"
    t.integer  "phone_number"
    t.string   "email"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
  end

  create_table "tours", force: :cascade do |t|
    t.integer  "community_id"
    t.string   "name"
    t.decimal  "latitude"
    t.decimal  "longitude"
    t.string   "image"
    t.datetime "created_at",               null: false
    t.datetime "updated_at",               null: false
    t.integer  "x_plot",       default: 0
    t.integer  "y_plot",       default: 0
    t.index ["community_id"], name: "index_tours_on_community_id", using: :btree
  end

  create_table "units", force: :cascade do |t|
    t.integer  "community_id"
    t.string   "provider"
    t.string   "property_id"
    t.string   "provider_unit_id"
    t.string   "unit_type"
    t.string   "marketing_name"
    t.string   "floorplan_id"
    t.float    "market_rent"
    t.float    "effective_rent"
    t.string   "availability"
    t.date     "available_date"
    t.string   "building"
    t.datetime "created_at",                                            null: false
    t.datetime "updated_at",                                            null: false
    t.integer  "x_plot",                            default: 0
    t.integer  "y_plot",                            default: 0
    t.integer  "floorplate_id"
    t.integer  "lease_term",                        default: 12
    t.string   "image"
    t.integer  "floor"
    t.string   "standard_image_url"
    t.boolean  "updated_by_admin",                  default: false
    t.boolean  "available"
    t.boolean  "sold",                              default: false
    t.boolean  "manually_updated",                  default: false
    t.boolean  "manual_override",                   default: false
    t.float    "square_feet"
    t.text     "description"
    t.string   "secondary_image"
    t.string   "availability_url"
    t.string   "lease_pricing"
    t.boolean  "name_is_updated"
    t.boolean  "floorplan_id_is_updated"
    t.boolean  "effective_rent_is_updated"
    t.boolean  "available_date_is_updated"
    t.boolean  "available_is_updated"
    t.boolean  "sold_is_updated"
    t.boolean  "floor_is_updated"
    t.boolean  "building_is_updated"
    t.boolean  "availability_is_updated"
    t.string   "stop_description"
    t.boolean  "display_virtual_tour_button_label", default: false
    t.string   "virtual_tour_button_label",         default: "3D Tour"
    t.string   "virtual_tour_url"
  end

  create_table "users", force: :cascade do |t|
    t.string   "email",                         default: "",    null: false
    t.string   "encrypted_password",            default: "",    null: false
    t.string   "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.integer  "sign_in_count",                 default: 0,     null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.inet     "current_sign_in_ip"
    t.inet     "last_sign_in_ip"
    t.datetime "created_at",                                    null: false
    t.datetime "updated_at",                                    null: false
    t.string   "first_name"
    t.string   "last_name"
    t.string   "role"
    t.string   "avatar"
    t.string   "invitation_token"
    t.datetime "invitation_created_at"
    t.datetime "invitation_sent_at"
    t.datetime "invitation_accepted_at"
    t.integer  "invitation_limit"
    t.string   "invited_by_type"
    t.integer  "invited_by_id"
    t.integer  "invitations_count",             default: 0
    t.integer  "company_id"
    t.string   "company_name"
    t.string   "community_logs"
    t.string   "entrata_list_logs"
    t.string   "entrata_function_logs"
    t.boolean  "welcome_prompt",                default: false
    t.boolean  "welcome_property_details_page", default: false
    t.boolean  "welcome_logo_page",             default: false
    t.boolean  "welcome_homepage_page",         default: false
    t.boolean  "welcome_floorplate_page",       default: false
    t.boolean  "welcome_amenity_page",          default: false
    t.boolean  "welcome_floorplan_page",        default: false
    t.boolean  "welcome_sitemap_page",          default: false
    t.boolean  "welcome_edit_floorplan_page",   default: false
    t.boolean  "welcome_unit_page",             default: false
    t.boolean  "welcome_neighbourhood_page",    default: false
    t.boolean  "welcome_favorite_page",         default: false
    t.boolean  "welcome_additional_page",       default: false
    t.boolean  "welcome_gallery_page",          default: false
    t.index ["email"], name: "index_users_on_email", unique: true, using: :btree
    t.index ["invitation_token"], name: "index_users_on_invitation_token", unique: true, using: :btree
    t.index ["invitations_count"], name: "index_users_on_invitations_count", using: :btree
    t.index ["invited_by_id"], name: "index_users_on_invited_by_id", using: :btree
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true, using: :btree
  end

  create_table "visited_stops", force: :cascade do |t|
    t.integer  "tour_user_id"
    t.string   "image"
    t.integer  "tour_stop_id"
    t.string   "description"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
    t.integer  "tour_id"
    t.string   "device_id"
    t.string   "tour_key"
    t.index ["tour_user_id"], name: "index_visited_stops_on_tour_user_id", using: :btree
  end

  create_table "webpages", force: :cascade do |t|
    t.string   "name"
    t.string   "url"
    t.integer  "community_id"
    t.datetime "created_at",                          null: false
    t.datetime "updated_at",                          null: false
    t.boolean  "hide_page",           default: false
    t.boolean  "display_on_homepage"
    t.integer  "position"
    t.index ["community_id"], name: "index_webpages_on_community_id", using: :btree
  end

  add_foreign_key "additional_images", "imagepages"
  add_foreign_key "amenity_galleries", "amenities"
  add_foreign_key "communities", "companies"
  add_foreign_key "community_users", "communities"
  add_foreign_key "community_users", "users"
  add_foreign_key "credentials", "communities"
  add_foreign_key "favorite_images", "favorite_settings"
  add_foreign_key "favorite_settings", "communities"
  add_foreign_key "galleries", "communities"
  add_foreign_key "gallery_images", "communities"
  add_foreign_key "gallery_images", "galleries"
  add_foreign_key "homepage_icons", "designs"
  add_foreign_key "imagepages", "communities"
  add_foreign_key "locations", "neighborhoods"
  add_foreign_key "neighborhoods", "communities"
  add_foreign_key "neighbour_units", "path_points"
  add_foreign_key "schedual_tours", "tour_users"
  add_foreign_key "schedual_tours", "tours"
  add_foreign_key "sitemaps", "communities"
  add_foreign_key "stop_details", "tour_stops"
  add_foreign_key "stop_galleries", "tour_stops"
  add_foreign_key "tour_stops", "tours"
  add_foreign_key "tours", "communities"
  add_foreign_key "visited_stops", "tour_users"
  add_foreign_key "webpages", "communities"
end
