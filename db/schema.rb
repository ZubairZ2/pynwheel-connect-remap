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

ActiveRecord::Schema.define(version: 20171018103243) do

  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "amenities", force: :cascade do |t|
    t.string   "provider_amenity_id"
    t.string   "amenty_type"
    t.text     "description"
    t.integer  "unit_id"
    t.datetime "created_at",          null: false
    t.datetime "updated_at",          null: false
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
    t.datetime "created_at",    null: false
    t.datetime "updated_at",    null: false
    t.string   "theme_name"
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
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
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
    t.datetime "created_at",       null: false
    t.datetime "updated_at",       null: false
    t.string   "url"
    t.string   "site_id"
    t.string   "c_code"
    t.string   "p_code"
    t.index ["community_id"], name: "index_credentials_on_community_id", using: :btree
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
    t.boolean  "manage_background",        default: false
    t.string   "background_color"
    t.integer  "design_id"
    t.datetime "created_at",                               null: false
    t.datetime "updated_at",                               null: false
    t.float    "background_opacity"
    t.string   "vertical_menu_position"
    t.string   "horizontal_menu_position"
  end

  create_table "sitemaps", force: :cascade do |t|
    t.string   "image"
    t.integer  "community_id"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
    t.index ["community_id"], name: "index_sitemaps_on_community_id", using: :btree
  end

  create_table "units", force: :cascade do |t|
    t.integer  "community_id"
    t.string   "provider"
    t.string   "property_id"
    t.string   "provider_unit_id"
    t.string   "unit_type"
    t.integer  "marketing_name"
    t.integer  "floorplan_id"
    t.float    "market_rent"
    t.float    "effective_rent"
    t.string   "availability"
    t.date     "available_date"
    t.string   "building"
    t.datetime "created_at",                   null: false
    t.datetime "updated_at",                   null: false
    t.integer  "x_plot",           default: 0
    t.integer  "y_plot",           default: 0
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

  add_foreign_key "communities", "companies"
  add_foreign_key "credentials", "communities"
  add_foreign_key "sitemaps", "communities"
end
