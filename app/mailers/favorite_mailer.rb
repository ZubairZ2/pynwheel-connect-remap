class FavoriteMailer < ApplicationMailer

	def email_favorites(email_from,email_to,email_bcc,favorites)
    @favorites = favorites
    mail(to: email_to, from: "info@pynwheel.com", subject: 'My Favorites')
  end
end
