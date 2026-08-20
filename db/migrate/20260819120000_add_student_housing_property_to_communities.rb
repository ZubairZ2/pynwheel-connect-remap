class AddStudentHousingPropertyToCommunities < ActiveRecord::Migration[7.2]
  def change
    add_column :communities, :student_housing_property, :boolean, default: false
  end
end
