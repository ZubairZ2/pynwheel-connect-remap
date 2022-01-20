class AddPdfFileToCommunity < ActiveRecord::Migration[5.0]
  def change
    add_column :communities , :brand_details_pdf , :string
  end
end
