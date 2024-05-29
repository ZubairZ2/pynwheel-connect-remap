class AddSkipTourEditingIntoTour < ActiveRecord::Migration[5.0]
  def change
    add_column :tours, :skip_tour_editing, :boolean,  default: false
  end
end
