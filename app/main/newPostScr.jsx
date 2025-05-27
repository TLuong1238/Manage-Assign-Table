import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Image, Pressable, Alert } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import Header from '../../components/MyHeader'
import { hp, wp } from '../../helper/common'
import { theme } from '../../constants/theme'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../../components/MyAvatar'
import MyRichTextEditor from '../../components/MyRichTextEditor'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Icon from "react-native-feather"
import MyButton from '../../components/MyButton'
import * as ImagePicker from 'expo-image-picker';
import { getSupabaseFileUrl } from '../../services/imageService'
import { Video } from 'expo-av';
import { createOrUpdatePost } from '../../services/postServices'
import { isForInStatement } from 'typescript'


const NewPostScr = () => {

  const { user } = useAuth();
  const bodyRef = useRef("");
  const editorRef = useRef(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);

  // console.log('user: ', user?.data);

  const post = useLocalSearchParams();
  useEffect(() => {
    if (post && post.id) {
      bodyRef.current = post.body;
      setFile(post.file);
      setTimeout(() => {
        editorRef?.current?.setContentHTML(post.body);
      }, 300)

      return () => clearTimeout();
    }
  }, [post?.id, post?.body, post?.file])

  const onPick = async (isImage) => {
    try {
      const mediaConfig = {
        allowsEditing: false,
        quality: 0.7,
        mediaTypes: isImage
          ? 'images'
          : 'videos',
        aspect: isImage ? [1, 1] : undefined
      };

      const result = await ImagePicker.launchImageLibraryAsync(mediaConfig);

      if (!result.canceled && result.assets[0]) {
        setFile(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Lỗi', 'Không thể chọn media, vui lòng thử lại');
    }
  }

  const isLocalFile = file => {
    if (!file) return null;
    if (typeof (file) == 'object') {
      return typeof (file)
    }
    return false
  }
  const isBodyEmpty = (body) => {
    if (!body) return true;
    //remove html
    const text = body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').replace(/\s/g, '');
    return text.length === 0;
  };

  const getFileType = file => {
    if (!file) return null;
    if (isLocalFile(file)) {
      return file.type;
    }
    //Chech file type
    if (file.includes('postImages')) {
      return 'image';
    }
    return 'video';
  }

  const getFIleUri = file => {
    if (!file) return null;
    if (isLocalFile(file)) return file.uri;

    return getSupabaseFileUrl(file)?.uri;
  }
  //
  const onSubmit = async () => {
    // console.log('bodyRef.current:', bodyRef.current);
    // console.log('file:', file);

    if (isBodyEmpty(bodyRef.current) && !file) {
      Alert.alert("Thông báo!", "Hãy nêu suy nghĩ của bạn hoặc thêm ảnh và video!");
      return;
    }
    let data = {
      file,
      body: bodyRef.current,
      userId: user?.id,
    }

    if (post && post.id) data.id = post.id;

    setLoading(true);
    let res = await createOrUpdatePost(data);
    setLoading(false);
    //
    if (res.success) {
      setFile(null);
      bodyRef.current = '';
      editorRef.current?.setContentHTML('');
      if (post && post.id) {
        Alert.alert('Post: ', 'Cập nhật bài viết thành công!');
      } else {
        Alert.alert('Post: ', 'Đăng bài thành công!');
      }
      router.back();
    } else {
      Alert.alert('Post: ', res.msg);
    }
    // console.log('post res: ',res);

    // console.log('body: ',bodyRef.current);
    // console.log('file: ',file);



  }


  return (
    <ScreenWrapper bg={'#FFBF00'}>
      <View style={styles.container}>
        <Header title={"Đăng bài"} />
        <ScrollView contentContainerStyle={{ gap: 20 }} showsVerticalScrollIndicator={false}>
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
          <View style={styles.textEditor}>
            <MyRichTextEditor editorRef={editorRef} onChange={body => bodyRef.current = body} />
          </View>
          {
            file && (
              <View style={styles.file}>
                {
                  getFileType(file) == 'video' ? (
                    <Video
                      style={{ flex: 1 }}
                      source={{ uri: getFIleUri(file) }}
                      useNativeControls
                      isLooping
                      resizeMode='cover'
                    />
                  ) : (
                    <Image source={{ uri: getFIleUri(file) }} resizeMode='cover'
                      style={{ flex: 1, width: '100%', height: '100%' }} />
                  )
                }
                <Pressable style={styles.deleteIcon} onPress={() => setFile(null)}>
                  <Icon.Trash2 stroke={'white'} height={18} width={18} />
                </Pressable>
              </View>
            )
          }
          <View style={styles.media}>
            <Text style={styles.addImageText}>Thêm vào bài đăng của bạn</Text>
            <View style={styles.mediaIcon}>
              <TouchableOpacity onPress={() => onPick(true)}>
                <Icon.Image height={30} width={30} color={theme.colors.dark} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onPick(false)}>
                <Icon.Video height={30} width={30} color={theme.colors.dark} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        <MyButton
          title={post && post?.id ? "Cập nhật" : "Đăng bài"}
          buttonStyle={{ height: hp(6) }}
          loading={loading}
          hasShadow={false}
          onPress={onSubmit}
        />
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
    color: 'white',
  },
  avatar: {
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
    color: 'black',
  },
  media: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    padding: 12,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderCurve: "continuous",
    borderColor: 'gray',
    backgroundColor: "white",
  },
  mediaIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15
  },
  imageIcon: {
    borderRadius: 12
  },
  addImageText: {
    fontSize: hp(1.9),
    fontWeight: 'semibold',
    color: theme.colors.text
  },
  file: {
    height: hp(40),
    width: '100%',
    borderRadius: 15,
    borderCurve: 'continuous',
  },
  video: {

  },
  deleteIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
    backgroundColor: 'rgba(255,0,0,0.6)',
    borderRadius: 20
  }

})
