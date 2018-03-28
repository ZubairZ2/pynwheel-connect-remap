class FavoriteMailer < ApplicationMailer

	def email_favorites(email_from,email_to,email_bcc,email_body,favorites,ios)
    @favorites = favorites
    @email_body = email_body
    @ios = ios
    mail(to: email_to, from: email_from, bcc: email_bcc, subject: 'My Favorites')
  end
end
