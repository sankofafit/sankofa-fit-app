import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SidebarFullScreenShell from './SidebarFullScreenShell';
import { Colors } from '../../theme/colours';
import { GOLD } from '../../theme/premium';

const POSTS = [];

const FORUM_TOPICS = [];

const FORUM_CATS = ['All', 'Nutrition', 'Training', 'Motivation', 'Weight Loss', 'Muscle', 'Women', 'Ghana'];

export default function CommunityScreen({ onClose, initialTab = 'feed' }) {
  const [tab, setTab] = useState(initialTab === 'forum' ? 'forum' : 'feed');
  const [liked, setLiked] = useState({});

  return (
    <SidebarFullScreenShell title="COMMUNITY" onClose={onClose}>
      <View style={styles.tabs}>
        {['feed', 'forum'].map((t) => (
          <TouchableOpacity delayPressIn={0} key={t} onPress={() => setTab(t)} style={styles.tabBtn}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'feed' ? 'Feed' : 'Forum'}</Text>
            {tab === t ? <View style={styles.tabLine} /> : null}
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'feed' ? (
        <>
          <TouchableOpacity delayPressIn={0} style={styles.createPost} activeOpacity={0.75}>
            <Text style={styles.createPostText}>Create Post</Text>
          </TouchableOpacity>
          {POSTS.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="people-outline" size={40} color="rgba(245,200,66,0.25)" />
              <Text style={styles.emptyTitle}>Community feed coming soon</Text>
              <Text style={styles.emptySub}>Posts from Sankofa Fit members will appear here.</Text>
            </View>
          ) : (
          POSTS.map((post) => {
            const isLiked = liked[post.id];
            return (
              <View key={post.id} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.initials}>{post.initials}</Text>
                  </View>
                  <View>
                    <Text style={styles.postName}>{post.name}</Text>
                    <Text style={styles.postTime}>{post.time}</Text>
                  </View>
                </View>
                <Text style={styles.postText}>{post.text}</Text>
                <View style={styles.postActions}>
                  <TouchableOpacity delayPressIn={0}
                    style={styles.actionBtn}
                    onPress={() => setLiked((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                  >
                    <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={20} color={isLiked ? '#EF4444' : Colors.SLATE} />
                    <Text style={styles.actionCount}>{post.likes + (isLiked ? 1 : 0)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity delayPressIn={0} style={styles.actionBtn}>
                    <Ionicons name="chatbubble-outline" size={20} color={Colors.SLATE} />
                    <Text style={styles.actionCount}>{post.comments}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
          )}
        </>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {FORUM_CATS.map((c) => (
              <View key={c} style={styles.chip}>
                <Text style={styles.chipText}>{c}</Text>
              </View>
            ))}
          </ScrollView>
          {FORUM_TOPICS.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbubbles-outline" size={40} color="rgba(245,200,66,0.25)" />
              <Text style={styles.emptyTitle}>Forum topics coming soon</Text>
              <Text style={styles.emptySub}>Start discussions when community launches.</Text>
            </View>
          ) : (
          FORUM_TOPICS.map((topic) => (
            <View key={topic.id} style={styles.topicCard}>
              <View style={styles.topicCat}>
                <Text style={styles.topicCatText}>{topic.cat}</Text>
              </View>
              <Text style={styles.topicTitle}>{topic.title}</Text>
              <View style={styles.topicStats}>
                <Text style={styles.statText}>{topic.replies} replies · {topic.time}</Text>
                <TouchableOpacity delayPressIn={0} style={styles.voteBtn}>
                  <Ionicons name="arrow-up-circle-outline" size={22} color={GOLD} />
                  <Text style={styles.voteCount}>{topic.votes}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
          )}
          <TouchableOpacity delayPressIn={0} style={styles.createPost} activeOpacity={0.75}>
            <Text style={styles.createPostText}>Post New Topic</Text>
          </TouchableOpacity>
        </>
      )}
    </SidebarFullScreenShell>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 24, marginBottom: 16 },
  tabBtn: { alignItems: 'center', paddingBottom: 8 },
  tabText: { color: Colors.SLATE, fontWeight: '700', fontSize: 15 },
  tabTextActive: { color: Colors.WHITE },
  tabLine: { marginTop: 6, height: 2, width: '100%', backgroundColor: GOLD },
  createPost: { alignSelf: 'flex-end', backgroundColor: GOLD, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginBottom: 12 },
  createPostText: { color: '#1B2F6B', fontWeight: '800', fontSize: 12 },
  postCard: { backgroundColor: 'rgba(27,47,107,0.35)', borderRadius: 14, padding: 14, marginBottom: 12 },
  postHeader: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(245,200,66,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: GOLD },
  initials: { color: GOLD, fontWeight: '800' },
  postName: { color: Colors.WHITE, fontWeight: '800' },
  postTime: { color: Colors.SLATE, fontSize: 12 },
  postText: { color: 'rgba(255,255,255,0.9)', lineHeight: 21 },
  postActions: { flexDirection: 'row', gap: 20, marginTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { color: Colors.SLATE, fontSize: 13 },
  chipsScroll: { marginBottom: 12, marginHorizontal: -16, paddingHorizontal: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', marginRight: 8 },
  chipText: { color: Colors.SLATE, fontSize: 12 },
  topicCard: { backgroundColor: 'rgba(27,47,107,0.35)', borderRadius: 14, padding: 14, marginBottom: 10 },
  topicCat: { alignSelf: 'flex-start', backgroundColor: GOLD, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 8 },
  topicCatText: { color: '#1B2F6B', fontWeight: '800', fontSize: 10 },
  topicTitle: { color: Colors.WHITE, fontWeight: '800', fontSize: 14 },
  topicStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  statText: { color: Colors.SLATE, fontSize: 12 },
  voteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  voteCount: { color: GOLD, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { color: Colors.WHITE, fontWeight: '800', fontSize: 16, marginTop: 12, textAlign: 'center' },
  emptySub: { color: Colors.SLATE, fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 20 },
});
