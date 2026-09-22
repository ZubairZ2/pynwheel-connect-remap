require "digest"

# Moves the partner registry out of the hardcoded Community::MAP_PARTNERS
# constant and into the database, so a new partner (Jonah and everyone after)
# can be added from the CMS without a code change.
#
# Two tables:
#   partners        - the registry itself: key, label, tab order and the
#                     credential material for the Partner Maps API key.
#   partner_events  - append-only audit trail (key issued/rotated/revoked,
#                     properties associated) recording who did what.
#
# Per-property enablement stays exactly where it is, in
# communities.partner_map_settings. This migration only changes where the list
# of partners and their API keys live.
class CreatePartners < ActiveRecord::Migration[7.2]
  # The registry as it was hardcoded, seeded so nothing changes for the
  # partners already live in production. `env` keys keep working because the
  # model falls back to ENV for rows that carry an env_var.
  LEGACY = [
    { key: "rent",          label: "Rent.com",          env: "PARTNER_RENT_API_KEY" },
    { key: "apartmentlist", label: "Apartmentlist.com", env: "PARTNER_APARTMENTLIST_API_KEY" },
    { key: "propexo",       label: "Propexo",           env: "PARTNER_PROPEXO_API_KEY" },
    { key: "apartments",    label: "Apartments.com",    env: "PARTNER_APARTMENTS_API_KEY",
      settings: { "svg_only" => true } }
  ].freeze

  def up
    create_table :partners do |t|
      t.string  :key,            null: false
      t.string  :label,          null: false
      t.integer :position,       null: false, default: 0
      t.boolean :active,         null: false, default: true

      # Only the digest is ever stored. The plaintext key exists exactly once,
      # at issue/rotate time, and is handed over through a one-time link.
      t.string  :api_key_digest
      t.string  :api_key_prefix
      t.string  :api_key_last4

      # Legacy partners authenticate against this ENV var until their key is
      # rotated through the CMS, at which point the digest takes over.
      t.string  :env_var

      # Per-partner behaviour that used to be special-cased in code,
      # e.g. { "svg_only" => true } for Apartments.com.
      t.jsonb   :settings,       null: false, default: {}

      t.datetime :key_issued_at
      t.datetime :key_rotated_at
      t.datetime :key_revoked_at

      t.timestamps
    end

    add_index :partners, :key,            unique: true
    add_index :partners, :api_key_digest, unique: true, where: "api_key_digest IS NOT NULL"
    add_index :partners, [:active, :position]

    create_table :partner_events do |t|
      t.references :partner, null: false, foreign_key: true, index: true
      t.references :user,    null: true,  foreign_key: true, index: true
      t.string     :event,   null: false
      t.jsonb      :metadata, null: false, default: {}
      t.datetime   :created_at, null: false
    end

    add_index :partner_events, [:partner_id, :created_at]

    seed_registry
  end

  def down
    drop_table :partner_events
    drop_table :partners
  end

  private

  # `quote` is not a method on Migration: it falls through
  # ActiveRecord::Migration#method_missing, which rewrites the first argument
  # with `proper_table_name` before delegating to the connection. That turns nil
  # into "" (quoted as '') and a Time into its to_s, so go straight to the
  # connection instead and let NULL stay NULL.
  def q(value)
    connection.quote(value)
  end

  def seed_registry
    now = Time.current

    LEGACY.each_with_index do |partner, index|
      raw = ENV[partner[:env]].presence

      execute(<<~SQL)
        INSERT INTO partners
          (key, label, position, active, api_key_digest, api_key_prefix,
           api_key_last4, env_var, settings, key_issued_at, created_at, updated_at)
        VALUES (
          #{q(partner[:key])},
          #{q(partner[:label])},
          #{index},
          TRUE,
          #{q(raw && Digest::SHA256.hexdigest(raw))},
          #{q(raw && raw[0, 8])},
          #{q(raw && raw[-4, 4])},
          #{q(partner[:env])},
          #{q((partner[:settings] || {}).to_json)}::jsonb,
          #{q(raw ? now : nil)},
          #{q(now)},
          #{q(now)}
        )
        ON CONFLICT (key) DO NOTHING
      SQL
    end

    # Jonah Digital (UC001/UC002). Seeded with no key: an admin issues one from
    # Partner Configuration, which is what produces the one-time delivery link.
    execute(<<~SQL)
      INSERT INTO partners (key, label, position, active, settings, created_at, updated_at)
      VALUES ('jonah', 'Jonah', #{LEGACY.size}, TRUE, '{}'::jsonb, #{q(now)}, #{q(now)})
      ON CONFLICT (key) DO NOTHING
    SQL
  end
end
