import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const PENDING_BOOKINGS_STORAGE_KEY = 'sankofa_pending_paid_bookings_v1';

export function logSupabaseError(error, context = 'Supabase') {
  if (!error) {
    return;
  }
  console.log(`[Supabase] ${context}`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    status: error.status,
  });
  try {
    console.log(`[Supabase] ${context} (raw)`, JSON.stringify(error));
  } catch {
    console.log(`[Supabase] ${context} (raw)`, error);
  }
}

function isMissingColumnError(error) {
  const msg = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return (
    error?.code === 'PGRST204' ||
    error?.code === '42703' ||
    msg.includes('column') ||
    msg.includes('schema cache')
  );
}

function isAuthOrRlsError(error) {
  const msg = `${error?.message || ''}`.toLowerCase();
  return (
    error?.code === '42501' ||
    error?.code === 'PGRST301' ||
    msg.includes('row-level security') ||
    msg.includes('jwt') ||
    msg.includes('not authenticated')
  );
}

export async function ensureSupabaseSessionForWrite() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    logSupabaseError(sessionError, 'auth.getSession');
  }

  let user = sessionData?.session?.user ?? null;
  if (user?.id) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      logSupabaseError(refreshError, 'auth.refreshSession');
    } else if (refreshed?.session?.user) {
      user = refreshed.session.user;
    }
    return user;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    logSupabaseError(userError, 'auth.getUser');
  }
  return userData?.user ?? null;
}

async function insertRow(table, row, context) {
  const { error } = await supabase.from(table).insert(row);
  if (!error) {
    return { ok: true, error: null };
  }
  logSupabaseError(error, context);
  return { ok: false, error };
}

async function insertWithAuthRetry(table, row, context) {
  let result = await insertRow(table, row, `${context} (attempt 1)`);
  if (result.ok) {
    return result;
  }

  if (isAuthOrRlsError(result.error)) {
    console.log('[Booking] auth/RLS error — refreshing session and retrying insert');
    await supabase.auth.refreshSession();
    result = await insertRow(table, row, `${context} (after refresh)`);
    if (result.ok) {
      return result;
    }
  }

  return result;
}

export async function saveGymClassBookingAfterPayment(record) {
  const user = await ensureSupabaseSessionForWrite();
  if (!user?.id) {
    const err = { message: 'No authenticated user for booking save', code: 'NO_USER' };
    console.log('[Booking] gym_class save aborted — no user');
    return { ok: false, error: err, user: null };
  }

  const baseRow = {
    user_id: user.id,
    gym_id: record.gym_id != null ? String(record.gym_id) : null,
    class_name: record.class_name,
    booking_date: record.booking_date,
    amount_ghs: record.amount_ghs,
    paystack_reference: record.paystack_reference,
    status: record.status || 'confirmed',
  };

  const extendedRow = {
    ...baseRow,
    gym_name: record.gym_name,
    class_time: record.class_time,
    trainer_name: record.trainer_name,
    booking_reference: record.booking_reference,
  };

  console.log('[Booking] gym_bookings insert (extended)', {
    user_id: baseRow.user_id,
    gym_id: baseRow.gym_id,
    paystack_reference: baseRow.paystack_reference,
  });

  let result = await insertWithAuthRetry('gym_bookings', extendedRow, 'gym_bookings extended');
  if (result.ok) {
    return { ok: true, error: null, user };
  }

  if (isMissingColumnError(result.error)) {
    console.log('[Booking] retrying gym_bookings with base columns only');
    result = await insertWithAuthRetry('gym_bookings', baseRow, 'gym_bookings base');
    if (result.ok) {
      return { ok: true, error: null, user };
    }
  }

  return { ok: false, error: result.error, user };
}

export async function saveTrainerBookingAfterPayment(record) {
  const user = await ensureSupabaseSessionForWrite();
  if (!user?.id) {
    const err = { message: 'No authenticated user for booking save', code: 'NO_USER' };
    console.log('[Booking] trainer save aborted — no user');
    return { ok: false, error: err, user: null };
  }

  const row = {
    user_id: user.id,
    trainer_id: record.trainer_id != null ? String(record.trainer_id) : null,
    session_type: record.session_type,
    session_date: record.session_date,
    session_time: record.session_time,
    amount_ghs: record.amount_ghs,
    paystack_reference: record.paystack_reference,
    status: record.status || 'confirmed',
  };

  console.log('[Booking] trainer_bookings insert', {
    user_id: row.user_id,
    trainer_id: row.trainer_id,
    paystack_reference: row.paystack_reference,
  });

  const result = await insertWithAuthRetry('trainer_bookings', row, 'trainer_bookings');
  return { ok: result.ok, error: result.error, user };
}

export async function saveGymMembershipAfterPayment(record) {
  const user = await ensureSupabaseSessionForWrite();
  if (!user?.id) {
    const err = { message: 'No authenticated user for membership save', code: 'NO_USER' };
    console.log('[Booking] membership save aborted — no user');
    return { ok: false, error: err, user: null };
  }

  const row = {
    user_id: user.id,
    gym_name: record.gym_name,
    gym_id: record.gym_id != null ? String(record.gym_id) : null,
    membership_type: record.membership_type,
    start_date: record.start_date,
    end_date: record.end_date,
    amount_ghs: record.amount_ghs,
    paystack_reference: record.paystack_reference,
    status: record.status || 'active',
    membership_reference: record.membership_reference,
  };

  console.log('[Booking] gym_memberships insert', {
    user_id: row.user_id,
    gym_id: row.gym_id,
    paystack_reference: row.paystack_reference,
  });

  const result = await insertWithAuthRetry('gym_memberships', row, 'gym_memberships');
  return { ok: result.ok, error: result.error, user };
}

export async function queueFailedPaidBooking({
  kind,
  paystackReference,
  userId,
  payload,
  supabaseError,
}) {
  const entry = {
    id: `local-${Date.now()}`,
    kind,
    paystack_reference: paystackReference,
    user_id: userId || null,
    payload,
    error_message: supabaseError?.message || null,
    error_code: supabaseError?.code || null,
    created_at: new Date().toISOString(),
  };

  console.log('[Booking] queue failed paid booking', entry);

  try {
    const raw = await AsyncStorage.getItem(PENDING_BOOKINGS_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.push(entry);
    await AsyncStorage.setItem(PENDING_BOOKINGS_STORAGE_KEY, JSON.stringify(list));
  } catch (storageError) {
    console.log('[Booking] AsyncStorage queue failed', storageError);
  }

  const { error } = await supabase.from('pending_bookings').insert({
    user_id: userId || null,
    booking_kind: kind,
    paystack_reference: paystackReference,
    payload,
    error_message: supabaseError?.message || null,
    error_code: supabaseError?.code || null,
  });

  if (error) {
    logSupabaseError(error, 'pending_bookings insert (non-fatal)');
  }
}
