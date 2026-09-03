# View-side plumbing shared by the rebuilt record forms. A form is a stack of
# sections, each a grid of these fields, so this is the only piece of markup a
# new form has to reach for.
module PynFormHelper
  # One labelled control. Wrapping them is what keeps thirty-odd fields visually
  # identical and puts rules like "this one is managed by the data feed" in one
  # place instead of as loose text under every affected field.
  def pyn_field(label, hint: nil, span: nil, badge: nil, field_class: nil, &block)
    render "shared/form_field",
           label: label,
           hint: hint,
           span: span,
           badge: badge,
           field_class: field_class,
           control: capture(&block)
  end

  # The circled "?" the property form uses for the handful of fields whose
  # effect reaches beyond this page. Plain title text rather than a popover:
  # the popover plugin here is wired into a one-time onboarding chain, and
  # borrowing it for a permanent hint would fire that chain.
  def pyn_tip(text)
    content_tag(:span, class: "pf-tip", title: text) do
      content_tag(:i, "", class: "fa fa-question-circle")
    end
  end
end
