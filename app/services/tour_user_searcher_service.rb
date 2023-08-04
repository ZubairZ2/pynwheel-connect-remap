class TourUserSearcher
  def initialize(phone_number, email_address)
    @phone_number = phone_number
    @email_address = email_address
  end

  def find_tour_user
    tour_user_by_phone_number_and_email || tour_user_with_email_and_empty_phone ||
    tour_user_with_phone_number_and_empty_email || tour_user_by_phone_number
  end

  private
  
    def tour_user_by_phone_number_and_email
      TourUser.where(email: @email_address, phone_number: @phone_number)
              .order(created_at: :desc).first
    end

    def tour_user_with_email_and_empty_phone
      TourUser.where(email: @email_address, phone_number: [nil, ""])
              .order(created_at: :desc).first
    end

    def tour_user_with_phone_number_and_empty_email
      TourUser.where(email: [nil, ""], phone_number: @phone_number)
              .order(created_at: :desc).first
    end

    def tour_user_by_phone_number
      TourUser.where(phone_number: @phone_number).order(created_at: :desc).first
    end
end