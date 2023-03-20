class CreateImpressions < ActiveRecord::Migration[5.0]
  def change
    create_table :impressions do |t|
      t.string :request_id, index: true
      t.json :in_request, default: {}
      t.json :out_response, default: {}
      t.boolean :enabled, default: false, index: true
      t.string :name_space

      t.timestamps
    end
  end
end
