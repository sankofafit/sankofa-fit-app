import React, { useState } from 'react';
import { Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SidebarFullScreenShell from './SidebarFullScreenShell';
import { Colors } from '../../theme/colours';
import { GOLD } from '../../theme/premium';

const FAQS = [
  { q: 'How do I cancel my subscription?', a: 'Go to Profile > Subscription > tap Cancel Subscription. Your access continues until the end of your billing period.' },
  { q: 'How does MTN MoMo payment work?', a: "When you tap Pay, a USSD prompt is sent to your phone. Simply enter your MoMo PIN to confirm the payment. It's instant and secure." },
  { q: 'Can I change my workout goals?', a: 'Yes! Go to Profile > Edit Profile to update your fitness goals. Your workout plan will update automatically.' },
  { q: 'How do I book a personal trainer?', a: 'Go to Explore > Certified Trainers, tap any trainer to view their profile, then tap Book Session and choose your preferred time.' },
  { q: 'What is Body Recomposition?', a: 'Body recomposition means losing fat and building muscle simultaneously. It requires a balanced workout combining strength training and cardio, plus a high-protein diet.' },
  { q: 'Can I use the app without internet?', a: 'Your workout plan and meal plan are available offline after first load. Booking and payments require internet connection.' },
  { q: 'How accurate is the step counter?', a: "Sankofa Fit uses your phone's built-in motion sensor (same as Apple Health) for step counting. Accuracy is typically within 5%." },
];

export default function HelpScreen({ onClose }) {
  const [openFaq, setOpenFaq] = useState(null);
  const [bugText, setBugText] = useState('');

  return (
    <SidebarFullScreenShell title="HELP & SUPPORT" onClose={onClose}>
      <Text style={styles.sectionTitle}>FAQ</Text>
      {FAQS.map((faq, i) => (
        <TouchableOpacity delayPressIn={0} key={faq.q} activeOpacity={0.75} onPress={() => setOpenFaq(openFaq === i ? null : i)}>
          <View style={styles.faqRow}>
            <Text style={styles.faqQuestion}>{faq.q}</Text>
            <Ionicons name={openFaq === i ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7B99" />
          </View>
          {openFaq === i ? <Text style={styles.faqAnswer}>{faq.a}</Text> : null}
        </TouchableOpacity>
      ))}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>CONTACT US</Text>
      <ContactRow label="Email: support@sankofafit.com" onPress={() => Linking.openURL('mailto:support@sankofafit.com')} />
      <ContactRow label="WhatsApp: Chat with us" onPress={() => Linking.openURL('https://wa.me/233244000000')} />
      <ContactRow label="Instagram: @SankofaFit" onPress={() => Linking.openURL('https://instagram.com/sankofafit')} />

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>REPORT A BUG</Text>
      <TextInput
        value={bugText}
        onChangeText={setBugText}
        placeholder="Describe the issue..."
        placeholderTextColor={Colors.SLATE}
        multiline
        style={styles.bugInput}
      />
      <TouchableOpacity delayPressIn={0}
        style={styles.goldBtn}
        onPress={() =>
          Linking.openURL(
            `mailto:bugs@sankofafit.com?subject=${encodeURIComponent('Bug Report')}&body=${encodeURIComponent(bugText)}`,
          )
        }
      >
        <Text style={styles.goldBtnText}>Send Report</Text>
      </TouchableOpacity>
    </SidebarFullScreenShell>
  );
}

function ContactRow({ label, onPress }) {
  return (
    <TouchableOpacity delayPressIn={0} style={styles.contactRow} onPress={onPress}>
      <Text style={styles.contactText}>{label}</Text>
      <Ionicons name="open-outline" size={16} color={GOLD} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: GOLD, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
  faqRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  faqQuestion: { flex: 1, color: Colors.WHITE, fontWeight: '700', paddingRight: 8 },
  faqAnswer: { color: Colors.SLATE, lineHeight: 21, paddingBottom: 14, paddingTop: 4 },
  contactRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  contactText: { color: Colors.WHITE },
  bugInput: {
    minHeight: 90,
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 12,
    padding: 14,
    color: Colors.WHITE,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  goldBtn: { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  goldBtnText: { color: '#1B2F6B', fontWeight: '800' },
});
