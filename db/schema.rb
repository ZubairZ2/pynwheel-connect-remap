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

ActiveRecord::Schema.define(version: 20170913132028) do

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
    t.string   "domain"
    t.string   "password"
    t.string   "username"
    t.string   "property_id"
    t.string   "pmc_id"
    t.string   "licence_key"
    t.string   "host"
    t.string   "server_name"
    t.string   "database"
    t.string   "platform"
    t.string   "interface_entity"
    t.datetime "created_at",       null: false
    t.datetime "updated_at",       null: false
    t.index ["community_id"], name: "index_credentials_on_community_id", using: :btree
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

  create_table "units", force: :cascade do |t|
    t.integer  "community_id"
    t.string   "provider"
    t.string   "property_id"
    t.string   "provider_unit_id"
    t.string   "name"
    t.integer  "number"
    t.integer  "floorplan_id"
    t.float    "avg_rent"
    t.float    "min_rent"
    t.integer  "max_rent"
    t.string   "availability"
    t.date     "available_date"
    t.string   "building"
    t.datetime "created_at",       null: false
    t.datetime "updated_at",       null: false
  end

  add_foreign_key "communities", "companies"
  add_foreign_key "credentials", "communities"
end
