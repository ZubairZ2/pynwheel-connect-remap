class Status < ApplicationRecord
    belongs_to :statusable, polymorphic: true

    enum status: [:in_progress, :submitted, :approved, :rejected , :re_submitted]
end
