class ErrorLogsController < ApplicationController
  before_action :set_error_log, only: [:show, :edit, :update, :destroy]

  # GET /error_logs
  # GET /error_logs.json
  def index
    @error_logs = ErrorLog.all
  end

  # GET /error_logs/1
  # GET /error_logs/1.json
  def show
  end

 def generate_error
      @error_log = ErrorLog.new(error_log_params)
      respond_to do |format|
      if @error_log.save
        # format.html{redirect_to error_page_path(:error_log => params[:error_log])}
        format.html{ render :file => "public/#{@error_log.status}.html"}
        format.json { render :status => params[:status], :message => params[:message] }
      else
         format.html{ render :file => "public/#{@error_log.status}.html"}
        format.json { render :status => params[:status], :message => params[:message]}
      end
    end
  end

  def error_page
    @error_log = ErrorLog.new(error_log_params)
  end

  def destroy
    @error_log.destroy
    respond_to do |format|
      format.html { redirect_to error_logs_url, notice: 'Error log was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_error_log
      @error_log = ErrorLog.find(params[:id])
    end

    # Only allow a list of trusted parameters through.
    def error_log_params
      params.require(:error_log).permit(:status, :description, :message,  :error_location)
    end
end
