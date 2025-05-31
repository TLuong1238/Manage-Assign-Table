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
import { useAuth } from '../../context/AuthContext';
import * as Icon from 'react-native-feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Feather from '@expo/vector-icons/Feather';
import SimpleLineIcons from '@expo/vector-icons/SimpleLineIcons';

import DateTimePicker from '@react-native-community/datetimepicker';
import { TouchableOpacity } from 'react-native';
import { createBill, createDetail, fetchBill, fetchBillByTimeRange, fetchDetailByBillIds } from '../../services/billService';


const AssignTableScr = () => {
  const { user } = useAuth();
  const [tables, setTables] = useState([]);
  const [floors, setFloors] = useState([]); 
  const [bills, setBills] = useState([]);

  const [loading, setLoading] = useState(false);
  //
  const today = new Date();

  const [date, setDate] = useState(new Date());

  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [chooseTable, setChooseTable] = useState([]);
  const [state, setState] = useState('');


  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [peopleCount, setPeopleCount] = useState(1);




  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    console.log('selectedDate:', selectedDate);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const today = new Date();
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      let selected = new Date(selectedTime);

      if (isToday) {
        const now = new Date();
        selected.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
        if (selected < now) {
          Alert.alert('Thông báo', 'Không thể chọn giờ trong quá khứ!');
          return;
        }
      } else {
        // setChooseDate
        selected.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      }

      setTime(selected);
    }
  };


  const updateTablesWithBills = (tables, detailBills) => {
    // all tables
    const inUseTableIds = detailBills.map(detail => detail.tableId);

    // state
    return tables.map(table =>
      inUseTableIds.includes(table.id)
        ? { ...table, state: 'in_use' }
        : { ...table, state: 'empty' }
    );
  };

  const refreshData = async () => {
    setLoading(true);
    const tableRes = await fetchTable();
    const billRes = await fetchBillByTimeRange(time);

    if (tableRes.success && billRes.success) {
      setBills(billRes.data);

      // state = inorder
      const inOrderBills = billRes.data.filter(bill => bill.state === 'in_order');
      const inOrderBillIds = inOrderBills.map(bill => bill.id);

      // detail bill inorder
      let detailBills = [];
      if (inOrderBillIds.length > 0) {
        const detailRes = await fetchDetailByBillIds(inOrderBillIds);
        if (detailRes.success && Array.isArray(detailRes.data)) {
          detailBills = detailRes.data;
        }
      }

      // set state
      const updatedTables = updateTablesWithBills(tableRes.data, detailBills);
      setTables(updatedTables);

      // group table by floor
      const groupedFloors = updatedTables.reduce((acc, table) => {
        if (!acc[table.floor]) acc[table.floor] = [];
        acc[table.floor].push(table);
        return acc;
      }, {});
      setFloors(Object.values(groupedFloors));
    } else {
      Alert.alert('Lỗi', 'Không thể lấy dữ liệu bàn hoặc hóa đơn');
    }
    setLoading(false);
  };



  // useEffect(() => {
  //   getTables();
  //   getBill();

  //   const interval = setInterval(() => {
  //     getTables();
  //     getBill();
  //   }, 10000); 
  //   return () => clearInterval(interval);
  // }, [date, time]);
  useEffect(() => {
    refreshData();
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
    console.log('date:', date);
    console.log('time:', time);
    console.log('user:', user?.name);


  }, [date, time, user, peopleCount]);

  // handle assing
  const handleAssign = async () => {
    console.log('1. Bắt đầu handleAssign');
    if (!name || name.trim() === "") {
      Alert.alert("Lỗi", "Vui lòng nhập tên của bạn!");
      return;
    }
    if (!phone || phone.trim() === "") {
      Alert.alert("Lỗi", "Vui lòng nhập số điện thoại!");
      return;
    }
    const phoneRegex = /^(0\d{9,10})$/;
    if (!phoneRegex.test(phone.trim())) {
      Alert.alert("Lỗi", "Số điện thoại không hợp lệ! Vui lòng nhập đúng định dạng (10 số, bắt đầu bằng 0).");
      return;
    }
    if (!peopleCount || isNaN(peopleCount) || peopleCount <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập số người hợp lệ!");
      return;
    }


    // require tables
    const requiredTables = Math.ceil(peopleCount / 6);
    if (chooseTable.length < requiredTables) {
      const missingTables = requiredTables - chooseTable.length;

      Alert.alert(
        "Thiếu bàn",
        `Với ${peopleCount} người, bạn cần ít nhất ${requiredTables} bàn. Hiện tại bạn mới chọn ${chooseTable.length} bàn. Bạn muốn:`,
        [
          {
            text: "Tự chọn thêm",
            style: "cancel",
          },
          {
            text: "Hệ thống tự chọn",
            onPress: () => autoSelectTables(missingTables),
          },
        ]
      );
      return;
    }

    //
    setLoading(true);
    console.log('2. Đã set loading = true');
    try {
      const bill = {
        userId: user?.id,
        num_people: peopleCount,
        note: note || "",
        phone: phone,
        name: name,
        time: time.toISOString(),
        state: "in_order",
        visit: "on_process",
      };
      console.log('3. Chuẩn bị tạo bill:', bill);

      const billRes = await createBill(bill);
      console.log('4. Kết quả createBill:', billRes);
      if (!billRes.success) {
        Alert.alert("Lỗi", billRes.msg || "Đặt bàn thất bại!");
        setLoading(false);
        return;
      }

      // detail bills
      const detailRes = await createDetail(billRes.data[0].id, chooseTable, peopleCount);
      console.log('6. Kết quả createDetail:', detailRes);
      if (!detailRes.success) {
        Alert.alert("Lỗi", detailRes.msg || "Tạo chi tiết bill thất bại!");
        setLoading(false);
        return;
      }

      Alert.alert("Thành công", "Đặt bàn thành công!");
      setChooseTable([]);
      setState("");
      refreshData();
    } catch (err) {
      Alert.alert("Lỗi", "Có lỗi xảy ra khi đặt bàn!", err.message);
    }
    setLoading(false);
  };

  // auto select tables
  const autoSelectTables = (missingTables) => {
    const availableTables = tables.filter(table =>
      table.state !== 'in_use' && !chooseTable.includes(table.id)
    );

    if (availableTables.length < missingTables) {
      Alert.alert("Lỗi", "Không đủ bàn trống để tự động chọn!");
      return;
    }

    // closet
    let selectedTables = [];
    if (chooseTable.length > 0) {
      // 
      const selectedTable = tables.find(t => t.id === chooseTable[0]);
      const sortedTables = availableTables.sort((a, b) => {
        // 
        if (a.floor === selectedTable.floor && b.floor !== selectedTable.floor) return -1;
        if (b.floor === selectedTable.floor && a.floor !== selectedTable.floor) return 1;

        // 
        return Math.abs(a.id - selectedTable.id) - Math.abs(b.id - selectedTable.id);
      });

      selectedTables = sortedTables.slice(0, missingTables).map(t => t.id);
    } else {
      // auto select first 
      selectedTables = availableTables.slice(0, missingTables).map(t => t.id);
    }

    // 
    setChooseTable([...chooseTable, ...selectedTables]);
    setState(`Hệ thống đã tự động chọn thêm ${missingTables} bàn!`);
  };
  

  const handleChoose = (item) => {
    console.log('item:', item);
    if (item.state === 'in_use') return;

    // max table
    const maxTable = Math.ceil(peopleCount / 6) || 1;

    // check select
    const isSelected = chooseTable.includes(item.id);

    let newChooseTable = [...chooseTable];

    if (isSelected) {
      // remove choose
      newChooseTable = newChooseTable.filter(id => id !== item.id);
      setChooseTable(newChooseTable);
      setState('');
      return;
    }

    if (chooseTable.length < maxTable) {
      newChooseTable.push(item.id);
      setChooseTable(newChooseTable);
      setState('');
    } else {
      setState(`Số người hiện tại chỉ được chọn tối đa ${maxTable} bàn!`);
    }
  }

  return (
    <ScreenWrapper bg="#FFBF00">
      <View style={styles.container}>
        <MyHeader title="Đặt bàn" showBackButton={true} />
        <View style={{ backgroundColor: '#fff7bf', borderRadius: 10, }}>
          {/* view all */}
          <View style={{ gap: 10, padding: 15 }}>
            <Text style={{ color: 'black', fontSize: 20, paddingHorizontal: wp(2) }}>Vui lòng điền thông tin của bạn:</Text>
            <MyInput
              placeholder="Tên của bạn..."
              value={name}
              onChangeText={setName}
              icon={<FontAwesome name="pencil-square-o" size={24} color="black" />}
            />
            <MyInput
              icon={<Feather name="phone-call" size={24} color="black" />}
              placeholder="Số điện thoại..."
              value={phone}
              onChangeText={setPhone}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity
                style={styles.dateTime}
                onPress={() => setShowDatePicker(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon.Calendar stroke={theme.colors.dark} strokeWidth={2} width={26} height={26} />
                  <Text>
                    {date.toLocaleDateString() + ""}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateTime}
                onPress={() => setShowTimePicker(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon.Clock stroke={theme.colors.dark} strokeWidth={2} width={26} height={26} />
                  <Text>
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ""}
                  </Text>
                </View>
              </TouchableOpacity>
              <MyInput
                containerStyle={{ width: wp(30) }}
                icon={<SimpleLineIcons name="people" size={24} color="black" />}
                keyboardType="numeric"
                value={peopleCount.toString()}
                onChangeText={(value) => {
                  const numValue = parseInt(value) || 0;
                  setPeopleCount(numValue);
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
              value={note}
              onChangeText={setNote}
            />
          </View>
          {/* table list */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ width: wp(95) }}
          >
            {floors.map((tables, index) => {
              const floorAvailable = tables.filter(t => t.state !== 'in_use').length;
              const floorTotal = tables.length;

              return (
                <View key={index} style={styles.verticalScrollView}>
                  <Text style={styles.floorText}>Tầng {index + 1} </Text>
                  <Text style={{ alignSelf: 'center' }}>({floorAvailable}/{floorTotal} bàn trống)</Text>
                  <FlatList
                    data={[...tables].sort((a, b) => a.id - b.id)}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={3}
                    renderItem={({ item }) => (
                      <MyTableItem
                        item={item}
                        isSelected={chooseTable.includes(item.id)}
                        tableClick={() => handleChoose(item)}
                      />
                    )}
                    contentContainerStyle={styles.tableContainer}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              );
            })}
          </ScrollView>
          <Text style={{ paddingHorizontal: wp(2), marginBottom: wp(2), color: 'red', }}>{state}</Text>
        </View>
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
  },

  verticalScrollView: {
    width: wp(95),
    height: hp(39),
  },
  floorText: {
    fontSize: hp(3),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableContainer: {
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