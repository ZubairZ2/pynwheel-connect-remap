class CreatePricingCalculatorTables < ActiveRecord::Migration[6.1]
  def change
    create_table :calculator_configs do |t|
      t.references :community, null: false, foreign_key: true
      t.text       :global_property_disclaimers
      t.boolean    :enabled, null: false, default: true
      t.timestamps
    end

    create_table :calculator_buckets do |t|
      t.references :calculator_config, null: false, foreign_key: true
      t.string     :name, null: false, default: ""
      t.text       :disclaimer
      t.integer    :order_index, null: false, default: 0
      t.timestamps
    end

    create_table :calculator_categories do |t|
      t.references :calculator_bucket, null: false, foreign_key: true
      t.string     :name, null: false, default: ""
      t.integer    :order_index, null: false, default: 0
      t.timestamps
    end

    create_table :calculator_fees do |t|
      t.references :calculator_category, null: false, foreign_key: true
      t.string     :name, null: false, default: ""
      # pricing_logic: Fixed | Range | Percentage | Unit Type | Varies
      t.string     :pricing_logic, null: false, default: "Fixed"
      t.string     :base_min_price
      t.string     :base_max_price
      # percentage_target: Base Rent | Total Monthly
      t.string     :percentage_target
      t.boolean    :is_mandatory_default, null: false, default: true
      t.boolean    :has_quantity_counter, null: false, default: false
      t.integer    :qty_min_limit, default: 1
      t.integer    :qty_max_limit, default: 2
      t.boolean    :varies_by_bedroom, null: false, default: false
      # bedroom_pricing stored as JSON: { "Studio": {"minPrice":"x","maxPrice":"y"}, "1 BR": {...} }
      t.jsonb      :bedroom_pricing, default: {}
      t.text       :display_text
      t.text       :pre_selection_info
      t.text       :post_selection_info
      t.integer    :order_index, null: false, default: 0
      t.timestamps
    end

    add_index :calculator_buckets,    :order_index
    add_index :calculator_categories, :order_index
    add_index :calculator_fees,       :order_index
    add_index :calculator_fees,       :bedroom_pricing, using: :gin
  end
end
