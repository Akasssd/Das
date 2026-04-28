import { useMemo } from 'react';
import { useApp } from '../AppContext';
import { BoxOrder } from '../types';
import { isBoxEligible, pickActiveOrder } from '../utils/delivery';

export interface UseBoxDeliveryApi {
  eligible: boolean;
  /** True when address has the minimum required fields. */
  hasAddress: boolean;
  /** True when boxProfile.configured. */
  hasBoxProfile: boolean;
  activeOrder: BoxOrder | null;
  orders: BoxOrder[];
}

export const useBoxDelivery = (): UseBoxDeliveryApi => {
  const { data } = useApp();
  const eligible = isBoxEligible(data.subscription);
  const hasAddress = useMemo(() => {
    const a = data.shippingAddress;
    return Boolean(
      a.country.trim() &&
        a.city.trim() &&
        a.street.trim() &&
        a.building.trim() &&
        a.phone.trim(),
    );
  }, [data.shippingAddress]);
  const hasBoxProfile = data.boxProfile.configured;
  const activeOrder = useMemo(
    () => pickActiveOrder(data.orders),
    [data.orders],
  );
  return {
    eligible,
    hasAddress,
    hasBoxProfile,
    activeOrder,
    orders: data.orders,
  };
};
