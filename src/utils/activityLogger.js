import { supabase } from '../lib/supabase';

export const logActivity = async ({
  actorId = null,
  actorEmail = null,
  actorName = null,
  actorType = 'system',
  action,
  category,
  description,
  metadata = {},
  status = 'success',
}) => {
  try {
    const { error } = await supabase.from('activity_logs').insert({
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

    if (error) {
      console.log('Log error:', error);
    }
  } catch (e) {
    console.log('logActivity error:', e);
  }
};

export const LOG_ACTIONS = {
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_REGISTER: 'auth.register',
  AUTH_FAILED: 'auth.failed',
  BOOKING_CREATED: 'booking.created',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_COMPLETED: 'booking.completed',
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  PAYOUT_SENT: 'payout.sent',
  TRAINER_APPROVED: 'trainer.approved',
  TRAINER_REJECTED: 'trainer.rejected',
  TRAINER_SUSPENDED: 'trainer.suspended',
  TRAINER_REGISTERED: 'trainer.registered',
  GYM_APPROVED: 'gym.approved',
  GYM_REJECTED: 'gym.rejected',
  GYM_REGISTERED: 'gym.registered',
  USER_REGISTERED: 'user.registered',
  USER_UPGRADED: 'user.upgraded',
  USER_REPORTED: 'user.reported',
  REVIEW_SUBMITTED: 'review.submitted',
  REVIEW_FLAGGED: 'review.flagged',
  REPORT_SUBMITTED: 'report.submitted',
  REPORT_RESOLVED: 'report.resolved',
  REPORT_DISMISSED: 'report.dismissed',
  ADMIN_LOGIN: 'admin.login',
  ADMIN_ACTION: 'admin.action',
};
