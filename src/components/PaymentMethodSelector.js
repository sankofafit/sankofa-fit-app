import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentMethodSelector({ selectedMethod, onSelect }) {
  const methods = [
    {
      id: 'mobile_money',
      label: 'Mobile Money',
      subtext: 'MTN · Vodafone · AirtelTigo',
      icon: 'phone-portrait-outline',
      iconSelected: 'phone-portrait',
    },
    {
      id: 'card',
      label: 'Bank Card',
      subtext: 'Visa · Mastercard',
      icon: 'card-outline',
      iconSelected: 'card',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>PAY WITH</Text>
      {methods.map((method) => {
        const isSelected = selectedMethod === method.id;
        return (
          <TouchableOpacity
            key={method.id}
            activeOpacity={0.75}
            onPress={() => onSelect(method.id)}
            style={[styles.card, isSelected ? styles.cardSelected : styles.cardUnselected]}
          >
            <View
              style={[
                styles.iconCircle,
                isSelected ? styles.iconCircleSelected : styles.iconCircleUnselected,
              ]}
            >
              <Ionicons
                name={isSelected ? method.iconSelected : method.icon}
                size={22}
                color={isSelected ? '#1B2F6B' : '#6B7B99'}
              />
            </View>

            <View style={styles.textContainer}>
              <Text style={[styles.methodLabel, isSelected && styles.methodLabelSelected]}>
                {method.label}
              </Text>
              <Text style={[styles.methodSubtext, isSelected && styles.methodSubtextSelected]}>
                {method.subtext}
              </Text>
            </View>

            {isSelected ? <Ionicons name="checkmark-circle" size={22} color="#F5C842" /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: '#6B7B99',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
    borderWidth: 2,
  },
  cardSelected: {
    backgroundColor: 'rgba(245,200,66,0.08)',
    borderColor: '#F5C842',
    shadowColor: '#F5C842',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  cardUnselected: {
    backgroundColor: 'rgba(27,47,107,0.3)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleSelected: {
    backgroundColor: '#F5C842',
  },
  iconCircleUnselected: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  textContainer: {
    flex: 1,
  },
  methodLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  methodLabelSelected: {
    color: 'white',
  },
  methodSubtext: {
    color: '#6B7B99',
    fontSize: 12,
  },
  methodSubtextSelected: {
    color: 'rgba(245,200,66,0.7)',
  },
});
