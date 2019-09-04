class CodeValidatorOnCreate < ActiveModel::Validator
  def validate(record)
    community = Community.find_by(code: record.code)
    communityGroup = CommunityGroup.find_by(code: record.code)
    if (community.present? || communityGroup.present?) && record.code.present?
      record.errors[:base] << "Code has already been taken."
    end

  end
end