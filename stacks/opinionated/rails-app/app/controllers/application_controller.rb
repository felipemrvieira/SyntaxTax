class ApplicationController < ActionController::API
  rescue_from ActionController::BadRequest, with: :render_bad_request
  rescue_from ActiveRecord::RecordInvalid, with: :render_record_invalid
  rescue_from ActiveRecord::RecordNotFound, with: :render_record_not_found
  rescue_from ActionController::ParameterMissing, with: :render_parameter_missing

  private

  def render_error(message, status)
    render json: { detail: message }, status: status
  end

  def render_record_invalid(exception)
    render_error(exception.record.errors.full_messages.join(", "), :unprocessable_entity)
  end

  def render_bad_request(exception)
    render_error(exception.message, :unprocessable_entity)
  end

  def render_record_not_found(exception)
    render_error(exception.message, :not_found)
  end

  def render_parameter_missing(exception)
    render_error(exception.message, :unprocessable_entity)
  end
end
