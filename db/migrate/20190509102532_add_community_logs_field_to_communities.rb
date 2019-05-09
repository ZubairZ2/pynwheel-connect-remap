class AddCommunityLogsFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :users, :community_logs, :string
    add_column :users, :entrata_list_logs, :string
    add_column :users, :entrata_function_logs, :string
    add_column :communities, :entrata_exception_logs, :string
  end
end
