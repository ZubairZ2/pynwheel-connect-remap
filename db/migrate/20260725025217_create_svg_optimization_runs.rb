class CreateSvgOptimizationRuns < ActiveRecord::Migration[7.1]
  def change
    create_table :svg_optimization_runs do |t|
      t.references :community, null: false, foreign_key: true

      # Polymorphic target — the Floorplate or Sitemap this run wrote to.
      t.string :target_type, null: false
      t.bigint :target_id, null: false

      # "optimize" (source = freshly re-encoded SVG) or "revert" (source =
      # a prior run's backup_url, restoring an earlier version).
      t.string :action, null: false, default: "optimize"

      # Self-reference: set when action == "revert", points at the run
      # whose backup_url supplied the restored content.
      t.bigint :reverts_run_id

      t.string :status, null: false, default: "queued"
      # queued -> running -> verified -> uploaded (success)
      #                   -> failed (verification or upload error; live file untouched)

      # Every run backs up whatever was live immediately before its own
      # write, BEFORE that write happens — this is what makes revert always
      # possible, not just "hope someone downloaded a copy."
      t.string :backup_url
      t.string :resulting_url

      t.bigint :original_bytes
      t.bigint :optimized_bytes
      t.decimal :reduction_pct, precision: 5, scale: 1

      t.text :error_message

      t.bigint :triggered_by_user_id
      t.datetime :started_at
      t.datetime :finished_at

      t.timestamps
    end

    add_index :svg_optimization_runs, [:target_type, :target_id]
    add_index :svg_optimization_runs, :status
    add_index :svg_optimization_runs, :reverts_run_id
  end
end
