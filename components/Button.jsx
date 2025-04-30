import { Pressable, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { theme } from '../constants/theme'
import { hp } from '../helper/common'
import Loading from './Loading'

const Button = (
    {buttonStyle,
    textStyle,
    title='',
    onPress=()=>{},
    loading=false,
    hasShadow=true,}
) => {
    const shadowStyle = {
        shadowColor: theme.colors.dar,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    }
    if(loading){
        return (
            <View style ={[styles.button,buttonStyle, {backgroundColor:"white"}]}>
                <Loading />
            </View>
        )
    }
    return (
        <Pressable onPress={onPress} style = {[styles.button, buttonStyle, hasShadow && shadowStyle]}>
            <Text style = {[styles.text, textStyle]}>{title}</Text>
        </Pressable >
    )
}

export default Button

const styles = StyleSheet.create({
    button:{
        backgroundColor: theme.colors.primary,
        height: hp(7),
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        borderCurve: 'continuous',
        padding: 10
    },
    text:{
        fontSize: hp(2.5),
        color: 'white',
        fontWeight: 'bold',
    }
})