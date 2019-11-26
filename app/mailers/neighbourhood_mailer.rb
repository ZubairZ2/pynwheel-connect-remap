class NeighbourhoodMailer < ApplicationMailer

  def email_counter_200(email_from,email_to,email_bcc,community)
    @community = community
    mail(to: email_to, from: email_from, bcc: email_bcc, subject: 'Neighbourhood calls exceeded 200')
  end
  def email_counter_400(email_from,email_to,email_bcc,community)
    @community = community
    mail(to: email_to, from: email_from, bcc: email_bcc, subject: 'Neighbourhood calls exceeded 400')
  end
end
