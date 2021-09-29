class Igloohome < ApplicationRecord
  require 'csv'

  belongs_to :community
  has_many :igloohome_locks, dependent: :destroy


  def import_data file
    binding.pry
  end
end
