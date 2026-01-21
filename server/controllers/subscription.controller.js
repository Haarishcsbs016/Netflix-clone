const stripe = require('../config/stripe');
const User = require('../models/User.model');
const SubscriptionPlan = require('../models/SubscriptionPlan.model');
const { sendEmail } = require('../config/email');

// @desc    Get all subscription plans
// @route   GET /api/subscriptions/plans
// @access  Public
exports.getPlans = async (req, res, next) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true });

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user subscription status
// @route   GET /api/subscriptions/status
// @access  Private
exports.getSubscriptionStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      data: {
        plan: user.subscription.plan,
        status: user.subscription.status,
        startDate: user.subscription.startDate,
        endDate: user.subscription.endDate
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create subscription checkout session
// @route   POST /api/subscriptions/create-checkout-session
// @access  Private
exports.createCheckoutSession = async (req, res, next) => {
  try {
    const { planId, billingCycle } = req.body; // billingCycle: 'monthly' or 'yearly'

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Get or create Stripe customer
    let customerId = req.user.subscription.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          userId: req.user._id.toString()
        }
      });
      customerId = customer.id;

      await User.findByIdAndUpdate(req.user._id, {
        'subscription.stripeCustomerId': customerId
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: plan.stripePriceIds[billingCycle],
        quantity: 1
      }],
      success_url: `${process.env.CLIENT_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/subscription/cancel`,
      metadata: {
        userId: req.user._id.toString(),
        planId: plan._id.toString(),
        planName: plan.name
      }
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Subscribe to a plan (direct)
// @route   POST /api/subscriptions/subscribe
// @access  Private
exports.subscribe = async (req, res, next) => {
  try {
    const { planName } = req.body;

    const plan = await SubscriptionPlan.findOne({ name: planName });
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // For free plan, just update user
    if (planName === 'free') {
      await User.findByIdAndUpdate(req.user._id, {
        subscription: {
          plan: 'free',
          status: 'active',
          startDate: new Date()
        }
      });

      return res.json({
        success: true,
        message: 'Subscribed to free plan'
      });
    }

    // For paid plans, redirect to checkout
    res.json({
      success: true,
      message: 'Please complete payment',
      data: {
        requiresPayment: true,
        planId: plan._id
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel subscription
// @route   POST /api/subscriptions/cancel
// @access  Private
exports.cancelSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.subscription.stripeSubscriptionId) {
      // Just downgrade to free
      user.subscription.plan = 'free';
      user.subscription.status = 'cancelled';
      await user.save();

      return res.json({
        success: true,
        message: 'Subscription cancelled'
      });
    }

    // Cancel Stripe subscription
    await stripe.subscriptions.cancel(user.subscription.stripeSubscriptionId);

    user.subscription.status = 'cancelled';
    await user.save();

    // Send cancellation email
    await sendEmail({
      to: user.email,
      subject: 'Subscription Cancelled',
      html: `
        <h1>Your subscription has been cancelled</h1>
        <p>We're sorry to see you go! Your premium features will remain active until ${user.subscription.endDate}.</p>
        <p>You can resubscribe anytime to continue enjoying premium content.</p>
      `
    });

    res.json({
      success: true,
      message: 'Subscription cancelled',
      data: {
        activeUntil: user.subscription.endDate
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Handle Stripe webhook
// @route   POST /api/subscriptions/webhook
// @access  Public (Stripe)
exports.handleWebhook = async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).json({ message: `Webhook Error: ${err.message}` });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { userId, planName } = session.metadata;

        await User.findByIdAndUpdate(userId, {
          'subscription.plan': planName,
          'subscription.status': 'active',
          'subscription.startDate': new Date(),
          'subscription.stripeSubscriptionId': session.subscription
        });

        const user = await User.findById(userId);
        await sendEmail({
          to: user.email,
          subject: 'Welcome to Premium!',
          html: `
            <h1>Your subscription is now active!</h1>
            <p>Thank you for subscribing to the ${planName} plan.</p>
            <p>Enjoy unlimited access to our premium content library.</p>
          `
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await User.findOneAndUpdate(
          { 'subscription.stripeSubscriptionId': subscription.id },
          {
            'subscription.status': subscription.status,
            'subscription.endDate': new Date(subscription.current_period_end * 1000)
          }
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await User.findOneAndUpdate(
          { 'subscription.stripeSubscriptionId': subscription.id },
          {
            'subscription.plan': 'free',
            'subscription.status': 'expired',
            'subscription.stripeSubscriptionId': null
          }
        );
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customer = await stripe.customers.retrieve(invoice.customer);
        
        await sendEmail({
          to: customer.email,
          subject: 'Payment Failed',
          html: `
            <h1>Payment Failed</h1>
            <p>We were unable to process your payment. Please update your payment method to continue your subscription.</p>
          `
        });
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment method
// @route   POST /api/subscriptions/update-payment-method
// @access  Private
exports.updatePaymentMethod = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.subscription.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.subscription.stripeCustomerId,
      return_url: `${process.env.CLIENT_URL}/account`
    });

    res.json({
      success: true,
      data: {
        url: session.url
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get billing history
// @route   GET /api/subscriptions/billing-history
// @access  Private
exports.getBillingHistory = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.subscription.stripeCustomerId) {
      return res.json({
        success: true,
        data: []
      });
    }

    const invoices = await stripe.invoices.list({
      customer: user.subscription.stripeCustomerId,
      limit: 10
    });

    const billingHistory = invoices.data.map(invoice => ({
      id: invoice.id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      status: invoice.status,
      date: new Date(invoice.created * 1000),
      invoiceUrl: invoice.hosted_invoice_url
    }));

    res.json({
      success: true,
      data: billingHistory
    });
  } catch (error) {
    next(error);
  }
};
