module FeedbacksHelper
  def write_feedback_report(workbook)
    worksheet = workbook.add_worksheet("Sheet 1")
    format = workbook.add_format({'align': 'left', 'font': 'Arial', 'size': '10','locked': true})
    format.set_bold()
    format.set_locked()
    format1 = workbook.add_format({'align': 'left', 'font': 'Arial', 'size': '10'})
    row = 1
    worksheet.freeze_panes(1, 2)
    worksheet.write(0, 0, "Company",format)
    worksheet.write(0, 1, "Community",format)
    worksheet.write(0, 2, "Tour",format)
    worksheet.write(0, 3, "Tour User",format)
    worksheet.write(0, 4, "Tour User Email",format)
    worksheet.write(0, 5, "Rating",format)
    worksheet.write(0, 6, "Comment",format)
    worksheet.write(0, 7, "Feedback Created Date",format)
    
    Feedback.all.order(created_at: :desc).each do |tf|
      if tf.present?
        worksheet.write(row, 0, tf.tour.community.company.name,format1)
        worksheet.write(row, 1, tf.tour.community.name,format1)
        worksheet.write(row, 2, tf.tour.name,format1)
        worksheet.write(row, 3, tf.tour_user.name,format1)
        worksheet.write(row, 4, tf.tour_user.email,format1)
        worksheet.write(row, 5, tf.rating,format1)
        worksheet.write(row, 6, tf.comment,format1)
        worksheet.write(row, 7, tf.created_at.strftime("%m/%d/%Y-%H:%M"),format1)

        row = row + 1
      end
    end
    workbook.close


    temp_file = Tempfile.new("TourFeedbackReport.zip")
    reportFiles = Dir.entries('public/TourFeedbackReport')
    Zip::File.open(temp_file.path, Zip::File::CREATE) do |zip_file|
      reportFiles.each do |d|
        unless d == "." || d == ".."
          zip_file.add(d,"public/TourFeedbackReport/TourFeedbackReport.xlsx")
        end
      end
    end
    File.read(temp_file.path)
  
    end
end
