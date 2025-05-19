import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { theme } from '../constants/theme'
import { hp } from '../helper/common'
import MyAvatar from './MyAvatar'
import moment from 'moment'
import * as Icon from 'react-native-feather'


const MyCommentItem = ({
  item,
  canDelete = false,
  onDelete = () => { },
}) => {

  const createdAt = moment(item?.created_at).fromNow();
  const handleDelete = () => {
    Alert.alert("Xác nhận", "Bạn có chắc chắn muốn xóa bình luận này không?" , [
      {
        text: "Hủy bỏ" ,
        onPress: () => console.log("Hủy"),
        style: 'cancel'
      },
      {
        text: "Đồng ý",
        onPress: () => onDelete(item),
        style: 'destructive'
      }
    ])
  }
  return (
    <View style={styles.container}>
      {/* avatar */}
      <MyAvatar
        uri={item?.user?.image}
        size={hp(4)}

      />
      <View style={styles.content}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.text}>
            {item?.user?.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={[styles.text, { color: theme.colors.textLight, fontSize: hp(1.5), fontStyle: 'italic' }]}>
              {createdAt}
            </Text>
            {
              canDelete && (
                <TouchableOpacity onPress ={handleDelete}>
                  <Icon.Trash2 stroke={'red'} width={hp(2)} height={hp(2)} />
                </TouchableOpacity>
              )
            }
          </View>
        </View>
        <Text>{item?.text}</Text>
      </View>
    </View>
  )
}

export default MyCommentItem

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  content: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    flex: 1,
    gap: 5,
    borderRadius: 10,
    borderCurve: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  highLight: {
    borderWidth: 1,
    backgroundColor: 'white',
    borderColor: theme.colors.dark,
    shadowColor: theme.colors.dark,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    fontSize: hp(2),
    fontWeight: 'semibold',
    color: theme.colors.textDark
  }
})