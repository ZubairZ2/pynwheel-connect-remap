class Status < ApplicationRecord
    belongs_to :statusable, polymorphic: true

    enum status: [:in_progress, :submitted, :approved, :rejected , :re_submitted]

    def status_and_remarks_obj
        {name: self.status, remarks: self.remarks}
    end
end
