class Schlage < ApplicationRecord
  belongs_to :edge_state
  has_one :status, as: :statusable

  mount_uploader :image, SchlagelockUploader

  def as_json
    super(
      :only => [:id, :email, :password, :image]
    )
  end
end
