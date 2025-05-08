import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { theme } from '../constants/theme'

const MyLoading = ({size = "large", color = theme.colors.primary}) => {
  return (
    <View style = {{ justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size={size} color={color} />
    </View>
  )
}

export default MyLoading
