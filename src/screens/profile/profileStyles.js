import { StyleSheet } from 'react-native';
import { Colors } from '../../theme/colours';
import { GOLD } from '../../theme/premium';

export const profileScreenStyles = StyleSheet.create({
  sectionLabel: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
  },
  fieldLabel: {
    color: Colors.SLATE,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 12,
    padding: 14,
    color: Colors.WHITE,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 16,
  },
  inputFocused: {
    borderColor: GOLD,
  },
  card: {
    backgroundColor: 'rgba(27,47,107,0.4)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  goldButton: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  goldButtonText: {
    color: '#1B2F6B',
    fontWeight: '800',
    fontSize: 16,
  },
  outlineGoldButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GOLD,
    marginTop: 8,
  },
  outlineGoldText: {
    color: GOLD,
    fontWeight: '700',
    fontSize: 15,
  },
  bodyPad: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  notifInfo: {
    flex: 1,
    paddingRight: 12,
  },
  notifTitle: {
    color: Colors.WHITE,
    fontWeight: '700',
    fontSize: 15,
  },
  notifSub: {
    color: Colors.SLATE,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
});
