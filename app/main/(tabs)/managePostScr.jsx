import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import * as Icon from 'react-native-feather';

import ScreenWrapper from '../../../components/ScreenWrapper';
import MyHeader from '../../../components/MyHeader';
import PostCard from '../postCard';
import { useAuth } from '../../../context/AuthContext';
import { usePostRt } from '../../../hook/usePostRt';
import { theme } from '../../../constants/theme';
import { hp, wp } from '../../../helper/common';

const ManagePostScr = () => {
  const { user } = useAuth();
  const [showSearch, setShowSearch] = useState(false);

  const {
    posts,
    statistics,
    loading,
    refreshing,
    hasMore,
    currentStatus,
    searchQuery,
    refreshPosts,
    loadMore,
    approvePost,
    rejectPost,
    resetPost,
    deletePost,
    filterByStatus,
    searchPosts
  } = usePostRt(user, 'wait');

  // ✅ Enhanced status tabs with icons
  const statusTabs = [
    {
      key: 'wait',
      label: 'Chờ duyệt',
      count: statistics.wait,
      color: '#FF9800',
      bgColor: 'rgba(255, 152, 0, 0.1)',
      icon: 'Clock'
    },
    {
      key: 'accept',
      label: 'Đã duyệt',
      count: statistics.accept,
      color: '#4CAF50',
      bgColor: 'rgba(76, 175, 80, 0.1)',
      icon: 'CheckCircle'
    },
    {
      key: 'reject',
      label: 'Từ chối',
      count: statistics.reject,
      color: '#F44336',
      bgColor: 'rgba(244, 67, 54, 0.1)',
      icon: 'XCircle'
    }
  ];

  // ✅ Enhanced status tab render
  const renderStatusTab = ({ item, index }) => {
    const isActive = currentStatus === item.key;

    return (
      <TouchableOpacity
        style={[
          styles.statusTab,
          isActive && [styles.activeStatusTab, { backgroundColor: item.bgColor }],
          index === 0 && styles.firstTab,
          index === statusTabs.length - 1 && styles.lastTab
        ]}
        onPress={() => filterByStatus(item.key)}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View style={[
          styles.tabIcon,
          isActive && { backgroundColor: item.color }
        ]}>
          {item.icon === 'Clock' && (
            <Icon.Clock
              stroke={isActive ? 'white' : item.color}
              width={hp(2)}
              height={hp(2)}
            />
          )}
          {item.icon === 'CheckCircle' && (
            <Icon.CheckCircle
              stroke={isActive ? 'white' : item.color}
              width={hp(2)}
              height={hp(2)}
            />
          )}
          {item.icon === 'XCircle' && (
            <Icon.XCircle
              stroke={isActive ? 'white' : item.color}
              width={hp(2)}
              height={hp(2)}
            />
          )}
        </View>

        {/* Content */}
        <View style={styles.tabContent}>
          <Text style={[
            styles.statusTabText,
            isActive && { color: item.color, fontWeight: '700' }
          ]}>
            {item.label}
          </Text>

          {/* Count Badge */}
          <View style={[
            styles.statusBadge,
            { backgroundColor: isActive ? item.color : item.bgColor }
          ]}>
            <Text style={[
              styles.statusBadgeText,
              { color: isActive ? 'white' : item.color }
            ]}>
              {item.count}
            </Text>
          </View>
        </View>

        {/* Active Indicator */}
        {isActive && (
          <View style={[styles.activeIndicator, { backgroundColor: item.color }]} />
        )}
      </TouchableOpacity>
    );
  };

  // ✅ Summary Cards Component
  const SummaryCards = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryCard}>
        <Icon.FileText stroke="#666" width={hp(3)} height={hp(3)} />
        <Text style={styles.summaryNumber}>{statistics.total}</Text>
        <Text style={styles.summaryLabel}>Tổng bài viết</Text>
      </View>

      <View style={[styles.summaryCard, styles.activeSummaryCard]}>
        <Icon.TrendingUp stroke={theme.colors.primary} width={hp(3)} height={hp(3)} />
        <Text style={[styles.summaryNumber, { color: theme.colors.primary }]}>
          {posts.length}
        </Text>
        <Text style={styles.summaryLabel}>Hiện tại</Text>
      </View>
    </View>
  );

  // Rest of the component remains the same...
  const renderPostItem = ({ item }) => (
    <PostCard
      item={item}
      currentUser={user}
      showApprovalActions={true} // ✅ Enable approval actions
      onApprove={(postId, note) => approvePost(postId, note)}
      onReject={(postId, reason) => rejectPost(postId, reason)}
      onReset={(postId) => resetPost(postId)}
      onEdit={(post) => console.log('Edit post:', post.id)}
      onDelete={(postId) => deletePost(postId)}
      showActions={true}
    />
  );

  const handleLoadMore = () => {
    if (hasMore && !loading && !refreshing) {
      loadMore();
    }
  };

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  };

  const getCurrentTabInfo = () => {
    return statusTabs.find(tab => tab.key === currentStatus) || statusTabs[0];
  };

  const currentTabInfo = getCurrentTabInfo();

  return (
    <ScreenWrapper bg="white">
      <View style={styles.container}>
        {/* Header */}
        <MyHeader
          title="Quản lý bài viết"
          showBackButton={false}
          rightComponent={
            <TouchableOpacity
              onPress={() => setShowSearch(!showSearch)}
              style={styles.searchToggle}
            >
              <Icon.Search stroke={theme.colors.dark} width={hp(3)} height={hp(3)} />
            </TouchableOpacity>
          }
        />

        {/* Search Bar */}
        {showSearch && (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Icon.Search stroke="#666" width={hp(2.5)} height={hp(2.5)} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm bài viết, tác giả..."
                value={searchQuery}
                onChangeText={searchPosts}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => searchPosts('')}>
                  <Icon.X stroke="#666" width={hp(2.5)} height={hp(2.5)} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ✅ Enhanced Status Tabs */}
        <View style={styles.statusTabsContainer}>
          <FlatList
            data={statusTabs}
            renderItem={renderStatusTab}
            keyExtractor={(item) => item.key}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusTabsList}
          />
        </View>

        {/* ✅ Summary Cards */}
        <SummaryCards />

        {/* Posts List */}
        <FlatList
          data={posts}
          renderItem={renderPostItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.postsList,
            posts.length === 0 && styles.postsListEmpty
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshPosts}
              colors={[theme.colors.primary]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            !loading && !refreshing && (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Icon.FileText stroke="#ddd" width={hp(8)} height={hp(8)} />
                </View>
                <Text style={styles.emptyText}>
                  {searchQuery
                    ? `Không tìm thấy "${searchQuery}"`
                    : `Không có bài viết ${currentTabInfo.label.toLowerCase()}`
                  }
                </Text>
                <Text style={styles.emptySubText}>
                  {!searchQuery && (() => {
                    switch (currentStatus) {
                      case 'wait':
                        return 'Chưa có bài viết nào cần duyệt';
                      case 'accept':
                        return 'Chưa có bài viết nào được duyệt';
                      case 'reject':
                        return 'Chưa có bài viết nào bị từ chối';
                      default:
                        return '';
                    }
                  })()}
                </Text>
              </View>
            )
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ScreenWrapper>
  );
};

// ✅ Enhanced Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  searchToggle: {
    padding: wp(2),
    borderRadius: wp(2),
    backgroundColor: 'rgba(0,0,0,0.05)',
  },

  searchContainer: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },

  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: wp(3),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.2),
    gap: wp(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  searchInput: {
    flex: 1,
    fontSize: hp(1.8),
    color: theme.colors.dark,
  },

  // ✅ Enhanced Status Tabs Styles
  statusTabsContainer: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },

  statusTabsList: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(1),
  },

  statusTab: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: wp(1),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderRadius: wp(3),
    backgroundColor: 'transparent',
    minWidth: wp(30),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0,
    shadowRadius: 2,
    elevation: 0,
    transition: 'all 0.2s ease',
  },

  firstTab: {
    marginLeft: wp(2),
  },

  lastTab: {
    marginRight: wp(2),
  },

  activeStatusTab: {
    shadowOpacity: 0.15,
    elevation: 4,
    transform: [{ scale: 1.02 }],
  },

  tabIcon: {
    width: hp(4),
    height: hp(4),
    borderRadius: hp(2),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginRight: wp(2.5),
  },

  tabContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statusTabText: {
    fontSize: hp(1.7),
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },

  statusBadge: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    borderRadius: wp(3),
    minWidth: wp(6),
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusBadgeText: {
    fontSize: hp(1.4),
    fontWeight: '700',
    textAlign: 'center',
  },

  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: wp(1),
    right: wp(1),
    height: hp(0.4),
    borderRadius: hp(0.2),
  },

  // ✅ Summary Cards Styles
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    backgroundColor: '#f8f9fa',
    gap: wp(3),
  },

  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: wp(4),
    borderRadius: wp(3),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  activeSummaryCard: {
    borderWidth: 2,
    borderColor: theme.colors.primary + '20',
  },

  summaryNumber: {
    fontSize: hp(2.5),
    fontWeight: '700',
    color: '#333',
    marginTop: hp(0.5),
  },

  summaryLabel: {
    fontSize: hp(1.4),
    color: '#666',
    marginTop: hp(0.3),
  },

  postsList: {
    padding: wp(4),
    paddingBottom: hp(10),
  },

  postsListEmpty: {
    flex: 1,
    justifyContent: 'center',
  },

  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(2),
    gap: wp(2),
  },

  loadingText: {
    fontSize: hp(1.6),
    color: theme.colors.textLight,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(8),
    gap: hp(2),
  },

  emptyIconContainer: {
    width: hp(12),
    height: hp(12),
    borderRadius: hp(6),
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(1),
  },

  emptyText: {
    fontSize: hp(2),
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: hp(0.5),
  },

  emptySubText: {
    fontSize: hp(1.6),
    color: '#999',
    textAlign: 'center',
    lineHeight: hp(2.2),
  },
});

export default ManagePostScr;