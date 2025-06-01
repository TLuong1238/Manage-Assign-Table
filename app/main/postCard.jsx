import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { Image } from 'expo-image';
import { Video } from 'expo-av';
import moment from 'moment';
import RenderHtml from 'react-native-render-html';
import * as Icon from 'react-native-feather';

import { theme } from '../../constants/theme';
import { hp, wp } from '../../helper/common';
import { getSupabaseFileUrl } from '../../services/imageService';
import MyAvatar from '../../components/MyAvatar';

const PostCard = ({
  item,
  currentUser,
  onApprove,
  onReject,
  onDelete,
  showActions = true,
  showApprovalActions = true,
  router
}) => {
  console.log(currentUser, 'currentUser in PostCard');
  // ================= STATES =================
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  // ================= COMPUTED VALUES =================
  const postState = item?.state?.toLowerCase() || 'unknown';
  const shouldShowApprovalActions = showApprovalActions;
  const shouldShowManagementActions = showActions;

  // ✅ Define states clearly
  const isWaitingState = postState === 'wait';
  const isAcceptedState = postState === 'accept';
  const isRejectedState = postState === 'reject';

  // ✅ Debug logs
  console.log('🎯 PostCard Render:', {
    postId: item?.id,
    postState,
    shouldShowApprovalActions,
    shouldShowManagementActions,
    isWaitingState,
    isAcceptedState
  });

  // ================= HELPERS =================
  const getFileUrl = (filePath) => {
    if (!filePath) return null;
    try {
      return getSupabaseFileUrl(filePath);
    } catch (error) {
      console.error('getFileUrl error:', error);
      return null;
    }
  };

  const isVideoFile = (filePath) => {
    if (!filePath || typeof filePath !== 'string') return false;
    const url = getFileUrl(filePath);
    if (!url || typeof url !== 'string') return false;
    return url.toLowerCase().includes('.mp4') ||
      url.toLowerCase().includes('.mov') ||
      url.toLowerCase().includes('.avi') ||
      filePath.toLowerCase().includes('video');
  };

  const getStatusInfo = () => {
    switch (postState) {
      case 'wait':
        return {
          text: 'Chờ duyệt',
          color: '#FF9800',
          bgColor: 'rgba(255, 152, 0, 0.1)',
          icon: 'Clock'
        };
      case 'accept':
        return {
          text: 'Đã duyệt',
          color: '#4CAF50',
          bgColor: 'rgba(76, 175, 80, 0.1)',
          icon: 'CheckCircle'
        };
      case 'reject':
        return {
          text: 'Từ chối',
          color: '#F44336',
          bgColor: 'rgba(244, 67, 54, 0.1)',
          icon: 'XCircle'
        };
      default:
        return {
          text: 'Không xác định',
          color: '#666',
          bgColor: 'rgba(102, 102, 102, 0.1)',
          icon: 'HelpCircle'
        };
    }
  };

  // ================= EVENT HANDLERS =================
  const handleApprove = () => {
    console.log('🟢 Approve clicked:', item?.id);
    if (!isWaitingState) {
      Alert.alert('Thông báo', 'Chỉ có thể duyệt bài viết đang chờ duyệt');
      return;
    }
    setShowApprovalModal(true);
  };

  const handleReject = () => {
    console.log('🔴 Reject clicked:', item?.id);
    if (!isWaitingState) {
      Alert.alert('Thông báo', 'Chỉ có thể từ chối bài viết đang chờ duyệt');
      return;
    }
    setShowRejectionModal(true);
  };

  const confirmApproval = () => {
  console.log('✅ Confirming approval:', item?.id);
  setShowApprovalModal(false);
  onApprove && onApprove(item.id); // ✅ Bỏ note parameter
  setApprovalNote('');
};

  const confirmRejection = () => {
  console.log('❌ Confirming rejection:', item?.id);
  setShowRejectionModal(false);
  onReject && onReject(item.id); // ✅ Bỏ reason parameter
  setRejectionReason('');
};

  const handleDelete = () => {
    console.log('🗑️ Delete clicked:', item?.id);
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa bài viết này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => onDelete && onDelete(item.id)
        }
      ]
    );
  };

  // ================= RENDER COMPONENTS =================
  const renderStatusIcon = (iconName, color) => {
    const IconComponent = Icon[iconName];
    return IconComponent ? (
      <IconComponent stroke={color} width={hp(1.6)} height={hp(1.6)} />
    ) : (
      <Icon.HelpCircle stroke={color} width={hp(1.6)} height={hp(1.6)} />
    );
  };

  // ✅ Simplified approval buttons - Only for waiting posts
  const renderApprovalButtons = () => {
    if (!shouldShowApprovalActions || !isWaitingState) return null;

    return (
      <View style={styles.approvalActions}>
        <Text style={styles.sectionTitle}>Hành động quản trị:</Text>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={handleApprove}
            activeOpacity={0.8}
          >
            <Icon.CheckCircle stroke="white" width={hp(2)} height={hp(2)} />
            <Text style={styles.buttonText}>Duyệt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleReject}
            activeOpacity={0.8}
          >
            <Icon.XCircle stroke="white" width={hp(2)} height={hp(2)} />
            <Text style={styles.buttonText}>Từ chối</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ✅ Simplified management buttons - Only delete for approved posts
  const renderManagementButtons = () => {
    if (!shouldShowManagementActions || !isAcceptedState) return null;

    return (
      <View style={styles.managementActions}>
        <Text style={styles.sectionTitle}>Quản lý bài viết:</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <Icon.Trash2 stroke="white" width={hp(1.8)} height={hp(1.8)} />
            <Text style={styles.buttonText}>Xóa bài viết</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ================= MAIN RENDER =================
  const statusInfo = getStatusInfo();
  const created_at = moment(item?.created_at).fromNow();
  const fileUrl = getFileUrl(item?.file);
  const isVideo = isVideoFile(item?.file);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <MyAvatar
            uri={item?.user?.image}
            size={hp(4.5)}
            rounded={10}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item?.user?.name || 'Unknown User'}</Text>
            <Text style={styles.postTime}>{created_at}</Text>
          </View>
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
          {renderStatusIcon(statusInfo.icon, statusInfo.color)}
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.text}
          </Text>
        </View>
      </View>

      {/* Content */}
      {item?.body && (
        <View style={styles.content}>
          <RenderHtml
            contentWidth={wp(90)}
            source={{ html: item.body }}
            tagsStyles={{
              div: styles.htmlText,
              p: styles.htmlText,
            }}
          />
        </View>
      )}

      {/* Media */}
      {fileUrl && (
        <View style={styles.mediaContainer}>
          {isVideo ? (
            <Video
              source={ fileUrl }
              style={styles.postMedia}
              useNativeControls
              resizeMode="contain"
              shouldPlay={false}
              onLoadStart={() => setIsVideoLoading(true)}
              onLoad={() => setIsVideoLoading(false)}
              onError={(error) => console.log('Video error:', error)}
            />
          ) : (
            <Image
              source={ fileUrl }
              transition={100}
              style={styles.postMedia}
              contentFit="cover"
              onError={(error) => console.log('Image error:', error)}
            />
          )}
        </View>
      )}

      {/* ✅ Approval Actions - Only for waiting posts */}
      {renderApprovalButtons()}

      {/* ✅ Management Actions - Only delete for approved posts */}
      {renderManagementButtons()}

      {/* ✅ Approval Modal */}
      <Modal
        visible={showApprovalModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowApprovalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Icon.CheckCircle stroke="#4CAF50" width={hp(4)} height={hp(4)} />
              <Text style={styles.modalTitle}>Duyệt bài viết</Text>
            </View>

            <Text style={styles.modalDescription}>
              Bạn có chắc chắn muốn duyệt bài viết này?
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Ghi chú duyệt (tùy chọn)"
              value={approvalNote}
              onChangeText={setApprovalNote}
              multiline
              numberOfLines={3}
              maxLength={500}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowApprovalModal(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmApproval}
              >
                <Text style={styles.confirmButtonText}>Duyệt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ✅ Rejection Modal */}
      <Modal
        visible={showRejectionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRejectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Icon.XCircle stroke="#F44336" width={hp(4)} height={hp(4)} />
              <Text style={styles.modalTitle}>Từ chối bài viết</Text>
            </View>

            <Text style={styles.modalDescription}>
              Vui lòng nhập lý do từ chối bài viết này:
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Lý do từ chối (bắt buộc)"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowRejectionModal(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.rejectConfirmButton]}
                onPress={confirmRejection}
              >
                <Text style={styles.confirmButtonText}>Từ chối</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ============= SIMPLIFIED STYLES =============
const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginBottom: hp(2),
    borderRadius: wp(4),
    padding: wp(4),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },

  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    flex: 1,
  },

  userDetails: {
    flex: 1,
  },

  userName: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: theme.colors.dark,
  },

  postTime: {
    fontSize: hp(1.4),
    color: theme.colors.textLight,
    marginTop: hp(0.2),
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.7),
    borderRadius: wp(3),
    gap: wp(1.5),
  },

  statusText: {
    fontSize: hp(1.3),
    fontWeight: '600',
  },

  content: {
    marginBottom: hp(1.5),
  },

  htmlText: {
    fontSize: hp(1.7),
    color: theme.colors.dark,
    lineHeight: hp(2.5),
  },

  mediaContainer: {
    marginBottom: hp(1.5),
    borderRadius: wp(2.5),
    overflow: 'hidden',
  },

  postMedia: {
    width: '100%',
    height: hp(30),
    borderRadius: wp(2.5),
  },

  // ✅ Action Sections
  approvalActions: {
    marginTop: hp(2),
    paddingTop: hp(2),
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },

  managementActions: {
    marginTop: hp(1.5),
    paddingTop: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },

  sectionTitle: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: '#495057',
    marginBottom: hp(1),
  },

  buttonRow: {
    flexDirection: 'row',
    gap: wp(3),
  },

  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3),
    borderRadius: wp(2.5),
    gap: wp(2),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },

  buttonText: {
    color: 'white',
    fontSize: hp(1.6),
    fontWeight: '600',
  },

  // ✅ Button Colors
  approveButton: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
  },

  rejectButton: {
    backgroundColor: '#F44336',
    shadowColor: '#F44336',
  },

  deleteButton: {
    backgroundColor: '#F44336',
    shadowColor: '#F44336',
  },

  // ✅ Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: 'white',
    borderRadius: wp(4),
    padding: wp(6),
    width: wp(90),
    maxHeight: hp(80),
  },

  modalHeader: {
    alignItems: 'center',
    marginBottom: hp(2),
  },

  modalTitle: {
    fontSize: hp(2.2),
    fontWeight: '700',
    color: theme.colors.dark,
    textAlign: 'center',
    marginTop: hp(1),
  },

  modalDescription: {
    fontSize: hp(1.6),
    color: '#666',
    textAlign: 'center',
    marginBottom: hp(2),
    lineHeight: hp(2.2),
  },

  modalInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: wp(2.5),
    padding: wp(3),
    fontSize: hp(1.6),
    color: theme.colors.dark,
    textAlignVertical: 'top',
    marginBottom: hp(3),
    minHeight: hp(10),
    backgroundColor: '#f8f9fa',
  },

  modalActions: {
    flexDirection: 'row',
    gap: wp(3),
  },

  modalButton: {
    flex: 1,
    paddingVertical: hp(1.8),
    borderRadius: wp(2.5),
    alignItems: 'center',
  },

  cancelButton: {
    backgroundColor: '#e9ecef',
  },

  confirmButton: {
    backgroundColor: '#4CAF50',
  },

  rejectConfirmButton: {
    backgroundColor: '#F44336',
  },

  cancelButtonText: {
    color: '#495057',
    fontSize: hp(1.7),
    fontWeight: '600',
  },

  confirmButtonText: {
    color: 'white',
    fontSize: hp(1.7),
    fontWeight: '600',
  },
});

export default PostCard;