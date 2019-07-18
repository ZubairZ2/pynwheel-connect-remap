class FavoriteMailer < ApplicationMailer

	def email_favorites(email_from,email_to,email_bcc,email_body,favorites,units,ios,community)
    @favorites = favorites
    @email_body = email_body
    @ios = ios
    @community = community
    @units = units
    mail(to: email_to, from: email_from, bcc: email_bcc, subject: 'My Favorites')
  end
  def email_favorites_text(email_from,email_to,email_bcc,email_body,favorites,units,ios,community)
      @favorites = favorites
      @email_body = email_body
      @ios = ios
      @community = community
      @units = units
      mail(to: email_from, from: email_from, bcc: email_bcc, subject: 'My Favorites Text Version')
  end
end
