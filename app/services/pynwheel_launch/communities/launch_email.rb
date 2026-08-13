# The two client-facing launch emails: "your application is going into
# production" (every core form approved) and "your application has been
# released".
#
# Nothing here sends on its own. `due?` and `recipients` describe the email an
# admin would be *offered* in Launch; `deliver` takes the list they actually
# confirmed. Keeping those two apart is the whole point of this class -- form
# approvals also arrive from the data importers, and those must never reach a
# client's inbox without someone having looked at the recipient list first.
class PynwheelLaunch::Communities::LaunchEmail
  APPROVED_KIND = "application_approved".freeze
  RELEASED_KIND = "application_released".freeze
  KINDS = [APPROVED_KIND, RELEASED_KIND].freeze

  # Where an address came from, so Launch can tell the client's own people
  # apart from our internal inbox.
  COMMUNITY_USER = "community_user".freeze
  SUPPORT_INBOX  = "support_inbox".freeze

  def initialize(community, kind)
    @community = community
    @kind = kind.to_s
  end

  # Whether there is an email worth offering. False for Dwelo, for a community
  # nobody would receive it, and for products with no template -- a Maps-only
  # community has no release email written for it.
  def due?
    @community.present? && KINDS.include?(@kind) && !dwelo_company? &&
      template.present? && recipients.any?
  end

  # Everyone Launch should tick by default. Client users first, our own inbox
  # last, deduped on address.
  def recipients
    return [] if @community.blank? || dwelo_company?

    @recipients ||= (community_user_recipients + support_inbox_recipients)
                    .uniq { |recipient| recipient[:email].to_s.downcase }
  end

  # Sends to exactly the addresses an admin confirmed -- no more, and never the
  # default list unless that is what came back. Returns the addresses that went
  # out so Launch can report what actually happened.
  def deliver(addresses)
    return [] if @community.blank? || dwelo_company? || template.blank?

    deliverable(addresses).each_with_object([]) do |address, sent|
      begin
        mail_for(address).deliver
        sent << address
      rescue StandardError => ex
        Rails.logger.error("LaunchEmail: could not send #{@kind} to #{address} " \
                           "for community #{@community.id} - #{ex.message}")
      end
    end
  end

  # What Launch needs to render the confirmation dialog.
  def as_json(*)
    {
      kind: @kind,
      title: title,
      description: description,
      subject: subject,
      body: body,
      always_copied: always_copied,
      recipients: recipients
    }
  end

  private

  # A rendered sample of the email, so an admin can read what they are about to
  # send. Built for the first recipient -- the templates differ between them
  # only in the address they greet. Rendering never delivers. Nil if the
  # template raises, and the dialog simply leaves the preview out.
  def body
    sample = recipients.first
    return nil if sample.blank? || template.blank?

    mail_for(sample[:email]).body.raw_source
  rescue StandardError => ex
    Rails.logger.error("LaunchEmail: could not render #{@kind} preview " \
                       "for community #{@community.id} - #{ex.message}")
    nil
  end

  # Addresses we are willing to put in a To: field: well formed, and not a
  # Dwelo admin. Applied to whatever Launch sends back, so an edited list gets
  # the same protection the default one has.
  def deliverable(addresses)
    Array(addresses)
      .flat_map { |address| address.to_s.split(",") }
      .map(&:strip)
      .uniq(&:downcase)
      .select { |address| emailable?(address) }
  end

  def emailable?(address)
    address.present? &&
      address.match?(URI::MailTo::EMAIL_REGEXP) &&
      FollowUpMailer.is_user_not_dwelo(address)
  end

  def community_user_recipients
    @community.users.map do |user|
      { email: user.email, name: user.name, role: user.role, source: COMMUNITY_USER }
    end.select { |recipient| emailable?(recipient[:email]) }
  end

  # The release email has always copied our follow-up inbox. The approval email
  # CCs it inside the mailer instead, so it is not a row you can untick there.
  def support_inbox_recipients
    return [] unless @kind == RELEASED_KIND
    return [] unless emailable?(ENV["FOLLOW_UP_EMAIL"])

    [{
      email: ENV["FOLLOW_UP_EMAIL"],
      name: "Pynwheel Launch",
      role: "Pynwheel",
      source: SUPPORT_INBOX
    }]
  end

  def always_copied
    return [] unless @kind == APPROVED_KIND && ENV["FOLLOW_UP_EMAIL"].present?

    [ENV["FOLLOW_UP_EMAIL"]]
  end

  def mail_for(address)
    case @kind
    when APPROVED_KIND then FollowUpMailer.send_application_approved_email(@community, address)
    when RELEASED_KIND then FollowUpMailer.public_send(template, address, @community)
    end
  end

  # Which mailer method backs this email. Nil means there is nothing written
  # for what this community bought, and so nothing to offer.
  def template
    case @kind
    when APPROVED_KIND then :send_application_approved_email
    when RELEASED_KIND then release_template
    end
  end

  def release_template
    touch = @community.touchscreen_app
    tour  = @community.self_tour

    return :released_app_self_tour_touch if touch && tour
    return :released_app_touch if touch
    return :released_app_self_tour if tour

    nil
  end

  # Display only -- the mailer sets the real subject. Kept in step with the
  # `mail(subject:)` calls in FollowUpMailer.
  def subject
    case @kind
    when APPROVED_KIND
      "#{@community.name} - Your Application is Going into Production"
    when RELEASED_KIND
      "Your Pynwheel Application has been completed for " \
      "#{@community.company&.name} - #{@community.name}"
    end
  end

  def title
    case @kind
    when APPROVED_KIND then "Send the \"going into production\" email?"
    when RELEASED_KIND then "Send the \"application released\" email?"
    end
  end

  def description
    case @kind
    when APPROVED_KIND
      "Every form for #{@community.name} is now approved. This email tells the " \
      "client their application is going into production."
    when RELEASED_KIND
      "#{@community.name} has been released. This email tells the client their " \
      "application is live."
    end
  end

  def dwelo_company?
    @community.company&.name.to_s.include?("Dwelo")
  end
end
