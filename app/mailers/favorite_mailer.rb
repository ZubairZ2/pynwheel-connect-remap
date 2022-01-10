class FavoriteMailer < ApplicationMailer
	def email_favorites(email_from,email_to,email_bcc,email_body,favorites,units,ios,community)
    @favorites = favorites
    @email_body = email_body
    @ios = ios
    @community = community
    @units = units
    @to_email = email_to
    mail(to: email_to, from: email_from, bcc: email_bcc, subject: 'My Favorites')
  end

  def email_favorites_text(email_from,email_to,email_bcc,email_body,favorites,units,ios,community)
      @favorites = favorites
      @email_body = email_body
      @ios = ios
      @community = community
      @units = units
      @to_email = email_to
      mail(to: email_bcc, from: email_from, subject: 'My Favorites Text Version')
  end

  def email_shared_tour(email_to,stops,community)
    email_from = 'info@pynwheel.com'
    # @favorites = stops
    @shared_tour_stops = stops
    @email_body = ""
    @ios = true
    @community = community
    @sitemap = @community.is_sitemap ? @community.sitemap : @community.floorplates.first
    @to_email = email_to
    mail(to: email_to,from: email_from, subject: 'Share Tour Details')
  end

end
