import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert, StatusBar, FlatList, Pressable } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import MyHeader from '../../components/MyHeader';
import MyInput from '../../components/MyInput';
import MyButton from '../../components/MyButton';
import MyTableItem from '../../components/MyTableItem';
import { fetchTable } from '../../services/tableService';
import { hp, wp } from '../../helper/common';
import { theme } from '../../constants/theme';
import * as Icon from 'react-native-feather';

import DateTimePicker from '@react-native-community/datetimepicker';
import { TouchableOpacity } from 'react-native';
import { fetchBill, fetchBillByTimeRange } from '../../services/billService';


const AssignTableScr = () => {
  const [tables, setTables] = useState([]); // Danh sách bàn
  const [floors, setFloors] = useState([]); // Danh sách tầng
  const [bills, setBills] = useState([]); // Danh sách hóa đơn

  const [peopleCount, setPeopleCount] = useState(0);
  const [loading, setLoading] = useState(false);
  //
  const today = new Date();

  const [date, setDate] = useState(new Date(today.getTime() + 7 * 60 * 60 * 1000)); // Giờ hiện tại trừ 7 tiếng

  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);



  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const peopleRef = useRef(null);
  const noteRef = useRef(null);



  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setTime(selectedTime);
    }
  };


  // Lấy danh sách bàn từ API và nhóm theo tầng
  const getTables = async () => {
    setLoading(true);
    const res = await fetchTable();
    if (res.success) {
      const sortedTables = res.data.sort((a, b) => a.id - b.id);

      // Nhóm bàn theo tầng
      const groupedFloors = sortedTables.reduce((acc, table) => {
        if (!acc[table.floor]) {
          acc[table.floor] = [];
        }
        acc[table.floor].push(table);
        return acc;
      }, {});

      setTables(sortedTables);
      setFloors(Object.values(groupedFloors)); // Chuyển thành mảng các tầng
    } else {
      Alert.alert('Lỗi', 'Không thể lấy danh sách bàn');
    }
    setLoading(false);
  };

  const getBill = async () => {
    const res = await fetchBillByTimeRange(date, date,time);
    console.log('res:', res);
    if (res.success) {
      setBills(res.data);
      console.log('Danh sách hóa đơn:', res.data);
    } else {
      Alert.alert('Lỗi', 'Không thể lấy danh sách hóa đơn');
    }
  }
  // handle assing
  const handleAssign = async () => {
    const currentTime = new Date();
    const utcPlus7Time = new Date(currentTime.getTime() + 7 * 60 * 60 * 1000);
    setTime(utcPlus7Time);
    console.log('time:', time);
    getBill();

  }


  useEffect(() => {
    console.log('today:', date);

    getTables();

  }, []);

  return (
    <ScreenWrapper bg="white">
      <StatusBar style="dark" />
      <View style={styles.container}>
        <MyHeader title="Đặt bàn" showBackButton={false} />

        {/* Form nhập thông tin */}
        <View style={{ gap: 10 }}>
          <Text>Vui lòng điền thông tin của bạn:</Text>
          <MyInput
            icon={<Icon.Mail stroke={theme.colors.dark} strokeWidth={2} width={26} height={26} />}
            placeholder="Tên của bạn..."
            onChangeText={(value) => (emailRef.current = value)}
          />
          <MyInput
            icon={<Icon.Lock stroke={theme.colors.dark} strokeWidth={2} width={26} height={26} />}
            placeholder="Số điện thoại..."
            onChangeText={(value) => (passwordRef.current = value)}
          />
          //
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity
              style={styles.dateTime}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon.Calendar stroke={theme.colors.dark} strokeWidth={2} width={26} height={26} />
                <Text >
                  {date.toLocaleDateString() + ""}
                </Text>
              </View>
            </TouchableOpacity>
            //
            <TouchableOpacity
              style={styles.dateTime}
              onPress={() => setShowTimePicker(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon.Clock stroke={theme.colors.dark} strokeWidth={2} width={26} height={26} />
                <Text >
                  {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ""}
                </Text>
              </View>
            </TouchableOpacity>
            <MyInput
              containerStyle={{ width: wp(30) }}
              icon={<Icon.Lock stroke={theme.colors.dark} strokeWidth={2} width={26} height={26} />}
              keyboardType="numeric"
              value={peopleCount.toString()} // Chuyển đổi số thành chuỗi
              onChangeText={(value) => {
                // Chuyển đổi giá trị thành số và cập nhật state
                const numValue = parseInt(value) || 0;
                setPeopleCount(numValue);
                // Đồng thời cập nhật vào ref nếu bạn cần sử dụng ref
                if (peopleRef && peopleRef.current) {
                  peopleRef.current = numValue;
                }
              }}
            />

          </View>
          {showDatePicker && (
            <DateTimePicker
              testID="datePicker"
              value={date}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              testID="timePicker"
              value={time}
              mode="time"
              display="default"
              onChange={handleTimeChange}
              minuteInterval={30}
            />
          )}


          <MyInput
            containerStyle={{ height: hp(10) }}
            placeholder="Ghi chú..."
            onChangeText={(value) => (passwordRef.current = value)}
          />
        </View>
        {/* Danh sách bàn */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScrollView}
        >
          {floors.map((tables, index) => (
            <View key={index} style={styles.verticalScrollView}>
              <Text style={styles.floorText}>Tầng {index + 1}</Text>
              <FlatList
                data={tables}
                keyExtractor={(item) => item.id.toString()}
                numColumns={3} // Số cột trong lưới
                renderItem={({ item }) => <MyTableItem item={item} />}
                contentContainerStyle={styles.tableContainer}
                showsVerticalScrollIndicator={false}
              />
            </View>
          ))}
        </ScrollView>
        {/* Nút đặt bàn */}
        <MyButton title="Đặt bàn" loading={loading} onPress={handleAssign} />
      </View>
    </ScreenWrapper>
  );
};

export default AssignTableScr;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 5,
    paddingHorizontal: wp(2),
    paddingTop: wp(2),
    paddingBottom: hp(1),
  },
  horizontalScrollView: {
    flex: 1,
    height: hp(20), // Chiều cao của ScrollView ngang

  },
  verticalScrollView: {
    flex: 1,
    width: wp(95), // Chiều rộng bằng 100% màn hình
    paddingHorizontal: wp(2),
  },
  floorText: {
    fontSize: hp(2),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableContainer: {
    justifyContent: 'center', // Căn giữa các bàn
    paddingBottom: 20, // Khoảng cách dưới cùng
  },
  dateTime: {
    backgroundColor: theme.colors.light,
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
  },
});