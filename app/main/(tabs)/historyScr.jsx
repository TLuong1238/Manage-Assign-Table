import { View, Text, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import { fetchBillByUser, fetchDetailByBillIds, updateBill } from '../../../services/billService';
import { fetchTable, updateTableState } from '../../../services/tableService';
import ScreenWrapper from '../../../components/ScreenWrapper';
import MyHeader from '../../../components/MyHeader';
import { hp, wp } from '../../../helper/common';
import { theme } from '../../../constants/theme';
import * as Icon from 'react-native-feather';
import { useAuth } from '../../../context/AuthContext';

const HistoryScr = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState([]);

  useEffect(() => {
    if (user) {
      fetchUserBills();
      fetchTableData();
    }
  }, [user]);

  const fetchTableData = async () => {
    const tableRes = await fetchTable();
    if (tableRes.success) {
      setTables(tableRes.data);
    }
  };

  const fetchUserBills = async () => {
    setLoading(true);
    try {
      const billRes = await fetchBillByUser(user.id);

      if (billRes.success && billRes.data.length > 0) {
        const sortedBills = billRes.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const billIds = sortedBills.map(bill => bill.id);
        const detailRes = await fetchDetailByBillIds(billIds);

        if (detailRes.success) {
          const billsWithDetails = sortedBills.map(bill => ({
            ...bill,
            details: detailRes.data.filter(detail => detail.billId === bill.id)
          }));

          setBills(billsWithDetails);
        } else {
          setBills(sortedBills);
        }
      } else {
        setBills([]);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lấy dữ liệu đơn đặt bàn');
    }
    setLoading(false);
  };

  const getTableName = (tableId) => {
    const table = tables.find(t => t.id === tableId);
    return table ? `Bàn ${table.id} (Tầng ${table.floor})` : `Bàn ${tableId}`;
  };
  // 
  const handleCancelBill = async (bill) => {
    Alert.alert(
      "Xác nhận hủy đơn",
      "Bạn có chắc chắn muốn hủy đơn này không?",
      [
        { text: "Không", style: "cancel" },
        {
          text: "Hủy đơn",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              // update bill
              const updateRes = await updateBill(bill.id, {
                state: 'cancelled',
                visit: 'un_visitted'
              });

              if (updateRes.success) {
                // update table state to empty
                if (bill.details && bill.details.length > 0) {
                  const tableIds = [...new Set(bill.details.map(detail => detail.tableId))];

                  for (const tableId of tableIds) {
                    await updateTableState(tableId, 'empty');
                  }
                }

                Alert.alert("Thành công", "Đã hủy đơn thành công");
                fetchUserBills(); // Refresh data
              } else {
                Alert.alert("Lỗi", updateRes.msg || "Không thể hủy đơn");
              }
            } catch (error) {
              Alert.alert("Lỗi", "Có lỗi xảy ra khi hủy đơn");
            }
            setLoading(false);
          }
        }
      ]
    );
  };

  const handleArrived = async (bill) => {

    Alert.alert(
      "Xác nhận đã đến",
      "Xác nhận bạn đã đến nhà hàng?",
      [
        { text: "Chưa", style: "cancel" },
        {
          text: "Đã đến",
          onPress: async () => {
            setLoading(true);
            try {
              // Cập nhật bill ngay lập tức
              const updateRes = await updateBill(bill.id, {
                visit: 'visitted'
              });

              if (updateRes.success) {
                Alert.alert("Thành công", "Chúc bạn có bữa ăn ngon miệng!");

                // time out after 1 hour 
                setTimeout(async () => {
                  try {
                    if (bill.details && bill.details.length > 0) {
                      const tableIds = [...new Set(bill.details.map(detail => detail.tableId))];

                      for (const tableId of tableIds) {
                        await updateTableState(tableId, 'empty');
                      }

                      await updateBill(bill.id, {
                        state: 'completed',
                      });

                      console.log(`Đã giải phóng bàn cho bill ${bill.id} sau 1 giờ`);
                    }
                  } catch (error) {
                    console.log('Lỗi khi giải phóng bàn sau 1 giờ:', error);
                  }
                }, 60 * 60 * 1000);

                fetchUserBills();
              } else {
                Alert.alert("Lỗi", updateRes.msg || "Không thể cập nhật trạng thái");
              }
            } catch (error) {
              Alert.alert("Lỗi", "Có lỗi xảy ra khi cập nhật trạng thái");
            }
            setLoading(false);
          }
        }
      ]
    );
  };
  // 
  const getStatusColor = (state) => {
    switch (state) {
      case 'in_order': return theme.colors.primary;
      case 'completed': return 'green';
      case 'cancelled': return 'red';
      default: return theme.colors.textLight;
    }
  };

  const getStatusText = (state) => {
    switch (state) {
      case 'in_order': return 'Đang đặt';
      case 'completed': return 'Hoàn thành';
      case 'cancelled': return 'Đã hủy';
      default: return state;
    }
  };


  const renderBillItem = ({ item, index }) => {
    const checkCanArrive = () => {
      const now = new Date();
      const bookingTime = new Date(item.time);
      const timeDiff = bookingTime.getTime() - now.getTime();
      const minutesDiff = timeDiff / (1000 * 60);

      //allow ten minutes
      return minutesDiff <= 10;
    };

    const getTimeStatus = () => {
      const now = new Date();
      const bookingTime = new Date(item.time);
      const timeDiff = bookingTime.getTime() - now.getTime();
      const minutesDiff = timeDiff / (1000 * 60);

      if (minutesDiff > 10) {
        const hours = Math.floor(minutesDiff / 60);
        const minutes = Math.floor(minutesDiff % 60);
        return `Còn ${hours > 0 ? `${hours}h ` : ''}${minutes}p mới đến giờ`;
      } else if (minutesDiff > 0) {
        return `Còn ${Math.floor(minutesDiff)}p nữa`;
      } else {
        return "Đã đến giờ";
      }
    };

    const canArrive = checkCanArrive();

    return (
      <View style={styles.billCard}>
        <View style={styles.billHeader}>
          <Text style={styles.billId}>Đơn #{bills.length - index}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.state) }]}>
            <Text style={styles.statusText}>{getStatusText(item.state)}</Text>
          </View>
        </View>

        <View style={styles.billInfo}>
          <View style={styles.infoRow}>
            <Icon.User width={16} height={16} color={theme.colors.textLight} />
            <Text style={styles.infoText}>{item.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Icon.Phone width={16} height={16} color={theme.colors.textLight} />
            <Text style={styles.infoText}>{item.phone}</Text>
          </View>

          <View style={styles.infoRow}>
            <Icon.Users width={16} height={16} color={theme.colors.textLight} />
            <Text style={styles.infoText}>{item.num_people} người</Text>
          </View>

          <View style={styles.infoRow}>
            <Icon.Clock width={16} height={16} color={theme.colors.textLight} />
            <Text style={styles.infoText}>
              {new Date(item.time).toLocaleString('vi-VN')}
            </Text>
          </View>

          {/* time for inorder */}
          {item.state === 'in_order' && (
            <View style={styles.infoRow}>
              <Icon.Info width={16} height={16} color={canArrive ? 'green' : 'orange'} />
              <Text style={[styles.infoText, { color: canArrive ? 'green' : 'orange' }]}>
                {getTimeStatus()}
              </Text>
            </View>
          )}

          {item.note && (
            <View style={styles.infoRow}>
              <Icon.FileText width={16} height={16} color={theme.colors.textLight} />
              <Text style={styles.infoText}>{item.note}</Text>
            </View>
          )}
        </View>

        {item.details && item.details.length > 0 && (
          <View style={styles.tablesSection}>
            <Text style={styles.tablesTitle}>Bàn đã đặt:</Text>
            <View style={styles.tablesContainer}>
              {[...new Set(item.details.map(detail => detail.tableId))].map(tableId => (
                <View key={tableId} style={styles.tableChip}>
                  <Text style={styles.tableText}>{getTableName(tableId)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* action button */}
        {item.state === 'in_order' && (
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleCancelBill(item)}
            >
              <Icon.X width={16} height={16} color="white" />
              <Text style={styles.actionButtonText}>Hủy đơn</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                canArrive ? styles.arrivedButton : styles.disabledButton
              ]}
              onPress={canArrive ? () => handleArrived(item) : null}
              disabled={!canArrive}
            >
              <Icon.Check width={16} height={16} color="white" />
              <Text style={styles.actionButtonText}>
                {canArrive ? "Đã đến" : "Chưa đến giờ"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenWrapper bg="#FFBF00">
      <View style={styles.container}>
        <MyHeader title="Lịch sử đặt bàn" showBackButton={false} />

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text>Đang tải...</Text>
          </View>
        ) : bills.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon.Calendar width={50} height={50} color={theme.colors.textLight} />
            <Text style={styles.emptyText}>Bạn chưa có đơn đặt bàn nào</Text>
          </View>
        ) : (
          <FlatList
            data={bills}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderBillItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshing={loading}
            onRefresh={fetchUserBills}
          />
        )}
      </View>
    </ScreenWrapper>
  );
};

export default HistoryScr;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  listContainer: {
    paddingBottom: hp(2),
  },
  billCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: wp(4),
    marginVertical: hp(1),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  billId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.dark,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  billInfo: {
    gap: hp(0.8),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  tablesSection: {
    marginTop: hp(1.5),
    paddingTop: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray,
  },
  tablesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: hp(1),
  },
  tablesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  tableChip: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderRadius: 20,
  },
  tableText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: hp(2),
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  actionSection: {
    flexDirection: 'row',
    gap: wp(3),
    marginTop: hp(1.5),
    paddingTop: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.2),
    borderRadius: 8,
    gap: wp(2),
  },
  cancelButton: {
    backgroundColor: '#ff4757',
  },
  arrivedButton: {
    backgroundColor: '#2ed573',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
});