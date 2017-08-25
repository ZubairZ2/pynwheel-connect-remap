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

ActiveRecord::Schema.define(version: 20170821104415) do

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

  create_table "floorplans", force: :cascade do |t|
    t.integer  "community_id"
    t.string   "provider"
    t.string   "property_id"
    t.string   "provider_floorplan_id"
    t.string   "name"
    t.integer  "unit_count"
    t.integer  "units_available"
    t.integer  "bedrooms"
    t.integer  "bathrooms"
    t.float    "market_rent"
    t.float    "square_feet"
    t.float    "deposit"
    t.text     "comment"
    t.text     "description"
    t.string   "file_url"
    t.datetime "created_at",            null: false
    t.datetime "updated_at",            null: false
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

end
