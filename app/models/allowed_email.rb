class AllowedEmail < ApplicationRecord
  belongs_to :community
    
  before_save :downcase

  def downcase
    self.email = self.email.downcase
  end
end
