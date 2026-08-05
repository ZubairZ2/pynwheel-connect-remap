# Pynwheel Launch builds its onboarding forms, section badges and progress
# rings entirely from the polymorphic `statuses` table. A Status row only ever
# got written by the code paths that remembered to call one of Community's
# `set_*_status` helpers: Launch's own API controllers, RentCafe and PSI.
#
# Everything else writing the same database left that table untouched -- the
# Connect (CMS) screens, and the AppFolio, RealPage, RentManager, Beans,
# Resman, Yardi and spreadsheet importers. Records created there were real rows
# in `floorplans` / `credentials`, but invisible to Launch, which is why the
# sync looked inconsistent: it worked for exactly the providers that happened
# to call the helper.
#
# Including this concern makes the status a property of the record itself
# rather than of the code path that created it, so both applications see the
# same thing no matter which one wrote it.
module LaunchStatusable
  extend ActiveSupport::Concern

  included do
    has_one :status, as: :statusable

    after_commit :ensure_launch_status, on: [:create, :update]
  end

  # The status Launch should render for this record. Reads never write, so a
  # row that predates this concern still reports a sensible status instead of
  # dropping out of the form.
  def launch_status_and_remarks_obj
    return status.status_and_remarks_obj if status.present?

    { name: derive_launch_status, remarks: nil }
  end

  # Materialises the Status row. For write paths -- approving a form, recording
  # reviewer remarks -- which need a record to update.
  def launch_status
    status || ensure_launch_status
  end

  # Where a record with no status yet starts out. Models override this with the
  # rule for their own form -- the rule used to live in a 400-line pile of
  # `Community#set_*_status` methods, far from the columns it inspects.
  def derive_launch_status
    IN_PROGRESS
  end

  private

  # Mirrors Community#status_string: content complete enough for Pynwheel to
  # review reads as submitted, anything less is still being worked on.
  def launch_status_from(complete)
    complete.present? ? SUBMITTED : IN_PROGRESS
  end

  # Only ever fills in a *missing* status. An existing one is left alone, so
  # editing a record in Connect can never walk back a status that Launch or a
  # Pynwheel reviewer has already advanced.
  def ensure_launch_status
    return status if status.present?

    create_status(status: derive_launch_status)
  rescue ActiveRecord::RecordNotUnique
    reload_status
  rescue StandardError => ex
    Rails.logger.error("LaunchStatusable: could not create status for #{self.class.name}##{id} - #{ex.message}")
    nil
  end
end
