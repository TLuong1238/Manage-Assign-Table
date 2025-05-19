import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { hp } from '../helper/common'
import { Image } from 'expo-image'
import { theme } from '../constants/theme'
import { getUserImageSrc } from '../services/imageService'

const MyAvatar = ({
    uri,
    size= hp(3),
    rounded = 10,
    style = {}
}) => {
  return (
    <View>
      <Image 
        source={getUserImageSrc(uri)}
        transition={100}
        style ={[styles.avatar, {height: size, width: size, borderRadius: rounded}, style]}
      
      />
    </View>
  )
}

export default MyAvatar

const styles = StyleSheet.create({
    avatar:{
        borderCurve: 'continuous',
        borderColor: theme.colors.textLight,
        borderWidth: 1
        
    }
})