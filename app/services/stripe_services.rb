module StripeServices
	def create_customer(email, token)
		customer = Stripe::Customer.create email: email.downcase, card: token
	end
	def charge_customer(tour_user, amount, description, currency)
		res = Stripe::Charge.create customer: tour_user.strip_customer_id, amount: amount, description: description, currency: currency
		tour_user.user_stripes.create(charge_amount_in_cent: amount, charge_id: res.id, last_digits: tu.card_last_digits)
		res
	end
	def refund_customer(tu, transaction_id)
		pay_back = Stripe::Refund.create({
          charge: transaction_id,
        })
		res = tu.user_stripes.where(charge_id: transaction_id)
		res.refund_id = pay_back.id
		res.save
	end
end