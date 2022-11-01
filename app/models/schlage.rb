class Schlage < ApplicationRecord
  belongs_to :community
  has_one :status, as: :statusable

  mount_uploader :image, SchlagelockUploader

  def as_json options = {}
    super(
      :only => [:id, :email, :password, :image]
    )
  end
end
