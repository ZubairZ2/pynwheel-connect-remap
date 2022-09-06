class DesignDirection < ApplicationRecord
  belongs_to :comunity

  def as_json
    super(
      :only => [:id, :image, :hex_colors, :direction, :additional_direction]
    )
  end
end
