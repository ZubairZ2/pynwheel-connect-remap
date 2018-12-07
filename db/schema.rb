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

ActiveRecord::Schema.define(version: 20180912114630) do

  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

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
    t.index ["amenityable_type", "amenityable_id"], name: "index_amenities_on_amenityable_type_and_amenityable_id", using: :btree
  end

  create_table "app_versions", force: :cascade do |t|
    t.string   "version"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
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
    t.index ["company_id"], name: "index_communities_on_company_id", using: :btree
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
    t.datetime "created_at",                       null: false
    t.datetime "updated_at",                       null: false
    t.string   "url"
    t.string   "site_id"
    t.string   "c_code"
    t.string   "p_code"
    t.boolean  "apply_now",        default: false
    t.string   "file"
    t.string   "api_token"
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
    t.datetime "created_at",                                                 null: false
    t.datetime "updated_at",                                                 null: false
    t.string   "loop_type",                               default: "images"
    t.string   "logo_position"
    t.string   "secondary_logo_position"
    t.string   "secondary_page_background_image"
    t.string   "global_navigation_position"
    t.string   "animation",                               default: "none"
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
    t.boolean  "buttons_as_image",                        default: false
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
    t.boolean  "filter_button_as_image",                  default: false
    t.boolean  "gallery_button_as_image",                 default: false
    t.boolean  "filter_panel_background_as_image",        default: false
    t.string   "gallery_button_on_image"
    t.boolean  "gallery_button_on_as_image",              default: false
    t.boolean  "global_nav_button_on_as_image",           default: false
    t.boolean  "global_nav_button_off_as_image",          default: false
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
    t.boolean  "display_home_page_button_icon",             default: true
    t.string   "home_page_button_font_family"
    t.string   "home_page_button_font_size"
    t.boolean  "display_home_page_nav_background",          default: true
    t.string   "home_page_button_image"
    t.string   "global_navigation_button_font_family"
    t.string   "global_navigation_button_font_size"
    t.boolean  "display_global_navigation_button_bg_color", default: true
    t.string   "filter_panel_button_border_color"
    t.string   "filter_panel_text_font_size"
    t.string   "filter_panel_button_text_font_size"
    t.integer  "design_id"
    t.datetime "created_at",                                                null: false
    t.datetime "updated_at",                                                null: false
    t.boolean  "display_global_navigation_button_icon",     default: true
    t.boolean  "display_home_page_image",                   default: false
    t.string   "global_navigation_button_border_color"
    t.string   "spacing_between_buttons"
    t.string   "button_on_bg_color"
    t.boolean  "display_button_on_bg_color",                default: false
    t.string   "global_navigation_button_on_font_color"
    t.string   "application_background_image"
    t.boolean  "display_application_background_image",      default: false
    t.string   "application_background_color"
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
    t.datetime "created_at",                          null: false
    t.datetime "updated_at",                          null: false
    t.text     "email_body"
    t.boolean  "show_favorite", default: true
    t.string   "favorite_name", default: "Favorites"
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
    t.datetime "created_at",                                                 null: false
    t.datetime "updated_at",                                                 null: false
    t.string   "gallery_button_on_font_color"
    t.boolean  "display_gallery_button_on_background_color", default: false
    t.string   "gallery_button_on_background_color"
    t.boolean  "display_filter_panel_icon",                  default: false
    t.string   "filter_panel_icon_color"
    t.string   "icon_background_color"
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
    t.datetime "created_at",                            null: false
    t.datetime "updated_at",                            null: false
    t.string   "image"
    t.string   "virtual_tour_url"
    t.string   "standard_image_url"
    t.boolean  "updated_by_admin",      default: false
    t.boolean  "manual_override",       default: false
  end

  create_table "floorplates", force: :cascade do |t|
    t.string   "name"
    t.integer  "number"
    t.string   "building"
    t.string   "range"
    t.string   "image"
    t.integer  "community_id"
    t.datetime "created_at",                         null: false
    t.datetime "updated_at",                         null: false
    t.string   "standard_image_url"
    t.string   "svg_image_url"
    t.float    "height"
    t.float    "width"
    t.string   "floor_name"
    t.boolean  "floor_name_added",   default: false
  end

  create_table "gables", force: :cascade do |t|
    t.boolean  "hide_tagline",              default: true
    t.string   "appartment_button_color"
    t.string   "gallery_button_color"
    t.string   "neighborhood_button_color"
    t.string   "favorite_button_color"
    t.string   "filter_panel_color"
    t.integer  "design_id"
    t.datetime "created_at",                               null: false
    t.datetime "updated_at",                               null: false
    t.string   "webpages_button_color"
    t.string   "imagepages_button_color"
  end

  create_table "galleries", force: :cascade do |t|
    t.string   "name"
    t.integer  "community_id"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
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
    t.datetime "created_at",                                                                              null: false
    t.datetime "updated_at",                                                                              null: false
    t.string   "category",          default: "Dining,Shopping,Entertainment,Schools,Banks,Parks,Errands"
    t.integer  "zoom"
    t.boolean  "show_neighborhood", default: true
    t.string   "neighborhood_name", default: "Neighborhood"
    t.text     "listing"
    t.index ["community_id"], name: "index_neighborhoods_on_community_id", using: :btree
  end

  create_table "sitemaps", force: :cascade do |t|
    t.string   "image"
    t.integer  "community_id"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
    t.index ["community_id"], name: "index_sitemaps_on_community_id", using: :btree
  end

  create_table "temporary_images", force: :cascade do |t|
    t.text     "image"
    t.integer  "position"
    t.integer  "community_id"
    t.string   "name"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
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
    t.datetime "created_at",                         null: false
    t.datetime "updated_at",                         null: false
    t.integer  "x_plot",             default: 0
    t.integer  "y_plot",             default: 0
    t.integer  "floorplate_id"
    t.string   "image"
    t.integer  "floor"
    t.string   "standard_image_url"
    t.boolean  "updated_by_admin",   default: false
    t.boolean  "available"
    t.boolean  "sold",               default: false
    t.boolean  "manually_updated",   default: false
    t.boolean  "manual_override",    default: false
    t.float    "square_feet"
  end

  create_table "users", force: :cascade do |t|
    t.string   "email",                  default: "", null: false
    t.string   "encrypted_password",     default: "", null: false
    t.string   "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.integer  "sign_in_count",          default: 0,  null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.inet     "current_sign_in_ip"
    t.inet     "last_sign_in_ip"
    t.datetime "created_at",                          null: false
    t.datetime "updated_at",                          null: false
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
    t.integer  "invitations_count",      default: 0
    t.integer  "company_id"
    t.index ["email"], name: "index_users_on_email", unique: true, using: :btree
    t.index ["invitation_token"], name: "index_users_on_invitation_token", unique: true, using: :btree
    t.index ["invitations_count"], name: "index_users_on_invitations_count", using: :btree
    t.index ["invited_by_id"], name: "index_users_on_invited_by_id", using: :btree
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true, using: :btree
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
  add_foreign_key "communities", "companies"
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
  add_foreign_key "sitemaps", "communities"
  add_foreign_key "webpages", "communities"
end
