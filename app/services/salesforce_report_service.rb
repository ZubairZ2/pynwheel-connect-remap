class SalesforceReportService < BaseService
  def initialize
  end

  def get_report
    csv_file = CSV.generate(headers: true) do |csv|
      csv << headers
      salesforce_logs = get_salesforce_logs()

      salesforce_logs.each do |salesforce_log|
        csv << formate_csv(salesforce_log)
      end

    end

    csv_file
  end

  private

  def headers
    %w{Salesforce\ Property\ Id Salesforce\ Property\ Name}
  end

  def get_salesforce_logs
    WebHookLog.where(webhook_type: "salesforce").pluck(:community_id, :community_name).distinct.compact
  end

  def formate_csv salesforce_log
    [ salesforce_log[0], salesforce_log[1] ]
  end
end