class CodeValidatorOnUpdate < ActiveModel::Validator
  def validate(record)
    community = Community.where(code: record.code).where.not(id: record.id)
    communityGroup = CommunityGroup.where(code: record.code).where.not(id: record.id)
    if (community.count + communityGroup.count > 0) && record.code.present?
      record.errors[:base] << "Code has already been taken."
    end

  end
end