class CodeValidatorOnUpdate < ActiveModel::Validator
  def validate(record)
    community = Community.where(code: record.code)
    communityGroup = CommunityGroup.where(code: record.code)
    if (community.count + communityGroup.count > 1) && record.code.present?
      record.errors[:base] << "Code has already been taken."
    end

  end
end