export const GYM_MEMBERSHIP_PLANS = [];

export function getMembershipPlansForGym(gym) {
  if (gym?.membershipPlans?.length) {
    return gym.membershipPlans.map((plan, index) => ({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      period: plan.duration ? `/ ${plan.duration} days` : '/ plan',
      features: plan.features?.length ? plan.features : ['Gym access included'],
      cta: 'Join Now',
      renewNote: 'Managed through Sankofa Fit.',
      popular: index === 0,
      badge: index === 0 ? 'PARTNER PLAN' : undefined,
      badgeColor: index === 0 ? 'gold' : undefined,
    }));
  }

  return [];
}

export function getMemberExpiryLabel() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}
