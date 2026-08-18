import React, { useEffect, useState } from 'react';
import { Modal, View } from 'react-native';
import PaystackWebView from './PaystackWebView';
import { billingMobileForPaystack } from '../lib/paystack';

/** Modal wrapper around PaystackWebView (v1 inline — MoMo + card). */
export default function PaystackPayment({
  visible,
  amount,
  email,
  phone,
  name,
  reference,
  planCode,
  selectedMethod = 'mobile_money',
  onSuccess,
  onCancel,
}) {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    setShow(visible);
  }, [visible]);

  const handleCancel = () => {
    setShow(false);
    onCancel?.();
  };

  const handleSuccess = (data) => {
    setShow(false);
    onSuccess?.(data);
  };

  if (!show || !email?.trim()) {
    return null;
  }

  return (
    <Modal
      visible={show}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleCancel}
    >
      <View style={{ flex: 1, backgroundColor: '#080C1C' }}>
        <PaystackWebView
          amount={amount}
          email={email.trim()}
          phone={billingMobileForPaystack(phone)}
          name={name}
          reference={reference}
          planCode={planCode}
          selectedMethod={selectedMethod}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </View>
    </Modal>
  );
}
