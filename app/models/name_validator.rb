class NameValidator < ActiveModel::Validator
  def validate(record)
    words = record.name.split(" ")
    if words.size > 3
      record.errors[:base] << "You can add upto three words and each word must be 15 characters long."
    end

    words.each do |w|
      if w.size > 15
        record.errors[:base] << "You can add upto three words and each word must be 15 characters long."
      end
    end
  end
end