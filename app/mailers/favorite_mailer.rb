class FavoriteMailer < ApplicationMailer
	def email_favorites(email_from,email_to,email_bcc,email_body,favorites,units,ios,community)
    @favorites = favorites
    @email_body = email_body
    @ios = ios
    @community = community
    @units = units
    @to_email = email_to
    mail(to: email_to, from: email_from, bcc: email_bcc, subject: "Your Ebrochure")
  end

  def email_favorites_text(email_from,email_to,email_bcc,email_body,favorites,units,ios,community)
      @favorites = favorites
      @email_body = email_body
      @ios = ios
      @community = community
      @units = units
      @to_email = email_to
      mail(to: email_bcc, from: email_from, subject: "Your Ebrochure Text Version")
  end

  def share_favorites(email_to, community, favorites_url)
    @community     = community
    @favorites_url = favorites_url

    @tour_url = community.community_tour.present? ? community.schedule_tour_url : nil

    @apply_url = if community.credential&.apply_now.to_s == "separate_link"
                   community.credential.separate_link.presence
                 elsif community.credential&.apply_now.to_s == "true"
                   community.website.presence
                 end

    mail(
      to:      email_to,
      from:    "info@pynwheel.com",
      subject: "Your Saved Favorites at #{community.name}",
      layout:  false
    )
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
