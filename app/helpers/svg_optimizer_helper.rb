module SvgOptimizerHelper
  # Server-side twin of the properties view's JS `badgeHtml` — renders the
  # initial per-target status badge so the page is correct before any polling.
  def render_target_badge(run)
    return content_tag(:span, "Not optimized", class: "badge b-none") if run.nil?

    case run.status
    when "uploaded"
      if run.action == "revert"
        content_tag(:span, "Reverted to original", class: "badge b-done")
      else
        pct = run.reduction_pct&.to_f || 0
        badge = content_tag(:span, "Optimized −#{pct}%", class: "badge b-done")
        detail = content_tag(:span, " #{kb(run.original_bytes)} → #{kb(run.optimized_bytes)}", class: "muted")
        safe_join([badge, detail])
      end
    when "skipped"
      content_tag(:span, "Nothing to optimize", class: "badge b-skipped")
    when "failed"
      badge = content_tag(:span, "Failed", class: "badge b-failed")
      err = run.error_message.present? ? content_tag(:div, run.error_message, class: "err") : "".html_safe
      safe_join([badge, err])
    else
      content_tag(:span, "#{run.status.capitalize}…", class: "badge b-progress")
    end
  end

  def kb(bytes)
    return "" if bytes.nil?
    "#{(bytes / 1024.0).round} KB"
  end
end
