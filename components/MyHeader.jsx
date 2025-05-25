import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router'
import BackButton from './MyBackButton';
import { hp } from '../helper/common';
import { theme } from '../constants/theme';

const MyHeader = ({title, showBackButton = true}) => {
    const router = useRouter();
  return (
    <View style = {styles.container}>
        {
            showBackButton && (
                <View style = {styles.showBackButton}>
                    <BackButton router={router} />
                </View >
            )
        }
      <Text style = {styles.title}>{title || ""}</Text>
    </View>
  )
}

export default MyHeader

const styles = StyleSheet.create({
    container:{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        marginTop: 5,
        gap: 10   
    },
    title: {
        fontSize: hp(3.5),
        fontWeight: 'bold',
        color: 'white',
    },
    showBackButton:{
        position: 'absolute',
        left: 0,
    }
})