import { ScrollView, StyleSheet, Text, View } from 'react-native'
import React, { useRef, useState } from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import Header from '../../components/Header'
import { hp, wp } from '../../helper/common'
import { theme } from '../../constants/theme'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../../components/Avatar'
import RichTextEditor from '../../components/RichTextEditor'
import { useRouter } from 'expo-router'

const NewPostScr = () => {

  const { user } = useAuth();
  const bodyRef = useRef("");
  const editorRef = useRef(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(file);



  return (
    <ScreenWrapper bg={'white'}>
      <View style={styles.container}>
        <Header title={"Đăng bài"} />
        <ScrollView contentContainerStyle={{ gap: 20 }}>
          <View style={styles.header}>
            <Avatar
              uri={user?.image}
              size={hp(7)}
              rounded={30}
            />
            <View style={{ gap: 2 }}>
              <Text style={styles.userName}> 
                {user && user.name}
              </Text>
              <Text style={styles.publicText}>
                Public
              </Text>
            </View>
          </View>
          {/* editor */}
          <View style = {styles.textEditor}>
            <RichTextEditor editorRef = {editorRef} onChange = {body => bodyRef.current = body} />
          </View>
        </ScrollView>
      </View>
    </ScreenWrapper>
  )
}

export default NewPostScr

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 30,
    paddingHorizontal: wp(2),
    gap: 15
  },
  title: {
    fontSize: hp(2, 5),
    fontWeight: 'semibold',
    color: theme.colors.text,
    textAlign: 'center'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  userName: {
    fontSize: hp(3),
    fontWeight: 'semibold',
  },
  avatar:{
    height: hp(6.5),
    width: hp(6.5),
    borderRadius: '20',
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: 'rgb(0,0,0,0,1)'
  },
  publicText: {
    fontSize: hp(2),
    fontWeight: '200',
    color: theme.colors.textLight,
  }

})
