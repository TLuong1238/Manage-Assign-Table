import { Pressable, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import * as Icon from 'react-native-feather'
import { theme } from '../constants/theme'
import { useNavigation } from '@react-navigation/native'

const BackButton = ({size = 26}) => {
    const navigation = useNavigation();
  return (
    <Pressable onPress={() => navigation.goBack()} style ={styles.button}>
        <Icon.ChevronLeft width={20} height={20} stroke={theme.colors.text}  strokeWidth={2}/>
    </Pressable>
  )
}

export default BackButton

const styles = StyleSheet.create({
    button:{
        alignSelf:'flex-start',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 5,
        borderRadius:5,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
})