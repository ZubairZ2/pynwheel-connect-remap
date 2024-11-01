class Status < ApplicationRecord
    belongs_to :statusable, polymorphic: true

    enum :status, [:in_progress, :in_review, :submitted, :approved, :rejected , :re_submitted, :completed, :deployed, :application_in_qa, :released, :form_approved, 
    :in_production]

    def status_and_remarks_obj
        {name: self.status, remarks: self.remarks}
    end
end
