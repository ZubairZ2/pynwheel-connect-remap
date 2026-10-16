# frozen_string_literal: true

module Visitors
  # The manual ID / selfie review (ToursController#flag_id_mismatch, moved
  # here verbatim in October 2026 so the legacy page and Connect send the
  # same mails): the flag on the visitor, and on a mismatch the mail to the
  # property (or the fallback address) and to the Pynwheel reviewer.
  module IdReview
    REVIEWER = 'usman.khalid@intagleo.co.uk'
    FALLBACK = 'jennifer@pynwheel.com'

    module_function

    # `review_url`: the visitor's ID page (manual_selfie_match_url with ?community=).
    def flag!(community:, tour_user:, mismatch:, review_url:, local_testing: false)
      tour_user.update_attribute(:id_selfie_mismatch, mismatch ? true : false)
      community_email = community.email
      message = "ID/Selfie is marked #{mismatch ? 'Mismatched' : 'Matched'}"

      if tour_user.id_selfie_mismatch
        name = tour_user.name || tour_user.email.split('@').first.humanize

        email_content = "The photo ID/selfie for #{name} visiting #{community.name} was marked as a mismatch.  Please click on the link below to view.<br><br> <a href='#{review_url}' target='_blank'> Visitor's ID page</a>"
        DelayedSchedulerMailerJob.perform_async("ID / Selfie Matching (Manual)", email_content, REVIEWER, community, nil, nil, nil, nil, false, nil)
        if community_email.present?
          emails = community_email.gsub(" ", "").split(',')
          emails.each do |email|
            DelayedSchedulerMailerJob.perform_async("User #{name} is marked Mismatched ", email_content, email, community, nil, nil, nil, nil, false, nil)
          end
        else
          DelayedSchedulerMailerJob.perform_async("User #{name} is marked Mismatched ", email_content, FALLBACK, community, nil, nil, nil, nil, false, nil) unless local_testing
        end
      end
      message
    end
  end
end
