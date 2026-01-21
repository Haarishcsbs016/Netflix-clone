const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Public routes
router.get('/plans', subscriptionController.getPlans);

// Webhook (raw body needed for Stripe signature verification)
router.post('/webhook', express.raw({ type: 'application/json' }), subscriptionController.handleWebhook);

// Protected routes
router.use(authenticate);
router.get('/status', subscriptionController.getSubscriptionStatus);
router.post('/subscribe', subscriptionController.subscribe);
router.post('/create-checkout-session', subscriptionController.createCheckoutSession);
router.post('/cancel', subscriptionController.cancelSubscription);
router.post('/update-payment-method', subscriptionController.updatePaymentMethod);
router.get('/billing-history', subscriptionController.getBillingHistory);

module.exports = router;
