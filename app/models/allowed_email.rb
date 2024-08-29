class AllowedEmail < ApplicationRecord
  belongs_to :community

  before_save :sanitize_email

  private

  def sanitize_email
    self.email = self.email.strip.downcase
  end
end
