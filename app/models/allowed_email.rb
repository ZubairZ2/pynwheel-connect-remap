class AllowedEmail < ApplicationRecord
  belongs_to :community

  after_create :downcase

  def downcase
    self.update_attributes(email: self.email.downcase)
  end
end
