class AddPartnerMapSettingsToCommunities < ActiveRecord::Migration[7.2]
  # Per-property, per-partner map enablement, e.g.
  #   { "apartments" => { "enabled" => true, "enabled_at" => "2026-07-09T..." } }
  # Replaces the app's reliance on the map_partners table. The table itself is
  # intentionally left in place for now and will be dropped in a later migration.
  #
  # Legacy partner names are normalized to the registry keys used by
  # Community::MAP_PARTNERS (e.g. "rent.com" -> "rent").
  NORMALIZE = {
    "rent"          => "rent",
    "rent.com"      => "rent",
    "apartmentlist" => "apartmentlist",
    "propexo"       => "propexo",
    "apartments"    => "apartments"
  }.freeze

  def up
    add_column :communities, :partner_map_settings, :jsonb, null: false, default: {}
    add_index  :communities, :partner_map_settings, using: :gin

    backfill_from_map_partners
  end

  def down
    remove_index  :communities, :partner_map_settings
    remove_column :communities, :partner_map_settings
  end

  private

  def backfill_from_map_partners
    return unless table_exists?(:map_partners)

    say_with_time "Backfilling partner_map_settings from map_partners" do
      # partner rows grouped per community, earliest created_at wins as enabled_at
      grouped = select_all(<<~SQL).to_a
        SELECT community_id, partner, MIN(created_at) AS enabled_at
        FROM map_partners
        GROUP BY community_id, partner
      SQL

      settings = Hash.new { |h, k| h[k] = {} }
      grouped.each do |row|
        key = NORMALIZE[row["partner"].to_s.strip.downcase]
        next if key.nil? # skip unknown partners

        community_id = row["community_id"]
        enabled_at   = row["enabled_at"]
        # keep the earliest timestamp if the same registry key appears twice
        existing = settings[community_id][key]
        if existing.nil? || (enabled_at && enabled_at < existing["enabled_at"])
          settings[community_id][key] = { "enabled" => true, "enabled_at" => enabled_at }
        end
      end

      settings.each do |community_id, value|
        execute(<<~SQL)
          UPDATE communities
          SET partner_map_settings = '#{quote_string(value.to_json)}'::jsonb
          WHERE id = #{community_id.to_i}
        SQL
      end

      settings.size
    end
  end
end
