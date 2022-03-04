module CommunitiesHelper
  def write_account_report(workbook)

    worksheet = workbook.add_worksheet("Sheet 1")
    format = workbook.add_format({ 'align': 'left', 'font': 'Arial', 'size': '10', 'locked': true })
    format.set_bold()
    format.set_locked()
    format1 = workbook.add_format({ 'align': 'left', 'font': 'Arial', 'size': '10' })
    row = 1
    worksheet.freeze_panes(1, 2)
    worksheet.write(0, 0, "Company", format, { 'freeze_panes': true })
    worksheet.write(0, 1, "Property Name", format)
    worksheet.write(0, 2, "Number of Units", format)
    worksheet.write(0, 3, "Address", format)
    worksheet.write(0, 4, "City", format)
    worksheet.write(0, 5, "State", format)
    worksheet.write(0, 6, "Zip", format)
    worksheet.write(0, 7, "Property Email Address", format)
    worksheet.write(0, 8, "eBrochure 'From' Email Address", format)
    worksheet.write(0, 9, "eBrochure 'BCC' Email Address ", format)
    worksheet.write(0, 10, "Phone", format)
    worksheet.write(0, 11, "Design Style", format)
    worksheet.write(0, 12, "Data Provider", format)
    worksheet.write(0, 13, "Self Tour (Yes/No)", format)
    worksheet.write(0, 14, "Active/Inactive", format)
    worksheet.write(0, 15, "Subscription Start Date", format)
    worksheet.write(0, 16, "Date Inactivated", format)
    worksheet.write(0, 17, "Billing Month", format)
    worksheet.write(0, 18, "Billing Rate (Annual)", format)
    worksheet.write(0, 19, "Billing Rate (Monthly)", format)

    Community.all.each do |community|
      if community.present?
        worksheet.write(row, 0, community.company.name, format1)
        worksheet.write(row, 1, community.name, format1)
        worksheet.write(row, 2, community.number_of_units, format1)
        worksheet.write(row, 3, community.address, format1)
        worksheet.write(row, 4, community.city, format1)
        worksheet.write(row, 5, community.state, format1)
        worksheet.write(row, 6, community.zip, format1)
        worksheet.write(row, 7, community.email, format1)
        worksheet.write(row, 8, community.favorite_setting.email_from, format1) if community.favorite_setting.present?
        worksheet.write(row, 9, community.favorite_setting.email_bcc, format1) if community.favorite_setting.present?
        worksheet.write(row, 10, community.phone, format1)
        worksheet.write(row, 11, community.theme_name.capitalize, format1) if community.theme_name.present?

        if community.data_provider == "psi"
          data_provider = "Entrata"
        elsif community.data_provider == "realpagesvc"
          data_provider = "RealPage"
        elsif community.data_provider == "zaremba"
          data_provider = "RE Data Systems (ftp)"
        elsif community.data_provider.present?
          data_provider = community.data_provider.capitalize
        else
          data_provider = "Nill"
        end
        worksheet.write(row, 12, data_provider, format1)
        worksheet.write(row, 13, community.self_tour == true ? "Yes" : "No", format1)
        worksheet.write(row, 14, community.locked.present? ? (community.locked ? "Inactive" : "Active") : "Active", format1)
        worksheet.write(row, 15, community.date_activated, format1)
        worksheet.write(row, 16, community.date_inactivated, format1)
        worksheet.write(row, 17, community.billing_type == "annual" ? "#{community.billing_month.present? ? community.billing_month : "Annually"}" : "Monthly", format1)
        if community.touchscreen_app == true
          worksheet.write(row, 18, community.billing_rate_touch, format1)
        end
        if community.company.name.downcase == "lincoln"
          worksheet.write(row, 19, community.lincoln_billing_rate, format1)
        elsif community.creator_id.present? and community.creator.present? and community.creator.role == "Dwelo admin"
          worksheet.write(row, 19, community.dwelo_billing_rate, format1)
        elsif community.self_tour == true and community.touchscreen_app == true and community.company.name.downcase != "lincoln" and ((community.creator_id.present? and community.creator.present? and community.creator.role != "Dwelo admin") or community.creator_id.nil?)
          worksheet.write(row, 19, community.billing_rate_selftour, format1)
        elsif community.self_tour == false and community.touchscreen_app == false
          worksheet.write(row, 19, community.billing_rate_maps, format1)
        elsif community.self_tour == true and community.touchscreen_app == true
          worksheet.write(row, 19, community.billing_rate_for_both, format1)
        elsif community.self_tour == true and community.touchscreen_app == false
          worksheet.write(row, 19, community.billing_rate_selftour, format1)
        end

        row = row + 1
      end
    end
    workbook.close

    temp_file = Tempfile.new("AccountReport.zip")
    reportFiles = Dir.entries('public/AccountReport')
    Zip::File.open(temp_file.path, Zip::File::CREATE) do |zip_file|
      reportFiles.each do |d|
        unless d == "." || d == ".."
          zip_file.add(d, "public/AccountReport/AccountReport.xlsx")
        end
      end
    end
    File.read(temp_file.path)
  end

  def write_authenteq_report(workbook)

    worksheet = workbook.add_worksheet("Sheet 1")
    format = workbook.add_format({ 'align': 'left', 'font': 'Arial', 'size': '10', 'locked': true })
    format.set_bold()
    format.set_locked()
    format1 = workbook.add_format({ 'align': 'left', 'font': 'Arial', 'size': '10' })
    row = 1
    worksheet.freeze_panes(1, 2)
    worksheet.write(0, 0, "Company", format)
    worksheet.write(0, 1, "Property Name", format)
    worksheet.write(0, 2, "Name", format)
    worksheet.write(0, 3, "Email", format)
    worksheet.write(0, 4, "Phone Number", format)
    worksheet.write(0, 5, "Tour Date", format)
    worksheet.write(0, 6, "Tour Time UTC", format)
    worksheet.write(0, 7, "Id Verification Provider", format)
    community = current_community
    tour_histories = TourHistory.where(tour_id: community.community_tour.id, verified_by: "authenteq", created_at: (Date.today - 30.days)..Date.today + 1)

    tour_histories.each do |th|
      if th.present?
        tour_user = TourUser.find th.tour_user_id
        worksheet.write(row, 0, community.company.name, format1)
        worksheet.write(row, 1, community.name, format1)
        worksheet.write(row, 2, tour_user.name, format1)
        worksheet.write(row, 3, tour_user.email, format1)
        worksheet.write(row, 4, tour_user.phone_number, format1)
        worksheet.write(row, 5, th.created_at.strftime("%m/%d/%Y"), format1)
        worksheet.write(row, 6, th.created_at.strftime("%H:%M"), format1)
        worksheet.write(row, 7, "Authenteq", format1)

        row = row + 1
      end
    end
    workbook.close

    temp_file = Tempfile.new("AuthenteqReport.zip")
    reportFiles = Dir.entries('public/AuthenteqReport')
    Zip::File.open(temp_file.path, Zip::File::CREATE) do |zip_file|
      reportFiles.each do |d|
        unless d == "." || d == ".."
          zip_file.add(d, "public/AuthenteqReport/AuthenteqReport.xlsx")
        end
      end
    end
    File.read(temp_file.path)
  end

  def check_tour_user_card_info(community, tour_user)
    community.community_tour.verification_type == "authenteq" && community.community_tour.tour_setting.charge_user_for_id_verfication && community.community_tour.visual_id_verification && tour_user.strip_customer_id.blank?
  end

  def check_visual_id_verification(tour_user, community)
    tour_type = tour_user.tour_type
    authentiq_verified_at = tour_user.authentiq_verified_at
    checkpoint_verified_at = tour_user.checkpoint_verified_at
    is_authentiq_verified = tour_user.is_authentiq_verified
    is_checkpoint_verified = tour_user.is_checkpoint_verified
    time_zone = community.get_time_zone()
    current_tour_time = params[:current_time] if params[:current_time].present?
    if community.community_tour.visual_id_verification && tour_type != "virtual_tour"
      if community.community_tour.verification_type == "authenteq"
        if !is_authentiq_verified
          true
        elsif is_authentiq_verified and (current_tour_time > (authentiq_verified_at + 30.days))
          true
        elsif is_authentiq_verified and (current_tour_time < (authentiq_verified_at + 30.days))
          false
        else
          false
        end
      else
        if community.community_tour.verification_type == "check_point_id"
          if !is_checkpoint_verified
            true
          elsif is_authentiq_verified and (current_tour_time > (checkpoint_verified_at + 30.days))
            true
          elsif is_authentiq_verified and (current_tour_time < (checkpoint_verified_at + 30.days))
            false
          else
            false
          end
        end
      end
    else
      false
    end
  end

end
