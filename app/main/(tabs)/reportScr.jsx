import { Alert, Dimensions, FlatList, Pressable, StyleSheet, Text, View, RefreshControl, ScrollView } from 'react-native'
import React, { useEffect, useState } from 'react'
import ScreenWrapper from '../../../components/ScreenWrapper'
import { hp, wp } from '../../../helper/common'
import { theme } from '../../../constants/theme'
import MyBackButton from '../../../components/MyBackButton'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import DateTimePicker from '@react-native-community/datetimepicker'

// CHART KIT - TỐI ƯU NHẤT CHO EXPO
import { LineChart } from 'react-native-chart-kit'

// Services
import {
  getBillsByReportType,
  calculateAllStats,
  formatDateRange,
  subscribeToBills
} from '../../../services/billService'

const { width: screenWidth } = Dimensions.get('window');

const reportScr = () => {
  // ===================
  // STATES
  // ===================
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reportType, setReportType] = useState('daily');
  const [stats, setStats] = useState({});
  const [chartData, setChartData] = useState(null);

  // ===================
  // EFFECTS
  // ===================
  useEffect(() => {
    loadBillsData();
  }, [selectedDate, reportType]);

  useEffect(() => {
    const cleanup = subscribeToBills((payload) => {
      // console.log('📊 Bills changed, refreshing report...');
      loadBillsData();
    });
    return cleanup;
  }, [reportType, selectedDate]);

  useEffect(() => {
    const newChartData = generateChartData();
    setChartData(newChartData);
  }, [bills, reportType, selectedDate]);

  // ===================
  // DATA LOADING
  // ===================
  const loadBillsData = async () => {
    setLoading(true);
    try {
      // console.log(`Loading ${reportType} report for ${selectedDate.toDateString()}`);

      const result = await getBillsByReportType(reportType, selectedDate);

      if (result.success) {
        setBills(result.data);
        const calculatedStats = calculateAllStats(result.data);
        setStats(calculatedStats);
        // console.log(`Report loaded: ${result.data.length} bills`);
      } else {
        console.error('Error loading report:', result.msg);
        Alert.alert('Lỗi', result.msg || 'Không thể tải dữ liệu báo cáo');
      }
    } catch (error) {
      console.error('Unexpected error loading report:', error);
      Alert.alert('Lỗi', 'Lỗi không xác định khi tải báo cáo');
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBillsData();
    setRefreshing(false);
  };

  // ===================
  // DATE HANDLING
  // ===================
  const onDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const getFormattedDateRange = () => {
    try {
      return formatDateRange(reportType, selectedDate);
    } catch (error) {
      console.error('❌ Error formatting date range:', error);
      return selectedDate.toLocaleDateString('vi-VN');
    }
  };

  // ===================
  // SAFE HELPER FUNCTIONS
  // ===================
  const safeToString = (value, fallback = '') => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value;
    try {
      return String(value);
    } catch (error) {
      console.error('Error converting to string:', error);
      return fallback;
    }
  };

  const safeToNumber = (value, fallback = 0) => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'number' && !isNaN(value)) return value;
    try {
      const num = Number(value);
      return isNaN(num) ? fallback : num;
    } catch (error) {
      console.error('Error converting to number:', error);
      return fallback;
    }
  };

  const safePercentage = (numerator, denominator) => {
    const num = safeToNumber(numerator, 0);
    const den = safeToNumber(denominator, 1);
    if (den === 0) return 0;
    const result = (num / den) * 100;
    return isNaN(result) ? 0 : Math.max(0, Math.min(100, result));
  };

  // ===================
  // BIỂU ĐỒ FUNCTIONS - CHART KIT
  // ===================
  const generateChartData = () => {
    if (!bills || bills.length === 0) {
      return null;
    }

    switch (reportType) {
      case 'yearly':
        return generateYearlyChartData();
      case 'monthly':
        return generateMonthlyChartData();
      case 'weekly':
        return generateWeeklyChartData();
      case 'daily':
        return generateDailyChartData();
      default:
        return null;
    }
  };

  // NGÀY: Hiển thị các khung giờ trong ngày (6h-22h)
  const generateDailyChartData = () => {
    const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6h-22h
    const hourLabels = hours.map(h => `${h}h`);
    const hourData = hours.map(hour => {
      const revenue = bills
        .filter(bill => {
          if (!bill.created_at || bill.state !== 'completed') return false;
          const billDate = new Date(bill.created_at);
          return (
            billDate.getHours() === hour &&
            billDate.toDateString() === selectedDate.toDateString()
          );
        })
        .reduce((sum, bill) => sum + safeToNumber(bill.price, 0), 0);
      return revenue / 1000; // Nghìn VNĐ
    });

    return {
      labels: hourLabels,
      datasets: [{ data: hourData.map(v => Math.max(1, v)) }],
      fullData: hourData.map((revenue, index) => ({
        hour: hours[index],
        label: hourLabels[index],
        fullLabel: `${hours[index]}:00 - ${hours[index] + 1}:00`,
        revenue,
        fullRevenue: revenue * 1000,
        billCount: bills.filter(bill => {
          if (!bill.created_at) return false;
          const billDate = new Date(bill.created_at);
          return (
            billDate.getHours() === hours[index] &&
            billDate.toDateString() === selectedDate.toDateString()
          );
        }).length
      })),
      maxRevenue: Math.max(...hourData),
      totalRevenue: hourData.reduce((sum, v) => sum + v, 0) * 1000,
      unit: 'nghìn VNĐ',
      unitShort: 'K',
      period: 'theo giờ',
    };
  };

  // TUẦN: Hiển thị 7 ngày trong tuần
  const generateWeeklyChartData = () => {
    const weekStart = new Date(selectedDate);
    weekStart.setDate(selectedDate.getDate() - selectedDate.getDay()); // Chủ nhật đầu tuần

    const daysData = [];
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);

      const dayRevenue = bills
        .filter(bill => {
          if (!bill.created_at || bill.state !== 'completed') return false;
          const billDate = new Date(bill.created_at);
          return billDate.toDateString() === date.toDateString();
        })
        .reduce((sum, bill) => sum + safeToNumber(bill.price, 0), 0);

      const dayCount = bills
        .filter(bill => {
          if (!bill.created_at) return false;
          const billDate = new Date(bill.created_at);
          return billDate.toDateString() === date.toDateString();
        }).length;

      daysData.push({
        date: new Date(date),
        label: dayNames[i],
        fullLabel: `${dayNames[i]} (${date.getDate()}/${date.getMonth() + 1})`,
        revenue: dayRevenue / 1000, // Nghìn VNĐ
        fullRevenue: dayRevenue,
        billCount: dayCount
      });
    }

    return {
      labels: daysData.map(item => item.label),
      datasets: [{ data: daysData.map(item => Math.max(1, item.revenue)) }],
      fullData: daysData,
      maxRevenue: Math.max(...daysData.map(item => item.revenue)),
      totalRevenue: daysData.reduce((sum, item) => sum + item.fullRevenue, 0),
      unit: 'nghìn VNĐ',
      unitShort: 'K',
      period: 'tuần này'
    };
  };

  // THÁNG: Hiển thị các ngày trong tháng (1-31)
  const generateMonthlyChartData = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dayLabels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
    const dayData = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const revenue = bills
        .filter(bill => {
          if (!bill.created_at || bill.state !== 'completed') return false;
          const billDate = new Date(bill.created_at);
          return (
            billDate.getFullYear() === year &&
            billDate.getMonth() === month &&
            billDate.getDate() === day
          );
        })
        .reduce((sum, bill) => sum + safeToNumber(bill.price, 0), 0);

      const billCount = bills
        .filter(bill => {
          if (!bill.created_at) return false;
          const billDate = new Date(bill.created_at);
          return (
            billDate.getFullYear() === year &&
            billDate.getMonth() === month &&
            billDate.getDate() === day
          );
        }).length;

      return {
        day,
        label: `${day}`,
        fullLabel: `${day}/${month + 1}/${year}`,
        revenue: revenue / 1000, // Nghìn VNĐ
        fullRevenue: revenue,
        billCount
      };
    });

    return {
      labels: dayLabels,
      datasets: [{ data: dayData.map(item => Math.max(1, item.revenue)) }],
      fullData: dayData,
      maxRevenue: Math.max(...dayData.map(item => item.revenue)),
      totalRevenue: dayData.reduce((sum, item) => sum + item.fullRevenue, 0),
      unit: 'nghìn VNĐ',
      unitShort: 'K',
      period: `tháng ${month + 1}/${year}`
    };
  };

  // NĂM: Hiển thị 12 tháng trong năm
  const generateYearlyChartData = () => {
    const year = selectedDate.getFullYear();
    const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

    const monthsData = [];

    for (let month = 0; month < 12; month++) {
      const monthRevenue = bills
        .filter(bill => {
          if (!bill.created_at || bill.state !== 'completed') return false;
          const billDate = new Date(bill.created_at);
          return (
            billDate.getFullYear() === year &&
            billDate.getMonth() === month
          );
        })
        .reduce((sum, bill) => sum + safeToNumber(bill.price, 0), 0);

      const monthCount = bills
        .filter(bill => {
          if (!bill.created_at) return false;
          const billDate = new Date(bill.created_at);
          return (
            billDate.getFullYear() === year &&
            billDate.getMonth() === month
          );
        }).length;

      monthsData.push({
        month: month + 1,
        label: monthNames[month],
        fullLabel: `Tháng ${month + 1}/${year}`,
        revenue: monthRevenue / 1000, // Nghìn VNĐ (không phải triệu)
        fullRevenue: monthRevenue,
        billCount: monthCount
      });
    }

    return {
      labels: monthsData.map(item => item.label),
      datasets: [{ data: monthsData.map(item => Math.max(1, item.revenue)) }],
      fullData: monthsData,
      maxRevenue: Math.max(...monthsData.map(item => item.revenue)),
      totalRevenue: monthsData.reduce((sum, item) => sum + item.fullRevenue, 0),
      unit: 'nghìn VNĐ', // Thay đổi từ triệu về nghìn
      unitShort: 'K', // Thay đổi từ M về K
      period: `năm ${year}`
    };
  };

  // ===================
  // RENDER COMPONENTS
  // ===================
  const renderReportTypeSelector = () => (
    <View style={styles.reportTypeSelector}>
      {[
        { key: 'daily', label: 'Ngày', icon: 'today' },
        { key: 'weekly', label: 'Tuần', icon: 'date-range' },
        { key: 'monthly', label: 'Tháng', icon: 'calendar-month' },
        { key: 'yearly', label: 'Năm', icon: 'calendar-view-month' }
      ].map(typeOption => (
        <Pressable
          key={typeOption.key}
          style={[
            styles.reportTypeButton,
            reportType === typeOption.key && styles.reportTypeButtonActive
          ]}
          onPress={() => setReportType(typeOption.key)}
        >
          <MaterialIcons
            name={typeOption.icon}
            size={18}
            color={reportType === typeOption.key ? 'white' : theme.colors.text}
          />
          <Text style={[
            styles.reportTypeText,
            reportType === typeOption.key && styles.reportTypeTextActive
          ]}>
            {safeToString(typeOption.label)}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const renderDateSelector = () => (
    <View style={styles.dateSelector}>
      <Pressable style={styles.dateSelectorButton} onPress={() => setShowDatePicker(true)}>
        <MaterialIcons name="calendar-today" size={20} color={theme.colors.primary} />
        <Text style={styles.dateSelectorText}>{getFormattedDateRange()}</Text>
        <MaterialIcons name="keyboard-arrow-down" size={20} color={theme.colors.textLight} />
      </Pressable>
    </View>
  );

  const renderStatsCard = (title, value, subtitle, icon, color = theme.colors.primary) => {
    const safeTitle = safeToString(title);
    const safeValue = safeToString(value);
    const safeSubtitle = safeToString(subtitle);
    const safeIcon = safeToString(icon, 'help');
    const safeColor = safeToString(color, theme.colors.primary);

    return (
      <View style={styles.statsCard}>
        <View style={[styles.statsIcon, { backgroundColor: safeColor }]}>
          <MaterialIcons name={safeIcon} size={24} color="white" />
        </View>
        <View style={styles.statsContent}>
          <Text style={styles.statsTitle}>{safeTitle}</Text>
          <Text style={[styles.statsValue, { color: safeColor }]}>{safeValue}</Text>
          {safeSubtitle.length > 0 && (
            <Text style={styles.statsSubtitle}>{safeSubtitle}</Text>
          )}
        </View>
      </View>
    );
  };

  const renderOverviewStats = () => {
    const totalBills = safeToNumber(stats.totalBills, 0);
    const completedBills = safeToNumber(stats.completedBills, 0);
    const cancelledBills = safeToNumber(stats.cancelledBills, 0);
    const inOrderBills = safeToNumber(stats.inOrderBills, 0);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Tổng quan</Text>
        <View style={styles.statsGrid}>
          {renderStatsCard(
            'Tổng đơn',
            totalBills,
            'Tất cả đơn hàng',
            'receipt',
            '#3498db'
          )}
          {renderStatsCard(
            'Hoàn thành',
            completedBills,
            `${safePercentage(completedBills, totalBills).toFixed(1)}%`,
            'check-circle',
            '#2ecc71'
          )}
          {renderStatsCard(
            'Hủy bỏ',
            cancelledBills,
            `${safePercentage(cancelledBills, totalBills).toFixed(1)}%`,
            'cancel',
            '#e74c3c'
          )}
          {renderStatsCard(
            'Đang xử lý',
            inOrderBills,
            `${safePercentage(inOrderBills, totalBills).toFixed(1)}%`,
            'hourglass-empty',
            '#f39c12'
          )}
        </View>
      </View>
    );
  };

  const renderRevenueStats = () => {
    const totalRevenue = safeToNumber(stats.totalRevenue, 0);
    const avgOrderValue = safeToNumber(stats.avgOrderValue, 0);
    const totalCustomers = safeToNumber(stats.totalCustomers, 0);
    const avgPartySize = safeToNumber(stats.avgPartySize, 0);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Doanh thu</Text>
        <View style={styles.statsGrid}>
          {renderStatsCard(
            'Tổng doanh thu',
            `${totalRevenue.toLocaleString('vi-VN')} đ`,
            'Từ đơn hoàn thành',
            'attach-money',
            '#27ae60'
          )}
          {renderStatsCard(
            'Giá trị TB/đơn',
            `${avgOrderValue.toLocaleString('vi-VN')} đ`,
            'Trung bình mỗi đơn',
            'trending-up',
            '#16a085'
          )}
          {renderStatsCard(
            'Tổng khách',
            totalCustomers,
            'Số người đã phục vụ',
            'people',
            '#9b59b6'
          )}
          {renderStatsCard(
            'TB người/bàn',
            avgPartySize.toFixed(1),
            'Trung bình mỗi bàn',
            'group',
            '#8e44ad'
          )}
        </View>
      </View>
    );
  };

  // ===================
  // BIỂU ĐỒ CHART KIT
  // ===================
  const renderRevenueChart = () => {
    if (!chartData || chartData.fullData.length === 0) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Biểu đồ doanh thu</Text>
          <View style={styles.emptyChartState}>
            <MaterialIcons name="show-chart" size={60} color={theme.colors.textLight} />
            <Text style={styles.emptyStateText}>Không có dữ liệu doanh thu</Text>
            <Text style={styles.emptyStateSubtext}>để hiển thị biểu đồ</Text>
          </View>
        </View>
      );
    }

    const hasData = chartData.fullData.some(item => item.fullRevenue > 0);
    if (!hasData) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Biểu đồ doanh thu</Text>
          <View style={styles.emptyChartState}>
            <MaterialIcons name="show-chart" size={60} color={theme.colors.textLight} />
            <Text style={styles.emptyStateText}>Chưa có doanh thu</Text>
            <Text style={styles.emptyStateSubtext}>trong khoảng thời gian này</Text>
          </View>
        </View>
      );
    }

    const avgRevenue = chartData.totalRevenue / chartData.fullData.length;

    // Config cho Chart Kit
    const chartConfig = {
      backgroundColor: '#ffffff',
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#f8f9fa',
      decimalPlaces: 1,
      color: (opacity = 1) => `rgba(39, 174, 96, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: '6',
        strokeWidth: '2',
        stroke: '#27ae60'
      },
      propsForBackgroundLines: {
        strokeDasharray: '',
        stroke: '#e3e3e3',
        strokeWidth: 1
      },
      propsForLabels: {
        fontSize: 12,
        fontWeight: '600'
      },
      fillShadowGradient: '#27ae60',
      fillShadowGradientOpacity: 0.3,
    };

    return (
      <View style={styles.section}>
        <View style={styles.chartHeader}>
          <Text style={styles.sectionTitle}>
            📊 Doanh thu {chartData.period} ({chartData.unit})
          </Text>
        </View>

        <View style={styles.chartContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <LineChart
              data={chartData}
              width={Math.max(screenWidth - wp(8), chartData.labels.length * 60)}
              height={220}
              yAxisSuffix={chartData.unitShort}
              yAxisInterval={1}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              segments={4}
              withDots={true}
              withShadow={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              withInnerLines={true}
              withOuterLines={true}
              withVerticalLines={false}
              withHorizontalLines={true}
            />
          </ScrollView>

          {/* Chart Details */}
          <View style={styles.chartDetails}>
            <View style={styles.chartSummary}>
              <View style={styles.chartSummaryItem}>
                <MaterialIcons name="trending-up" size={16} color="#27ae60" />
                <Text style={styles.chartSummaryLabel}>Tổng doanh thu</Text>
                <Text style={styles.chartSummaryValue}>
                  {chartData.totalRevenue.toLocaleString('vi-VN')} đ
                </Text>
              </View>
              <View style={styles.chartSummaryItem}>
                <MaterialIcons name="assessment" size={16} color="#3498db" />
                <Text style={styles.chartSummaryLabel}>Trung bình/{reportType === 'daily' ? 'giờ' : reportType === 'weekly' ? 'ngày' : reportType === 'monthly' ? 'ngày' : 'tháng'}</Text>
                <Text style={styles.chartSummaryValue}>
                  {avgRevenue.toLocaleString('vi-VN')} đ
                </Text>
              </View>
              <View style={styles.chartSummaryItem}>
                <MaterialIcons name="receipt" size={16} color="#9b59b6" />
                <Text style={styles.chartSummaryLabel}>Tổng đơn hàng</Text>
                <Text style={styles.chartSummaryValue}>
                  {chartData.fullData.reduce((sum, item) => sum + item.billCount, 0)} đơn
                </Text>
              </View>
            </View>

            {/* Peak Period */}
            {(() => {
              const peakPeriod = chartData.fullData.reduce((max, current) =>
                current.fullRevenue > max.fullRevenue ? current : max
              );

              return peakPeriod.fullRevenue > 0 ? (
                <View style={styles.peakPeriodCard}>
                  <MaterialIcons name="star" size={20} color="#f39c12" />
                  <View style={styles.peakPeriodContent}>
                    <Text style={styles.peakPeriodTitle}>🏆 Cao điểm</Text>
                    <Text style={styles.peakPeriodValue}>
                      {peakPeriod.fullLabel}: {peakPeriod.fullRevenue.toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                </View>
              ) : null;
            })()}
          </View>
        </View>
      </View>
    );
  };

  // ... (giữ nguyên các render functions khác như renderVisitStats, renderTimeAnalysis, renderBillItem)

  const renderVisitStats = () => {
    const checkedInBills = safeToNumber(stats.checkedInBills, 0);
    const noShowBills = safeToNumber(stats.noShowBills, 0);
    const checkInRate = safeToNumber(stats.checkInRate, 0);
    const noShowRate = safeToNumber(stats.noShowRate, 0);

    // THÊM DÒNG NÀY - Tính tổng số khách đã đến và không đến
    const totalVisitedGuests = bills
      .filter(bill => bill.visit === 'visited' || bill.visit === 'in_process')
      .reduce((sum, bill) => sum + safeToNumber(bill.num_people, 0), 0);

    const totalNoShowGuests = bills
      .filter(bill => bill.visit === 'unvisited')
      .reduce((sum, bill) => sum + safeToNumber(bill.num_people, 0), 0);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👥 Tỷ lệ khách đến</Text>
        <View style={styles.statsGrid}>
          {renderStatsCard(
            'Đã đến',
            checkedInBills,
            `${totalVisitedGuests} khách đã đến`,
            'login',
            '#3498db'
          )}
          {renderStatsCard(
            'Không đến',
            noShowBills,
            `${totalNoShowGuests} khách không đến`,
            'person-off',
            '#e67e22'
          )}
          {renderStatsCard(
            'Tỷ lệ đến',
            `${checkInRate.toFixed(1)}%`,
            `${noShowRate.toFixed(1)}% không đến`,
            'pie-chart',
            '#9b59b6'
          )}
          {/* THÊM CARD MỚI - Tổng khách */}
          {renderStatsCard(
            'Tổng khách',
            totalVisitedGuests + totalNoShowGuests,
            `${totalVisitedGuests} đến + ${totalNoShowGuests} không đến`,
            'groups',
            '#34495e'
          )}
        </View>
      </View>
    );
  };

  const getTimeSlotColor = (slot) => {
    const safeSlot = safeToString(slot);
    const colors = {
      morning: '#f39c12',
      lunch: '#e74c3c',
      afternoon: '#3498db',
      dinner: '#9b59b6',
      night: '#34495e'
    };
    return colors[safeSlot] || '#95a5a6';
  };

  const renderTimeAnalysis = () => {
    if (!stats || !stats.timeSlots || typeof stats.timeSlots !== 'object') {
      return null;
    }

    const timeSlotLabels = {
      morning: '🌅 Sáng (6-11h)',
      lunch: '🍽️ Trưa (11-14h)',
      afternoon: '☀️ Chiều (14-17h)',
      dinner: '🌃 Tối (17-22h)',
      night: '🌙 Đêm (22-6h)'
    };

    const peakTimeData = stats.peakTime || {};
    const peakTimeSlot = safeToString(peakTimeData.time, '');
    const peakTimeLabel = timeSlotLabels[peakTimeSlot] || 'Chưa có dữ liệu';
    const peakTimeCount = safeToNumber(peakTimeData.count, 0);

    const totalBills = safeToNumber(stats.totalBills, 1);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⏰ Phân tích thời gian</Text>

        <View style={styles.peakTimeCard}>
          <MaterialIcons name="trending-up" size={24} color="#f39c12" />
          <View style={styles.peakTimeContent}>
            <Text style={styles.peakTimeTitle}>Giờ cao điểm</Text>
            <Text style={styles.peakTimeValue}>
              {`${peakTimeLabel} - ${peakTimeCount} đơn`}
            </Text>
          </View>
        </View>

        <View style={styles.timeSlotsList}>
          {Object.entries(stats.timeSlots).map(([slot, count], index) => {
            const safeSlot = safeToString(slot, `slot_${index}`);
            const safeCount = safeToNumber(count, 0);
            const percentage = safePercentage(safeCount, totalBills);
            const slotLabel = timeSlotLabels[safeSlot] || `❓ ${safeSlot}`;

            return (
              <View key={`timeslot-${safeSlot}-${index}`} style={styles.timeSlotItem}>
                <Text style={styles.timeSlotLabel}>{safeToString(slotLabel)}</Text>
                <View style={styles.timeSlotBar}>
                  <View
                    style={[
                      styles.timeSlotProgress,
                      {
                        width: `${percentage.toFixed(1)}%`,
                        backgroundColor: getTimeSlotColor(safeSlot)
                      }
                    ]}
                  />
                </View>
                <Text style={styles.timeSlotValue}>{safeToString(safeCount)}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderBillItem = (bill) => {
    if (!bill || typeof bill !== 'object') {
      return <View key="empty-bill" />;
    }

    const statusConfig = {
      completed: { icon: 'check-circle', color: '#2ecc71', label: 'Hoàn thành' },
      cancelled: { icon: 'cancel', color: '#e74c3c', label: 'Đã hủy' },
      in_order: { icon: 'hourglass-empty', color: '#f39c12', label: 'Đang xử lý' }
    };

    const visitConfig = {
      visited: { icon: 'check', color: '#2ecc71', label: 'Đã đến' },
      in_process: { icon: 'access-time', color: '#f39c12', label: 'Đang phục vụ' },
      un_visited: { icon: 'schedule', color: '#95a5a6', label: 'Chưa đến' }
    };

    const billState = safeToString(bill.state, 'in_order');
    const billVisit = safeToString(bill.visit, 'un_visited');
    const status = statusConfig[billState] || statusConfig.in_order;
    const visit = visitConfig[billVisit] || visitConfig.un_visited;

    const safeBillId = safeToString(bill.id, 'N/A');
    const safeBillName = safeToString(bill.name, 'Khách hàng');
    const safeNumPeople = safeToNumber(bill.num_people, 0);
    const safePrice = safeToNumber(bill.price, 0);
    const safeNote = safeToString(bill.note, '');

    let formattedDate = 'Không có thông tin thời gian';
    try {
      const dateToFormat = bill.time || bill.created_at;
      if (dateToFormat) {
        const date = new Date(dateToFormat);
        if (!isNaN(date.getTime())) {
          formattedDate = date.toLocaleString('vi-VN');
        }
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      formattedDate = 'Lỗi định dạng ngày';
    }

    return (
      <View style={styles.billItem}>
        <View style={styles.billHeader}>
          <View style={styles.billInfo}>
            <Text style={styles.billId}>#{safeBillId}</Text>
            <Text style={styles.billName}>{safeBillName}</Text>
          </View>
          <View style={styles.billStatus}>
            <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
              <MaterialIcons name={status.icon} size={12} color="white" />
              <Text style={styles.statusText}>{safeToString(status.label)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.billDetails}>
          <View style={styles.billDetailRow}>
            <MaterialIcons name="access-time" size={16} color={theme.colors.textLight} />
            <Text style={styles.billDetailText}>{formattedDate}</Text>
          </View>

          <View style={styles.billDetailRow}>
            <MaterialIcons name="people" size={16} color={theme.colors.textLight} />
            <Text style={styles.billDetailText}>{safeToString(safeNumPeople)} người</Text>
          </View>

          <View style={styles.billDetailRow}>
            <MaterialIcons name={visit.icon} size={16} color={visit.color} />
            <Text style={[styles.billDetailText, { color: visit.color }]}>
              {safeToString(visit.label)}
            </Text>
          </View>

          {safePrice > 0 && (
            <View style={styles.billDetailRow}>
              <MaterialIcons name="attach-money" size={16} color="#27ae60" />
              <Text style={[styles.billDetailText, { color: '#27ae60', fontWeight: '600' }]}>
                {safePrice.toLocaleString('vi-VN')} đ
              </Text>
            </View>
          )}

          {safeNote.trim().length > 0 && (
            <View style={styles.billDetailRow}>
              <MaterialIcons name="note" size={16} color={theme.colors.textLight} />
              <Text style={styles.billDetailText} numberOfLines={2}>
                {safeNote.trim()}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ===================
  // RENDER ALL DATA
  // ===================
  const renderAllReportData = () => {
    const safeBills = Array.isArray(bills) ? bills : [];

    const reportSections = [
      { type: 'overview', id: 'overview' },
      { type: 'revenue', id: 'revenue' },
      { type: 'chart', id: 'chart' },
      { type: 'visit', id: 'visit' },
      { type: 'time', id: 'time' },
      { type: 'bills_header', id: 'bills_header' },
      ...safeBills.map((bill, index) => ({
        type: 'bill',
        data: bill,
        id: `bill-${safeToString(bill?.id, index)}-${index}`
      }))
    ];

    const renderSection = ({ item, index }) => {
      if (!item || typeof item !== 'object') {
        return <View key={`empty-section-${index}`} />;
      }

      const sectionType = safeToString(item.type, 'unknown');

      switch (sectionType) {
        case 'overview':
          return renderOverviewStats();
        case 'revenue':
          return renderRevenueStats();
        case 'chart':
          return renderRevenueChart();
        case 'visit':
          return renderVisitStats();
        case 'time':
          return renderTimeAnalysis();
        case 'bills_header':
          return (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📝 Chi tiết đơn hàng</Text>
                <Text style={styles.billsCount}>
                  {safeToString(safeBills.length)} đơn
                </Text>
              </View>
              {safeBills.length === 0 && (
                <View style={styles.emptyState}>
                  <MaterialIcons name="receipt-long" size={60} color={theme.colors.textLight} />
                  <Text style={styles.emptyStateText}>Không có đơn hàng nào</Text>
                  <Text style={styles.emptyStateSubtext}>trong khoảng thời gian này</Text>
                </View>
              )}
            </View>
          );
        case 'bill':
          return renderBillItem(item.data);
        default:
          return <View key={`unknown-section-${index}`} />;
      }
    };

    return (
      <FlatList
        data={reportSections}
        renderItem={renderSection}
        keyExtractor={(item, index) => {
          if (!item) return `empty-${index}`;
          return safeToString(item.id, `section-${index}`);
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
        contentContainerStyle={styles.reportContentList}
        removeClippedSubviews={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    );
  };

  // ===================
  // MAIN RENDER
  // ===================
  if (loading) {
    return (
      <ScreenWrapper bg={'#FFBF00'}>
        <View style={[styles.container, styles.center]}>
          <MaterialIcons name="assessment" size={60} color={theme.colors.text} />
          <Text style={styles.loadingText}>Đang tạo báo cáo...</Text>
          <Text style={styles.loadingSubText}>{getFormattedDateRange()}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper bg={'#FFBF00'}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <MyBackButton />
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Báo cáo</Text>
            <Text style={styles.subtitle}>Thống kê kinh doanh</Text>
          </View>
          <View style={styles.headerButtons}>
            <Pressable style={styles.actionButton} onPress={onRefresh}>
              <MaterialIcons name="refresh" size={24} color={theme.colors.text} />
            </Pressable>
          </View>
        </View>

        {/* Report Controls */}
        {renderReportTypeSelector()}
        {renderDateSelector()}

        {/* Report Content */}
        {renderAllReportData()}

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}
      </View>
    </ScreenWrapper>
  );
};

export default reportScr;

// ===================
// STYLES - CHART KIT OPTIMIZED
// ===================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: hp(1.4),
    color: theme.colors.textLight,
    marginTop: 2,
  },
  loadingSubText: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginTop: 5,
    textAlign: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  reportTypeSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reportTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  reportTypeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  reportTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  reportTypeTextActive: {
    color: 'white',
  },
  dateSelector: {
    marginBottom: 15,
  },
  dateSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateSelectorText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  reportContentList: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  billsCount: {
    fontSize: 14,
    color: theme.colors.textLight,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    width: (screenWidth - wp(8) - 10) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statsContent: {
    flex: 1,
  },
  statsTitle: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginBottom: 2,
  },
  statsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statsSubtitle: {
    fontSize: 10,
    color: theme.colors.textLight,
  },

  // ===================
  // CHART KIT STYLES - ỔN ĐỊNH
  // ===================
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartDetails: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  chartSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  chartSummaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  chartSummaryLabel: {
    fontSize: 10,
    color: theme.colors.textLight,
    marginTop: 4,
    marginBottom: 2,
    textAlign: 'center',
  },
  chartSummaryValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  peakPeriodCard: {
    flexDirection: 'row',
    backgroundColor: '#fff8e1',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
  },
  peakPeriodContent: {
    marginLeft: 10,
    flex: 1,
  },
  peakPeriodTitle: {
    fontSize: 12,
    color: '#f39c12',
    fontWeight: '600',
    marginBottom: 2,
  },
  peakPeriodValue: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
  },
  emptyChartState: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // ===================
  // TIME ANALYSIS STYLES
  // ===================
  peakTimeCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  peakTimeContent: {
    marginLeft: 12,
  },
  peakTimeTitle: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 2,
  },
  peakTimeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  timeSlotsList: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timeSlotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeSlotLabel: {
    width: 120,
    fontSize: 12,
    color: theme.colors.text,
  },
  timeSlotBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginHorizontal: 10,
  },
  timeSlotProgress: {
    height: '100%',
    borderRadius: 4,
  },
  timeSlotValue: {
    width: 30,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },

  // ===================
  // BILL ITEM STYLES
  // ===================
  billItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  billInfo: {
    flex: 1,
  },
  billId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  billName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  billStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  billDetails: {
    gap: 6,
  },
  billDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  billDetailText: {
    fontSize: 13,
    color: theme.colors.text,
    flex: 1,
  },

  // ===================
  // EMPTY STATES
  // ===================
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textLight,
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginTop: 5,
  },
  loadingText: {
    fontSize: 18,
    color: theme.colors.text,
    fontWeight: '600',
    marginTop: 15,
  },
});