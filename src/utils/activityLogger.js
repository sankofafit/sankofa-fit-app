import { supabase } from '../lib/supabase';

export const logActivity = async ({
  actorId = null,
  actorEmail = null,
  actorName = null,
  actorType = 'user',
  action,
  category,
  description,
  metadata = {},
  status = 'success',
}) => {
  try {
    await supabase.from('activity_logs').insert({
      actor_id: actorId,
      actor_email: actorEmail,
      actor_name: actorName,
      actor_type: actorType,
      action,
      category,
      description,
      metadata,
      status,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.log('logActivity error:', e);
  }
};

export const LOG_ACTIONS = {
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_REGISTER: 'auth.register',
  BOOKING_CREATED: 'booking.created',
  BOOKING_CANCELLED: 'booking.cancelled',
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  MESSAGE_SENT: 'message.sent',
  REVIEW_SUBMITTED: 'review.submitted',
  REPORT_SUBMITTED: 'report.submitted',
};
