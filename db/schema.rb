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

ActiveRecord::Schema.define(version: 20180424130138) do

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
    t.datetime "created_at",                    null: false
    t.datetime "updated_at",                    null: false
    t.string   "theme_name"
    t.string   "website"
    t.string   "code"
    t.boolean  "is_sitemap",     default: true
    t.string   "secondary_logo"
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
    t.datetime "created_at",                                         null: false
    t.datetime "updated_at",                                         null: false
    t.string   "loop_type",                       default: "images"
    t.string   "logo_position"
    t.string   "secondary_logo_position"
    t.string   "secondary_page_background_image"
    t.string   "global_navigation_position"
  end

  create_table "favorite_images", force: :cascade do |t|
    t.string   "image"
    t.integer  "favorite_setting_id"
    t.datetime "created_at",          null: false
    t.datetime "updated_at",          null: false
    t.index ["favorite_setting_id"], name: "index_favorite_images_on_favorite_setting_id", using: :btree
  end

  create_table "favorite_settings", force: :cascade do |t|
    t.integer  "community_id"
    t.string   "email_from"
    t.string   "email_bcc"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
    t.text     "email_body"
    t.index ["community_id"], name: "index_favorite_settings_on_community_id", using: :btree
  end

  create_table "favorites", force: :cascade do |t|
    t.integer  "community_id"
    t.string   "session_id"
    t.json     "unit_ids"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
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
    t.string   "file_url"
    t.datetime "created_at",            null: false
    t.datetime "updated_at",            null: false
    t.string   "image"
    t.string   "virtual_tour_url"
    t.string   "standard_image_url"
  end

  create_table "floorplates", force: :cascade do |t|
    t.string   "name"
    t.integer  "number"
    t.string   "building"
    t.string   "range"
    t.string   "image"
    t.integer  "community_id"
    t.datetime "created_at",         null: false
    t.datetime "updated_at",         null: false
    t.string   "standard_image_url"
    t.string   "svg_image_url"
    t.float    "height"
    t.float    "width"
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
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
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
    t.datetime "created_at",                   null: false
    t.datetime "updated_at",                   null: false
    t.boolean  "hide_page",    default: false
    t.index ["community_id"], name: "index_imagepages_on_community_id", using: :btree
  end

  create_table "locations", force: :cascade do |t|
    t.string   "address"
    t.decimal  "latitude"
    t.decimal  "longitude"
    t.string   "category"
    t.string   "title"
    t.integer  "neighborhood_id"
    t.datetime "created_at",      null: false
    t.datetime "updated_at",      null: false
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
    t.datetime "created_at",                                                                         null: false
    t.datetime "updated_at",                                                                         null: false
    t.string   "category",     default: "Dining,Shopping,Entertainment,Schools,Banks,Parks,Errands"
    t.integer  "zoom"
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
    t.datetime "created_at",                      null: false
    t.datetime "updated_at",                      null: false
    t.integer  "x_plot",             default: 0
    t.integer  "y_plot",             default: 0
    t.integer  "floorplate_id"
    t.integer  "lease_term",         default: 12
    t.string   "image"
    t.integer  "floor"
    t.string   "standard_image_url"
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
    t.datetime "created_at",                   null: false
    t.datetime "updated_at",                   null: false
    t.boolean  "hide_page",    default: false
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
